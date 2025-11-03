require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');

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

const redisClient = createClient({
  url: process.env.REDIS_URL
});

// Enhanced Redis logging
redisClient.on('error', (err) => {
  console.error('[REDIS ERROR]', new Date().toISOString(), 'Redis Client Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('[REDIS INFO]', new Date().toISOString(), 'Redis client connected');
});

redisClient.on('ready', () => {
  console.log('[REDIS INFO]', new Date().toISOString(), 'Redis client ready');
});

redisClient.on('end', () => {
  console.log('[REDIS INFO]', new Date().toISOString(), 'Redis client disconnected');
});

redisClient.on('reconnecting', () => {
  console.log('[REDIS INFO]', new Date().toISOString(), 'Redis client reconnecting...');
});

(async () => {
  try {
    console.log('[REDIS INFO]', new Date().toISOString(), 'Attempting to connect to Redis...');
    await redisClient.connect();
    console.log('[REDIS INFO]', new Date().toISOString(), 'Successfully connected to Redis');
  } catch (error) {
    console.error('[REDIS ERROR]', new Date().toISOString(), 'Failed to connect to Redis:', error.message);
  }
})();

// Add ingredients to a recipe
app.post('/recipe/:name', async (req, res) => {
  const { name } = req.params;
  const { ingredients } = req.body;
  const timestamp = new Date().toISOString();

  console.log(`[API] ${timestamp} POST /recipe/${name} - Adding ingredients:`, ingredients);

  if (!Array.isArray(ingredients)) {
    console.log(`[API ERROR] ${timestamp} Invalid ingredients format - expected array, got:`, typeof ingredients);
    return res.status(400).json({ error: 'Ingredients must be an array' });
  }

  try {
    // Get existing ingredients if any
    console.log(`[API] ${timestamp} Checking for existing ingredients for recipe: ${name}`);
    const existingData = await redisClient.get(name);
    let existingIngredients = [];
    
    if (existingData) {
      existingIngredients = JSON.parse(existingData);
      console.log(`[API] ${timestamp} Found existing ingredients for ${name}:`, existingIngredients);
    } else {
      console.log(`[API] ${timestamp} No existing ingredients found for ${name}`);
    }
    
    // Merge new ingredients with existing ones, avoiding duplicates
    const allIngredients = [...existingIngredients];
    const newIngredients = [];
    
    ingredients.forEach(ingredient => {
      if (!allIngredients.includes(ingredient)) {
        allIngredients.push(ingredient);
        newIngredients.push(ingredient);
      }
    });

    console.log(`[API] ${timestamp} New ingredients added:`, newIngredients);
    console.log(`[API] ${timestamp} Total ingredients for ${name}:`, allIngredients);

    await redisClient.set(name, JSON.stringify(allIngredients));
    console.log(`[API SUCCESS] ${timestamp} Successfully saved ${allIngredients.length} ingredients for ${name}`);
    
    res.status(200).json({ message: `Ingredients for ${name} saved.` });
  } catch (error) {
    console.error(`[API ERROR] ${timestamp} Failed to save recipe ${name}:`, error.message);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// Get ingredients for a recipe
app.get('/recipe/:name', async (req, res) => {
  const { name } = req.params;
  const timestamp = new Date().toISOString();

  console.log(`[API] ${timestamp} GET /recipe/${name} - Retrieving recipe`);

  try {
    const data = await redisClient.get(name);

    if (!data) {
      console.log(`[API] ${timestamp} Recipe not found: ${name}`);
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const ingredients = JSON.parse(data);
    console.log(`[API SUCCESS] ${timestamp} Retrieved recipe ${name} with ${ingredients.length} ingredients`);
    
    res.status(200).json({ name, ingredients });
  } catch (error) {
    console.error(`[API ERROR] ${timestamp} Failed to retrieve recipe ${name}:`, error.message);
    res.status(500).json({ error: 'Failed to retrieve recipe' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[API] ${timestamp} GET /health - Health check`);
  res.status(200).json({ status: 'healthy', service: 'redis-service', timestamp });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`[SERVER] ${timestamp} Redis Service started successfully`);
  console.log(`[SERVER] ${timestamp} Server running on port ${PORT}`);
  console.log(`[SERVER] ${timestamp} Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] ${timestamp} Redis URL: ${process.env.REDIS_URL || 'default'}`);
});