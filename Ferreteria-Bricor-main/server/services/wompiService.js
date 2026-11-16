import crypto from 'node:crypto';
import { config } from '../config/env.js';

export const wompiService = {
  /**
   * Genera una referencia única para la pasarela de pagos Wompi.
   * Formato: BCR-<TIMESTAMP>-<RANDOM_HEX>
   */
  generateReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const entropy = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `BCR-${timestamp}-${entropy}`;
  },

  /**
   * Genera la firma de integridad SHA-256 conforme a la documentación oficial de Wompi Colombia.
   * Cadena de firma: <referencia><monto_en_centavos><moneda><secreto_integridad>
   * 
   * @param {Object} params
   * @param {string} params.reference - Referencia única de la transacción
   * @param {number} params.amountInCents - Monto total en centavos (ej: $168.000 COP -> 16800000)
   * @param {string} [params.currency='COP'] - Código ISO de la moneda
   * @returns {string} Hash SHA-256 en formato hexadecimal
   */
  generateIntegritySignature({ reference, amountInCents, currency = 'COP' }) {
    if (!reference || amountInCents === undefined || amountInCents === null) {
      throw new Error('La referencia y el monto en centavos son obligatorios para la firma de integridad');
    }

    const { integritySecret } = config.wompi;
    if (!integritySecret) {
      throw new Error('WOMPI_INTEGRITY_SECRET no está configurado en las variables de entorno');
    }

    const centsInt = Math.round(Number(amountInCents));

    // Estructura estricta oficial Wompi
    const concatenatedString = `${reference}${centsInt}${currency}${integritySecret}`;
    return crypto.createHash('sha256').update(concatenatedString).digest('hex');
  },

  /**
   * Valida la firma de integridad de una transacción contra el secreto de integridad
   */
  verifyIntegritySignature({ reference, amountInCents, currency = 'COP', signature }) {
    const expected = this.generateIntegritySignature({ reference, amountInCents, currency });
    return expected.toLowerCase() === (signature || '').toLowerCase();
  },

  /**
   * Obtiene la configuración pública de Wompi para compartir de forma segura con el cliente
   */
  getPublicConfig() {
    return {
      publicKey: config.wompi.publicKey,
      currency: config.wompi.currency,
      isSandbox: config.wompi.isSandbox,
      env: config.wompi.env,
    };
  },

  /**
   * Consulta el estado de una transacción directamente a la API oficial de Wompi (server-to-server).
   * 
   * @param {string} transactionId - ID oficial de la transacción en Wompi
   * @returns {Promise<Object|null>}
   */
  async fetchTransactionFromWompi(transactionId) {
    if (!transactionId) return null;
    const baseUrl = config.wompi.apiUrl || 'https://sandbox.wompi.co/v1';
    const headers = {
      'Accept': 'application/json',
    };
    if (config.wompi.privateKey) {
      headers['Authorization'] = `Bearer ${config.wompi.privateKey}`;
    }

    try {
      const res = await fetch(`${baseUrl}/transactions/${encodeURIComponent(transactionId)}`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      return json.data || null;
    } catch (err) {
      console.error('[WompiService] Error al consultar API Wompi:', err);
      return null;
    }
  },

  /**
   * Valida la firma del evento Webhook según la documentación oficial de Wompi:
   * https://docs.wompi.co/docs/colombia/eventos/
   * 
   * Se concatenan los valores de las propiedades indicadas en signature.properties
   * (en el orden especificado en el array), seguidos del timestamp, seguidos del secreto de eventos.
   * Luego se calcula SHA-256 y se compara de forma constante con signature.checksum.
   */
  verifyWebhookEvent(eventPayload) {
    if (!eventPayload || !eventPayload.signature || !eventPayload.timestamp) {
      const err = new Error('Carga útil de evento inválida: faltan signature o timestamp.');
      err.statusCode = 400;
      throw err;
    }

    const { properties, checksum } = eventPayload.signature;
    if (!Array.isArray(properties) || !checksum) {
      const err = new Error('Estructura de firma de evento Wompi inválida.');
      err.statusCode = 400;
      throw err;
    }

    const { eventsSecret } = config.wompi;
    if (!eventsSecret) {
      throw new Error('WOMPI_EVENTS_SECRET no está configurado en el servidor.');
    }

    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((acc, part) => (acc !== null && acc !== undefined ? acc[part] : undefined), obj);
    };

    let concatenatedValues = '';
    for (const prop of properties) {
      const val = getNestedValue(eventPayload.data, prop);
      if (val !== undefined && val !== null) {
        concatenatedValues += val.toString();
      }
    }

    concatenatedValues += eventPayload.timestamp.toString();
    concatenatedValues += eventsSecret;

    const computedChecksum = crypto.createHash('sha256').update(concatenatedValues).digest('hex');

    const bufA = Buffer.from(computedChecksum.toLowerCase(), 'utf8');
    const bufB = Buffer.from(checksum.toLowerCase(), 'utf8');

    const isValid = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);

    return {
      isValid,
      computedChecksum,
      receivedChecksum: checksum,
    };
  },
};
