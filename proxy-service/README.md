# Proxy Service

This is the proxy service for the Recipe Management application. It acts as an intelligent middleware layer between the UI service and Redis service, providing additional features like request validation, rate limiting, and enhanced logging.

## Features

- **Request Proxying**: Forwards API calls to the Redis service
- **Input Validation**: Validates and sanitizes recipe names and ingredients
- **Rate Limiting**: Prevents abuse with configurable rate limits (100 req/min per IP)
- **Enhanced Logging**: Detailed request/response logging with metadata
- **CORS Support**: Cross-origin resource sharing for web applications
- **Health Monitoring**: Comprehensive health checks and metrics
- **Error Handling**: Graceful error handling with informative responses

## API Endpoints

### Recipe Management
- **POST /recipe/:name** - Add ingredients to a recipe (with validation)
- **GET /recipe/:name** - Retrieve recipe ingredients (with metadata)

### Monitoring
- **GET /health** - Health check with dependency status
- **GET /metrics** - Service metrics and statistics

## Environment Variables

Create a `.env` file in this directory with the following variables:

```env
# Port for the proxy service
PORT=3002

# URL of the Redis service
REDIS_SERVICE_URL=http://localhost:3001

# Node environment
NODE_ENV=development
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

## Features in Detail

### Input Validation
- Recipe names: Limited to 100 characters, special characters removed
- Ingredients: Maximum 50 ingredients per recipe, each limited to 100 characters
- Type validation: Ensures proper data types and formats

### Rate Limiting
- 100 requests per minute per IP address
- In-memory tracking (resets on service restart)
- Returns HTTP 429 with retry-after header when exceeded

### Enhanced Responses
All API responses include metadata:
```json
{
  "name": "recipe-name",
  "ingredients": ["ingredient1", "ingredient2"],
  "_metadata": {
    "proxyService": "recipe-proxy",
    "timestamp": "2025-11-05T16:30:00.000Z",
    "processingTime": 45
  }
}
```

### Health Monitoring
The `/health` endpoint provides comprehensive status:
```json
{
  "status": "healthy",
  "service": "proxy-service",
  "timestamp": "2025-11-05T16:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 25165824,
    "heapTotal": 18874368,
    "heapUsed": 12345678
  },
  "dependencies": {
    "redisService": {
      "status": "healthy",
      "url": "http://localhost:3001",
      "responseTime": 23
    }
  }
}
```

## Architecture Role

```
Browser → UI Service → Proxy Service → Redis Service → Redis Database
           (3000)       (3002)         (3001)       (6379)
```

The proxy service provides:
- **Security**: Input validation and sanitization
- **Reliability**: Rate limiting and error handling
- **Observability**: Enhanced logging and metrics
- **Flexibility**: Can add caching, authentication, load balancing

## Development

The service runs on port 3002 by default. Ensure the Redis service is running on port 3001.

### Testing the Service

```bash
# Health check
curl http://localhost:3002/health

# Add a recipe
curl -X POST http://localhost:3002/recipe/pasta \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["tomatoes","garlic","basil"]}'

# Get a recipe
curl http://localhost:3002/recipe/pasta

# View metrics
curl http://localhost:3002/metrics
```

## Monitoring and Observability

- **Logs**: Structured logging with timestamps and request IDs
- **Metrics**: Service statistics available at `/metrics`
- **Health**: Dependency health monitoring at `/health`
- **Rate Limiting**: Request tracking and abuse prevention

## Docker Support

The proxy service can be containerized similar to the Redis service. A Dockerfile can be added for deployment in containerized environments.