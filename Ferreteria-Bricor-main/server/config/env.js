import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno prioritariamente desde server/.env y luego raíz
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../data/bricor.sqlite'),
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY || 'pub_test_pbm4uIUdmLxHfUja89kN8EXwhP14h3fL',
    privateKey: process.env.WOMPI_PRIVATE_KEY || '',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || '',
    env: process.env.WOMPI_ENV || 'sandbox',
    apiUrl: process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1',
    currency: 'COP',
    isSandbox: (process.env.WOMPI_ENV || 'sandbox').toLowerCase() !== 'production' && process.env.NODE_ENV !== 'production',
  },
  commercial: {
    freeShippingThreshold: 300000,
    standardShippingFee: 18000,
  },
};
