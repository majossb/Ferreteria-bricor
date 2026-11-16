import app from '../index.js';

async function runHttpTest() {
  console.log('--- INICIANDO PRUEBAS HTTP DE ENDPOINTS EXPRESS ---');
  const server = app.listen(3099);

  try {
    const baseUrl = 'http://127.0.0.1:3099/api/v1';

    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('[HTTP] GET /health:', healthRes.status, healthData.status);

    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error('Health check falló');
    }

    // 2. Products
    const prodRes = await fetch(`${baseUrl}/products`);
    const prodData = await prodRes.json();
    console.log('[HTTP] GET /products:', prodRes.status, `(${prodData.data.length} productos)`);

    if (prodRes.status !== 200 || prodData.data.length === 0) {
      throw new Error('Products endpoint falló');
    }

    // 3. Create Order
    const orderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          fullName: 'Empresa Demo S.A.S.',
          documentNumber: '900.888.777-1',
          email: 'contacto@empresademo.com',
          phone: '3123456789',
          address: 'Zona Industrial Lote 4',
          city: 'Bogotá D.C.',
        },
        items: [{ productId: 'prod-002', quantity: 1 }], // Amoladora $325.000 COP
        shippingMethod: 'delivery',
      }),
    });
    const orderData = await orderRes.json();
    console.log('[HTTP] POST /orders:', orderRes.status, orderData.data.orderNumber, 'Wompi Ref:', orderData.data.wompi.reference);

    if (orderRes.status !== 201 || !orderData.data.wompi.signature) {
      throw new Error('Create order endpoint falló');
    }

    // 4. Query Order
    const queryRes = await fetch(`${baseUrl}/orders/${orderData.data.orderNumber}`);
    const queryData = await queryRes.json();
    console.log('[HTTP] GET /orders/:id:', queryRes.status, queryData.data.orderNumber, 'Status:', queryData.data.status);

    if (queryRes.status !== 200 || queryData.data.orderNumber !== orderData.data.orderNumber) {
      throw new Error('Query order endpoint falló');
    }

    console.log('\n--- TODAS LAS PRUEBAS HTTP COMPLETADAS CON ÉXITO ---');
  } finally {
    server.close();
  }
}

runHttpTest().catch((err) => {
  console.error('Error en pruebas HTTP:', err);
  process.exit(1);
});
