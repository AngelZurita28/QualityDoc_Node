import { type Request, type Response } from 'express';
import { db } from '../../config/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Utilidades ───

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${label} excedió ${ms}ms`)), ms);
        promise.then(val => { clearTimeout(timer); resolve(val); })
            .catch(err => { clearTimeout(timer); reject(err); });
    });
}

function normalizeTags(tags: string[]): string[] {
    const processed = new Set<string>();
    tags.forEach(tag => {
        const cleanTag = tag.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        cleanTag.split(/[\s\-_]+/).forEach(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            if (cleanWord.length > 2) processed.add(cleanWord);
        });
    });
    return Array.from(processed);
}

/**
 * Genera etiquetas usando Gemini AI
 */
async function generarEtiquetasIA(titulo: string, descripcion: string): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY no configurada. Saltando generación de etiquetas por IA.');
        return [];
    }
    if (!titulo && !descripcion) return [];

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const prompt = `
Eres un sistema experto en clasificación de documentos.
Analiza el siguiente título y descripción de un documento y genera una extensa lista de AL MENOS 15 a 20 etiquetas (tags) clave.

REGLAS ESTRICTAS:
1. Extrae las palabras más importantes del título y descripción.
2. INCLUYE SINÓNIMOS Y TÉRMINOS RELACIONADOS. Por ejemplo, si el texto menciona "informática", debes incluir también términos como "tics", "tecnologia", "informacion", "computacion".
3. Cada etiqueta debe ser UNA SOLA PALABRA (sin espacios, sin guiones). Si una idea tiene varias palabras (ej. "seguridad informática"), sepárala en palabras individuales ("seguridad", "informatica").
4. No uses acentos ni tildes.
5. Si incluye cosas como "iso 27001", incluye "iso" y "27001" como etiquetas separadas y "iso27001" como una sola palabra.
6. Devuelve ÚNICAMENTE un array en formato JSON con las etiquetas como strings, sin formato markdown ni texto adicional.
Ejemplo: ["calidad", "procesos", "manual", "auditoria", "seguridad", "informatica", "tics", "tecnologia", "informacion", "computacion", "planta", "operacion", "gestion", "riesgos", "iso", "27001", "iso27001"]

Título: ${titulo}
Descripción: ${descripcion}
        `;

        const result = await withTimeout(model.generateContent(prompt), 20000, 'Gemini API');
        const text = result.response.text();
        const jsonText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const tags = JSON.parse(jsonText);
        return Array.isArray(tags) ? normalizeTags(tags) : [];
    } catch (error) {
        console.error('Error al generar etiquetas con IA:', error);
        return [];
    }
}

// ─── Validación de metadatos por categoría ───

interface ValidationResult {
    valid: boolean;
    cleaned: any;
    warnings: string[];
}

function validateUniversalMeta(meta: any): ValidationResult {
    const warnings: string[] = [];
    const cleaned: any = {};

    // fileSize — string o number, ambos aceptados
    if (meta.fileSize !== undefined) {
        cleaned.fileSize = String(meta.fileSize);
    } else {
        warnings.push('metadata.fileSize no proporcionado');
    }

    // mimeType
    if (meta.mimeType && typeof meta.mimeType === 'string') {
        cleaned.mimeType = meta.mimeType.trim().toLowerCase();
    } else {
        warnings.push('metadata.mimeType no proporcionado');
    }

    // extension
    if (meta.extension && typeof meta.extension === 'string') {
        cleaned.extension = meta.extension.trim().toLowerCase();
        if (!cleaned.extension.startsWith('.')) cleaned.extension = '.' + cleaned.extension;
    } else {
        warnings.push('metadata.extension no proporcionado');
    }

    // checksum / hash
    if (meta.checksum) cleaned.checksum = String(meta.checksum);
    if (meta.sha256) cleaned.sha256 = String(meta.sha256);

    // Fechas de disco
    if (meta.createdOnDisk) cleaned.createdOnDisk = String(meta.createdOnDisk);
    if (meta.modifiedOnDisk) cleaned.modifiedOnDisk = String(meta.modifiedOnDisk);

    // Tags previos
    if (Array.isArray(meta.tags)) {
        cleaned.tags = meta.tags;
    }

    return { valid: true, cleaned, warnings };
}

function validateDocumentMeta(specific: any): any {
    const cleaned: any = {};
    if (specific.authorOriginal !== undefined) cleaned.authorOriginal = specific.authorOriginal;
    if (specific.pageCount !== undefined) cleaned.pageCount = Number(specific.pageCount) || null;
    if (specific.hasImages !== undefined) cleaned.hasImages = Boolean(specific.hasImages);
    if (specific.language !== undefined) cleaned.language = specific.language;
    return cleaned;
}

function validateImageMeta(specific: any): any {
    const cleaned: any = {};
    if (specific.dimensions) cleaned.dimensions = String(specific.dimensions);
    if (specific.width !== undefined) cleaned.width = Number(specific.width) || null;
    if (specific.height !== undefined) cleaned.height = Number(specific.height) || null;
    if (specific.colorSpace) cleaned.colorSpace = String(specific.colorSpace);
    if (specific.exifData && typeof specific.exifData === 'object') {
        cleaned.exifData = {};
        const exif = specific.exifData;
        if (exif.make) cleaned.exifData.make = String(exif.make);
        if (exif.model) cleaned.exifData.model = String(exif.model);
        if (exif.dateTaken) cleaned.exifData.dateTaken = String(exif.dateTaken);
        if (exif.gps && typeof exif.gps === 'object') {
            cleaned.exifData.gps = {
                lat: Number(exif.gps.lat) || null,
                lng: Number(exif.gps.lng) || null,
            };
        }
        if (exif.orientation !== undefined) cleaned.exifData.orientation = exif.orientation;
    }
    return cleaned;
}

function validateCadMeta(specific: any): any {
    const cleaned: any = {};
    if (specific.softwareVersion) cleaned.softwareVersion = String(specific.softwareVersion);
    if (Array.isArray(specific.layers)) cleaned.layers = specific.layers.map(String);
    return cleaned;
}

// ═══════════════════════════════════════════
// CONTROLADOR: syncDocument (POST /api/documents)
// Recibe JSON puro — sin archivos
// ═══════════════════════════════════════════

export const syncDocument = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    try {
        // ── 1. Verificar que el body no esté vacío ──
        if (!req.body || Object.keys(req.body).length === 0) {
            res.status(400).json({
                status: 'error',
                message: 'El body está vacío. Se espera un JSON con los datos del documento.',
            });
            return;
        }

        const data = req.body;

        // ── 2. Campos obligatorios ──
        const docId = data.id || data.Id;
        if (!docId) {
            res.status(400).json({
                status: 'error',
                message: 'El campo "id" es obligatorio para sincronizar con Firestore.',
            });
            return;
        }

        const title = data.title || data.Title || '';
        const description = data.description || data.Description || '';

        if (!title) {
            res.status(400).json({
                status: 'error',
                message: 'El campo "title" es obligatorio.',
            });
            return;
        }

        console.log(`📄 Recibido documento ID: ${docId} — "${title}"`);

        // ── 3. Verificar que el ID no exista ya en Firestore ──
        const docRef = db.collection('documents').doc(String(docId));
        const existingDoc = await withTimeout(docRef.get(), 10000, 'Firestore read');
        if (existingDoc.exists) {
            const elapsed = Date.now() - startTime;
            console.warn(`⚠️ Documento ID ${docId} ya existe en Firestore. Rechazado.`);
            res.status(409).json({
                status: 'error',
                message: `El documento con ID "${docId}" ya existe en Firestore. No se permite duplicar.`,
                processingTimeMs: elapsed,
            });
            return;
        }

        // ── 4. Validar y limpiar metadata (Nivel 1 — Universal) ──
        const rawMeta = data.metadata || {};
        const { cleaned: universalMeta, warnings } = validateUniversalMeta(rawMeta);

        if (warnings.length > 0) {
            console.warn('⚠️ Advertencias de metadatos:', warnings.join(', '));
        }

        // ── 4. Validar metadata específica (Nivel 2) según categoría ──
        const category = rawMeta.category || 'other';
        let specificMeta: any = {};

        if (rawMeta.specific && typeof rawMeta.specific === 'object') {
            switch (category) {
                case 'document':
                    specificMeta = validateDocumentMeta(rawMeta.specific);
                    break;
                case 'image':
                    specificMeta = validateImageMeta(rawMeta.specific);
                    break;
                case 'cad':
                    specificMeta = validateCadMeta(rawMeta.specific);
                    break;
                default:
                    // Categoría desconocida: guardar tal cual sin validación estricta
                    specificMeta = rawMeta.specific;
            }
        }

        // ── 5. Generar tags con IA (no bloquea si falla) ──
        let iaTags: string[] = [];
        try {
            iaTags = await generarEtiquetasIA(title, description);
        } catch (e: any) {
            console.warn('⚠️ Generación de tags IA falló, continuando:', e.message);
        }

        const existingTags = Array.isArray(universalMeta.tags) ? normalizeTags(universalMeta.tags) : [];
        const allTags = [...new Set([...existingTags, ...iaTags])];

        // ── 6. Armar documento final ──
        const documentToSave: any = {
            id: String(docId),
            title,
            description,
            filePath: data.filePath || data.FilePath || null,
            authorId: data.authorId || data.AuthorId || null,
            statusId: data.statusId || data.StatusId || null,
            companyId: data.companyId || data.CompanyId || null,
            parentId: data.parentId || data.ParentId || null,
            versionNumber: Number(data.versionNumber || data.VersionNumber || 1),
            isLatest: data.isLatest !== undefined ? Boolean(data.isLatest) : (data.IsLatest !== undefined ? Boolean(data.IsLatest) : true),
            metadata: {
                ...universalMeta,
                category,
                specific: specificMeta,
                tags: allTags,
            },
            syncedAt: new Date().toISOString(),
        };

        // ── 8. Guardar en Firestore con timeout de seguridad ──
        await withTimeout(docRef.set(documentToSave), 15000, 'Firestore write');

        const elapsed = Date.now() - startTime;
        console.log(`✅ Documento sincronizado en ${elapsed}ms — Tags: ${allTags.length}`);

        res.status(200).json({
            status: 'success',
            message: 'Documento sincronizado exitosamente.',
            data: {
                id: String(docId),
                category,
                tagsGenerated: allTags.length,
                warnings: warnings.length > 0 ? warnings : undefined,
                metadata: documentToSave.metadata,
            },
            processingTimeMs: elapsed,
        });
    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`❌ Error tras ${elapsed}ms:`, error.message);
        res.status(500).json({
            status: 'error',
            message: 'Error al procesar el documento.',
            error: error.message,
            processingTimeMs: elapsed,
        });
    }
};

// ═══════════════════════════════════════════
// CONTROLADOR: searchDocuments (GET /api/documents/search)
// ═══════════════════════════════════════════

// Eliminamos acentos de las stop words para que coincidan con la búsqueda sin acentos
const STOP_WORDS = new Set([
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
    'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o',
    'este', 'si', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'tambien',
    'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos',
    'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto',
    'mi', 'antes', 'algunos', 'que', 'unos', 'yo', 'otro', 'otras', 'otra', 'el', 'tanto',
    'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar',
    'estas', 'algunas', 'algo', 'nosotros', 'mis', 'tu', 'te', 'ti', 'tus',
    'ellas', 'nosotras', 'vosotros', 'vosotras', 'os', 'mio', 'mia', 'mios', 'mias',
    'tuyo', 'tuya', 'tuyos', 'tuyas', 'suyo', 'suya', 'suyos', 'suyas', 'nuestro', 'nuestra',
    'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras'
]);

export const searchDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = req.query.q as string;

        if (!query) {
            res.status(400).json({
                status: 'error',
                message: 'Se requiere el parámetro de búsqueda "q".'
            });
            return;
        }

        // 1. Limpiar la frase: quitar signos de puntuación, pasar a minúsculas y REMOVER ACENTOS
        const cleanedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, '');

        // 2. Dividir en palabras y filtrar conectores (stop words)
        const words = cleanedQuery.split(/\s+/).filter(word => word.length > 0 && !STOP_WORDS.has(word));

        // Eliminar palabras duplicadas en la búsqueda
        const searchTags = [...new Set(words)];

        if (searchTags.length === 0) {
            res.status(200).json({
                status: 'success',
                message: 'La búsqueda no contiene palabras clave válidas.',
                data: []
            });
            return;
        }

        // Firestore 'array-contains-any' soporta un máximo de 10 elementos.
        // Si hay más de 10 palabras clave, tomamos solo las primeras 10.
        const firestoreTags = searchTags.slice(0, 10);

        // 3. Buscar en Firestore los documentos que contengan AL MENOS UNA de las etiquetas
        const snapshot = await withTimeout(
            db.collection('documents').where('metadata.tags', 'array-contains-any', firestoreTags).get(),
            15000, 'Firestore search'
        );

        if (snapshot.empty) {
            res.status(200).json({
                status: 'success',
                data: [],
                searchTags: firestoreTags
            });
            return;
        }

        // 4. Calcular el nivel de coincidencia (cuántos tags buscados están presentes en el documento)
        const results = snapshot.docs.map(doc => {
            const data = doc.data();
            const docTags = data.metadata?.tags || [];

            // Contar cuántas palabras clave de la búsqueda están en los tags del documento
            let matchCount = 0;
            for (const tag of firestoreTags) {
                if (docTags.includes(tag)) {
                    matchCount++;
                }
            }

            return {
                id: doc.id,
                ...data,
                _matchCount: matchCount // Campo temporal para ordenar
            };
        });

        // 5. Ordenar los resultados: mayor coincidencia primero
        results.sort((a, b) => b._matchCount - a._matchCount);

        // Opcional: remover el campo _matchCount antes de enviar si no lo necesitas, 
        // pero es útil para el frontend para mostrar relevancia.

        res.status(200).json({
            status: 'success',
            data: results,
            searchTags: firestoreTags
        });
    } catch (error: any) {
        console.error('Error buscando documentos:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Error al realizar la búsqueda en Firestore',
            error: error.message
        });
    }
};
