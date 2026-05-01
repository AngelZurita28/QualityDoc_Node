# Manual de Integración: API de Sincronización con Firebase

Este documento describe cómo integrar la aplicación principal (origen de datos SQL Server / .NET) con el microservicio Node.js encargado de persistir los documentos y sus metadatos en Firebase (Firestore).

> **Versión:** 2.0 — Abril 2026
> Incluye soporte para metadatos específicos por tipo de archivo (documentos, imágenes, planos CAD).

---

## Endpoint de Sincronización

- **URL:** `/api/documents`
- **Método HTTP:** `POST`
- **Content-Type:** `application/json`
- **Timeout del servidor:** 15 segundos para Firestore, 20 segundos para Gemini IA

### Descripción del Flujo
1. La aplicación .NET detecta que un documento fue creado o modificado.
2. Extrae los datos del registro desde la tabla `Documents`, lee el archivo físico del disco y extrae sus metadatos.
3. Envía una petición `POST` a este endpoint con todos los datos en formato JSON.
4. La API de Node.js recibe el JSON, valida los campos, genera etiquetas con IA (Gemini), y guarda todo en Firestore usando el `Id` como clave primaria.
5. La API responde con `200 OK` y un JSON detallado con los metadatos procesados y las etiquetas generadas.
6. La aplicación .NET, al recibir el `200`, procede a ejecutar: `UPDATE Documents SET SyncFirebase = 1 WHERE Id = '...'`

---

## Campos Obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `Id` | `string` (GUID) | Identificador único del documento. Se usa como clave en Firestore. |
| `Title` | `string` | Título del documento. También se usa para generar etiquetas con IA. |

> **⚠️ IMPORTANTE:** Ambos campos son obligatorios. Si falta alguno, la API responde `400 Bad Request`.

---

## Estructura del Payload (Request Body)

El body es un JSON con las columnas de la tabla SQL + un objeto `metadata` con los metadatos del archivo.

### Ejemplo Mínimo (Solo campos obligatorios):

```json
{
  "Id": "B7853A1B-E012-421D-8F98-4B80F7BE98E4",
  "Title": "Manual de Procesos Operativos"
}
```

### Ejemplo Completo — Documento (PDF / Word / Excel):

```json
{
  "Id": "B7853A1B-E012-421D-8F98-4B80F7BE98E4",
  "ParentId": null,
  "VersionNumber": 1,
  "IsLatest": true,
  "Title": "Manual de Procesos Operativos",
  "Description": "Documento con el flujo estándar de operaciones en la planta.",
  "FilePath": "/uploads/manual_procesos_v1.pdf",
  "AuthorId": 12,
  "StatusId": 3,
  "CompanyId": 1,
  "CreatedAt": "2024-04-28T10:00:00Z",
  "metadata": {
    "fileSize": "1.5MB",
    "mimeType": "application/pdf",
    "extension": ".pdf",
    "checksum": "8d969eef6ecad3c29a3a629280e686cf",
    "sha256": "a1b2c3d4e5f6...",
    "createdOnDisk": "2024-04-28T10:00:00Z",
    "modifiedOnDisk": "2024-04-28T10:00:00Z",
    "category": "document",
    "specific": {
      "authorOriginal": "Juan Pérez",
      "pageCount": 24,
      "hasImages": true,
      "language": "es"
    }
  }
}
```

### Ejemplo Completo — Imagen (Foto de planta / auditoría):

```json
{
  "Id": "C9127F3A-BB01-4E5C-9A23-1D4F8E6B2C7A",
  "Title": "Foto de auditoría Línea 3",
  "Description": "Fotografía tomada durante la auditoría de calidad en la línea de producción 3.",
  "FilePath": "/uploads/auditoria_linea3.jpg",
  "AuthorId": 5,
  "StatusId": 3,
  "CompanyId": 1,
  "metadata": {
    "fileSize": "4.2MB",
    "mimeType": "image/jpeg",
    "extension": ".jpg",
    "checksum": "abc123def456",
    "sha256": "f1e2d3c4b5a6...",
    "createdOnDisk": "2024-04-28T14:30:00Z",
    "modifiedOnDisk": "2024-04-28T14:30:00Z",
    "category": "image",
    "specific": {
      "dimensions": "1920x1080",
      "width": 1920,
      "height": 1080,
      "colorSpace": "srgb",
      "exifData": {
        "make": "Samsung",
        "model": "Galaxy S23",
        "dateTaken": "2024-04-28T14:28:00Z",
        "gps": {
          "lat": 25.6866,
          "lng": -100.3161
        },
        "orientation": 1
      }
    }
  }
}
```

### Ejemplo Completo — Plano CAD (AutoCAD .dwg / .dxf):

```json
{
  "Id": "D4E5F6A7-1234-5678-9ABC-DEF012345678",
  "Title": "Plano de distribución Planta Norte",
  "Description": "Layout actualizado de la distribución de maquinaria en planta norte.",
  "FilePath": "/uploads/planta_norte_v3.dxf",
  "AuthorId": 8,
  "StatusId": 3,
  "CompanyId": 1,
  "metadata": {
    "fileSize": "12.4MB",
    "mimeType": "application/dxf",
    "extension": ".dxf",
    "checksum": "def789abc012",
    "sha256": "9a8b7c6d5e4f...",
    "createdOnDisk": "2024-04-25T09:00:00Z",
    "modifiedOnDisk": "2024-04-27T16:45:00Z",
    "category": "cad",
    "specific": {
      "softwareVersion": "AutoCAD 2018+",
      "layers": ["MUROS", "ELECTRICIDAD", "PLOMERIA", "MAQUINARIA", "COTAS"]
    }
  }
}
```

---

## Referencia Completa de Campos

### Campos de nivel raíz (tabla Documents de SQL)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `Id` | `string` | ✅ **Sí** | GUID del documento. Clave primaria en Firestore. |
| `Title` | `string` | ✅ **Sí** | Título. Se usa para generar etiquetas IA. |
| `Description` | `string` | No | Descripción. También alimenta la generación de etiquetas. |
| `ParentId` | `string\|null` | No | GUID del documento padre (para versionado). |
| `VersionNumber` | `number` | No | Número de versión. Default: `1`. |
| `IsLatest` | `boolean` | No | ¿Es la versión vigente? Default: `true`. |
| `FilePath` | `string` | No | Ruta al archivo en el servidor. |
| `AuthorId` | `number` | No | ID del usuario autor. |
| `StatusId` | `number` | No | ID del estado (1=Borrador, 2=Revisión, 3=Aprobado, 4=Obsoleto). |
| `CompanyId` | `number` | No | ID de la empresa. |
| `CreatedAt` | `string` | No | Fecha ISO del registro en SQL. |

> **Nota:** La API acepta tanto `Id` como `id`, `Title` como `title`, etc. (case-insensitive en la primera letra).

### Metadatos Nivel 1 — Universales (`metadata.*`)

Estos campos aplican a **todo tipo de archivo**. Se recomienda enviarlos siempre que sea posible.

| Campo | Tipo | Descripción |
|---|---|---|
| `fileSize` | `string` | Peso formateado (ej. `"1.5MB"`, `"320KB"`). |
| `mimeType` | `string` | Tipo MIME real (ej. `"application/pdf"`, `"image/jpeg"`). |
| `extension` | `string` | Extensión del archivo (ej. `".pdf"`, `".docx"`). Se normaliza a minúsculas con punto. |
| `checksum` | `string` | Hash MD5 del archivo. Para verificar integridad. |
| `sha256` | `string` | Hash SHA-256 del archivo. Para ISO 9001 / auditoría. |
| `createdOnDisk` | `string` | Fecha ISO de creación del archivo en disco. |
| `modifiedOnDisk` | `string` | Fecha ISO de última modificación en disco. |
| `category` | `string` | Categoría: `"document"`, `"image"`, `"cad"`, u `"other"`. |
| `tags` | `string[]` | Tags manuales previos (opcionales). Se fusionarán con los generados por IA. |

### Metadatos Nivel 2 — Específicos (`metadata.specific.*`)

La API valida estos campos según el valor de `metadata.category`:

#### Cuando `category = "document"` (PDF, Word, Excel)

| Campo | Tipo | Descripción |
|---|---|---|
| `authorOriginal` | `string\|null` | Autor registrado en las propiedades del archivo. |
| `pageCount` | `number\|null` | Número de páginas. |
| `hasImages` | `boolean` | Si el documento contiene imágenes embebidas. |
| `language` | `string\|null` | Idioma detectado del contenido (ej. `"es"`, `"en"`). |

#### Cuando `category = "image"` (JPG, PNG, TIFF, etc.)

| Campo | Tipo | Descripción |
|---|---|---|
| `dimensions` | `string\|null` | Ancho x Alto (ej. `"1920x1080"`). |
| `width` | `number\|null` | Ancho en píxeles. |
| `height` | `number\|null` | Alto en píxeles. |
| `colorSpace` | `string\|null` | Espacio de color (ej. `"srgb"`, `"cmyk"`). |
| `exifData` | `object\|null` | Datos EXIF (ver sub-campos abajo). |

**Sub-campos de `exifData`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `make` | `string\|null` | Fabricante del dispositivo (ej. `"Samsung"`). |
| `model` | `string\|null` | Modelo del dispositivo (ej. `"Galaxy S23"`). |
| `dateTaken` | `string\|null` | Fecha ISO real de la toma fotográfica. |
| `gps` | `object\|null` | `{ lat: number, lng: number }` — Coordenadas GPS. |
| `orientation` | `number\|null` | Orientación EXIF (1-8). |

#### Cuando `category = "cad"` (AutoCAD .dwg / .dxf)

| Campo | Tipo | Descripción |
|---|---|---|
| `softwareVersion` | `string\|null` | Versión de AutoCAD (ej. `"AutoCAD 2018+"`). |
| `layers` | `string[]` | Lista de nombres de capas del plano. |

---

## Respuestas de la API

### 🟢 Éxito — `200 OK`

```json
{
  "status": "success",
  "message": "Documento sincronizado exitosamente.",
  "data": {
    "id": "B7853A1B-E012-421D-8F98-4B80F7BE98E4",
    "category": "document",
    "tagsGenerated": 25,
    "warnings": ["metadata.mimeType no proporcionado"],
    "metadata": {
      "fileSize": "1.5MB",
      "mimeType": "application/pdf",
      "extension": ".pdf",
      "checksum": "8d969eef...",
      "category": "document",
      "specific": { "pageCount": 24, "authorOriginal": "Juan Pérez" },
      "tags": ["manual", "procesos", "operacion", "planta", "calidad", "..."]
    }
  },
  "processingTimeMs": 2103
}
```

- `tagsGenerated`: Cantidad total de etiquetas (manuales + IA).
- `warnings`: Array de advertencias si faltaron campos recomendados (NO es error, solo informativo).
- `processingTimeMs`: Tiempo de procesamiento del servidor en milisegundos.

**Acción para .NET:** Si `status == "success"` → `UPDATE Documents SET SyncFirebase = 1 WHERE Id = '...'`

### 🔴 Error `400` — Campos obligatorios faltantes

```json
{
  "status": "error",
  "message": "El campo \"id\" es obligatorio para sincronizar con Firestore."
}
```

```json
{
  "status": "error",
  "message": "El campo \"title\" es obligatorio."
}
```

```json
{
  "status": "error",
  "message": "El body está vacío. Se espera un JSON con los datos del documento."
}
```

### 🔴 Error `500` — Error interno (Firebase / IA / Red)

```json
{
  "status": "error",
  "message": "Error al procesar el documento.",
  "error": "Timeout: Firestore write excedió 15000ms",
  "processingTimeMs": 15023
}
```

**Acción para .NET:** Guardar en `LastErrorLog` y reintentar más tarde.

---

## Notas para el Desarrollador .NET

### Compatibilidad con versiones anteriores

La API mantiene compatibilidad con payloads simples. Un JSON con solo `Id` y `Title` funciona perfectamente. Los metadatos en `metadata` y `metadata.specific` son **opcionales** — la API simplemente no los valida si no están presentes.

### Generación automática de etiquetas

La API usa **Google Gemini** para generar etiquetas de búsqueda automáticamente a partir del `Title` y `Description`. Si Gemini falla o no está disponible, el documento se guarda de todas formas sin tags IA (sin error).

### Recomendaciones de implementación en C#

```csharp
// Ejemplo de payload para un PDF
var payload = new {
    Id = document.Id.ToString().ToUpper(),
    Title = document.Title,
    Description = document.Description,
    FilePath = document.FilePath,
    AuthorId = document.AuthorId,
    StatusId = document.StatusId,
    CompanyId = document.CompanyId,
    metadata = new {
        fileSize = FormatFileSize(fileInfo.Length),
        mimeType = MimeMapping.GetMimeType(filePath),
        extension = Path.GetExtension(filePath).ToLower(),
        checksum = ComputeMD5(filePath),
        sha256 = ComputeSHA256(filePath),
        createdOnDisk = fileInfo.CreationTimeUtc.ToString("o"),
        modifiedOnDisk = fileInfo.LastWriteTimeUtc.ToString("o"),
        category = DetectCategory(filePath),  // "document", "image", "cad"
        specific = ExtractSpecificMetadata(filePath, category)
    }
};

var json = JsonSerializer.Serialize(payload);
var content = new StringContent(json, Encoding.UTF8, "application/json");
var response = await httpClient.PostAsync("http://localhost:3000/api/documents", content);

if (response.IsSuccessStatusCode) {
    // Marcar como sincronizado
    await db.ExecuteAsync("UPDATE Documents SET SyncFirebase = 1 WHERE Id = @Id", new { Id = document.Id });
}
```

### Timeouts recomendados para HttpClient

```csharp
httpClient.Timeout = TimeSpan.FromSeconds(30); // La API tiene timeout interno de 15s
```

---

## Endpoint de Búsqueda

- **URL:** `/api/documents/search?q=texto de búsqueda`
- **Método HTTP:** `GET`
- **Documentación completa:** Ver `API_SEARCH_DOCUMENTATION.md`
