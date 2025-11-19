# Recipe Proxy Service

This is an intelligent proxy service that acts as a load balancer and middleware layer for recipe management APIs. It routes requests to multiple backend recipe services based on recipe names, while providing additional features like request validation, rate limiting, and enhanced monitoring.

## Key Features

- **Intelligent Request Routing**: Routes requests to different Redis services based on recipe name (A-G → port 3001, H-R → port 3004, S-Z → port 3003)
- **Input Validation & Sanitization**: Validates and sanitizes recipe names and ingredients with security controls
- **Rate Limiting**: Prevents abuse with in-memory rate limiting (100 req/min per IP address)
- **Enhanced Logging**: Comprehensive request/response logging with timestamps, metadata, and performance metrics
- **CORS Support**: Cross-origin resource sharing for web clients
- **Health Monitoring**: Multi-service health checks with dependency status reporting
- **Error Handling**: Graceful error handling with proper HTTP status codes and informative responses
- **Security**: Non-root user execution, input sanitization, and request validation
- **Observability**: Detailed metrics endpoint with system and application statistics

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
# Port for the proxy service (default: 3002)
PORT=3002

# Base URL for backend recipe services (default: http://host.docker.internal)
REDIS_SERVICE_BASE_URL=http://host.docker.internal

# Node environment
NODE_ENV=development
```

## Service Routing Logic

The proxy service intelligently routes requests based on recipe names:
- **A-G**: Routes to `${REDIS_SERVICE_BASE_URL}:3001` (recipe-service-1)
- **H-R**: Routes to `${REDIS_SERVICE_BASE_URL}:3004` (recipe-service-2) 
- **S-Z**: Routes to `${REDIS_SERVICE_BASE_URL}:3003` (recipe-service-3)

This provides horizontal scaling and load distribution across multiple recipe service instances.

## Prerequisites

- Node.js (v16 or higher)
- Backend recipe services running (see ../redis-service)

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
The `/health` endpoint provides comprehensive status including all backend service dependencies:
```json
{
  "status": "healthy",
  "service": "proxy-service",
  "timestamp": "2025-11-19T16:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 25165824,
    "heapTotal": 18874368,
    "heapUsed": 12345678
  },
  "dependencies": {
    "recipe-service-1": {
      "status": "healthy",
      "url": "http://host.docker.internal:3001",
      "range": "A-G",
      "responseTime": 23
    },
    "recipe-service-2": {
      "status": "healthy", 
      "url": "http://host.docker.internal:3004",
      "range": "H-R",
      "responseTime": 18
    },
    "recipe-service-3": {
      "status": "healthy",
      "url": "http://host.docker.internal:3003", 
      "range": "S-Z",
      "responseTime": 21
    }
  }
}
```

## Architecture Role

```
Clients → Proxy Service → Recipe Services
           (3002)         (3001,3003,3004)
```

The proxy service acts as an **Ambassador Pattern** implementation providing:
- **Load Distribution**: Routes requests across multiple backend service instances
- **Service Discovery**: Manages connections to distributed recipe services
- **Security**: Input validation, sanitization, and rate limiting
- **Reliability**: Health monitoring, error handling, and graceful degradation
- **Observability**: Enhanced logging, metrics, and distributed tracing
- **Scalability**: Horizontal scaling support through intelligent routing

## Development

The service runs on port 3002 by default. Ensure the backend recipe services are running on ports 3001, 3003, and 3004.

### Testing the API

```bash
# Health check
curl http://localhost:3002/health

# Test routing: Recipe starting with 'A' (routes to port 3001)
curl -X POST http://localhost:3002/recipe/apple-pie \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["apples","cinnamon","flour","sugar"]}'

# Test routing: Recipe starting with 'P' (routes to port 3003)  
curl -X POST http://localhost:3002/recipe/pasta \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["tomatoes","garlic","basil"]}'

# Get recipes
curl http://localhost:3002/recipe/apple-pie
curl http://localhost:3002/recipe/pasta

# View metrics and routing statistics
curl http://localhost:3002/metrics
```

## Monitoring and Observability

- **Logs**: Structured logging with timestamps and request IDs
- **Metrics**: Service statistics available at `/metrics`
- **Health**: Dependency health monitoring at `/health`
- **Rate Limiting**: Request tracking and abuse prevention

## Docker Support

### Building the Container

The service includes a production-ready Dockerfile with security best practices:

```bash
# Build the Docker image
docker build -t recipe-proxy-service .

# Run the container
docker run -p 3002:3002 --name proxy-service recipe-proxy-service
```

### Docker Compose Integration

Add this service to your `docker-compose.yml`:

```yaml
services:
  proxy-service:
    build: ./proxy-service
    ports:
      - "3002:3002"
    environment:
      - REDIS_SERVICE_BASE_URL=http://host.docker.internal
      - PORT=3002
      - NODE_ENV=production
    depends_on:
      - recipe-service-1
      - recipe-service-2  
      - recipe-service-3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  recipe-service-1:
    build: ../recipe-service
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
    
  recipe-service-2:
    build: ../recipe-service  
    ports:
      - "3004:3004"
    environment:
      - PORT=3004
      
  recipe-service-3:
    build: ../recipe-service
    ports:
      - "3003:3003" 
    environment:
      - PORT=3003
```

### Container Features

- **Multi-stage build**: Optimized for production
- **Non-root user**: Runs as `nodeuser` (UID 1001) for security
- **Health checks**: Built-in container health monitoring
- **Graceful shutdown**: Handles SIGTERM and SIGINT signals
- **Resource efficiency**: Alpine Linux base image
- **Production dependencies**: Only installs required packages

### Environment Configuration

For containerized deployment, configure these environment variables:

```bash
# Docker environment
REDIS_SERVICE_BASE_URL=http://host.docker.internal  # For Docker Desktop
# OR
REDIS_SERVICE_BASE_URL=http://172.17.0.1            # For Linux Docker

# Kubernetes environment  
REDIS_SERVICE_BASE_URL=http://recipe-service-cluster  # Internal cluster DNS

# Production settings
NODE_ENV=production
PORT=3002
```

### Container Networking

The service is designed to work in containerized environments:
- Uses `host.docker.internal` for Docker Desktop compatibility
- Supports Docker internal networking
- Compatible with Kubernetes service discovery
- Handles network failures gracefully with timeouts and retries