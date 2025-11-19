# UI Service

This is the UI service for the Recipe Management application. It serves as the **frontend presentation layer** and acts as the external entry point to the distributed recipe system.

## Features

- **Web Interface**: Serves the Recipe Manager frontend application
- **API Gateway**: Proxies recipe requests to the internal proxy service
- **External Access Point**: Only externally accessible service in the system
- **Health Monitoring**: Monitors the health of dependent internal services
- **Static Content**: Serves HTML, CSS, and JavaScript assets

## Service Interface

### External Interface (Public)
- **Port**: 3000 (HTTP)
- **Access**: Externally accessible from host machine
- **Purpose**: Entry point for web users and API consumers

### Internal Interface (Private)
- **Depends on**: Proxy Service (`proxy-service:3002`)
- **Network**: Internal Docker network communication only
- **Purpose**: Forwards recipe requests to business logic layer

## Environment Variables

```env
# Port for the UI service (external interface)
PORT=3000

# Internal proxy service URL (container-to-container communication)
PROXY_SERVICE_URL=http://proxy-service:3002
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

The UI service provides the following external API endpoints:

### Add Ingredients to Recipe
```http
POST /recipe/:name
Content-Type: application/json

{
  "ingredients": ["ingredient1", "ingredient2", "ingredient3"]
}
```

Forwards the request to the proxy service for processing.

### Get Recipe Ingredients
```http
GET /recipe/:name
```

Retrieves ingredients for the specified recipe by forwarding the request to the proxy service.

### Web Interface
```http
GET /
```

Serves the Recipe Manager web application interface.

### Health Check
```http
GET /health
```

Returns health status for this service and its direct dependency:
```json
{
  "status": "healthy",
  "service": "ui-service",
  "timestamp": "2025-11-19T14:30:00.000Z",
  "dependencies": {
    "proxyService": {
      "status": "healthy",
      "url": "http://proxy-service:3002",
      "response": {
        "status": "healthy",
        "service": "proxy-service"
      }
    }
  }
}
```

## Web Interface

Visit `http://localhost:3000` to access the Recipe Manager web interface.

## Development

### Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   # Create .env file
   PORT=3000
   PROXY_SERVICE_URL=http://localhost:3002
   ```

3. **Start Dependent Services**:
   ```bash
   # Start proxy and Redis services first
   cd ../
   docker-compose up -d proxy-service
   ```

4. **Run UI Service**:
   ```bash
   npm start
   ```

### Development vs Production

| Environment | External Port | Proxy URL | Network |
|-------------|---------------|-----------|---------|
| **Development** | 3000 | `http://localhost:3002` | Host network |
| **Production** | 3000 | `http://proxy-service:3002` | Docker network |

### Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test recipe creation
curl -X POST http://localhost:3000/recipe/Apple \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["flour", "sugar", "apples"]}'

# Test recipe retrieval
curl http://localhost:3000/recipe/Apple

# Access web interface
open http://localhost:3000
```

## Architecture

```
External Traffic → UI Service (port 3000) → Proxy Service (internal)
                       ↓                            ↓
                 Web Interface                 Business Logic
```

### Service Responsibilities:
- **Web Interface**: Serves static HTML, CSS, and JavaScript files
- **API Gateway**: Forwards recipe API requests to the proxy service
- **External Access**: Provides the only external entry point to the system
- **Health Monitoring**: Checks the availability of the proxy service

### Network Interface:
- **External Port**: 3000 (accessible from host machine)
- **Internal Dependency**: Proxy service at `proxy-service:3002`
- **Protocol**: HTTP for both external and internal communication

## Container Composition

### Docker Compose Integration

The UI service is designed to be part of a multi-service Docker Compose stack:

```yaml
# docker-compose.yml
version: '3.8'

services:
  ui-service:
    build:
      context: ./ui-service
      dockerfile: Dockerfile
    container_name: recipe-ui-service
    ports:
      - "3000:3000"  # External access point
    environment:
      - NODE_ENV=production
      - PORT=3000
      - PROXY_SERVICE_URL=http://proxy-service:3002
    depends_on:
      - proxy-service
    networks:
      - recipe-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Standalone Docker

For development or standalone usage:

```bash
# Build the image
docker build -t recipe-ui-service .

# Run with proxy service connection
docker run -p 3000:3000 \
  -e PROXY_SERVICE_URL=http://host.docker.internal:3002 \
  recipe-ui-service
```

### Service Dependencies

**Required Services**:
1. **Proxy Service** (internal, accessible at `proxy-service:3002`)

**Network Requirements**:
- Must be on the same Docker network as proxy service
- Requires external port exposure (3000) for user access
- Communicates with proxy service via internal service name

### Deployment Commands

```bash
# Start the entire distributed system
docker-compose up -d

# Build and restart just the UI service
docker-compose up -d --build ui-service

# View UI service logs
docker-compose logs -f ui-service

# Check service health
curl http://localhost:3000/health
```