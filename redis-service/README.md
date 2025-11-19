# Redis Service

A robust Redis-based microservice for recipe management that provides persistent storage and retrieval of recipe ingredients. Built with Node.js and Express, this service offers comprehensive logging, error handling, and production-ready containerization.

## Features

### Core API Endpoints
- **POST /recipe/:name** - Add ingredients to a recipe (merges with existing ingredients, prevents duplicates)
- **GET /recipe/:name** - Retrieve ingredients for a recipe
- **GET /health** - Health check endpoint with service status and timestamp

### Production Features
- **Comprehensive Logging** - Request/response logging with timestamps, duration tracking, and detailed Redis connection events
- **Error Handling** - Global exception handlers, graceful shutdown on SIGINT/SIGTERM
- **Default Data** - Automatically initializes with a sample chocolate chip cookies recipe for testing
- **Duplicate Prevention** - Smart ingredient merging that avoids duplicate entries
- **Health Monitoring** - Built-in health checks for container orchestration
- **Security** - Runs as non-root user in container environment

## Configuration

### Environment Variables

Create a `.env` file in this directory with the following variables:

```env
# Redis connection string (required)
REDIS_URL=redis://localhost:6379

# Port for the Redis service (default: 3001)
PORT=3001

# Environment mode (development/production)
NODE_ENV=development
```

### Container Environment Variables

For container deployments, the following environment variables are pre-configured in the Dockerfile:

- `NODE_ENV=production` - Optimizes Node.js for production
- `PORT=3001` - Service listening port
- `REDIS_URL=redis://redis:6379` - Default Redis connection for Docker Compose

### Advanced Configuration

The service supports additional Redis client options through the connection URL:

```env
# Redis with authentication
REDIS_URL=redis://username:password@redis-host:6379

# Redis with SSL
REDIS_URL=rediss://redis-host:6380

# Redis with specific database
REDIS_URL=redis://redis-host:6379/2
```

## Architecture

### Service Design

This microservice follows cloud-native principles with:

- **Stateless design** - All data stored in Redis, enabling horizontal scaling
- **12-Factor App compliance** - Environment-based configuration, proper logging, graceful shutdown
- **Container-first** - Optimized for Docker and Kubernetes deployments
- **Health monitoring** - Built-in health checks for orchestration platforms
- **Observability** - Structured logging for monitoring and debugging

### Data Model

Recipes are stored in Redis as JSON strings with the following structure:
- **Key**: Recipe name (string)
- **Value**: JSON array of ingredients (string[])

Example:
```
Key: "chocolate-chip-cookies"
Value: ["flour", "butter", "brown sugar", "white sugar", "eggs", "vanilla extract", "chocolate chips", "baking soda", "salt"]
```

### Logging Strategy

The service provides comprehensive logging across multiple categories:

- **[REQUEST]** - HTTP request details with IP, method, URL
- **[RESPONSE]** - HTTP response with status codes and duration
- **[REDIS INFO]** - Redis connection events and status
- **[REDIS ERROR]** - Redis operation failures
- **[API]** - Business logic operations and data flow
- **[API ERROR]** - Application-level errors with context
- **[API SUCCESS]** - Successful operations with metrics
- **[PROCESS]** - Service lifecycle events (startup, shutdown)
- **[INIT]** - Initialization operations and default data setup

All logs include ISO timestamps for precise timing and debugging.

## Prerequisites

- Node.js (v18 or higher) - Service built on Node.js 18 LTS
- Redis server (v6 or higher) - For data persistence and caching
- Docker (optional) - For containerized deployment

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

The service runs on port 3001 by default and provides extensive logging for development and debugging.

### Local Development Setup

1. **Start Redis locally:**
   ```bash
   # Using Docker
   docker run -d --name redis-dev -p 6379:6379 redis:7-alpine
   
   # Or install Redis locally and start the server
   redis-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Create .env file
   echo "REDIS_URL=redis://localhost:6379" > .env
   echo "PORT=3001" >> .env
   echo "NODE_ENV=development" >> .env
   ```

4. **Start the service:**
   ```bash
   npm start
   # or for development with auto-restart
   npm run dev  # if nodemon is configured
   ```

### Development Features

- **Auto-initialization** - Service automatically creates a sample recipe on startup
- **Detailed logging** - Request/response logging with timing information
- **Error tracking** - Comprehensive error logging with stack traces
- **Hot reload** - Use nodemon for automatic restarts during development
- **Health monitoring** - Access `/health` endpoint to verify service status

### Testing the API

```bash
# Test health endpoint
curl http://localhost:3001/health

# Add ingredients to a recipe
curl -X POST http://localhost:3001/recipe/test-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["flour", "sugar", "eggs"]}'

# Get recipe ingredients
curl http://localhost:3001/recipe/test-recipe

# Check the default recipe
curl http://localhost:3001/recipe/chocolate-chip-cookies
```

## Container Composition

This service is designed to run in containerized environments with comprehensive Docker support, health monitoring, and production-ready configurations.

### Docker Compose (Recommended)

Create a `docker-compose.yml` file for orchestrating the Redis service with its database:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: redis-db
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  redis-service:
    build: .
    container_name: redis-service
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - PORT=3001
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  redis_data:

networks:
  default:
    name: recipe-network
```

**Usage:**
```bash
# Start the entire stack
docker-compose up -d

# View logs
docker-compose logs -f redis-service

# Scale the service (if needed)
docker-compose up -d --scale redis-service=3

# Stop and cleanup
docker-compose down -v
```

### Standalone Container Deployment

#### Option 1: Docker Network (Production)
```bash
# Create dedicated network
docker network create recipe-network

# Start Redis database
docker run -d \
  --name redis-db \
  --network recipe-network \
  -v redis_data:/data \
  --health-cmd="redis-cli ping" \
  --health-interval=10s \
  --health-timeout=3s \
  --health-retries=3 \
  redis:7-alpine redis-server --appendonly yes

# Build and run the Redis service
docker build -t redis-service:latest .

docker run -d \
  --name redis-service \
  --network recipe-network \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e REDIS_URL=redis://redis-db:6379 \
  --restart unless-stopped \
  redis-service:latest
```

#### Option 2: Host Network (Development)
```bash
# Start Redis locally
docker run -d --name redis-local -p 6379:6379 redis:7-alpine

# Build and run service
docker build -t redis-service:dev .

docker run -d \
  --name redis-service-dev \
  -p 3001:3001 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e NODE_ENV=development \
  redis-service:dev
```

### Kubernetes Deployment

Example Kubernetes manifests for production deployment:

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis-service
  template:
    metadata:
      labels:
        app: redis-service
    spec:
      containers:
      - name: redis-service
        image: redis-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: REDIS_URL
          value: "redis://redis-master:6379"
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  selector:
    app: redis-service
  ports:
  - port: 3001
    targetPort: 3001
  type: LoadBalancer
```

### Container Features

- **Multi-stage optimization** - Uses Node.js 18 Alpine for minimal footprint
- **Security hardened** - Runs as non-root user (nodejs:1001)
- **Health monitoring** - Built-in health checks for container orchestration
- **Production ready** - Optimized for production with proper signal handling
- **Resource efficient** - Only production dependencies installed
- **Logging optimized** - Structured logging with timestamps for container environments

## Monitoring and Operations

### Health Monitoring

The service provides multiple layers of health monitoring:

```bash
# Basic health check
curl http://localhost:3001/health

# Container health check (automatic)
docker ps  # Shows health status in STATUS column

# Kubernetes readiness/liveness probes (automatic)
kubectl get pods  # Shows pod health status
```

### Log Analysis

Monitor service health through structured logs:

```bash
# View real-time logs
docker logs -f redis-service

# Filter by log category
docker logs redis-service 2>&1 | grep "\[API\]"
docker logs redis-service 2>&1 | grep "\[REDIS ERROR\]"

# In Kubernetes
kubectl logs -f deployment/redis-service
```

### Performance Metrics

Key metrics to monitor:

- **Response Times** - Check `[RESPONSE]` logs for duration values
- **Redis Connection Health** - Monitor `[REDIS INFO]` and `[REDIS ERROR]` events  
- **Request Volume** - Count `[REQUEST]` log entries
- **Error Rates** - Monitor `[API ERROR]` and `[REDIS ERROR]` frequency

### Troubleshooting

**Common Issues:**

1. **Redis Connection Failed**
   ```
   [REDIS ERROR] Redis Client Error: connect ECONNREFUSED
   ```
   - **Solution**: Verify Redis is running and `REDIS_URL` is correct
   - **Container**: Ensure Redis container is healthy and network connectivity

2. **Service Unresponsive**
   ```
   curl: (7) Failed to connect to localhost port 3001
   ```
   - **Solution**: Check if service started successfully, verify PORT configuration
   - **Container**: Check container status with `docker ps` or `kubectl get pods`

3. **Memory Issues**
   ```
   [PROCESS ERROR] Uncaught Exception: JavaScript heap out of memory
   ```
   - **Solution**: Increase container memory limits, check for memory leaks
   - **Kubernetes**: Update resource limits in deployment manifest

**Debug Mode:**

For detailed debugging, the service logs all Redis operations and API calls automatically. No additional configuration required.

## Production Considerations

### Security
- Service runs as non-root user in containers
- No sensitive data in logs (Redis URLs are masked)
- HTTPS termination should be handled by reverse proxy/load balancer

### Scaling
- Service is stateless and can be horizontally scaled
- Redis should be configured for high availability in production
- Consider Redis Cluster for large deployments

### Backup and Recovery
- Redis data persistence is handled by Redis configuration
- Use Redis AOF (Append Only File) for durability
- Regular Redis snapshots recommended for backup strategy