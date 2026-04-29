import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { db } from '../config/firebase';
import documentRoutes from './routes/document.routes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/documents', documentRoutes);

// Test routes
app.get('/api/saludo', (req: Request, res: Response) => {
    res.json({ mensaje: '¡Hola desde el backend en Docker!' });
});

app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const collections = await db.listCollections();
        res.json({
            status: 'success',
            message: 'Conexión a Firestore exitosa',
            collections: collections.map(c => c.id)
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error conectando a Firestore',
            error: (error as Error).message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
