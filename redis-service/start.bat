@echo off
REM Build and run script for Redis Service (Windows)

echo 🔨 Building Redis Service Docker image...
docker build -t redis-service .

echo 🚀 Starting services with Docker Compose...
docker-compose up -d

echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak >nul

echo 🏥 Checking health status...
docker-compose ps

echo.
echo 📋 Service URLs:
echo   - Redis Service: http://localhost:3001
echo   - Health Check: http://localhost:3001/health
echo.
echo 📊 To view logs: docker-compose logs -f
echo 🛑 To stop: docker-compose down