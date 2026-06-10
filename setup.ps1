# =================================================================
# Script de Configuracion Inicial - QualityDoc Node (Windows)
# =================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracion de QualityDoc Node (API)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Verificar Docker
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "ERROR: Docker no esta ejecutandose." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    exit 1
}

# 2. Pedir credenciales para MongoDB
Write-Host "`nConfiguracion de MongoDB:" -ForegroundColor Green
$mongoUser = Read-Host "Ingresa el USUARIO para MongoDB (Enter para 'admin')"
if ([string]::IsNullOrWhiteSpace($mongoUser)) { $mongoUser = "admin" }

$isValidPassword = $false
while (-not $isValidPassword) {
    Write-Host "`nIngresa una contrasena para MongoDB (minimo 6 caracteres):" -ForegroundColor Yellow
    $mongoPassword = Read-Host -AsSecureString "Contrasena"
    $mongoPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($mongoPassword))
    
    if ($mongoPasswordPlain.Length -ge 6) {
        $isValidPassword = $true
    } else {
        Write-Host "ERROR: Contrasena demasiado corta." -ForegroundColor Red
    }
}

$geminiKey = Read-Host "`nIngresa tu GEMINI_API_KEY (opcional, Enter para omitir)"

# 3. Guardar en .env
Write-Host "`nGenerando archivo .env..."
Set-Content -Path ".env" -Value "MONGO_USER=$mongoUser" -Encoding ascii
Add-Content -Path ".env" -Value "MONGO_PASS=$mongoPasswordPlain" -Encoding ascii
Add-Content -Path ".env" -Value "GEMINI_API_KEY=$geminiKey" -Encoding ascii
Add-Content -Path ".env" -Value "GEMINI_MODEL=gemini-3.1-flash-lite" -Encoding ascii
Add-Content -Path ".env" -Value "PORT=3000" -Encoding ascii
Add-Content -Path ".env" -Value "JSON_BODY_LIMIT=15mb" -Encoding ascii
Add-Content -Path ".env" -Value "MONGO_DB=QualityDocDB" -Encoding ascii

# 4. Limpiar e Iniciar Docker
Write-Host "`nLimpiando contenedores anteriores..." -ForegroundColor Cyan
docker compose down -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudieron detener los contenedores anteriores." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    exit 1
}

Write-Host "Levantando entorno de Node y MongoDB..." -ForegroundColor Cyan
docker compose up -d --build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Compose no pudo levantar el entorno." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    exit 1
}

# 5. Verificar API
Write-Host "`nVerificando API en http://localhost:3000..." -ForegroundColor Cyan
$apiReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/saludo" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            $apiReady = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $apiReady) {
    Write-Host "ERROR: La API no respondio en http://localhost:3000." -ForegroundColor Red
    Write-Host "Ultimos logs de node_backend:" -ForegroundColor Yellow
    docker compose logs --tail=80 node_backend
    Read-Host "Presiona Enter para salir..."
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ¡Entorno configurado con exito!" -ForegroundColor Green
Write-Host "  API disponible en: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Prueba: curl http://localhost:3000/api/saludo" -ForegroundColor Cyan
Write-Host "  MongoDB en el puerto: 27017" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green

Read-Host "Presiona Enter para salir..."
