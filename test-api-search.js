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
    console.log(`\nConsultando a la API...\n`);

    try {
        const response = await fetch(requestUrl);
        const result = await response.json(); // Tu API siempre devuelve JSON

        // Manejo de respuesta exitosa (200 OK)
        if (response.ok) {

            // Mostrar los searchTags extraídos por tu API
            if (result.searchTags && result.searchTags.length > 0) {
                console.log(`🏷️  Etiquetas de búsqueda extraídas: [ ${result.searchTags.join(', ')} ]`);
            } else if (result.message) {
                // Caso en el que solo se mandaron "Stop Words"
                console.log(`⚠️  Mensaje: ${result.message}`);
            }

            console.log("\n📄 Resultados:");
            console.log("----------------------------------------");

            // Mostrar el listado ordenado
            if (result.data && result.data.length > 0) {
                result.data.forEach((doc, index) => {
                    console.log(`\n[Resultado #${index + 1}]`);
                    console.log(`Título:       ${doc.Title}`);
                    console.log(`Descripción:  ${doc.Description}`);
                    console.log(`Relevancia:   ⭐ ${doc._matchCount} coincidencias`);
                });
                console.log("\n----------------------------------------");
            } else {
                console.log("\nNo se encontraron documentos que coincidan con tu búsqueda.");
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