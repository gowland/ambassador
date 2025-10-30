require('dotenv').config();
const express = require('express');
const { createClient } = require('redis');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();

// Add ingredients to a recipe
app.post('/recipe/:name', async (req, res) => {
  const { name } = req.params;
  const { ingredients } = req.body;

  if (!Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Ingredients must be an array' });
  }

  // Get existing ingredients if any
  const existingData = await redisClient.get(name);
  let existingIngredients = [];
  
  if (existingData) {
    existingIngredients = JSON.parse(existingData);
  }
  
  // Merge new ingredients with existing ones, avoiding duplicates
  const allIngredients = [...existingIngredients];
  ingredients.forEach(ingredient => {
    if (!allIngredients.includes(ingredient)) {
      allIngredients.push(ingredient);
    }
  });

  await redisClient.set(name, JSON.stringify(allIngredients));
  res.status(200).json({ message: `Ingredients for ${name} saved.` });
});

// Get ingredients for a recipe
app.get('/recipe/:name', async (req, res) => {
  const { name } = req.params;
  const data = await redisClient.get(name);

  if (!data) {
    return res.status(404).json({ error: 'Recipe not found' });
  }

  res.status(200).json({ name, ingredients: JSON.parse(data) });
});

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const keys = await redisClient.keys('*');
    const recipes = [];
    
    for (const key of keys) {
      const ingredients = await redisClient.get(key);
      if (ingredients) {
        recipes.push({
          name: key,
          ingredients: JSON.parse(ingredients)
        });
      }
    }
    
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
