import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { getMongoDb } from '../config/mongodb';
import documentRoutes from './routes/document.routes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '15mb' }));

// Routes
app.use('/api/documents', documentRoutes);

// Test routes
app.get('/api/saludo', (req: Request, res: Response) => {
    res.json({ mensaje: '¡Hola desde el backend en Docker!' });
});

app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const db = await getMongoDb();
        const collections = await db.listCollections().toArray();
        res.json({
            status: 'success',
            message: 'Conexión a MongoDB exitosa',
            database: db.databaseName,
            collections: collections.map((c: any) => c.name)
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error conectando a MongoDB',
            error: (error as Error).message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
