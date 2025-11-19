@echo off
REM Build and run script for UI and Proxy Services Pod (Windows Batch)

echo 🔨 Building UI and Proxy Services Docker Pod...

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop.
    exit /b 1
)

echo 🏗️  Building Docker images...
docker-compose build --no-cache

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to build Docker images.
    exit /b 1
)

echo 🚀 Starting services with Docker Compose...
docker-compose up -d

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to start services.
    exit /b 1
)

echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo 🏥 Checking health status...
docker-compose ps

echo.
echo 📋 Service URLs:
echo    - UI Service: http://localhost:3000
echo    - Proxy Service: http://localhost:3002
echo    - UI Health Check: http://localhost:3000/health
echo    - Proxy Health Check: http://localhost:3002/health
echo    - Proxy Metrics: http://localhost:3002/metrics
echo.
echo 📊 Management Commands:
echo    To view logs: docker-compose logs -f
echo    To stop: docker-compose down
echo    To restart: docker-compose restart
echo    To rebuild: docker-compose up --build
echo.
echo ⚠️  Note: Make sure your Redis service is running externally!
echo    Default Redis service URL: http://localhost:3001
echo    Update REDIS_SERVICE_URL in docker-compose.yml if different
echo.

set /p openBrowser="Would you like to open the Recipe Management app in your browser? (y/N): "
if /i "%openBrowser%"=="y" (
    start http://localhost:3000
)

echo ✅ Services are now running!