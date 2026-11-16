import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import { initDatabase } from './database/db.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares globales
app.use(cors({
  origin: '*', // Permitir solicitudes del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Customer-Email', 'X-Customer-Token'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar SQLite y esquema de tablas
initDatabase();

// Rutas API v1
app.use('/api/v1', apiRoutes);

// Manejador centralizado de errores
app.use(errorHandler);

// Iniciar servidor solo si es ejecutado directamente como archivo principal
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(` BRICOR Backend API escuchando en http://localhost:${config.port}`);
    console.log(` Entorno: ${config.nodeEnv}`);
    console.log(` SQLite BD: ${config.dbPath}`);
    console.log(` Wompi Sandbox: Configurado con firma SHA-256`);
    console.log(`====================================================`);
  });

  const shutdown = () => {
    console.log('\n[Server] Cerrando servidor gracefully...');
    server.close(() => {
      console.log('[Server] Servidor cerrado.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export default app;
