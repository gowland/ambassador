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

### Option 1: Docker Compose (Recommended)
The easiest way to run the Redis service with all dependencies:

```bash
# Start both Redis database and Redis service
docker-compose up -d

# Check the logs
docker-compose logs -f

# Stop the services
docker-compose down

# Stop and remove volumes (clears data)
docker-compose down -v
```

### Option 2: Manual Docker Build
```bash
# Build the image
docker build -t redis-service .

# Run Redis first
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Run the Redis service
docker run -d \
  --name redis-service \
  -p 3001:3001 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  redis-service

# Or use the docker environment file
docker run -d \
  --name redis-service \
  -p 3001:3001 \
  --env-file .env.docker \
  redis-service
```

### Option 3: Using Docker Network
```bash
# Create a network
docker network create recipe-network

# Run Redis
docker run -d \
  --name redis \
  --network recipe-network \
  redis:7-alpine

# Run the Redis service
docker run -d \
  --name redis-service \
  --network recipe-network \
  -p 3001:3001 \
  -e REDIS_URL=redis://redis:6379 \
  redis-service
```