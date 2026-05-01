/**
 * ═══════════════════════════════════════════════════════════════
 *  TEST-API-DOCUMENT.JS
 *  Lee un archivo real, extrae sus metadatos, arma un JSON
 *  y lo envía a la API (POST /api/documents) para probar.
 * ═══════════════════════════════════════════════════════════════
 *
 *  USO:   bun test-api-document.js
 *
 *  CONFIGURACIÓN: Edita las variables en la sección de abajo ↓
 */

const fs = require('fs');
const crypto = require('crypto');
const pathModule = require('path');

// ╔═══════════════════════════════════════╗
// ║      EDITAR AQUÍ PARA PROBAR         ║
// ╚═══════════════════════════════════════╝

const API_URL     = 'http://localhost:3000/api/documents';
const FILE_PATH   = pathModule.join(__dirname, 'document.docx'); // ← Cambia la ruta al archivo que quieras probar
const DOCUMENT_ID = crypto.randomUUID().toUpperCase();           // ← O pon un ID fijo: 'MI-DOC-001'
const DOC_TITLE       = 'Documento de prueba ISO 27001';
const DOC_DESCRIPTION = 'Manual de seguridad de la información para la planta industrial';

// ═══════════════════════════════════════════════════════════════

// Mapa de extensiones a MIME types
const MIME_MAP = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.tiff': 'image/tiff', '.tif': 'image/tiff',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.dwg': 'application/acad',
    '.dxf': 'application/dxf',
};

function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
}

function detectCategory(ext) {
    if (['.pdf', '.docx', '.doc', '.xlsx', '.xls'].includes(ext)) return 'document';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg'].includes(ext)) return 'image';
    if (['.dwg', '.dxf'].includes(ext)) return 'cad';
    return 'other';
}

// ─── Extractores de metadatos por tipo ───

async function extractPdfSpecific(buffer) {
    try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        return {
            authorOriginal: data.info?.Author || null,
            pageCount: data.numpages || null,
            hasImages: (data.text?.length || 0) < (buffer.length * 0.3),
            language: null,
        };
    } catch (e) {
        console.warn('  ⚠️ No se pudo extraer metadatos PDF:', e.message);
        return { authorOriginal: null, pageCount: null, hasImages: null, language: null };
    }
}

async function extractDocxSpecific(buffer) {
    try {
        const JSZip = require('jszip');
        const zip = await new JSZip().loadAsync(buffer);
        let authorOriginal = null;
        let pageCount = null;

        const coreFile = zip.file('docProps/core.xml');
        if (coreFile) {
            const xml = await coreFile.async('text');
            const match = xml.match(/<dc:creator>([^<]+)<\/dc:creator>/);
            if (match) authorOriginal = match[1];
        }
        const appFile = zip.file('docProps/app.xml');
        if (appFile) {
            const xml = await appFile.async('text');
            const match = xml.match(/<Pages>(\d+)<\/Pages>/);
            if (match) pageCount = parseInt(match[1]);
        }
        const hasImages = Object.keys(zip.files).some(f => f.startsWith('word/media/'));
        return { authorOriginal, pageCount, hasImages, language: null };
    } catch (e) {
        console.warn('  ⚠️ No se pudo extraer metadatos DOCX:', e.message);
        return { authorOriginal: null, pageCount: null, hasImages: null, language: null };
    }
}

async function extractImageSpecific(buffer) {
    try {
        const sharp = require('sharp');
        const meta = await sharp(buffer).metadata();
        const result = {
            dimensions: meta.width && meta.height ? `${meta.width}x${meta.height}` : null,
            width: meta.width || null,
            height: meta.height || null,
            colorSpace: meta.space || null,
            exifData: null,
        };
        // Intentar EXIF
        try {
            const exifr = require('exifr');
            const exif = await exifr.parse(buffer);
            if (exif) {
                result.exifData = {
                    make: exif.Make || null,
                    model: exif.Model || null,
                    dateTaken: exif.DateTimeOriginal ? exif.DateTimeOriginal.toISOString() : null,
                    gps: exif.latitude && exif.longitude ? { lat: exif.latitude, lng: exif.longitude } : null,
                    orientation: exif.Orientation || null,
                };
            }
        } catch { /* sin EXIF, está bien */ }
        return result;
    } catch (e) {
        console.warn('  ⚠️ No se pudo extraer metadatos de imagen:', e.message);
        return { dimensions: null, colorSpace: null, exifData: null };
    }
}

async function extractDxfSpecific(buffer) {
    try {
        const DxfParser = require('dxf-parser');
        const parser = new DxfParser();
        const dxf = parser.parseSync(buffer.toString('utf-8'));
        if (!dxf) return { softwareVersion: null, layers: [] };
        const layers = dxf.tables?.layer?.layers ? Object.keys(dxf.tables.layer.layers) : [];
        return { softwareVersion: dxf.header?.['$ACADVER'] || null, layers };
    } catch (e) {
        console.warn('  ⚠️ No se pudo extraer metadatos DXF:', e.message);
        return { softwareVersion: null, layers: [] };
    }
}

function extractDwgSpecific(buffer) {
    try {
        const header = buffer.toString('ascii', 0, 6);
        const versions = {
            'AC1032': 'AutoCAD 2018+', 'AC1027': 'AutoCAD 2013-2017',
            'AC1024': 'AutoCAD 2010-2012', 'AC1021': 'AutoCAD 2007-2009',
            'AC1018': 'AutoCAD 2004-2006', 'AC1015': 'AutoCAD 2000-2003',
        };
        return { softwareVersion: versions[header] || `Desconocida (${header})`, layers: [] };
    } catch (e) {
        return { softwareVersion: null, layers: [] };
    }
}

// ─── Main ───

async function run() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     TEST DE DOCUMENTOS — Extrae metadatos → JSON → API ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // 1. Verificar archivo
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ Archivo no encontrado: ${FILE_PATH}`);
        console.error('   Edita la variable FILE_PATH al inicio del script.');
        process.exit(1);
    }

    const stats = fs.statSync(FILE_PATH);
    const fileName = pathModule.basename(FILE_PATH);
    const ext = pathModule.extname(FILE_PATH).toLowerCase();
    const category = detectCategory(ext);
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';

    console.log(`📄 Archivo:    ${fileName}`);
    console.log(`📏 Tamaño:     ${formatSize(stats.size)} (${stats.size} bytes)`);
    console.log(`🔖 Extensión:  ${ext}`);
    console.log(`📦 MIME:       ${mimeType}`);
    console.log(`📂 Categoría:  ${category}`);
    console.log(`🆔 ID:         ${DOCUMENT_ID}\n`);

    // 2. Verificar servidor
    console.log('🔌 Verificando conexión al servidor...');
    try {
        const health = await fetch(API_URL.replace('/api/documents', '/api/saludo'), {
            signal: AbortSignal.timeout(5000),
        });
        if (health.ok) {
            console.log('✅ Servidor accesible.\n');
        } else {
            console.warn(`⚠️  Servidor respondió HTTP ${health.status}, continuando...\n`);
        }
    } catch (e) {
        console.error(`❌ No se pudo conectar a ${API_URL}`);
        console.error('   Asegúrate de que el servidor esté corriendo (bun run dev).');
        process.exit(1);
    }

    // 3. Leer archivo y extraer metadatos
    console.log('🔍 Extrayendo metadatos del archivo...');
    const fileBuffer = fs.readFileSync(FILE_PATH);

    // Hash
    const md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Metadatos específicos según categoría
    let specificMeta = {};
    if (category === 'document') {
        if (ext === '.pdf') specificMeta = await extractPdfSpecific(fileBuffer);
        else if (ext === '.docx') specificMeta = await extractDocxSpecific(fileBuffer);
    } else if (category === 'image') {
        specificMeta = await extractImageSpecific(fileBuffer);
    } else if (category === 'cad') {
        if (ext === '.dxf') specificMeta = await extractDxfSpecific(fileBuffer);
        else if (ext === '.dwg') specificMeta = extractDwgSpecific(fileBuffer);
    }

    console.log('✅ Metadatos extraídos.\n');

    // 4. Armar el JSON igual a como lo mandaría .NET
    const payload = {
        id: DOCUMENT_ID,
        title: DOC_TITLE,
        description: DOC_DESCRIPTION,
        filePath: `/uploads/${fileName}`,
        authorId: 101,
        statusId: 3,
        companyId: 1,
        versionNumber: 1,
        isLatest: true,
        metadata: {
            fileSize: formatSize(stats.size),
            mimeType: mimeType,
            extension: ext,
            checksum: md5,
            sha256: sha256,
            createdOnDisk: stats.birthtime.toISOString(),
            modifiedOnDisk: stats.mtime.toISOString(),
            category: category,
            specific: specificMeta,
        },
    };

    console.log('📦 Payload JSON a enviar:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');

    // 5. Enviar POST
    console.log(`📤 Enviando POST a ${API_URL}...`);
    const startTime = Date.now();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(60000),
        });

        const elapsed = Date.now() - startTime;
        const text = await response.text();

        console.log(`⏱️  Respuesta en: ${elapsed}ms`);
        console.log(`📊 HTTP Status: ${response.status}\n`);

        let json;
        try { json = JSON.parse(text); } catch { json = null; }

        if (response.ok) {
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║                    ✅ ÉXITO                             ║');
            console.log('╚══════════════════════════════════════════════════════════╝');
            if (json) {
                console.log('\n📋 Respuesta:');
                console.log(JSON.stringify(json, null, 2));
                if (json.data) {
                    const d = json.data;
                    console.log('\n┌─────────────────────────────────────┐');
                    console.log('│          RESUMEN                    │');
                    console.log('├─────────────────────────────────────┤');
                    console.log(`│ ID:         ${d.id}`);
                    console.log(`│ Categoría:  ${d.category}`);
                    console.log(`│ Tags:       ${d.tagsGenerated} generados`);
                    if (d.warnings) console.log(`│ Warnings:   ${d.warnings.join(', ')}`);
                    console.log('└─────────────────────────────────────┘');
                }
            } else {
                console.log('Respuesta:', text);
            }
        } else {
            console.log('╔══════════════════════════════════════════════════════════╗');
            console.log('║                    ❌ ERROR                             ║');
            console.log('╚══════════════════════════════════════════════════════════╝');
            console.log(json ? JSON.stringify(json, null, 2) : text);
        }
    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`❌ Error tras ${elapsed}ms: ${error.message}`);
        if (error.message.includes('timeout')) {
            console.error('   La petición excedió 60s. El servidor puede estar cargado.');
        }
    }
}

run().catch(err => { console.error('Error fatal:', err); process.exit(1); });