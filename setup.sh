#!/bin/bash

# =================================================================
# Script de Configuracion Inicial - QualityDoc Node (Linux)
# =================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Configuracion de QualityDoc Node (API) ${NC}"
echo -e "${CYAN}========================================${NC}"

# 1. Verificar Docker
DOCKER_CMD="docker"
if ! docker info > /dev/null 2>&1; then
    if sudo docker info > /dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
    else
        echo -e "${RED}ERROR: Docker no esta ejecutandose.${NC}"
        exit 1
    fi
fi

if $DOCKER_CMD compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="$DOCKER_CMD compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

# 2. Pedir credenciales
echo -e "\n${GREEN}Configuracion de MongoDB:${NC}"
read -p "Ingresa el USUARIO para MongoDB (Enter para 'admin'): " mongoUser
if [ -z "$mongoUser" ]; then mongoUser="admin"; fi

isValidPassword=false
while [ "$isValidPassword" = false ]; do
    echo -e "${YELLOW}Ingresa una contrasena para MongoDB (minimo 6 caracteres):${NC}"
    read -p "Contrasena: " mongoPasswordPlain
    if [ ${#mongoPasswordPlain} -ge 6 ]; then
        isValidPassword=true
    else
        echo -e "${RED}ERROR: Demasiado corta.${NC}"
    fi
done

read -p "Ingresa tu GEMINI_API_KEY (opcional): " geminiKey

# 3. Guardar en .env
echo -e "\nGenerando archivo .env..."
cat <<EOF > .env
MONGO_USER=$mongoUser
MONGO_PASS=$mongoPasswordPlain
GEMINI_API_KEY=$geminiKey
PORT=3000
EOF

# 4. Limpiar e Iniciar Docker
echo -e "\n${CYAN}Limpiando y levantando contenedores...${NC}"
$DOCKER_COMPOSE_CMD down -v
$DOCKER_COMPOSE_CMD up -d --build

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  ¡Entorno configurado con exito!       ${NC}"
echo -e "${CYAN}  API en: http://localhost:3000        ${NC}"
echo -e "${GREEN}========================================${NC}"
