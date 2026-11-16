import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { initDatabase } from '../database/db.js';
import { productService } from '../services/productService.js';
import { orderService } from '../services/orderService.js';

async function runTestSuite() {
  console.log('--- INICIANDO SUITE DE PRUEBAS DEL BACKEND BRICOR ---');
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

  // 1. Inicializar base de datos
  initDatabase();
  const products = productService.getAllProducts();
  assert(products.length > 0, `Catálogo SQLite sembrado correctamente (${products.length} productos)`);

  // 2. Verificación de cálculo autoritativo de precios en el servidor
  const sampleProduct = products[0];
  const itemsCalculation = productService.validateAndCalculateItems([
    { productId: sampleProduct.id, quantity: 2 },
  ]);
  assert(
    itemsCalculation.subtotal === sampleProduct.price * 2,
    `Cálculo autoritativo de precio en servidor: ${sampleProduct.price} x 2 = ${itemsCalculation.subtotal}`
  );

  // 3. Verificación de rechazo por stock insuficiente
  let stockErrorCaught = false;
  try {
    productService.validateAndCalculateItems([
      { productId: sampleProduct.id, quantity: 99999 },
    ]);
  } catch (err) {
    stockErrorCaught = true;
    assert(
      err.message.includes('Stock insuficiente'),
      `Rechazo por stock insuficiente verificado: "${err.message}"`
    );
  }
  assert(stockErrorCaught, 'El servidor bloqueó exitosamente una solicitud que excedía el stock disponible');

  // 4. Verificación de rechazo por producto inexistente
  let notFoundErrorCaught = false;
  try {
    productService.validateAndCalculateItems([
      { productId: 'prod-inexistente-xyz', quantity: 1 },
    ]);
  } catch (err) {
    notFoundErrorCaught = true;
    assert(
      err.message.includes('no existe'),
      `Rechazo por producto inexistente verificado: "${err.message}"`
    );
  }
  assert(notFoundErrorCaught, 'El servidor bloqueó exitosamente un ID de producto fraudulento');

  // 5. Creación de orden con despacho a domicilio (mayor a 300k -> flete gratis)
  const orderAbove300k = orderService.createOrder({
    customer: {
      fullName: 'Constructora Bolívar S.A.S.',
      documentNumber: '900.123.456-7',
      email: 'compras@bolivar.com.co',
      phone: '3104567890',
      address: 'Autopista Norte Km 18',
      city: 'Chía',
    },
    items: [{ productId: 'prod-001', quantity: 1 }], // Taladro $689.000 COP
    shippingMethod: 'delivery',
    notes: 'Entregar en portería principal',
  });

  assert(orderAbove300k.subtotal === 689000, `Subtotal orden > 300k correcto ($689.000)`);
  assert(orderAbove300k.shippingFee === 0, `Flete gratis por superar umbral de $300.000 COP`);
  assert(orderAbove300k.totalAmount === 689000, `Total orden > 300k correcto ($689.000)`);
  assert(orderAbove300k.wompi.amountInCents === 68900000, `Monto en centavos Wompi correcto (68900000)`);

  // 6. Verificación de firma de integridad Wompi
  const expectedSigRaw = `${orderAbove300k.wompi.reference}68900000COP${config.wompi.integritySecret}`;
  const expectedSig = crypto.createHash('sha256').update(expectedSigRaw).digest('hex');
  assert(
    orderAbove300k.wompi.signature === expectedSig,
    `Firma de integridad SHA-256 de Wompi coincide exactamente con la fórmula oficial`
  );

  // 7. Creación de orden con despacho a domicilio (menor a 300k -> flete $18.000)
  const orderBelow300k = orderService.createOrder({
    customer: {
      fullName: 'Juan Pérez',
      documentNumber: '1018456789',
      email: 'juan.perez@gmail.com',
      phone: '3007654321',
      address: 'Calle 45 # 12-34',
      city: 'Bogotá D.C.',
    },
    items: [{ productId: 'prod-005', quantity: 1 }], // Mortero $142.000 COP
    shippingMethod: 'delivery',
  });

  assert(orderBelow300k.subtotal === 142000, `Subtotal orden < 300k correcto ($142.000)`);
  assert(orderBelow300k.shippingFee === 18000, `Flete aplicado correctamente para pedido menor ($18.000)`);
  assert(orderBelow300k.totalAmount === 160000, `Total orden con flete correcto ($160.000)`);
  assert(orderBelow300k.wompi.amountInCents === 16000000, `Monto en centavos Wompi correcto (16000000)`);

  // 8. Creación de orden con retiro en punto BRICOR (menor a 300k -> flete $0)
  const orderPickup = orderService.createOrder({
    customer: {
      fullName: 'Carlos Gómez',
      documentNumber: '80123456',
      email: 'cgomez@outlook.com',
      phone: '3159876543',
      address: 'Cra 15 # 85-20',
      city: 'Bogotá D.C.',
    },
    items: [{ productId: 'prod-005', quantity: 1 }], // Mortero $142.000 COP
    shippingMethod: 'pickup',
  });

  assert(orderPickup.shippingFee === 0, `Flete $0 garantizado al seleccionar 'pickup'`);
  assert(orderPickup.totalAmount === 142000, `Total orden 'pickup' igual al subtotal ($142.000)`);

  // 9. Consulta de orden en SQLite por número de orden y por referencia Wompi
  const queriedByNumber = orderService.getOrderByIdentifier(orderAbove300k.orderNumber);
  assert(queriedByNumber !== null, `Consulta por orderNumber (${orderAbove300k.orderNumber}) exitosa`);
  assert(queriedByNumber.customerName === 'Constructora Bolívar S.A.S.', `Datos de cliente en SQLite verificados`);
  assert(queriedByNumber.items.length === 1, `Ítems de la orden persistidos en tabla order_items`);

  const queriedByWompiRef = orderService.getOrderByIdentifier(orderAbove300k.wompi.reference);
  assert(queriedByWompiRef !== null, `Consulta por wompiReference (${orderAbove300k.wompi.reference}) exitosa`);
  assert(queriedByWompiRef.orderNumber === orderAbove300k.orderNumber, `Coincidencia unívoca de referencias en SQLite`);

  console.log(`\n--- RESULTADOS: ${passed} PASADAS, ${failed} FALLIDAS ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Error no controlado en suite:', err);
  process.exit(1);
});
