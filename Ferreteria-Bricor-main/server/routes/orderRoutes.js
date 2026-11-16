import { Router } from 'express';
import { orderController } from '../controllers/orderController.js';

const router = Router();

// Creación de orden con firma de integridad Wompi y validación de stock
router.post('/', orderController.createOrder);

// Rutas de cliente y consulta de "Mis compras" (preceden a las rutas con parámetro :identifier)
router.post('/customer/auth', orderController.authCustomer);
router.get('/customer/history', orderController.getCustomerHistory);

// Reconciliación server-to-server con Wompi para verificación de transacción
router.post('/:identifier/verify-wompi', orderController.verifyWompiTransaction);

// Consulta pública de estado de transacción (segura sin datos privados)
router.get('/:identifier/status', orderController.getOrderStatus);

// Consulta completa de orden por orderNumber o wompiReference
router.get('/:identifier', orderController.getOrder);

export default router;
