import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import socketLogic from './socket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure allowed origins (set FRONTEND_URL in production)
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173']
    : '*';

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// Initialize Socket.IO logic
socketLogic(io);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ObrixChat Socket.IO Server is running',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
