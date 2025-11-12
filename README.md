# Recipe Management System - Microservices Architecture

This project has been split into two separate Node.js services for better scalability and maintainability:

## Services

### 1. Redis Service (`redis-service/`)
- Handles data storage and retrieval operations
- Manages Redis database connections
- Provides RESTful API for recipe data
- Runs on port 3001

### 2. Proxy Service (`proxy-service/`)
- Acts as intelligent middleware layer
- Provides request validation and rate limiting
- Enhances logging and monitoring
- Runs on port 3002

### 3. UI Service (`ui-service/`)
- Serves the web interface
- Proxies API calls to the Proxy service
- Handles static file serving
- Runs on port 3000

## Quick Start

1. **Start Redis** (if not already running):
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   
   # Or install locally and start
   redis-server
   ```

2. **Start Redis Service**:
   ```bash
   cd redis-service
   npm install
   npm start
   ```

3. **Start UI Service** (in a new terminal):
   ```bash
   cd ui-service
   npm install
   npm start
   ```

4. **Access the application**:
   - Web Interface: http://localhost:3000
   - Redis Service API: http://localhost:3001
   - Health Checks: 
     - UI Service: http://localhost:3000/health
     - Redis Service: http://localhost:3001/health

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │────│ UI Service  │────│Proxy Service│────│Redis Service│────│   Redis     │
│             │    │ (Port 3000) │    │ (Port 3002) │    │ (Port 3001) │    │ (Port 6379) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## API Endpoints

Both services expose the same recipe management endpoints:

- `POST /recipe/:name` - Add ingredients to a recipe
- `GET /recipe/:name` - Retrieve recipe ingredients
- `GET /health` - Service health check

## Development

Each service can be developed and deployed independently:

- **Redis Service**: Focus on data operations and Redis integration
- **UI Service**: Focus on frontend and user experience

## Environment Configuration

Each service has its own `.env` file:

**redis-service/.env**:
```env
REDIS_URL=redis://localhost:6379
PORT=3001
```

**ui-service/.env**:
```env
PORT=3000
REDIS_SERVICE_URL=http://localhost:3001
```

## Benefits of This Architecture

1. **Separation of Concerns**: UI and data logic are separated
2. **Scalability**: Each service can be scaled independently
3. **Maintainability**: Easier to maintain and update individual services
4. **Fault Isolation**: Issues in one service don't directly affect the other
5. **Technology Flexibility**: Each service can use different technologies as needed

## Migration from Monolith

This project was originally a single Node.js application (`recipe-service/`). The migration involved:

1. Extracting Redis operations into a dedicated service
2. Creating a UI service that proxies API calls
3. Moving static assets to the UI service
4. Setting up inter-service communication via HTTP

The API contract remains the same, so existing clients continue to work without changes.