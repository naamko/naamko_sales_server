import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { captureRawBody } from './middleware/authMiddleware';
import { db } from './database/connection';
import routes from './routes/index';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Capture raw body BEFORE json middleware
app.use(captureRawBody);

// 🌐 CORS & body parsing middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🖼️ Serve uploaded images
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// 🚀 Main API routes
app.use('/api', routes);

// ❌ 404 Not Found Handler
app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// ❗ Error Handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
});

// 🟢 Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔒 Request signing authentication enabled`);
    console.log(`📁 File uploads served at /uploads`);
    console.log(`📊 Excel reports available at /api/reports/export/excel`);

    try {
        await db.connect();
        await db.initializeSchema();
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
});

// 📦 Graceful Shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await db.close();
    process.exit(0);
});

