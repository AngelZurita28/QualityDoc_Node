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
Add-Content -Path ".env" -Value "PORT=3000" -Encoding ascii

# 4. Limpiar e Iniciar Docker
Write-Host "`nLimpiando contenedores anteriores..." -ForegroundColor Cyan
docker compose down -v
Write-Host "Levantando entorno de Node y MongoDB..." -ForegroundColor Cyan
docker compose up -d --build

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ¡Entorno configurado con exito!" -ForegroundColor Green
Write-Host "  API disponible en: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  MongoDB en el puerto: 27017" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green

Read-Host "Presiona Enter para salir..."
