import { Router } from 'express';
import orderRoutes from './orderRoutes.js';
import productRoutes from './productRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import { wompiService } from '../services/wompiService.js';

const router = Router();

// Endpoint de salud del sistema
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BRICOR API Backend',
    timestamp: new Date().toISOString(),
    wompi: wompiService.getPublicConfig(),
  });
});

router.use('/orders', orderRoutes);
router.use('/products', productRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
