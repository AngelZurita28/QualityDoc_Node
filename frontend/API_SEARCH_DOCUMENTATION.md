# Manual de Integración: API de Búsqueda de Documentos

Este documento describe cómo integrar y consumir el endpoint de búsqueda inteligente de documentos persistidos en Firebase (Firestore).

---

## Endpoint de Búsqueda Inteligente

- **URL:** `/api/documents/search`
- **Método HTTP:** `GET`
- **Content-Type esperado en respuesta:** `application/json`

### Descripción del Flujo
1. El servicio cliente envía una petición `GET` con una frase de búsqueda natural en el parámetro `q`.
2. La API procesa la frase:
   - Elimina signos de puntuación y la convierte a minúsculas.
   - Divide la frase en palabras individuales.
   - Elimina "Stop Words" (conectores, artículos y preposiciones comunes en español como "de", "la", "el", "con", etc.).
   - Utiliza las palabras restantes como **etiquetas (tags)** de búsqueda.
3. La API consulta a Firestore buscando cualquier documento que contenga **al menos una** de esas etiquetas en su campo `metadata.tags`.
4. Los resultados obtenidos son procesados en memoria para contar cuántas de las etiquetas buscadas coinciden con las del documento.
5. Se devuelve un arreglo ordenado de mayor a menor relevancia (los que tienen más coincidencias aparecen primero).

---

## Parámetros de Consulta (Query Parameters)

| Parámetro | Requerido | Tipo   | Descripción | Ejemplo |
| :--- | :---: | :--- | :--- | :--- |
| `q` | **Sí** | `string` | La frase, palabras clave o texto libre que se desea buscar. | `?q=Documento de informatica iso 27001` |

---

## Estructura de la Respuesta

La API devuelve un objeto JSON que indica el estado de la petición, las etiquetas que finalmente se usaron para la búsqueda en la base de datos (después de limpiar la frase), y el arreglo de documentos `data` ordenado por relevancia.

### 🟢 Ejemplo de Respuesta Exitosa (`200 OK`)

Petición: `GET /api/documents/search?q=Documento de informatica iso 27001`

```json
{
  "status": "success",
  "searchTags": [
    "documento",
    "informatica",
    "iso",
    "27001"
  ],
  "data": [
    {
      "id": "B7853A1B-E012-421D-8F98-4B80F7BE98E4",
      "Title": "Manual de Seguridad Informatica ISO 27001",
      "Description": "Políticas de seguridad de la información.",
      "metadata": {
        "tags": ["documento", "informatica", "iso", "27001", "seguridad"]
      },
      "_matchCount": 4
    },
    {
      "id": "C9993A1B-E012-421D-8F98-4B80F7BE9999",
      "Title": "Plantilla de Documento General",
      "Description": "Formato en blanco para creación de políticas.",
      "metadata": {
        "tags": ["documento", "plantilla", "general"]
      },
      "_matchCount": 1
    }
  ]
}
```

> [!TIP]
> **El campo `_matchCount`**: Este campo es inyectado por la API en cada objeto de `data`. Representa el número exacto de etiquetas que coincidieron entre la búsqueda y el documento. Puedes usar este número en el frontend para mostrar indicadores visuales de relevancia (ej. "Coincidencia Alta", "Coincidencia Baja").

### 🟡 Respuesta sin palabras clave válidas (`200 OK`)

Si la frase de búsqueda solo contiene conectores (ej. `?q=de la para el`), la API devolverá una lista vacía para evitar búsquedas masivas innecesarias.

```json
{
  "status": "success",
  "message": "La búsqueda no contiene palabras clave válidas.",
  "data": []
}
```

### 🔴 Error por falta del parámetro `q` (`400 Bad Request`)

```json
{
  "status": "error",
  "message": "Se requiere el parámetro de búsqueda \"q\"."
}
```

### 🔴 Error interno de Firebase / Red (`500 Internal Server Error`)

```json
{
  "status": "error",
  "message": "Error al realizar la búsqueda en Firestore",
  "error": "Detalle técnico del error..."
}
```
