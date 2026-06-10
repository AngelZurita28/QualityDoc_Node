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
const server = app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`El puerto ${PORT} ya está en uso. Cambia PORT en .env o detén el proceso que lo ocupa.`);
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        console.error(`No hay permisos para escuchar en el puerto ${PORT}. Revisa permisos del entorno o usa otro puerto.`);
    } else {
        console.error('Error iniciando el servidor:', error.message);
    }

    process.exit(1);
});
