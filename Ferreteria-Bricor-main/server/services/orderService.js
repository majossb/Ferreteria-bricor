import crypto from 'node:crypto';
import { db } from '../database/db.js';
import { productService } from './productService.js';
import { wompiService } from './wompiService.js';
import { config } from '../config/env.js';

export const orderService = {
  /**
   * Crea un nuevo pedido con validación de inventario y genera la firma de integridad de Wompi.
   */
  createOrder({ customer, items, shippingMethod = 'delivery', notes = '' }) {
    // 1. Validación de datos de cliente
    if (!customer) {
      throw new Error('La información del cliente es obligatoria.');
    }

    const { fullName, documentNumber, email, phone, address, city } = customer;

    if (!fullName || !fullName.trim()) {
      throw new Error('El nombre completo o razón social es obligatorio.');
    }
    if (!documentNumber || !documentNumber.trim()) {
      throw new Error('La cédula o NIT es obligatorio.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error('Introduce un correo electrónico de facturación válido.');
    }
    if (!phone || phone.trim().length < 7) {
      throw new Error('Introduce un teléfono de contacto válido (mínimo 7 dígitos).');
    }
    if (!address || !address.trim()) {
      throw new Error('La dirección de entrega es obligatoria.');
    }
    if (!city || !city.trim()) {
      throw new Error('La ciudad o municipio es obligatorio.');
    }

    const validShippingMethod = shippingMethod === 'pickup' ? 'pickup' : 'delivery';
    const normalizedEmail = email.trim().toLowerCase();

    // 2. Validación autoritativa de productos y precios en el servidor
    const { validatedItems, subtotal } = productService.validateAndCalculateItems(items);

    // 3. Cálculo de flete según método y monto
    let shippingFee = 0;
    if (validShippingMethod === 'delivery') {
      shippingFee = subtotal >= config.commercial.freeShippingThreshold ? 0 : config.commercial.standardShippingFee;
    }

    const totalAmount = subtotal + shippingFee;
    const amountInCents = Math.round(totalAmount * 100);

    // 4. Identificadores y firma de integridad de Wompi
    const orderId = crypto.randomUUID();
    const orderNumber = `BCR-${Math.floor(100000 + Math.random() * 900000)}`;
    const wompiReference = wompiService.generateReference();
    const wompiSignature = wompiService.generateIntegritySignature({
      reference: wompiReference,
      amountInCents,
      currency: config.wompi.currency,
    });

    const now = new Date().toISOString();

    // 5. Persistencia atómica en SQLite
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_name, customer_document, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_method, notes,
        subtotal, shipping_fee, total_amount, currency,
        wompi_reference, wompi_signature, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, product_sku, unit_price, quantity, line_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      insertOrderStmt.run(
        orderId,
        orderNumber,
        fullName.trim(),
        documentNumber.trim(),
        normalizedEmail,
        phone.trim(),
        address.trim(),
        city.trim(),
        validShippingMethod,
        notes?.trim() || null,
        subtotal,
        shippingFee,
        totalAmount,
        config.wompi.currency,
        wompiReference,
        wompiSignature,
        'PENDING',
        now,
        now
      );

      for (const item of validatedItems) {
        insertItemStmt.run(
          orderId,
          item.productId,
          item.name,
          item.sku,
          item.unitPrice,
          item.quantity,
          item.lineTotal
        );
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('[OrderService] Error en transacción SQLite:', err);
      throw new Error('No fue posible persistir la orden en el servidor.');
    }

    return {
      orderId,
      orderNumber,
      status: 'PENDING',
      customer: {
        fullName: fullName.trim(),
        documentNumber: documentNumber.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
      },
      customerToken: this.generateCustomerToken(normalizedEmail),
      shippingMethod: validShippingMethod,
      items: validatedItems,
      subtotal,
      shippingFee,
      totalAmount,
      currency: config.wompi.currency,
      wompi: {
        reference: wompiReference,
        signature: wompiSignature,
        amountInCents,
        currency: config.wompi.currency,
        publicKey: config.wompi.publicKey,
      },
      createdAt: now,
    };
  },

  /**
   * Consulta los detalles de una orden por orderNumber o wompiReference
   */
  getOrderByIdentifier(identifier) {
    if (!identifier) return null;

    const orderStmt = db.prepare(`
      SELECT 
        id, order_number as orderNumber, customer_name as customerName,
        customer_document as customerDocument, customer_email as customerEmail,
        customer_phone as customerPhone, shipping_address as shippingAddress,
        shipping_city as shippingCity, shipping_method as shippingMethod,
        notes, subtotal, shipping_fee as shippingFee, total_amount as totalAmount,
        currency, wompi_reference as wompiReference, wompi_signature as wompiSignature,
        wompi_transaction_id as wompiTransactionId, status,
        created_at as createdAt, updated_at as updatedAt
      FROM orders
      WHERE order_number = ? OR wompi_reference = ? OR id = ?
    `);

    const order = orderStmt.get(identifier, identifier, identifier);
    if (!order) return null;

    const itemsStmt = db.prepare(`
      SELECT 
        product_id as productId, product_name as productName,
        product_sku as productSku, unit_price as unitPrice,
        quantity, line_total as lineTotal
      FROM order_items
      WHERE order_id = ?
    `);

    const items = itemsStmt.all(order.id);

    return {
      ...order,
      items,
    };
  },

  /**
   * Consulta pública y segura del estado de la transacción.
   * Regla de seguridad: Protege los datos personales sensibles (cédula, dirección, teléfono)
   * y jamás devuelve secretos o firmas privadas.
   */
  getOrderPublicStatus(identifier) {
    if (!identifier) return null;

    const orderStmt = db.prepare(`
      SELECT 
        order_number as orderNumber,
        wompi_reference as wompiReference,
        wompi_transaction_id as wompiTransactionId,
        customer_email as customerEmail,
        status,
        subtotal,
        shipping_fee as shippingFee,
        total_amount as totalAmount,
        currency,
        shipping_method as shippingMethod,
        created_at as createdAt,
        updated_at as updatedAt
      FROM orders
      WHERE order_number = ? OR wompi_reference = ? OR id = ?
    `);

    const order = orderStmt.get(identifier, identifier, identifier);
    if (!order) return null;

    const countStmt = db.prepare(`
      SELECT COUNT(*) as itemsCount FROM order_items
      WHERE order_id = (SELECT id FROM orders WHERE order_number = ? OR wompi_reference = ? OR id = ?)
    `);
    const { itemsCount } = countStmt.get(identifier, identifier, identifier);

    return {
      orderNumber: order.orderNumber,
      wompiReference: order.wompiReference,
      wompiTransactionId: order.wompiTransactionId,
      customerEmail: order.customerEmail,
      customerToken: this.generateCustomerToken(order.customerEmail),
      status: order.status,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      currency: order.currency,
      shippingMethod: order.shippingMethod,
      itemsCount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  },

  /**
   * Reconcilia de forma segura y autoritativa una orden con la API oficial de Wompi.
   */
  async reconcileWithWompi({ orderIdentifier, transactionId }) {
    if (!orderIdentifier) {
      throw new Error('Identificador de orden requerido para la conciliación.');
    }

    const order = db.prepare(`
      SELECT id, order_number, total_amount, currency, wompi_reference, wompi_transaction_id, status
      FROM orders
      WHERE order_number = ? OR wompi_reference = ? OR id = ?
    `).get(orderIdentifier, orderIdentifier, orderIdentifier);

    if (!order) {
      const err = new Error(`No se encontró la orden '${orderIdentifier}'.`);
      err.statusCode = 404;
      throw err;
    }

    // Si ya está en un estado final confirmado, devolver estado actual
    if (order.status === 'APPROVED' || order.status === 'DECLINED' || order.status === 'VOIDED') {
      return this.getOrderPublicStatus(order.order_number);
    }

    const txId = transactionId || order.wompi_transaction_id;
    if (!txId) {
      return this.getOrderPublicStatus(order.order_number);
    }

    const tx = await wompiService.fetchTransactionFromWompi(txId);
    if (!tx) {
      return this.getOrderPublicStatus(order.order_number);
    }

    // 1. Validar que la referencia de la transacción coincida con la orden
    if (tx.reference !== order.wompi_reference) {
      console.error(`[Reconcile ALERTA] Referencia discordante: esperada ${order.wompi_reference}, recibida ${tx.reference}`);
      const err = new Error('La referencia de la transacción no coincide con la orden.');
      err.statusCode = 400;
      throw err;
    }

    // 2. Validar que el monto coincida exactamente
    const expectedCents = Math.round(order.total_amount * 100);
    if (tx.amount_in_cents !== expectedCents) {
      console.error(`[Reconcile ALERTA] Monto discordante: esperado ${expectedCents}, recibido ${tx.amount_in_cents}`);
      db.prepare(`
        UPDATE orders
        SET status = 'AMOUNT_MISMATCH', wompi_transaction_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(tx.id, order.id);
      const err = new Error('El monto reportado por la pasarela difiere del total oficial de la orden.');
      err.statusCode = 400;
      throw err;
    }

    // 3. Validar moneda
    if (tx.currency !== order.currency) {
      console.error(`[Reconcile ALERTA] Moneda discordante: esperada ${order.currency}, recibida ${tx.currency}`);
      const err = new Error('La moneda de la transacción difiere de la orden.');
      err.statusCode = 400;
      throw err;
    }

    // 4. Actualizar estado verificado en SQLite
    const statusUpper = (tx.status || 'PENDING').toUpperCase();
    db.prepare(`
      UPDATE orders
      SET status = ?, wompi_transaction_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(statusUpper, tx.id, order.id);

    return this.getOrderPublicStatus(order.order_number);
  },

  /**
   * Genera un token temporal de alta entropía (HMAC-SHA256) asociado a un cliente.
   * Validez: 2 horas (7200 segundos).
   */
  generateCustomerToken(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const timestampHex = Date.now().toString(16);
    const nonce = crypto.randomBytes(16).toString('hex');
    const secret = config.wompi.integritySecret || 'bricor-customer-session-secret';
    const payload = `${normalized}:${timestampHex}:${nonce}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${timestampHex}.${nonce}.${hmac}`;
  },

  /**
   * Valida criptográficamente un token de acceso de cliente y su expiración.
   */
  verifyCustomerToken(email, token) {
    if (!email || !token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [timestampHex, nonce, receivedHmac] = parts;
    const timestamp = parseInt(timestampHex, 16);
    if (isNaN(timestamp)) return false;

    // Expiración a las 2 horas (7200000 ms)
    const MAX_AGE_MS = 2 * 60 * 60 * 1000;
    if (Date.now() - timestamp > MAX_AGE_MS || timestamp > Date.now() + 60000) {
      return false;
    }

    const normalized = email.trim().toLowerCase();
    const secret = config.wompi.integritySecret || 'bricor-customer-session-secret';
    const payload = `${normalized}:${timestampHex}:${nonce}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const bufA = Buffer.from(receivedHmac, 'utf8');
    const bufB = Buffer.from(expectedHmac, 'utf8');
    if (bufA.length !== bufB.length) return false;

    return crypto.timingSafeEqual(bufA, bufB);
  },

  /**
   * Autenticación segura de cliente para "Mis compras":
   * Requiere el correo y un número de pedido u orden reciente que demuestre titularidad.
   */
  authenticateCustomer({ email, orderNumber }) {
    if (!email || !orderNumber) {
      const err = new Error('Debes ingresar tu correo electrónico y el número de pedido para verificar tu identidad.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOrderNumber = orderNumber.trim();

    const order = db.prepare(`
      SELECT id, order_number, customer_name
      FROM orders
      WHERE LOWER(customer_email) = ? AND (order_number = ? OR wompi_reference = ?)
    `).get(normalizedEmail, cleanOrderNumber, cleanOrderNumber);

    if (!order) {
      const err = new Error('No se encontró ningún pedido que coincida con el correo y número ingresado.');
      err.statusCode = 401;
      throw err;
    }

    const token = this.generateCustomerToken(normalizedEmail);

    return {
      success: true,
      email: normalizedEmail,
      customerName: order.customer_name,
      token,
      expiresIn: 7200,
    };
  },

  /**
   * Consulta segura de historial de compras para un cliente validado.
   */
  getCustomerOrders({ email, token }) {
    if (!email || !token) {
      const err = new Error('Acceso no autorizado: se requiere correo y token de sesión válido.');
      err.statusCode = 401;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!this.verifyCustomerToken(normalizedEmail, token)) {
      const err = new Error('Tu sesión ha expirado o el token de acceso es inválido. Por favor verifica tus datos nuevamente.');
      err.statusCode = 401;
      throw err;
    }

    const ordersStmt = db.prepare(`
      SELECT 
        id,
        order_number as orderNumber,
        wompi_reference as wompiReference,
        wompi_transaction_id as wompiTransactionId,
        status,
        subtotal,
        shipping_fee as shippingFee,
        total_amount as totalAmount,
        currency,
        shipping_method as shippingMethod,
        shipping_city as shippingCity,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM orders
      WHERE LOWER(customer_email) = ?
      ORDER BY datetime(created_at) DESC
    `);

    const orders = ordersStmt.all(normalizedEmail);

    const itemsStmt = db.prepare(`
      SELECT 
        product_id as productId,
        product_name as productName,
        product_sku as productSku,
        unit_price as unitPrice,
        quantity,
        line_total as lineTotal
      FROM order_items
      WHERE order_id = ?
    `);

    return orders.map((o) => {
      const items = itemsStmt.all(o.id);
      delete o.id;

      // Separación estricta entre estado de pago y estado logístico real
      let logisticStatus = 'PENDIENTE_PAGO';
      let logisticStatusLabel = 'En espera de confirmación de pago';

      if (o.status === 'APPROVED') {
        if (o.shippingMethod === 'pickup') {
          logisticStatus = 'LISTO_PARA_RETIRO';
          logisticStatusLabel = 'Listo para retiro en punto BRICOR';
        } else {
          logisticStatus = 'EN_PREPARACION';
          logisticStatusLabel = 'En preparación en almacén';
        }
      } else if (o.status === 'DECLINED') {
        logisticStatus = 'CANCELADO';
        logisticStatusLabel = 'Cancelado por rechazo bancario';
      }

      return {
        ...o,
        logisticStatus,
        logisticStatusLabel,
        items,
      };
    });
  },

  /**
   * Procesa de forma segura y verificable los eventos de Wompi Webhooks:
   * https://docs.wompi.co/docs/colombia/eventos/
   */
  processWebhookEvent(eventPayload) {
    // 1. Verificación criptográfica de firma con WOMPI_EVENTS_SECRET
    const { isValid, receivedChecksum, computedChecksum } = wompiService.verifyWebhookEvent(eventPayload);
    if (!isValid) {
      console.error(`[Webhook] Checksum inválido. Recibido: ${receivedChecksum}, Esperado: ${computedChecksum}`);
      const err = new Error('Firma de evento inválida: el checksum no coincide.');
      err.statusCode = 401;
      throw err;
    }

    if (eventPayload.event !== 'transaction.updated') {
      console.log(`[Webhook] Evento ignorado (no es transaction.updated): ${eventPayload.event}`);
      return { success: true, ignored: true };
    }

    const transaction = eventPayload.data?.transaction;
    if (!transaction || !transaction.reference || !transaction.id) {
      const err = new Error('Payload de transacción incompleto.');
      err.statusCode = 400;
      throw err;
    }

    const statusUpper = (transaction.status || 'PENDING').toUpperCase();

    // 2. Control de idempotencia: evitar reprocesar eventos idénticos
    const duplicateCheck = db.prepare(`
      SELECT id FROM processed_events
      WHERE transaction_id = ? AND status = ?
    `).get(transaction.id, statusUpper);

    if (duplicateCheck) {
      console.log(`[Webhook] Evento duplicado omitido (Tx: ${transaction.id}, Estado: ${statusUpper})`);
      return { success: true, duplicate: true, status: statusUpper };
    }

    // 3. Localizar la orden por referencia única de Wompi
    const order = db.prepare(`
      SELECT id, order_number, total_amount, currency, status
      FROM orders
      WHERE wompi_reference = ?
    `).get(transaction.reference);

    if (!order) {
      console.error(`[Webhook] Orden no encontrada para referencia: ${transaction.reference}`);
      const err = new Error(`Orden no encontrada para referencia ${transaction.reference}`);
      err.statusCode = 404;
      throw err;
    }

    // 4. Validación de Integridad de Monto y Moneda
    const expectedCents = Math.round(order.total_amount * 100);
    if (transaction.amount_in_cents !== expectedCents) {
      console.error(
        `[Webhook ALERTA DE SEGURIDAD] Monto discordante para orden ${order.order_number}: esperado ${expectedCents} centavos, recibido ${transaction.amount_in_cents}`
      );
      // Registrar discrepancia en base de datos sin aprobar la orden
      db.prepare(`
        UPDATE orders
        SET status = 'AMOUNT_MISMATCH', wompi_transaction_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(transaction.id, order.id);

      const err = new Error('El monto reportado por la pasarela difiere del total oficial de la orden.');
      err.statusCode = 400;
      throw err;
    }

    if (transaction.currency !== order.currency) {
      console.error(`[Webhook ALERTA] Moneda discordante: esperada ${order.currency}, recibida ${transaction.currency}`);
      const err = new Error('La moneda de la transacción difiere de la orden.');
      err.statusCode = 400;
      throw err;
    }

    // 5. Actualización atómica en SQLite y registro en processed_events
    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare(`
        UPDATE orders
        SET status = ?, wompi_transaction_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(statusUpper, transaction.id, order.id);

      db.prepare(`
        INSERT INTO processed_events (
          id, event_type, transaction_id, reference, status, checksum
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        eventPayload.event,
        transaction.id,
        transaction.reference,
        statusUpper,
        eventPayload.signature.checksum
      );

      db.exec('COMMIT');
      console.log(`[Webhook] Orden ${order.order_number} actualizada a '${statusUpper}' (Tx: ${transaction.id})`);
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('[Webhook] Error en transacción SQLite:', err);
      throw err;
    }

    return {
      success: true,
      updated: true,
      orderNumber: order.order_number,
      status: statusUpper,
    };
  },
};
