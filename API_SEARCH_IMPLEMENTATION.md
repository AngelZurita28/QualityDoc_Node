# API Search Implementation

Este documento describe las APIs para buscar documentos y obtener el detalle completo de un documento sincronizado.

## 1. Buscar documentos para vista de lista

Usa este endpoint para pantallas de listado, buscadores o resultados rápidos.

```http
GET http://localhost:3000/api/documents/search?q=manual%20calidad
```

### Parámetros

- `q`: frase de búsqueda. Es obligatorio.

La API limpia la frase, remueve acentos y conectores comunes, y busca coincidencias contra `metadata.tags`.

### Respuesta

La búsqueda solo devuelve documentos vigentes (`isLatest: true`) y un JSON resumido. No incluye texto completo ni metadata pesada.

```json
{
  "status": "success",
  "data": [
    {
      "id": "DOC-V2-001",
      "documentCode": "DOC-001",
      "title": "Manual de calidad",
      "description": "Documento de prueba",
      "filePath": "/docs/manual-calidad.pdf",
      "authorId": "USER-001",
      "statusId": "ACTIVE",
      "companyId": "COMPANY-001",
      "parentId": null,
      "versionNumber": 2,
      "isLatest": true,
      "lifecycleStatus": "active",
      "syncedAt": "2026-06-10T12:00:00.000Z",
      "metadata": {
        "category": "document",
        "mimeType": "application/pdf",
        "extension": ".pdf",
        "fileSize": "120KB",
        "tags": ["manual", "calidad", "proceso"]
      },
      "_matchCount": 2
    }
  ],
  "searchTags": ["manual", "calidad"]
}
```

### Campos importantes para la lista

- `id`: úsalo para abrir el detalle del documento.
- `title` y `description`: texto principal visible.
- `documentCode` y `versionNumber`: identificación funcional.
- `metadata.category`, `mimeType`, `extension`, `fileSize`: datos generales del archivo.
- `_matchCount`: cantidad de etiquetas coincidentes; sirve para mostrar relevancia.

### Sin resultados

```json
{
  "status": "success",
  "data": [],
  "searchTags": ["manual", "calidad"]
}
```

## 2. Buscar profundamente en todos los campos

Usa este endpoint cuando necesites buscar dentro de cualquier campo guardado en MongoDB, incluyendo `metadata.fullText`, `metadata.specific`, IDs, rutas, fechas, tags y campos anidados.

```http
GET http://localhost:3000/api/documents/deepsearch?q=iso%2027001
```

### Diferencia contra `/search`

- `/search`: busca solo contra `metadata.tags`; es más rápido y recomendado para uso normal.
- `/deepsearch`: revisa el JSON completo de cada documento vigente; encuentra coincidencias aunque Gemini no haya generado ese tag.

### Respuesta

Devuelve el mismo formato resumido de lista, pero agrega `_matchedFields` para indicar dónde encontró coincidencias. No devuelve `metadata.fullText`; para eso usa el endpoint de detalle.

```json
{
  "status": "success",
  "data": [
    {
      "id": "DOC-V2-001",
      "documentCode": "DOC-001",
      "title": "Manual de calidad",
      "description": "Documento de prueba",
      "versionNumber": 2,
      "isLatest": true,
      "lifecycleStatus": "active",
      "metadata": {
        "category": "document",
        "mimeType": "application/pdf",
        "extension": ".pdf",
        "fileSize": "120KB",
        "tags": ["manual", "calidad", "iso27001"]
      },
      "_matchCount": 2,
      "_matchedFields": ["metadata.fullText", "metadata.specific.language"]
    }
  ],
  "searchTags": ["iso", "27001"],
  "searchMode": "deep"
}
```

### Nota de rendimiento

`deepsearch` carga documentos vigentes y evalúa sus campos en Node.js. Es útil para búsquedas exhaustivas, pero no debe reemplazar a `/search` en listados frecuentes si la colección crece mucho.

## 3. Obtener detalle completo de documento

Usa este endpoint al abrir una pantalla de detalle, modal completo o vista técnica.

```http
GET http://localhost:3000/api/documents/DOC-V2-001
```

El valor final de la URL es el `id` recibido en la búsqueda.

### Respuesta

Devuelve el JSON completo guardado en MongoDB.

```json
{
  "status": "success",
  "data": {
    "_id": "675...",
    "id": "DOC-V2-001",
    "documentCode": "DOC-001",
    "title": "Manual de calidad",
    "description": "Documento de prueba",
    "filePath": "/docs/manual-calidad.pdf",
    "authorId": "USER-001",
    "statusId": "ACTIVE",
    "companyId": "COMPANY-001",
    "parentId": null,
    "versionNumber": 2,
    "isLatest": true,
    "lifecycleStatus": "active",
    "metadata": {
      "fileSize": "120KB",
      "mimeType": "application/pdf",
      "extension": ".pdf",
      "fullText": "Texto completo extraido del PDF...",
      "category": "document",
      "specific": {
        "pageCount": 12,
        "hasImages": true,
        "language": "es"
      },
      "tags": ["manual", "calidad", "proceso"]
    },
    "syncedAt": "2026-06-10T12:00:00.000Z"
  }
}
```

## Errores comunes

### Búsqueda sin `q`

```json
{
  "status": "error",
  "message": "Se requiere el parámetro de búsqueda \"q\"."
}
```

### Documento no encontrado

```json
{
  "status": "error",
  "message": "No se encontró el documento con ID \"DOC-V2-001\"."
}
```

## Ejemplos con curl

Buscar documentos:

```bash
curl "http://localhost:3000/api/documents/search?q=manual%20calidad"
```

Buscar profundamente:

```bash
curl "http://localhost:3000/api/documents/deepsearch?q=iso%2027001"
```

Obtener detalle completo:

```bash
curl "http://localhost:3000/api/documents/DOC-V2-001"
```

## Recomendación de uso en frontend

1. Usa `/api/documents/search?q=...` para llenar tablas, cards o listas frecuentes.
2. Usa `/api/documents/deepsearch?q=...` para búsqueda avanzada o cuando el usuario pida buscar en contenido completo.
3. Guarda el `id` de cada resultado.
4. Cuando el usuario abra un documento, llama `/api/documents/{id}`.
5. Renderiza `metadata.fullText` y `metadata.specific` solo en la vista de detalle.
