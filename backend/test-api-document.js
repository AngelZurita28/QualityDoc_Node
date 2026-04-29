const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// URL apuntando a tu servidor local
const API_URL = 'http://localhost:3000/api/documents';
const FILE_NAME = 'document.docx';

async function extractAndSync() {
    const filePath = path.join(__dirname, FILE_NAME);

    // 1. Verificamos que el archivo exista
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: No se encontró el archivo ${FILE_NAME}.`);
        return;
    }

    console.log(`Leyendo metadatos de ${FILE_NAME}...`);

    // 2. Extraer metadatos reales del archivo
    const stats = fs.statSync(filePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2) + 'MB';

    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    const checksum = hashSum.digest('hex');

    // 3. Simular payload de SQL (SIN keywords, el backend con Gemini las generará)
    const payload = {
        Id: crypto.randomUUID().toUpperCase(), // El ID es estrictamente obligatorio
        ParentId: null,
        VersionNumber: 1,
        IsLatest: true,
        Title: "DOCUMENTO DE ISO 27001",
        Description: "DOCUMENTO DE ISO 27001",
        FilePath: `/uploads/${FILE_NAME}`,
        AuthorId: 101,
        StatusId: 3,
        CompanyId: 1,
        CreatedAt: new Date().toISOString(),
        metadata: {
            fileSize: fileSizeKB,
            pages: Math.floor(Math.random() * 20) + 1,
            checksum: checksum
        }
    };

    console.log("\nPayload a enviar (Sin Keywords):");
    console.log(JSON.stringify(payload, null, 2));
    console.log("\n");

    try {
        console.log(`Enviando POST a ${API_URL}...`);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // 4. Manejo de la respuesta
        if (response.ok) {
            // El servidor Node procesó la solicitud y devolverá un 200 OK silencioso
            console.log(`✅ ¡Éxito! El servidor respondió con HTTP ${response.status}.`);
            console.log(`El documento ID: ${payload.Id} fue enviado y Gemini está generando las etiquetas.`);
        } else {
            // Manejo de errores
            const errorData = await response.text();
            console.error(`❌ Falló la sincronización. Código HTTP: ${response.status}`);
            try {
                console.error(JSON.parse(errorData));
            } catch {
                console.error("Respuesta cruda:", errorData);
            }
        }
    } catch (error) {
        console.error(`❌ Falló la conexión al servidor: ${error.message}`);
        console.error("Verifica que el servidor Node esté corriendo en el puerto 3000.");
    }
}

// Ejecutar script
extractAndSync();