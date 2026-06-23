import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initSockets } from './core/sockets/index.js';
import pool from './core/db/mysql.js';

// Module Routers
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import transferRoutes from './modules/transfer/transfer.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';

const app = express();
const httpServer = createServer(app);

// Initialize WebSockets
initSockets(httpServer);

// CORS: allow the deployed web app, common Expo dev origins, and any extras
// listed in the FRONTEND_URL env var (comma-separated). If FRONTEND_URL is
// unset OR explicitly set to "*", allow all origins.
const defaultAllowed = [
  'https://cps449-group5-coil.github.io',
  'http://localhost:8081',
  'http://localhost:19006',
];
const envFrontend = process.env.FRONTEND_URL?.trim();
const corsOptions =
  !envFrontend || envFrontend === '*'
    ? { origin: true } // reflect request origin = allow all
    : {
        origin: [
          ...defaultAllowed,
          ...envFrontend.split(',').map((s) => s.trim()).filter(Boolean),
        ],
      };
app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode}`);
  });
  next();
});

// Main Health Endpoint (Liveness Probe purely disconnected from DB faults)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Online',
    service: 'Aegis Pay Core',
    build: 'v8-ailocal',
    skipOtp: process.env.SKIP_OTP === 'true',
    timestamp: new Date().toISOString(),
  });
});

// Load Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/ai', aiRoutes);

// Global Unhandled Error Trap Mechanism
app.use((err, req, res, next) => {
  console.error('[Critical Error Matrix] ->', err.message);
  res.status(500).json({ success: false, error: 'Internal Gateway Timeout or Server Fault.' });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
