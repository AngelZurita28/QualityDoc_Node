import { Router } from 'express';
import { syncDocument, searchDocuments, deepSearchDocuments, getDocumentById } from '../controllers/document.controller';

const router = Router();

// Ruta para buscar documentos por tags generados a partir de una frase
router.get('/search', searchDocuments);

// Ruta para buscar documentos en todos los campos guardados
router.get('/deepsearch', deepSearchDocuments);

// Ruta para obtener el JSON completo de un documento por ID
router.get('/:id', getDocumentById);

// Ruta para sincronizar un documento (POST /api/documents)
router.post('/', syncDocument);

export default router;
