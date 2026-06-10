# API de Sincronizacion de Documentos

Este documento describe como consumir la API para sincronizar documentos en QualityDoc Node.

## Endpoint

```http
POST http://localhost:3000/api/documents
Content-Type: application/json
```

La API recibe JSON puro. No recibe archivos binarios.

## Campos Obligatorios

```json
{
  "id": "GUID-O-ID-UNICO-DE-LA-VERSION",
  "documentCode": "CODIGO-UNICO-DEL-DOCUMENTO",
  "title": "Titulo del documento",
  "metadata": {
    "fileSize": "123KB",
    "mimeType": "application/pdf",
    "extension": ".pdf"
  }
}
```

### `id`

Identificador unico de la version que se esta sincronizando.

Si se envia un `id` que ya existe en MongoDB, la API responde `409 Conflict` y no duplica el documento.

### `documentCode`

Codigo estable del documento. Este campo agrupa todas las versiones del mismo documento.

Tambien se aceptan estos alias:

```text
DocumentCode
codigo
Codigo
code
Code
```

Cuando llega un documento nuevo con el mismo `documentCode`, la API marca todas las versiones anteriores como obsoletas y deja la nueva como la version vigente.

### `title`

Titulo del documento.

### `metadata`

Objeto con metadatos del archivo/documento. Como minimo debe incluir:

```json
{
  "fileSize": "123KB",
  "mimeType": "application/pdf",
  "extension": ".pdf"
}
```

## Texto Completo del Documento

Para que Gemini genere mejores etiquetas, envia el texto extraido del documento dentro de `metadata`.

Campo recomendado:

```json
{
  "metadata": {
    "fullText": "Texto completo extraido del documento..."
  }
}
```

Tambien se aceptan estos alias:

```text
metadata.content
metadata.textContent
metadata.extractedText
metadata.documentText
```

## Payload Recomendado

```json
{
  "id": "8A54766D-91C5-4AB2-A49A-143A977BFD5C",
  "documentCode": "MAN-CAL-001",
  "title": "Manual de Calidad",
  "description": "Manual del sistema de gestion de calidad",
  "filePath": "/uploads/manual-calidad.pdf",
  "authorId": 101,
  "statusId": 3,
  "companyId": 1,
  "parentId": null,
  "versionNumber": 2,
  "metadata": {
    "fileSize": "2.4MB",
    "mimeType": "application/pdf",
    "extension": ".pdf",
    "checksum": "md5-del-archivo",
    "sha256": "sha256-del-archivo",
    "createdOnDisk": "2026-06-10T10:00:00.000Z",
    "modifiedOnDisk": "2026-06-10T10:20:00.000Z",
    "category": "document",
    "fullText": "Texto completo extraido del documento...",
    "specific": {
      "authorOriginal": "Juan Perez",
      "pageCount": 12,
      "hasImages": true,
      "language": "es"
    },
    "tags": ["calidad", "manual"]
  }
}
```

## Categorias Soportadas

### Documento

```json
{
  "metadata": {
    "category": "document",
    "specific": {
      "authorOriginal": "Autor",
      "pageCount": 10,
      "hasImages": true,
      "language": "es"
    }
  }
}
```

### Imagen

```json
{
  "metadata": {
    "category": "image",
    "specific": {
      "dimensions": "1920x1080",
      "width": 1920,
      "height": 1080,
      "colorSpace": "srgb",
      "exifData": {
        "make": "Canon",
        "model": "EOS",
        "dateTaken": "2026-06-10T10:00:00.000Z",
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

### CAD

```json
{
  "metadata": {
    "category": "cad",
    "specific": {
      "softwareVersion": "AutoCAD 2018+",
      "layers": ["muros", "cotas", "electricidad"]
    }
  }
}
```

## Comportamiento de Sincronizacion

Al recibir un documento nuevo:

1. La API valida que `id`, `documentCode` y `title` existan.
2. Rechaza el documento si ya existe otro con el mismo `id`.
3. Limpia y normaliza metadatos.
4. Envia el JSON completo del documento a Gemini.
5. Gemini genera etiquetas.
6. La API completa hasta 30 etiquetas si Gemini devuelve menos despues de normalizar.
7. Marca como obsoletos todos los documentos anteriores con el mismo `documentCode`.
8. Inserta el documento nuevo como version vigente.

Los documentos anteriores quedan asi:

```json
{
  "isLatest": false,
  "lifecycleStatus": "obsolete",
  "obsoleteAt": "2026-06-10T10:30:00.000Z",
  "supersededById": "ID-DEL-DOCUMENTO-NUEVO"
}
```

El documento nuevo queda asi:

```json
{
  "isLatest": true,
  "lifecycleStatus": "active"
}
```

## Respuesta Exitosa

```json
{
  "status": "success",
  "message": "Documento sincronizado exitosamente.",
  "data": {
    "id": "8A54766D-91C5-4AB2-A49A-143A977BFD5C",
    "documentCode": "MAN-CAL-001",
    "category": "document",
    "obsoleteDocuments": 1,
    "tagsGenerated": 30,
    "metadata": {
      "fileSize": "2.4MB",
      "mimeType": "application/pdf",
      "extension": ".pdf",
      "category": "document",
      "specific": {},
      "tags": ["calidad", "manual", "gestion"]
    }
  },
  "processingTimeMs": 1500
}
```

## Errores Comunes

### Falta `id`

```json
{
  "status": "error",
  "message": "El campo \"id\" es obligatorio para sincronizar con MongoDB."
}
```

### Falta `documentCode`

```json
{
  "status": "error",
  "message": "El codigo de documento es obligatorio. Envia \"documentCode\", \"codigo\" o \"code\"."
}
```

### Falta `title`

```json
{
  "status": "error",
  "message": "El campo \"title\" es obligatorio."
}
```

### `id` duplicado

```json
{
  "status": "error",
  "message": "El documento con ID \"...\" ya existe en MongoDB. No se permite duplicar."
}
```

## Busqueda

```http
GET http://localhost:3000/api/documents/search?q=manual%20calidad
```

La busqueda solo devuelve documentos vigentes:

```json
{
  "isLatest": true
}
```

## Prueba Rapida

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "id": "DOC-V2-001",
    "documentCode": "DOC-001",
    "title": "Documento de prueba",
    "description": "Documento enviado desde prueba curl",
    "versionNumber": 2,
    "metadata": {
      "fileSize": "10KB",
      "mimeType": "text/plain",
      "extension": ".txt",
      "category": "document",
      "fullText": "Este es el texto completo del documento de prueba."
    }
  }'
```

Verificar busqueda:

```bash
curl "http://localhost:3000/api/documents/search?q=documento%20prueba"
```
