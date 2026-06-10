import { MongoClient, type Collection, type Db } from 'mongodb';

const dbNameFromEnv = process.env.MONGO_DB || 'QualityDocDB';
const mongoUri = process.env.MONGO_URI || buildMongoUri(dbNameFromEnv);
const dbName = process.env.MONGO_DB || getDatabaseNameFromUri(mongoUri) || 'QualityDocDB';

const client = new MongoClient(mongoUri);

let connection: Promise<Db> | null = null;

export async function getMongoDb(): Promise<Db> {
    if (!connection) {
        connection = client.connect().then(async (connectedClient: MongoClient) => {
            const db = connectedClient.db(dbName);
            await ensureIndexes(db);
            return db;
        });
    }

    return connection;
}

export async function getDocumentsCollection(): Promise<Collection> {
    const db = await getMongoDb();
    return db.collection('documents');
}

async function ensureIndexes(db: Db): Promise<void> {
    const documents = db.collection('documents');
    await documents.createIndex({ id: 1 }, { unique: true });
    await documents.createIndex({ 'metadata.tags': 1 });
}

export async function closeMongoConnection(): Promise<void> {
    await client.close();
    connection = null;
}

function getDatabaseNameFromUri(uri: string): string | null {
    try {
        const parsed = new URL(uri);
        const pathname = parsed.pathname.replace('/', '');
        return pathname || null;
    } catch {
        return null;
    }
}

function buildMongoUri(dbName: string): string {
    const user = process.env.MONGO_USER;
    const pass = process.env.MONGO_PASS;

    if (user && pass) {
        return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@127.0.0.1:27017/${dbName}?authSource=admin`;
    }

    return `mongodb://127.0.0.1:27017/${dbName}`;
}
