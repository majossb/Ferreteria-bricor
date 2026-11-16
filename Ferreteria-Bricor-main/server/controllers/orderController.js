import { orderService } from '../services/orderService.js';

export const orderController = {
  /**
   * POST /api/v1/orders
   * Crea una orden en el sistema, validando stock y precios en servidor,
   * y genera la firma de integridad de Wompi.
   */
  async createOrder(req, res, next) {
    try {
      const { customer, items, shippingMethod, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'El pedido debe incluir una lista válida de productos.',
        });
      }

      if (!customer) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Los datos del cliente son obligatorios.',
        });
      }

      const order = orderService.createOrder({
        customer,
        items,
        shippingMethod,
        notes,
      });

      return res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/orders/customer/auth
   * Autenticación segura de cliente para acceder a "Mis compras"
   * mediante correo y número de pedido reciente.
   */
  async authCustomer(req, res, next) {
    try {
      const { email, orderNumber } = req.body || {};
      const authResult = orderService.authenticateCustomer({ email, orderNumber });
      return res.status(200).json({
        success: true,
        data: authResult,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/orders/customer/history
   * Consulta protegida del historial de compras del cliente autenticado.
   */
  async getCustomerHistory(req, res, next) {
    try {
      const email = req.query.email || req.headers['x-customer-email'];
      const token = req.query.token || req.headers['x-customer-token'];

      const orders = orderService.getCustomerOrders({ email, token });
      return res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/orders/:identifier
   * Consulta el estado y detalle de una orden por orderNumber o wompiReference.
   */
  async getOrder(req, res, next) {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Debes proporcionar una referencia o número de orden.',
        });
      }

      const order = orderService.getOrderByIdentifier(identifier);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `No se encontró la orden con identificador '${identifier}'.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/orders/:identifier/status
   * Consulta pública y segura del estado de la transacción para el frontend.
   */
  async getOrderStatus(req, res, next) {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Debes proporcionar una referencia o número de orden.',
        });
      }

      const statusData = orderService.getOrderPublicStatus(identifier);

      if (!statusData) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: `No se encontró la orden '${identifier}'.`,
        });
      }

      return res.status(200).json({
        success: true,
        data: statusData,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/orders/:identifier/verify-wompi
   * Reconcilia la orden directamente con la API de Wompi (server-to-server)
   * validando monto, referencia, moneda y estado.
   */
  async verifyWompiTransaction(req, res, next) {
    try {
      const { identifier } = req.params;
      const { transactionId } = req.body || {};

      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Debes proporcionar una referencia o número de orden.',
        });
      }

      const statusData = await orderService.reconcileWithWompi({
        orderIdentifier: identifier,
        transactionId,
      });

      return res.status(200).json({
        success: true,
        data: statusData,
      });
    } catch (err) {
      next(err);
    }
  },
};
