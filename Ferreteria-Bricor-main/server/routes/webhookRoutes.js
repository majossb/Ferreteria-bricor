import { Router } from 'express';
import { webhookController } from '../controllers/webhookController.js';

const router = Router();

// Endpoint oficial de webhook de Wompi Colombia
router.post('/wompi', webhookController.handleWompiWebhook);

export default router;
