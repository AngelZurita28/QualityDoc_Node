import { type Request, type Response } from 'express';
import { db } from '../../config/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar el SDK de Google Generative AI
// Asegúrate de tener GEMINI_API_KEY en tus variables de entorno (.env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Función auxiliar para limpiar y normalizar etiquetas
 * Elimina acentos, pasa a minúsculas y separa por espacios o guiones
 */
function normalizeTags(tags: string[]): string[] {
    const processed = new Set<string>();
    tags.forEach(tag => {
        // Eliminar acentos y pasar a minúsculas
        const cleanTag = tag.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        // Dividir por espacios, guiones o guiones bajos
        const words = cleanTag.split(/[\s\-_]+/);
        words.forEach(word => {
            const cleanWord = word.replace(/[^\w]/g, ''); // dejar solo alfanumérico
            if (cleanWord.length > 2) { // ignorar palabras muy cortas (de 1 o 2 letras)
                processed.add(cleanWord);
            }
        });
    });
    return Array.from(processed);
}

/**
 * Función auxiliar para generar etiquetas usando Gemini
 */
async function generarEtiquetasIA(titulo: string, descripcion: string): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY no configurada. Saltando generación de etiquetas por IA.');
        return [];
    }

    // Si no hay texto suficiente, no gastamos la llamada a la API
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
5. Devuelve ÚNICAMENTE un array en formato JSON con las etiquetas como strings, sin formato markdown ni texto adicional.
Ejemplo: ["calidad", "procesos", "manual", "auditoria", "seguridad", "informatica", "tics", "tecnologia", "informacion", "computacion", "planta", "operacion", "gestion", "riesgos"]

Título: ${titulo}
Descripción: ${descripcion}
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Limpiar posible formato markdown que pueda traer la respuesta
        const jsonText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

        const tags = JSON.parse(jsonText);

        if (Array.isArray(tags)) {
            return normalizeTags(tags);
        }
        return [];
    } catch (error) {
        console.error('Error al generar etiquetas con IA:', error);
        return [];
    }
}

export const syncDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const documentData = req.body;

        // Validar que venga el ID al menos, para usarlo en Firestore
        if (!documentData.Id) {
            res.status(400).json({
                status: 'error',
                message: 'El campo "Id" es obligatorio para sincronizar con Firestore.',
            });
            return;
        }

        // Generar etiquetas usando IA basado en Título y Descripción
        const iaTags = await generarEtiquetasIA(
            documentData.Title || '',
            documentData.Description || ''
        );

        // Asegurarnos de que exista el objeto metadata
        if (!documentData.metadata) {
            documentData.metadata = {};
        }

        // Unir las etiquetas generadas por IA con las que ya pudieran venir, eliminando duplicados
        const existingTags = Array.isArray(documentData.metadata.tags) ? documentData.metadata.tags : [];
        documentData.metadata.tags = [...new Set([...existingTags, ...iaTags])];

        // Referencia a la colección 'documents' usando el mismo Id de SQL
        const docRef = db.collection('documents').doc(documentData.Id);

        // Se agrega un timestamp de sincronización
        const dataToSave = {
            ...documentData,
            syncedAt: new Date().toISOString()
        };

        // Guardar o actualizar en Firestore
        await docRef.set(dataToSave, { merge: true });

        // Solo regresar código de éxito (HTTP 200) para que la app cliente actualice su base de datos
        res.sendStatus(200);
    } catch (error) {
        console.error('Error sincronizando documento:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al guardar el documento en Firestore',
            error: (error as Error).message
        });
    }
};

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
        const snapshot = await db.collection('documents')
            .where('metadata.tags', 'array-contains-any', firestoreTags)
            .get();

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
    } catch (error) {
        console.error('Error buscando documentos:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al realizar la búsqueda en Firestore',
            error: (error as Error).message
        });
    }
};
