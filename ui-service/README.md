# UI Service

This is the UI service for the Recipe Management application. It serves the frontend interface and proxies API calls to the Redis service.

## Features

- Serves the Recipe Manager web interface
- Proxies API calls to the Redis service
- Health monitoring for dependent services
- Static file serving for HTML, CSS, and JavaScript

## Environment Variables

Create a `.env` file in this directory with the following variables:

```env
# Port for the UI service
PORT=3000

# URL of the Redis service
REDIS_SERVICE_URL=http://localhost:3001
```

## Prerequisites

- Node.js (v16 or higher)
- Redis service running (see ../redis-service)

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

The UI service proxies the following endpoints to the Redis service:

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

### Health Check
```
GET /health
```

Response includes both UI service and Redis service status:
```json
{
  "status": "healthy",
  "service": "ui-service",
  "timestamp": "2025-11-03T14:30:00.000Z",
  "dependencies": {
    "redisService": {
      "status": "healthy",
      "url": "http://localhost:3001",
      "response": {
        "status": "healthy",
        "service": "redis-service",
        "timestamp": "2025-11-03T14:30:00.000Z"
      }
    }
  }
}
```

## Web Interface

Visit `http://localhost:3000` to access the Recipe Manager web interface.

## Development

The service runs on port 3000 by default. Ensure the Redis service is running on port 3001.

## Architecture

```
Browser → UI Service (port 3000) → Redis Service (port 3001) → Redis Database
```

The UI service acts as a reverse proxy, forwarding recipe-related API calls to the Redis service while serving the web interface directly.

## Docker Support

To run with Docker:

```bash
# Build the image
docker build -t ui-service .

# Run the container
docker run -p 3000:3000 --env-file .env ui-service
```