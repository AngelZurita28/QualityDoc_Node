# QualityDoc Node API

Este es el backend de procesamiento de documentos para QualityDoc, construido con Node.js y MongoDB.

## Instalación y Configuración

El proyecto utiliza Docker para facilitar el despliegue del entorno de desarrollo, incluyendo la base de datos MongoDB.

### Prerrequisitos
*   **Docker** y **Docker Compose** instalados.
*   **Git** para clonar el repositorio.

### Pasos Rápidos

#### En Windows (PowerShell):
1.  Abre una terminal en la raíz de este proyecto.
2.  Ejecuta el script de configuración:
    ```powershell
    .\setup.ps1
    ```

#### En Linux (Bash):
1.  Abre una terminal en la raíz de este proyecto.
2.  Dale permisos y ejecuta el script:
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

### ¿Qué hace el script?
1.  Crea un archivo `.env` con tus credenciales de MongoDB y tu Gemini API Key.
2.  Levanta un contenedor de **MongoDB** con persistencia de datos.
3.  Levanta el contenedor de la **API (Node.js)** en modo `network_mode: host`.
    *   Esto permite que la API sea accesible desde tu red local mediante tu dirección IP.
    *   La API se conecta a MongoDB a través de `localhost:27017`.
4.  Instala las dependencias necesarias mediante `pnpm` automáticamente dentro del contenedor.
5.  Inicia el servidor en modo desarrollo con auto-recarga.

### Uso Diario

*   **Encender:** `docker compose up -d`
*   **Apagar:** `docker compose down`

La API estará disponible en [http://localhost:3000](http://localhost:3000).
