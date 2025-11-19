require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('[PROCESS ERROR]', new Date().toISOString(), 'Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[PROCESS ERROR]', new Date().toISOString(), 'Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('[PROCESS]', new Date().toISOString(), 'Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[PROCESS]', new Date().toISOString(), 'Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

const app = express();

// CORS middleware - allow all origins for development
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[REQUEST] ${timestamp} ${req.method} ${req.url} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'Unknown'}`);
  
  // Log request body for POST/PUT requests
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[REQUEST BODY] ${timestamp}`, JSON.stringify(req.body));
  }
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    console.log(`[RESPONSE] ${new Date().toISOString()} ${req.method} ${req.url} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    originalEnd.apply(this, args);
  };
  
  next();
});

// Request rate limiting (simple in-memory implementation)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP

const rateLimitMiddleware = (req, res, next) => {
  const clientIP = req.ip;
  const now = Date.now();
  
  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, []);
  }
  
  const requests = requestCounts.get(clientIP);
  
  // Remove requests older than the window
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  requestCounts.set(clientIP, recentRequests);
  
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    console.log(`[RATE LIMIT] ${new Date().toISOString()} IP ${clientIP} exceeded rate limit`);
    return res.status(429).json({ 
      error: 'Too many requests', 
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000) 
    });
  }
  
  recentRequests.push(now);
  next();
};

// Apply rate limiting
app.use(rateLimitMiddleware);

app.use(express.json());

const REDIS_SERVICE_BASE_URL = process.env.REDIS_SERVICE_BASE_URL || 'http://host.docker.internal';

// Function to determine which Redis service to use based on recipe name
const getRedisServiceUrl = (recipeName) => {
  const firstLetter = recipeName.charAt(0).toLowerCase();
  
  if (firstLetter >= 'a' && firstLetter <= 'g') {
    return `${REDIS_SERVICE_BASE_URL}:3001`; // A-G -> Port 3001
  } else if (firstLetter >= 'h' && firstLetter <= 'r') {
    return `${REDIS_SERVICE_BASE_URL}:3004`; // H-R -> Port 3004
  } else {
    return `${REDIS_SERVICE_BASE_URL}:3003`; // S-Z (and numbers/special chars) -> Port 3003
  }
};

// Request validation middleware
const validateRecipeRequest = (req, res, next) => {
  const { name } = req.params;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Recipe name is required' });
  }
  
  if (name.length > 100) {
    return res.status(400).json({ error: 'Recipe name too long (max 100 characters)' });
  }
  
  // Sanitize recipe name - remove special characters that might cause issues
  req.params.name = name.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '');
  
  next();
};

const validateIngredientsRequest = (req, res, next) => {
  const { ingredients } = req.body;
  
  if (!Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Ingredients must be an array' });
  }
  
  if (ingredients.length === 0) {
    return res.status(400).json({ error: 'At least one ingredient is required' });
  }
  
  if (ingredients.length > 50) {
    return res.status(400).json({ error: 'Too many ingredients (max 50)' });
  }
  
  // Validate and sanitize each ingredient
  const sanitizedIngredients = ingredients
    .filter(ingredient => typeof ingredient === 'string' && ingredient.trim().length > 0)
    .map(ingredient => ingredient.trim().substring(0, 100)) // Limit length
    .slice(0, 50); // Ensure max 50 ingredients
  
  if (sanitizedIngredients.length !== ingredients.length) {
    console.log(`[VALIDATION] Sanitized ingredients from ${ingredients.length} to ${sanitizedIngredients.length}`);
  }
  
  req.body.ingredients = sanitizedIngredients;
  next();
};

// Proxy endpoint for adding ingredients to a recipe
app.post('/recipe/:name', validateRecipeRequest, validateIngredientsRequest, async (req, res) => {
  const { name } = req.params;
  const { ingredients } = req.body;
  const timestamp = new Date().toISOString();
  
  const redisServiceUrl = getRedisServiceUrl(name);
  console.log(`[PROXY] ${timestamp} POST /recipe/${name} - Routing to ${redisServiceUrl} based on first letter '${name.charAt(0)}'`);
  console.log(`[PROXY] ${timestamp} POST /recipe/${name} - Forwarding ${ingredients.length} ingredients to Redis service`);

  try {
    const response = await axios.post(`${redisServiceUrl}/recipe/${encodeURIComponent(name)}`, {
      ingredients
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.ip,
        'X-Proxy-Service': 'recipe-proxy'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`[PROXY SUCCESS] ${timestamp} Redis service responded with status: ${response.status}`);
    
    // Add proxy metadata to response
    const enhancedResponse = {
      ...response.data,
      _metadata: {
        proxyService: 'recipe-proxy',
        timestamp,
        processingTime: Date.now() - new Date(timestamp).getTime()
      }
    };
    
    res.status(response.status).json(enhancedResponse);
  } catch (error) {
    console.error(`[PROXY ERROR] ${timestamp} Failed to forward request to Redis service:`, error.message);
    
    if (error.response) {
      // Redis service responded with error
      res.status(error.response.status).json({
        ...error.response.data,
        _metadata: {
          proxyService: 'recipe-proxy',
          timestamp,
          error: 'Redis service error'
        }
      });
    } else if (error.request) {
      // Redis service is unreachable
      res.status(503).json({ 
        error: 'Recipe service is temporarily unavailable',
        _metadata: {
          proxyService: 'recipe-proxy',
          timestamp,
          error: 'Service unreachable'
        }
      });
    } else {
      // Other error
      res.status(500).json({ 
        error: 'Internal proxy error',
        _metadata: {
          proxyService: 'recipe-proxy',
          timestamp,
          error: 'Internal error'
        }
      });
    }
  }
});

// Proxy endpoint for getting ingredients for a recipe
app.get('/recipe/:name', validateRecipeRequest, async (req, res) => {
  const { name } = req.params;
  const timestamp = new Date().toISOString();
  
  const redisServiceUrl = getRedisServiceUrl(name);
  console.log(`[PROXY] ${timestamp} GET /recipe/${name} - Routing to ${redisServiceUrl} based on first letter '${name.charAt(0)}'`);
  console.log(`[PROXY] ${timestamp} GET /recipe/${name} - Forwarding to Redis service`);

  try {
    const response = await axios.get(`${redisServiceUrl}/recipe/${encodeURIComponent(name)}`, {
      headers: {
        'X-Forwarded-For': req.ip,
        'X-Proxy-Service': 'recipe-proxy'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`[PROXY SUCCESS] ${timestamp} Redis service responded with status: ${response.status}`);
    
    // Add proxy metadata to response
    const enhancedResponse = {
      ...response.data,
      _metadata: {
        proxyService: 'recipe-proxy',
        timestamp,
        processingTime: Date.now() - new Date(timestamp).getTime()
      }
    };
    
    res.status(response.status).json(enhancedResponse);
  } catch (error) {
    console.error(`[PROXY ERROR] ${timestamp} Failed to forward request to Redis service:`, error.message);
    
    if (error.response) {
      // Redis service responded with error
      res.status(error.response.status).json({
        ...error.response.data,
        _metadata: {
          proxyService: 'recipe-proxy',
          timestamp,
          error: 'Redis service error'
        }
      });
    } else if (error.request) {
      // Redis service is unreachable
      res.status(503).json({ 
        error: 'Recipe service is temporarily unavailable',
        _metadata: {
          proxyService: 'recipe-proxy',
          timestamp,
          error: 'Service unreachable'
        }
      });
    } else {
      // Other error
      res.status(500).json({ 
        error: 'Internal proxy error',
        _metadata: {
          proxyService: 'recipe-proxy',
          timestamp,
          error: 'Internal error'
        }
      });
    }
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[PROXY] ${timestamp} GET /health - Health check`);
  
  const healthStatus = {
    status: 'healthy',
    service: 'proxy-service',
    timestamp,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {}
  };
  
  // Check all three Redis services
  const redisServices = [
    { name: 'redis-service-1', url: `${REDIS_SERVICE_BASE_URL}:3001`, range: 'A-G' },
    { name: 'redis-service-2', url: `${REDIS_SERVICE_BASE_URL}:3004`, range: 'H-R' },
    { name: 'redis-service-3', url: `${REDIS_SERVICE_BASE_URL}:3003`, range: 'S-Z' }
  ];
  
  let overallHealthy = true;
  
  for (const service of redisServices) {
    try {
      const redisHealthResponse = await axios.get(`${service.url}/health`, { 
        timeout: 5000,
        headers: {
          'X-Proxy-Service': 'recipe-proxy'
        }
      });
      
      healthStatus.dependencies[service.name] = {
        status: 'healthy',
        url: service.url,
        range: service.range,
        responseTime: Date.now() - new Date(timestamp).getTime(),
        response: redisHealthResponse.data
      };
      
    } catch (error) {
      console.error(`[PROXY ERROR] ${timestamp} ${service.name} health check failed:`, error.message);
      
      overallHealthy = false;
      healthStatus.dependencies[service.name] = {
        status: 'unhealthy',
        url: service.url,
        range: service.range,
        error: error.message,
        responseTime: Date.now() - new Date(timestamp).getTime()
      };
    }
  }
  
  healthStatus.status = overallHealthy ? 'healthy' : 'degraded';
  const statusCode = overallHealthy ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[PROXY] ${timestamp} GET /metrics - Metrics request`);
  
  const metrics = {
    service: 'proxy-service',
    timestamp,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rateLimitStats: {
      activeIPs: requestCounts.size,
      totalRequests: Array.from(requestCounts.values()).reduce((sum, requests) => sum + requests.length, 0)
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      redisServiceBaseUrl: REDIS_SERVICE_BASE_URL,
      routingRules: {
        'A-G': `${REDIS_SERVICE_BASE_URL}:3001`,
        'H-R': `${REDIS_SERVICE_BASE_URL}:3004`,
        'S-Z': `${REDIS_SERVICE_BASE_URL}:3003`
      }
    }
  };
  
  res.status(200).json(metrics);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`[SERVER] ${timestamp} Proxy Service started successfully`);
  console.log(`[SERVER] ${timestamp} Server running on port ${PORT}`);
  console.log(`[SERVER] ${timestamp} Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] ${timestamp} Redis Service Base URL: ${REDIS_SERVICE_BASE_URL}`);
  console.log(`[SERVER] ${timestamp} Recipe Routing Rules:`);
  console.log(`[SERVER] ${timestamp}   A-G recipes -> ${REDIS_SERVICE_BASE_URL}:3001`);
  console.log(`[SERVER] ${timestamp}   H-R recipes -> ${REDIS_SERVICE_BASE_URL}:3004`);
  console.log(`[SERVER] ${timestamp}   S-Z recipes -> ${REDIS_SERVICE_BASE_URL}:3003`);
  console.log(`[SERVER] ${timestamp} Rate Limit: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW/1000} seconds`);
});