import { orderService } from '../services/orderService.js';

export const webhookController = {
  /**
   * POST /api/v1/webhooks/wompi
   * Recepción de eventos de Wompi con validación criptográfica de firma (checksum).
   */
  async handleWompiWebhook(req, res, next) {
    try {
      const eventPayload = req.body;

      if (!eventPayload) {
        return res.status(400).json({
          success: false,
          error: 'BAD_REQUEST',
          message: 'Cuerpo de solicitud vacío.',
        });
      }

      const result = orderService.processWebhookEvent(eventPayload);

      return res.status(200).json({
        success: true,
        message: 'Evento procesado correctamente',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
