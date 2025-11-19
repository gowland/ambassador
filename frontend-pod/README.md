# Frontend Pod

This directory contains th```powershell
# Start Proxy service
cd proxy-service
npm install
npm start

# Start UI service (in another terminal)
cd ui-service  
npm install
npm start
```oxy services that are deployed together as a cohesive frontend pod. These services work together to provide the user-facing layer of the Recipe Management System.

## Services

### UI Service (ui-service/)
- **Purpose**: Serves the web interface and static assets
- **Port**: 3000
- **Dependencies**: Proxy Service

### Proxy Service (proxy-service/)  
- **Purpose**: Intelligent middleware layer with validation, rate limiting, and routing
- **Port**: 3002
- **Dependencies**: Redis Services (external)

## Deployment

The services in this pod are designed to be deployed together using Docker Compose:

```powershell
# Build and start both services
docker-compose up --build

# Or use the convenience scripts
.\start-pod.ps1    # PowerShell
.\start-pod.bat    # Command Prompt
```

## Architecture Rationale

These services are grouped together because:

1. **Tight Coupling**: UI service depends directly on Proxy service
2. **Shared Deployment Lifecycle**: Both need to be updated together for new features
3. **Network Efficiency**: Internal communication stays within the pod
4. **Operational Simplicity**: Single deployment unit for the entire frontend

## Development

For development, you can run services individually:

`ash
# Start Proxy service
cd proxy-service
npm install
npm start

# Start UI service (in another terminal)
cd ui-service  
npm install
npm start
`

Make sure the Redis service is running externally on the expected ports (3001, 3003, 3004).

## Environment Variables

- **UI Service**: Configure PROXY_SERVICE_URL to point to proxy service
- **Proxy Service**: Configure REDIS_SERVICE_BASE_URL to point to Redis services

See individual service READMEs for detailed configuration options.
