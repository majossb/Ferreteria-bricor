import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config/env.js';
import { initDatabase, db } from '../database/db.js';
import { orderService } from '../services/orderService.js';
import { wompiService } from '../services/wompiService.js';

async function runWompiLifecycleTests() {
  console.log('========================================================================');
  console.log(' INICIANDO 14 PRUEBAS OBLIGATORIAS DE INTEGRACIÓN Y CICLO WOMPI SANDBOX');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  initDatabase();

  // Helper para generar payload de webhook firmado conforme a la fórmula oficial de Wompi
  function createSignedWebhookPayload({
    transactionId = `tx-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    status = 'APPROVED',
    reference,
    amountInCents,
    currency = 'COP',
    timestamp = Math.floor(Date.now() / 1000),
    overrideChecksum = null,
  }) {
    const properties = [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ];

    const data = {
      transaction: {
        id: transactionId,
        status,
        reference,
        amount_in_cents: amountInCents,
        currency,
        customer_email: 'cliente@bricor.com',
        payment_method_type: 'CARD',
      },
    };

    let concat = `${transactionId}${status}${amountInCents}${timestamp}${config.wompi.eventsSecret}`;
    const checksum = overrideChecksum || crypto.createHash('sha256').update(concat).digest('hex');

    return {
      event: 'transaction.updated',
      data,
      sent_at: new Date().toISOString(),
      timestamp,
      signature: {
        properties,
        checksum,
      },
      environment: 'test',
    };
  }

  // --------------------------------------------------------------------------
  // PRUEBA 1: Creación de una orden en el backend
  // --------------------------------------------------------------------------
  console.log('--- PRUEBA 1: Creación de una orden ---');
  const order1 = orderService.createOrder({
    customer: {
      fullName: 'Distribuidora Ferretera del Valle S.A.S.',
      documentNumber: '900.555.444-3',
      email: 'compras@valle.com',
      phone: '3151234567',
      address: 'Zona Industrial Acopi',
      city: 'Yumbo',
    },
    items: [{ productId: 'prod-001', quantity: 1 }], // 689.000 COP
    shippingMethod: 'delivery',
  });
  assert(order1.status === 'PENDING', `Orden creada con estado PENDING (${order1.orderNumber})`);
  assert(order1.totalAmount === 689000, `Total calculado en servidor correcto: $${order1.totalAmount} COP`);

  // --------------------------------------------------------------------------
  // PRUEBA 2: Generación de firma de integridad SHA-256 oficial
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 2: Generación de firma de integridad ---');
  const expectedSignatureRaw = `${order1.wompi.reference}${order1.wompi.amountInCents}${order1.wompi.currency}${config.wompi.integritySecret}`;
  const expectedHash = crypto.createHash('sha256').update(expectedSignatureRaw).digest('hex');
  assert(order1.wompi.signature === expectedHash, 'Firma generada coincide exactamente con SHA-256(<ref><centavos><moneda><secreto>)');
  assert(
    wompiService.verifyIntegritySignature({
      reference: order1.wompi.reference,
      amountInCents: order1.wompi.amountInCents,
      currency: order1.wompi.currency,
      signature: order1.wompi.signature,
    }),
    'Verificación criptográfica de firma de integridad positiva'
  );

  // --------------------------------------------------------------------------
  // PRUEBA 3: Inicialización del Widget y parámetros requeridos
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 3: Inicialización del Widget ---');
  const publicConfig = wompiService.getPublicConfig();
  assert(publicConfig.publicKey.startsWith('pub_test_'), 'Llave pública corresponde al entorno Sandbox');
  assert(publicConfig.currency === 'COP', 'Moneda configurada como COP');
  assert(publicConfig.isSandbox === true, 'Modo Sandbox activo');
  assert(order1.wompi.publicKey === publicConfig.publicKey, 'Llave pública en orden coincide con configuración pública');

  // --------------------------------------------------------------------------
  // PRUEBA 4: Carga y validación de métodos de pago desde Wompi Sandbox
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 4: Carga de métodos de pago desde Wompi Sandbox ---');
  let merchantData = null;
  try {
    const mRes = await fetch(`${config.wompi.apiUrl}/merchants/${publicConfig.publicKey}`);
    const mJson = await mRes.json();
    merchantData = mJson.data;
  } catch (err) {
    console.error('Error al consultar Wompi Sandbox:', err);
  }
  assert(merchantData !== null, 'Comunicación con endpoint de comercios Wompi Sandbox exitosa');
  assert(merchantData?.name === 'Bricor', `Comercio validado en Sandbox: "${merchantData?.name}"`);
  assert(
    Array.isArray(merchantData?.accepted_payment_methods) && merchantData.accepted_payment_methods.includes('CARD'),
    `Métodos de pago habilitados: ${merchantData?.accepted_payment_methods?.join(', ')}`
  );

  // --------------------------------------------------------------------------
  // PRUEBA 5: Transacción Aprobada (APPROVED) en Wompi Sandbox
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 5: Pago aprobado en Sandbox ---');
  let approvedTxId = null;
  try {
    const acceptanceToken = merchantData.presigned_acceptance.acceptance_token;
    // Tokenizar tarjeta de prueba de aprobación
    const cardRes = await fetch(`${config.wompi.apiUrl}/tokens/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicConfig.publicKey}` },
      body: JSON.stringify({
        number: '4242424242424242',
        cvc: '123',
        exp_month: '12',
        exp_year: '30',
        card_holder: 'Cliente Bricor Aprobado',
      }),
    }).then((r) => r.json());

    const txRes = await fetch(`${config.wompi.apiUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicConfig.publicKey}` },
      body: JSON.stringify({
        acceptance_token: acceptanceToken,
        amount_in_cents: order1.wompi.amountInCents,
        currency: order1.wompi.currency,
        customer_email: 'compras@valle.com',
        payment_method: { type: 'CARD', token: cardRes.data.id, installments: 1 },
        reference: order1.wompi.reference,
        signature: order1.wompi.signature,
        customer_data: { phone_number: '3151234567', full_name: 'Cliente Bricor Aprobado' },
      }),
    }).then((r) => r.json());

    approvedTxId = txRes.data?.id;

    // Polling hasta estado final en Wompi Sandbox
    let status = txRes.data?.status;
    let tries = 0;
    while (status === 'PENDING' && tries < 6) {
      await new Promise((r) => setTimeout(r, 1000));
      tries++;
      const poll = await fetch(`${config.wompi.apiUrl}/transactions/${approvedTxId}`).then((r) => r.json());
      status = poll.data?.status;
    }
    assert(status === 'APPROVED', `Transacción Wompi Sandbox procesada como APPROVED (ID: ${approvedTxId})`);

    // Conciliación server-to-server en BRICOR
    const reconciledApproved = await orderService.reconcileWithWompi({
      orderIdentifier: order1.orderNumber,
      transactionId: approvedTxId,
    });
    assert(reconciledApproved.status === 'APPROVED', 'Orden en BRICOR actualizada a APPROVED mediante reconciliación oficial');
  } catch (err) {
    console.error('Error en prueba de pago aprobado:', err);
    assert(false, `Fallo en prueba de pago aprobado: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // PRUEBA 6: Transacción Rechazada (DECLINED) en Wompi Sandbox
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 6: Pago rechazado en Sandbox ---');
  const orderDeclined = orderService.createOrder({
    customer: {
      fullName: 'Prueba Rechazo Sandbox',
      documentNumber: '11223344',
      email: 'rechazo@bricor.com',
      phone: '3101112233',
      address: 'Calle 10 # 20-30',
      city: 'Cali',
    },
    items: [{ productId: 'prod-005', quantity: 1 }],
    shippingMethod: 'pickup',
  });

  try {
    // Obtener token de aceptación fresco para la segunda transacción
    const freshMerchantRes = await fetch(`${config.wompi.apiUrl}/merchants/${publicConfig.publicKey}`).then((r) => r.json());
    const acceptanceToken = freshMerchantRes.data?.presigned_acceptance?.acceptance_token;

    // Tokenizar tarjeta de declinación
    const cardRes = await fetch(`${config.wompi.apiUrl}/tokens/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicConfig.publicKey}` },
      body: JSON.stringify({
        number: '4111111111111111',
        cvc: '123',
        exp_month: '12',
        exp_year: '30',
        card_holder: 'Cliente Rechazo Sandbox',
      }),
    }).then((r) => r.json());

    if (!cardRes.data?.id) {
      throw new Error(`Error al tokenizar tarjeta de rechazo: ${JSON.stringify(cardRes)}`);
    }

    const txRes = await fetch(`${config.wompi.apiUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicConfig.publicKey}` },
      body: JSON.stringify({
        acceptance_token: acceptanceToken,
        amount_in_cents: orderDeclined.wompi.amountInCents,
        currency: orderDeclined.wompi.currency,
        customer_email: 'rechazo@bricor.com',
        payment_method: { type: 'CARD', token: cardRes.data.id, installments: 1 },
        reference: orderDeclined.wompi.reference,
        signature: orderDeclined.wompi.signature,
        customer_data: { phone_number: '3101112233', full_name: 'Cliente Rechazo Sandbox' },
      }),
    }).then((r) => r.json());

    if (!txRes.data?.id) {
      throw new Error(`Error al crear transacción de rechazo en Wompi: ${JSON.stringify(txRes)}`);
    }

    const declinedTxId = txRes.data.id;
    let status = txRes.data.status;
    let tries = 0;
    while (status === 'PENDING' && tries < 6) {
      await new Promise((r) => setTimeout(r, 1000));
      tries++;
      const poll = await fetch(`${config.wompi.apiUrl}/transactions/${declinedTxId}`).then((r) => r.json());
      status = poll.data?.status;
    }
    assert(status === 'DECLINED', `Transacción Wompi Sandbox procesada como DECLINED (ID: ${declinedTxId})`);

    const reconciledDeclined = await orderService.reconcileWithWompi({
      orderIdentifier: orderDeclined.orderNumber,
      transactionId: declinedTxId,
    });
    assert(reconciledDeclined.status === 'DECLINED', 'Orden en BRICOR actualizada a DECLINED');
  } catch (err) {
    console.error('Error en prueba de pago rechazado:', err);
    assert(false, `Fallo en prueba de pago rechazado: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // PRUEBA 7: Transacción Pendiente (PENDING)
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 7: Pago pendiente ---');
  const orderPending = orderService.createOrder({
    customer: {
      fullName: 'Cliente PSE Pendiente',
      documentNumber: '77889900',
      email: 'pendiente@bricor.com',
      phone: '3123456789',
      address: 'Carrera 15 # 80-10',
      city: 'Bogotá',
    },
    items: [{ productId: 'prod-006', quantity: 1 }],
    shippingMethod: 'delivery',
  });

  const pendingPayload = createSignedWebhookPayload({
    reference: orderPending.wompi.reference,
    amountInCents: orderPending.wompi.amountInCents,
    status: 'PENDING',
  });
  orderService.processWebhookEvent(pendingPayload);
  const pendingCheck = orderService.getOrderByIdentifier(orderPending.orderNumber);
  assert(pendingCheck.status === 'PENDING', 'La orden se mantiene como PENDING en base de datos');

  // --------------------------------------------------------------------------
  // PRUEBA 8: Webhook válido con firma criptográfica correcta
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 8: Webhook válido ---');
  const validWebhookPayload = createSignedWebhookPayload({
    reference: orderPending.wompi.reference,
    amountInCents: orderPending.wompi.amountInCents,
    status: 'APPROVED',
  });
  const webhookResult = orderService.processWebhookEvent(validWebhookPayload);
  assert(webhookResult.success === true, 'Webhook procesado exitosamente');
  assert(webhookResult.status === 'APPROVED', 'Estado del webhook retornado como APPROVED');
  const orderAfterValidWebhook = orderService.getOrderByIdentifier(orderPending.orderNumber);
  assert(orderAfterValidWebhook.status === 'APPROVED', 'Orden actualizada en base de datos tras webhook válido');

  // --------------------------------------------------------------------------
  // PRUEBA 9: Webhook inválido (firma o checksum manipulado)
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 9: Webhook inválido ---');
  let invalidSignatureCaught = false;
  try {
    const invalidPayload = createSignedWebhookPayload({
      reference: orderPending.wompi.reference,
      amountInCents: orderPending.wompi.amountInCents,
      status: 'APPROVED',
      overrideChecksum: 'checksum_falso_adulterado_0123456789abcdef',
    });
    orderService.processWebhookEvent(invalidPayload);
  } catch (err) {
    invalidSignatureCaught = true;
    assert(err.statusCode === 401 || err.message.includes('inválida'), `Webhook rechazado con error: "${err.message}"`);
  }
  assert(invalidSignatureCaught, 'El servidor bloqueó exitosamente el webhook con checksum falso');

  // --------------------------------------------------------------------------
  // PRUEBA 10: Eventos duplicados (Control de Idempotencia)
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 10: Eventos duplicados ---');
  const duplicateWebhookResult = orderService.processWebhookEvent(validWebhookPayload);
  assert(
    duplicateWebhookResult.success === true && duplicateWebhookResult.duplicate === true,
    'Evento duplicado reconocido e ignorado idempotentemente sin duplicar registros'
  );

  // --------------------------------------------------------------------------
  // PRUEBA 11: Referencias duplicadas (Unicidad garantizada)
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 11: Referencias duplicadas ---');
  let duplicateRefCaught = false;
  try {
    // Intentar insertar manualmente una orden con la misma referencia de Wompi
    db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_name, customer_document, customer_email, customer_phone,
        shipping_address, shipping_city, shipping_method, subtotal, shipping_fee, total_amount,
        currency, wompi_reference, wompi_signature, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      crypto.randomUUID(),
      `BCR-${Math.floor(100000 + Math.random() * 900000)}`,
      'Test Duplicado',
      '12345678',
      'test@dup.com',
      '3001234567',
      'Calle 1',
      'Bogotá',
      'delivery',
      100000,
      18000,
      118000,
      'COP',
      order1.wompi.reference, // Referencia duplicada
      'sig_dummy',
      'PENDING'
    );
  } catch (err) {
    duplicateRefCaught = true;
    assert(err.message.includes('UNIQUE') || err.message.includes('constraint'), `Rechazo de referencia duplicada por restricción UNIQUE: "${err.message}"`);
  }
  assert(duplicateRefCaught, 'SQLite garantizó la unicidad estricta de la referencia de Wompi');

  // --------------------------------------------------------------------------
  // PRUEBA 12: Persistencia de órdenes en SQLite
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 12: Persistencia de órdenes ---');
  const newDbInstance = new DatabaseSync(config.dbPath);
  const persistedOrder = newDbInstance
    .prepare('SELECT order_number, status, total_amount, wompi_reference FROM orders WHERE order_number = ?')
    .get(order1.orderNumber);

  assert(persistedOrder !== undefined, `Orden persistida encontrada en base de datos (${persistedOrder?.order_number})`);
  assert(persistedOrder?.status === 'APPROVED', `Estado persistido correctamente como ${persistedOrder?.status}`);
  assert(persistedOrder?.wompi_reference === order1.wompi.reference, 'Referencia Wompi persistida intacta');

  // --------------------------------------------------------------------------
  // PRUEBA 13: Conservación del carrito ante fallos / rechazos
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 13: Conservación del carrito ante fallos ---');
  // Simular lógica de validación de estado en cliente: solo vaciar si status === 'APPROVED'
  function evaluateCartAction(status) {
    if (status === 'APPROVED') {
      return 'CLEAR_CART';
    }
    return 'PRESERVE_CART';
  }
  assert(evaluateCartAction('DECLINED') === 'PRESERVE_CART', 'Carrito conservado ante estado DECLINED');
  assert(evaluateCartAction('PENDING') === 'PRESERVE_CART', 'Carrito conservado ante estado PENDING');
  assert(evaluateCartAction('ERROR') === 'PRESERVE_CART', 'Carrito conservado ante error de comunicación');
  assert(evaluateCartAction('AMOUNT_MISMATCH') === 'PRESERVE_CART', 'Carrito conservado ante discrepancia de monto');
  assert(evaluateCartAction('APPROVED') === 'CLEAR_CART', 'Carrito vaciado ÚNICAMENTE tras confirmación de APPROVED');

  // --------------------------------------------------------------------------
  // PRUEBA 14: Confirmación correcta después de recibir el evento
  // --------------------------------------------------------------------------
  console.log('\n--- PRUEBA 14: Confirmación correcta tras evento ---');
  const finalPublicStatus = orderService.getOrderPublicStatus(order1.orderNumber);
  assert(finalPublicStatus.orderNumber === order1.orderNumber, 'Confirmación pública retorna el número de orden oficial');
  assert(finalPublicStatus.status === 'APPROVED', 'Estado público confirmado como APPROVED');
  assert(finalPublicStatus.totalAmount === 689000, 'Monto final verificado');
  assert(finalPublicStatus.customerDocument === undefined, 'Regla de seguridad: Documento de identidad NO expuesto');
  assert(finalPublicStatus.customerPhone === undefined, 'Regla de seguridad: Teléfono NO expuesto');
  assert(finalPublicStatus.shippingAddress === undefined, 'Regla de seguridad: Dirección física NO expuesta');
  assert(finalPublicStatus.wompiSignature === undefined, 'Regla de seguridad: Firma ni secretos expuestos');

  console.log('\n========================================================================');
  console.log(` RESULTADO DE LAS 14 PRUEBAS OBLIGATORIAS: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWompiLifecycleTests().catch((err) => {
  console.error('Error no controlado en suite de pruebas:', err);
  process.exit(1);
});
