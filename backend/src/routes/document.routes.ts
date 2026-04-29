import { Router } from 'express';
import { syncDocument, searchDocuments } from '../controllers/document.controller';

const router = Router();

// Ruta para buscar documentos por tags generados a partir de una frase
router.get('/search', searchDocuments);

// Ruta para sincronizar un documento (POST /api/documents)
router.post('/', syncDocument);

export default router;
