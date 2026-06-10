# QualityDoc Node API

Este es el backend de procesamiento de documentos para QualityDoc, construido con Node.js y MongoDB.

## Instalación y Configuración

El proyecto utiliza Docker para facilitar el despliegue del entorno de desarrollo, incluyendo la base de datos MongoDB.

### Prerrequisitos
*   **Docker** y **Docker Compose** instalados.
*   **Git** para clonar el repositorio.
*   Puerto **3000** disponible para la API.
*   Puerto **27017** disponible para MongoDB.

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
1.  Crea un archivo `.env` con la configuración completa del entorno:
    ```env
    MONGO_USER=...
    MONGO_PASS=...
    GEMINI_API_KEY=...
    GEMINI_MODEL=gemini-2.5-flash-lite
    PORT=3000
    JSON_BODY_LIMIT=15mb
    MONGO_DB=QualityDocDB
    ```
2.  Levanta un contenedor de **MongoDB** con persistencia de datos.
3.  Levanta el contenedor de la **API (Node.js)** y publica el puerto `3000`.
    *   La API queda accesible desde el host en `http://localhost:3000`.
    *   Dentro de Docker, la API se conecta a MongoDB usando el host de servicio `mongodb:27017`.
    *   El backend construye internamente la URI de MongoDB usando `MONGO_USER`, `MONGO_PASS`, `MONGO_DB`, `MONGO_HOST` y `MONGO_PORT`.
4.  Instala las dependencias necesarias mediante `pnpm` automáticamente dentro del contenedor.
5.  Inicia el servidor en modo desarrollo con auto-recarga.
6.  Verifica que la API responda en `http://localhost:3000/api/saludo`.

### Uso Diario

*   **Encender:** `docker compose up -d`
*   **Apagar:** `docker compose down`
*   **Ver logs de la API:** `docker compose logs -f node_backend`
*   **Ver estado:** `docker compose ps`

La API estará disponible en [http://localhost:3000](http://localhost:3000).

### Sincronización de Documentos

El endpoint principal es:

```text
POST /api/documents
```

Cada documento enviado debe incluir:

```json
{
  "id": "GUID-O-ID-UNICO-DE-LA-VERSION",
  "documentCode": "CODIGO-UNICO-DEL-DOCUMENTO",
  "title": "Titulo del documento",
  "description": "Descripcion",
  "metadata": {
    "category": "document",
    "fullText": "Texto completo extraido del documento"
  }
}
```

El campo `documentCode` es obligatorio. Tambien se aceptan los alias `DocumentCode`, `codigo`, `Codigo`, `code` o `Code`.

Cuando llega un documento nuevo:

1.  La API busca documentos existentes con el mismo `documentCode`.
2.  Todos esos documentos anteriores se marcan como obsoletos:
    ```json
    {
      "isLatest": false,
      "lifecycleStatus": "obsolete",
      "obsoleteAt": "...",
      "supersededById": "ID-DEL-DOCUMENTO-NUEVO"
    }
    ```
3.  El documento recien recibido se guarda como:
    ```json
    {
      "isLatest": true,
      "lifecycleStatus": "active"
    }
    ```

La búsqueda en `GET /api/documents/search` solo devuelve documentos con `isLatest: true`.

### Verificación

Después de ejecutar el setup, prueba:

```bash
curl http://localhost:3000/api/saludo
curl http://localhost:3000/api/test-db
curl "http://localhost:3000/api/documents/search?q=hola%20mundo"
```

La búsqueda de `hola mundo` debe responder al menos con:

```json
{"status":"success","data":[],"searchTags":["hola","mundo"]}
```

### Integración con otra app

Si una app Vite usa proxy hacia este backend, configura el target a:

```text
http://localhost:3000
```

Un error `502 Bad Gateway` desde Vite normalmente significa que el contenedor `node_backend` no está corriendo o no está escuchando en el puerto `3000`. Revisa:

```bash
docker compose ps
docker compose logs -f node_backend
curl http://localhost:3000/api/saludo
```

### Nota Importante

Los scripts `setup.sh` y `setup.ps1` ejecutan `docker compose down -v` antes de levantar el entorno. Eso elimina el volumen de MongoDB y borra los datos locales existentes. Para uso diario, usa `docker compose up -d` y `docker compose down`.
