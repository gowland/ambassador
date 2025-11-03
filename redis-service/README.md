# Redis Service

This is the Redis service for the Recipe Management application. It handles data storage and retrieval operations using Redis as the backend database.

## Features

- **POST /recipe/:name** - Add ingredients to a recipe
- **GET /recipe/:name** - Retrieve ingredients for a recipe
- **GET /health** - Health check endpoint

## Environment Variables

Create a `.env` file in this directory with the following variables:

```env
# Redis connection string
REDIS_URL=redis://localhost:6379

# Port for the Redis service
PORT=3001
```

## Prerequisites

- Node.js (v16 or higher)
- Redis server running on localhost:6379 (or configure REDIS_URL)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the service:
   ```bash
   npm start
   ```

## API Endpoints

### Add Ingredients to Recipe
```
POST /recipe/:name
Content-Type: application/json

{
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
}
```

### Get Recipe Ingredients
```
GET /recipe/:name
```

Response:
```json
{
  "name": "recipe-name",
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
}
```

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "redis-service",
  "timestamp": "2025-11-03T14:30:00.000Z"
}
```

## Development

The service runs on port 3001 by default. Make sure Redis is running before starting the service.

## Docker Support

To run with Docker:

```bash
# Build the image
docker build -t redis-service .

# Run the container
docker run -p 3001:3001 --env-file .env redis-service
```