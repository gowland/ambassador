require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

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

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[REQUEST] ${timestamp} ${req.method} ${req.url} - IP: ${req.ip}`);
  
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

app.use(express.json());
app.use(express.static('public'));

const PROXY_SERVICE_URL = process.env.PROXY_SERVICE_URL || 'http://localhost:3002';

// Proxy endpoint for adding ingredients to a recipe
app.post('/recipe/:name', async (req, res) => {
  const { name } = req.params;
  const { ingredients } = req.body;
  const timestamp = new Date().toISOString();

  console.log(`[PROXY] ${timestamp} POST /recipe/${name} - Forwarding to Redis service`);

  try {
    const response = await axios.post(`${PROXY_SERVICE_URL}/recipe/${name}`, {
      ingredients
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });

    console.log(`[PROXY SUCCESS] ${timestamp} Redis service responded with status: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[PROXY ERROR] ${timestamp} Failed to forward request to Redis service:`, error.message);
    
    if (error.response) {
      // Redis service responded with error
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // Redis service is unreachable
      res.status(503).json({ error: 'Recipe service is temporarily unavailable' });
    } else {
      // Other error
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Proxy endpoint for getting ingredients for a recipe
app.get('/recipe/:name', async (req, res) => {
  const { name } = req.params;
  const timestamp = new Date().toISOString();

  console.log(`[PROXY] ${timestamp} GET /recipe/${name} - Forwarding to Redis service`);

  try {
    const response = await axios.get(`${PROXY_SERVICE_URL}/recipe/${name}`, {
      timeout: 5000 // 5 second timeout
    });

    console.log(`[PROXY SUCCESS] ${timestamp} Redis service responded with status: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[PROXY ERROR] ${timestamp} Failed to forward request to Redis service:`, error.message);
    
    if (error.response) {
      // Redis service responded with error
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // Redis service is unreachable
      res.status(503).json({ error: 'Recipe service is temporarily unavailable' });
    } else {
      // Other error
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Serve the main page
app.get('/', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[UI] ${timestamp} GET / - Serving main page`);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[UI] ${timestamp} GET /health - Health check`);
  
  try {
    // Check if Proxy service is healthy
    const proxyHealthResponse = await axios.get(`${PROXY_SERVICE_URL}/health`, { timeout: 3000 });
    
    res.status(200).json({
      status: 'healthy',
      service: 'ui-service',
      timestamp,
      dependencies: {
        proxyService: {
          status: 'healthy',
          url: PROXY_SERVICE_URL,
          response: proxyHealthResponse.data
        }
      }
    });
  } catch (error) {
    console.error(`[UI ERROR] ${timestamp} Proxy service health check failed:`, error.message);
    
    res.status(503).json({
      status: 'degraded',
      service: 'ui-service',
      timestamp,
      dependencies: {
        proxyService: {
          status: 'unhealthy',
          url: PROXY_SERVICE_URL,
          error: error.message
        }
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`[SERVER] ${timestamp} UI Service started successfully`);
  console.log(`[SERVER] ${timestamp} Server running on port ${PORT}`);
  console.log(`[SERVER] ${timestamp} Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] ${timestamp} Proxy Service URL: ${PROXY_SERVICE_URL}`);
});