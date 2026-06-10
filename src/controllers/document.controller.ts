import { type Request, type Response } from 'express';
import { getDocumentsCollection } from '../../config/mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

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

function extractFallbackTagsFromDocument(documentData: any): string[] {
    const searchableParts = [
        documentData.title,
        documentData.description,
        documentData.filePath,
        documentData.metadata?.category,
        documentData.metadata?.mimeType,
        documentData.metadata?.extension,
        documentData.metadata?.fullText,
        documentData.metadata?.specific ? JSON.stringify(documentData.metadata.specific) : '',
    ];

    const text = searchableParts.join(' ')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ");

    const words = text
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));

    return [...new Set(words)];
}

function getDocumentCode(data: any): string | null {
    const rawCode = data.documentCode
        ?? data.DocumentCode
        ?? data.codigo
        ?? data.Codigo
        ?? data.code
        ?? data.Code
        ?? data.document?.code
        ?? data.Document?.Code;

    if (rawCode === undefined || rawCode === null) return null;

    const code = String(rawCode).trim();
    return code.length > 0 ? code : null;
}

/**
 * Genera etiquetas usando Gemini AI
 */
async function generarEtiquetasIA(documentData: any): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY no configurada. Saltando generación de etiquetas por IA.');
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: geminiModel });
        const prompt = `
Eres un sistema experto en clasificación de documentos.
Analiza el siguiente JSON completo de un documento y genera exactamente 30 etiquetas (tags) clave.

REGLAS ESTRICTAS:
1. Extrae las palabras más importantes del título, descripción, metadatos y texto completo del documento si está presente.
2. INCLUYE SINÓNIMOS Y TÉRMINOS RELACIONADOS. Por ejemplo, si el texto menciona "informática", debes incluir también términos como "tics", "tecnologia", "informacion", "computacion".
3. Cada etiqueta debe ser UNA SOLA PALABRA (sin espacios, sin guiones). Si una idea tiene varias palabras (ej. "seguridad informática"), sepárala en palabras individuales ("seguridad", "informatica").
4. No uses acentos ni tildes.
5. Si incluye cosas como "iso 27001", incluye "iso" y "27001" como etiquetas separadas y "iso27001" como una sola palabra.
6. Devuelve ÚNICAMENTE un array en formato JSON con las etiquetas como strings, sin formato markdown ni texto adicional.
7. El array debe contener 30 strings, sin duplicados.
Ejemplo: ["calidad", "procesos", "manual", "auditoria", "seguridad", "informatica", "tics", "tecnologia", "informacion", "computacion", "planta", "operacion", "gestion", "riesgos", "iso", "27001", "iso27001"]

JSON del documento:
${JSON.stringify(documentData)}
        `;

        const result = await withTimeout(model.generateContent(prompt), 30000, 'Gemini API');
        const text = result.response.text();
        const jsonText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const tags = JSON.parse(jsonText);
        return Array.isArray(tags) ? normalizeTags(tags).slice(0, 30) : [];
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

    const fullText = meta.fullText ?? meta.content ?? meta.textContent ?? meta.extractedText ?? meta.documentText;
    if (fullText !== undefined && fullText !== null) {
        cleaned.fullText = String(fullText);
    }

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
                message: 'El campo "id" es obligatorio para sincronizar con MongoDB.',
            });
            return;
        }

        const title = data.title || data.Title || '';
        const description = data.description || data.Description || '';
        const documentCode = getDocumentCode(data);

        if (!documentCode) {
            res.status(400).json({
                status: 'error',
                message: 'El código de documento es obligatorio. Envía "documentCode", "codigo" o "code".',
            });
            return;
        }

        if (!title) {
            res.status(400).json({
                status: 'error',
                message: 'El campo "title" es obligatorio.',
            });
            return;
        }

        console.log(`📄 Recibido documento ID: ${docId} — Código: ${documentCode} — "${title}"`);

        // ── 3. Verificar que el ID no exista ya en MongoDB ──
        const documents = await getDocumentsCollection();
        const existingDoc = await withTimeout(documents.findOne({ id: String(docId) }), 10000, 'MongoDB read');
        if (existingDoc) {
            const elapsed = Date.now() - startTime;
            console.warn(`⚠️ Documento ID ${docId} ya existe en MongoDB. Rechazado.`);
            res.status(409).json({
                status: 'error',
                message: `El documento con ID "${docId}" ya existe en MongoDB. No se permite duplicar.`,
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

        // ── 6. Armar documento final ──
        const documentToSave: any = {
            id: String(docId),
            documentCode,
            title,
            description,
            filePath: data.filePath || data.FilePath || null,
            authorId: data.authorId || data.AuthorId || null,
            statusId: data.statusId || data.StatusId || null,
            companyId: data.companyId || data.CompanyId || null,
            parentId: data.parentId || data.ParentId || null,
            versionNumber: Number(data.versionNumber || data.VersionNumber || 1),
            isLatest: true,
            lifecycleStatus: 'active',
            metadata: {
                ...universalMeta,
                category,
                specific: specificMeta,
                tags: Array.isArray(universalMeta.tags) ? normalizeTags(universalMeta.tags) : [],
            },
            syncedAt: new Date().toISOString(),
        };

        // ── 7. Generar tags con IA usando el JSON completo del documento ──
        let iaTags: string[] = [];
        try {
            iaTags = await generarEtiquetasIA(documentToSave);
        } catch (e: any) {
            console.warn('⚠️ Generación de tags IA falló, continuando:', e.message);
        }

        const existingTags = Array.isArray(universalMeta.tags) ? normalizeTags(universalMeta.tags) : [];
        const fallbackTags = extractFallbackTagsFromDocument(documentToSave);
        const allTags = [...new Set([...existingTags, ...iaTags, ...fallbackTags])].slice(0, 30);
        documentToSave.metadata.tags = allTags;

        // ── 8. Marcar versiones anteriores con el mismo código como obsoletas ──
        const obsoleteResult = await withTimeout(
            documents.updateMany(
                { documentCode, id: { $ne: String(docId) } },
                {
                    $set: {
                        isLatest: false,
                        lifecycleStatus: 'obsolete',
                        obsoleteAt: new Date().toISOString(),
                        supersededById: String(docId),
                    },
                }
            ),
            15000,
            'MongoDB obsolete previous versions'
        );

        // ── 9. Guardar en MongoDB con timeout de seguridad ──
        await withTimeout(documents.insertOne(documentToSave), 15000, 'MongoDB write');

        const elapsed = Date.now() - startTime;
        console.log(`✅ Documento sincronizado en ${elapsed}ms — Código: ${documentCode} — Obsoletos: ${obsoleteResult.modifiedCount} — Tags: ${allTags.length}`);

        res.status(200).json({
            status: 'success',
            message: 'Documento sincronizado exitosamente.',
            data: {
                id: String(docId),
                documentCode,
                category,
                obsoleteDocuments: obsoleteResult.modifiedCount,
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

        const mongoTags = searchTags.slice(0, 30);

        // 3. Buscar en MongoDB los documentos que contengan AL MENOS UNA de las etiquetas
        const documents = await getDocumentsCollection();
        const docs = await withTimeout<any[]>(
            documents.find({ 'metadata.tags': { $in: mongoTags }, isLatest: true }).toArray(),
            15000, 'MongoDB search'
        );

        if (docs.length === 0) {
            res.status(200).json({
                status: 'success',
                data: [],
                searchTags: mongoTags
            });
            return;
        }

        // 4. Calcular el nivel de coincidencia (cuántos tags buscados están presentes en el documento)
        const results = docs.map((doc: any) => {
            const { _id, ...data } = doc;
            const docTags = data.metadata?.tags || [];

            // Contar cuántas palabras clave de la búsqueda están en los tags del documento
            let matchCount = 0;
            for (const tag of mongoTags) {
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
        results.sort((a: any, b: any) => b._matchCount - a._matchCount);

        // Opcional: remover el campo _matchCount antes de enviar si no lo necesitas, 
        // pero es útil para el frontend para mostrar relevancia.

        res.status(200).json({
            status: 'success',
            data: results,
            searchTags: mongoTags
        });
    } catch (error: any) {
        console.error('Error buscando documentos:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Error al realizar la búsqueda en MongoDB',
            error: error.message
        });
    }
};
