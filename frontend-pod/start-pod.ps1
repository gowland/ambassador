# Build and run script for UI and Proxy Services Pod (Windows PowerShell)

Write-Host "🔨 Building UI and Proxy Services Docker Pod..." -ForegroundColor Yellow

# Check if Docker is running
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "🏗️  Building Docker images..." -ForegroundColor Cyan
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Docker images." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Starting services with Docker Compose..." -ForegroundColor Green
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services." -ForegroundColor Red
    exit 1
}

Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "🏥 Checking health status..." -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Green
Write-Host "   - UI Service: http://localhost:3000" -ForegroundColor White
Write-Host "   - Proxy Service: http://localhost:3002" -ForegroundColor White
Write-Host "   - UI Health Check: http://localhost:3000/health" -ForegroundColor Gray
Write-Host "   - Proxy Health Check: http://localhost:3002/health" -ForegroundColor Gray
Write-Host "   - Proxy Metrics: http://localhost:3002/metrics" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Management Commands:" -ForegroundColor Yellow
Write-Host "   To view logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   To stop: docker-compose down" -ForegroundColor White
Write-Host "   To restart: docker-compose restart" -ForegroundColor White
Write-Host "   To rebuild: docker-compose up --build" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: Make sure your Redis service is running externally!" -ForegroundColor Magenta
Write-Host "   Default Redis service URL: http://localhost:3001" -ForegroundColor Gray
Write-Host "   Update REDIS_SERVICE_URL in docker-compose.yml if different" -ForegroundColor Gray

# Optional: Open browser to UI service
$openBrowser = Read-Host "Would you like to open the Recipe Management app in your browser? (y/N)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "http://localhost:3000"
}

Write-Host "✅ Services are now running!" -ForegroundColor Green