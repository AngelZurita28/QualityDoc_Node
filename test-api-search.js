const readline = require('readline');

// Configuración de la interfaz para pedir datos por consola
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// URL base de tu nueva API local
const API_URL = 'http://localhost:3000/api/documents/search';

console.log("========================================");
console.log("🔍 TEST DE BÚSQUEDA INTELIGENTE");
console.log("========================================\n");

rl.question('Ingresa la frase que deseas buscar: ', async (query) => {
    // Validamos que no envíe un texto vacío
    if (!query.trim()) {
        console.log("❌ No ingresaste ninguna búsqueda.");
        rl.close();
        return;
    }

    // Codificamos la URI para que los espacios y caracteres especiales viajen bien (ej. ?q=hola%20mundo)
    const requestUrl = `${API_URL}?q=${encodeURIComponent(query)}`;
    console.log(`\nConsultando a la API...`);
    console.log(`URL: ${requestUrl}\n`);

    try {
        const response = await fetch(requestUrl);
        const result = await response.json(); // Tu API siempre devuelve JSON

        // ── Imprimir el JSON completo de la respuesta ──
        console.log("═══════════════════════════════════════");
        console.log("📦 RESPUESTA JSON COMPLETA:");
        console.log("═══════════════════════════════════════");
        console.log(JSON.stringify(result, null, 2));
        console.log("═══════════════════════════════════════\n");

        // Manejo de respuesta exitosa (200 OK)
        if (response.ok) {

            // Mostrar los searchTags extraídos por tu API
            if (result.searchTags && result.searchTags.length > 0) {
                console.log(`🏷️  Etiquetas de búsqueda extraídas: [ ${result.searchTags.join(', ')} ]`);
            }

            // Mensaje cuando la búsqueda no tiene palabras clave válidas (solo stop words)
            if (result.message) {
                console.log(`⚠️  Mensaje: ${result.message}`);
            }

            console.log("\n📄 Resultados:");
            console.log("────────────────────────────────────────");

            // Mostrar el listado ordenado
            if (result.data && result.data.length > 0) {
                result.data.forEach((doc, index) => {
                    console.log(`\n┌─── [Resultado #${index + 1}] ───`);
                    console.log(`│ ID:            ${doc.id}`);
                    console.log(`│ Título:        ${doc.title || '(sin título)'}`);
                    console.log(`│ Descripción:   ${doc.description || '(sin descripción)'}`);
                    console.log(`│ Relevancia:    ⭐ ${doc._matchCount} coincidencia(s)`);
                    console.log(`│ Ruta archivo:  ${doc.filePath || '(no disponible)'}`);
                    console.log(`│ Autor ID:      ${doc.authorId ?? '(no disponible)'}`);
                    console.log(`│ Empresa ID:    ${doc.companyId ?? '(no disponible)'}`);
                    console.log(`│ Estado ID:     ${doc.statusId ?? '(no disponible)'}`);
                    console.log(`│ Versión:       ${doc.versionNumber ?? '(no disponible)'}`);
                    console.log(`│ Es última:     ${doc.isLatest !== undefined ? (doc.isLatest ? 'Sí' : 'No') : '(no disponible)'}`);
                    console.log(`│ Sincronizado:  ${doc.syncedAt || '(no disponible)'}`);

                    // ── Metadata ──
                    if (doc.metadata) {
                        const meta = doc.metadata;
                        console.log(`│`);
                        console.log(`│ ── Metadata ──`);
                        console.log(`│   Categoría:     ${meta.category || '(no definida)'}`);
                        console.log(`│   Tamaño:        ${meta.fileSize || '(no disponible)'}`);
                        console.log(`│   MIME Type:     ${meta.mimeType || '(no disponible)'}`);
                        console.log(`│   Extensión:     ${meta.extension || '(no disponible)'}`);
                        console.log(`│   Checksum MD5:  ${meta.checksum || '(no disponible)'}`);
                        console.log(`│   SHA-256:       ${meta.sha256 ? meta.sha256.substring(0, 16) + '...' : '(no disponible)'}`);
                        console.log(`│   Creado disco:  ${meta.createdOnDisk || '(no disponible)'}`);
                        console.log(`│   Modif. disco:  ${meta.modifiedOnDisk || '(no disponible)'}`);

                        // ── Metadata específica (varía según categoría) ──
                        if (meta.specific && Object.keys(meta.specific).length > 0) {
                            console.log(`│`);
                            console.log(`│   ── Metadata Específica (${meta.category || 'unknown'}) ──`);

                            switch (meta.category) {
                                case 'document':
                                    console.log(`│     Autor original:  ${meta.specific.authorOriginal ?? '(no disponible)'}`);
                                    console.log(`│     Páginas:         ${meta.specific.pageCount ?? '(no disponible)'}`);
                                    console.log(`│     Tiene imágenes:  ${meta.specific.hasImages !== undefined ? (meta.specific.hasImages ? 'Sí' : 'No') : '(no disponible)'}`);
                                    console.log(`│     Idioma:          ${meta.specific.language ?? '(no disponible)'}`);
                                    break;

                                case 'image':
                                    console.log(`│     Dimensiones:  ${meta.specific.dimensions ?? '(no disponible)'}`);
                                    console.log(`│     Ancho:        ${meta.specific.width ?? '(no disponible)'}`);
                                    console.log(`│     Alto:         ${meta.specific.height ?? '(no disponible)'}`);
                                    console.log(`│     Color Space:  ${meta.specific.colorSpace ?? '(no disponible)'}`);
                                    if (meta.specific.exifData) {
                                        console.log(`│     EXIF Make:    ${meta.specific.exifData.make ?? '(no disponible)'}`);
                                        console.log(`│     EXIF Model:   ${meta.specific.exifData.model ?? '(no disponible)'}`);
                                        console.log(`│     Fecha toma:   ${meta.specific.exifData.dateTaken ?? '(no disponible)'}`);
                                        if (meta.specific.exifData.gps) {
                                            console.log(`│     GPS Lat:      ${meta.specific.exifData.gps.lat ?? '(no disponible)'}`);
                                            console.log(`│     GPS Lng:      ${meta.specific.exifData.gps.lng ?? '(no disponible)'}`);
                                        }
                                        if (meta.specific.exifData.orientation !== undefined) {
                                            console.log(`│     Orientación:  ${meta.specific.exifData.orientation}`);
                                        }
                                    }
                                    break;

                                case 'cad':
                                    console.log(`│     Software Ver.:  ${meta.specific.softwareVersion ?? '(no disponible)'}`);
                                    if (meta.specific.layers && meta.specific.layers.length > 0) {
                                        console.log(`│     Capas:          ${meta.specific.layers.join(', ')}`);
                                    }
                                    break;

                                default:
                                    // Categoría desconocida: mostrar todos los campos
                                    Object.entries(meta.specific).forEach(([key, value]) => {
                                        console.log(`│     ${key}: ${JSON.stringify(value)}`);
                                    });
                            }
                        }

                        // ── Tags del documento ──
                        if (meta.tags && meta.tags.length > 0) {
                            console.log(`│`);
                            console.log(`│   ── Tags (${meta.tags.length}) ──`);
                            console.log(`│     ${meta.tags.join(', ')}`);
                        }
                    }

                    console.log(`└────────────────────────────────────`);
                });

                console.log(`\n📊 Total: ${result.data.length} documento(s) encontrado(s)`);
            } else {
                console.log("\n  No se encontraron documentos que coincidan con tu búsqueda.");
            }

        } else {
            // Manejo de errores (400, 500)
            console.error(`❌ Error en la API (HTTP ${response.status})`);
            console.error(`Mensaje: ${result.message}`);
            if (result.error) console.error(`Detalle: ${result.error}`);
        }

    } catch (error) {
        console.error(`❌ Falló la conexión al servidor: ${error.message}`);
        console.error("Asegúrate de que el servidor Node esté corriendo en el puerto 3000.");
    } finally {
        rl.close(); // Cerramos la consola interactiva
    }
});