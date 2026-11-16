/**
 * BRICOR - Suite de pruebas: Carrito Cross-Selling, Token de Cliente y Mis Compras
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { initDatabase, db } from '../database/db.js';
import { orderService } from '../services/orderService.js';
import { getCrossSellRecommendation, CROSS_SELL_RULES } from '../../src/data/crossSellRules.js';
import { SOCIAL_LINKS } from '../../src/config/socialLinks.js';

// Inicializar base de datos en memoria
initDatabase();

console.log('--- INICIANDO PRUEBAS DE CARRITO, CROSS-SELLING Y MIS COMPRAS ---');

// ─────────────────────────────────────────────────────────────
// 1. Cross-Selling Contextual
// ─────────────────────────────────────────────────────────────
console.log('\n--- 1. Cross-Selling Contextual ---');

const cartTaladro = [
  { product: { id: 'prod-001', name: 'Taladro Percutor Inalámbrico 20V Brushless' }, quantity: 1 },
];
const rec = getCrossSellRecommendation(cartTaladro);
assert.ok(rec, 'Debe sugerir un accesorio para el taladro');
assert.equal(rec.id, 'prod-004', 'Para taladro percutor debe sugerir pernos de fijación mecánica (primer ítem compatible en stock)');
console.log(`[PASS] Cross-sell para Taladro: "${rec.name}" (${rec.sku})`);

// Si el sugerido ya está en carrito, debe pasar al siguiente
const cartTaladroYPernos = [
  { product: { id: 'prod-001' }, quantity: 1 },
  { product: { id: 'prod-004' }, quantity: 1 },
];
const rec2 = getCrossSellRecommendation(cartTaladroYPernos);
assert.ok(rec2, 'Debe seguir sugiriendo algo al tener un ítem excluido');
assert.notEqual(rec2.id, 'prod-004', 'No debe recomendar prod ya en carrito');
console.log(`[PASS] Exclusión de ítem ya en carrito verificada → alternativo: "${rec2.name}"`);

// Carrito vacío → null
assert.equal(getCrossSellRecommendation([]), null, 'Carrito vacío → null');
console.log('[PASS] Carrito vacío retorna null');

// CROSS_SELL_RULES exportado correctamente
assert.ok(typeof CROSS_SELL_RULES === 'object', 'CROSS_SELL_RULES debe ser un objeto');
assert.ok('prod-001' in CROSS_SELL_RULES, 'CROSS_SELL_RULES debe mapear prod-001');
console.log('[PASS] CROSS_SELL_RULES exportado y mapeado correctamente');

// ─────────────────────────────────────────────────────────────
// 2. Token de Autenticación de Cliente (HMAC-SHA256 + expiración)
// ─────────────────────────────────────────────────────────────
console.log('\n--- 2. Seguridad del Token de Cliente ---');

const testEmail = 'cliente.prueba@bricor.co';

const tokenValido = orderService.generateCustomerToken(testEmail);
assert.ok(tokenValido && tokenValido.split('.').length === 3, 'Token tiene formato timestampHex.nonceHex.hmac');
assert.equal(orderService.verifyCustomerToken(testEmail, tokenValido), true, 'Token legítimo debe verificar como válido');
console.log('[PASS] Generación y verificación de token HMAC exitosa');

assert.equal(orderService.verifyCustomerToken('otro@externo.com', tokenValido), false, 'Token debe fallar con email distinto');
console.log('[PASS] Token rechazado para email distinto');

const tokenAdulterado = tokenValido.slice(0, -4) + '0000';
assert.equal(orderService.verifyCustomerToken(testEmail, tokenAdulterado), false, 'Token adulterado debe ser rechazado');
console.log('[PASS] Token falsificado rechazado con timingSafeEqual');

// Token expirado (timestamp hace 3 horas, ventana es 2 horas)
{
  const expTs = (Date.now() - (3 * 60 * 60 * 1000)).toString(16);
  const nonce = '0123456789abcdef';
  const payload = `${testEmail.trim().toLowerCase()}:${expTs}:${nonce}`;
  const secret = process.env.WOMPI_INTEGRITY_SECRET || 'test-secret';
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const tokenExpirado = `${expTs}.${nonce}.${hmac}`;
  assert.equal(orderService.verifyCustomerToken(testEmail, tokenExpirado), false, 'Token expirado debe ser rechazado');
  console.log('[PASS] Token expirado (3h) rechazado por ventana de expiración 2h');
}

// ─────────────────────────────────────────────────────────────
// 3. Consulta Segura de Órdenes y Separación de Estados
// ─────────────────────────────────────────────────────────────
console.log('\n--- 3. Consulta Segura de Órdenes ---');

// Crear una orden de prueba con delivery (supera $300k → flete $0)
const orden1 = orderService.createOrder({
  customer: {
    fullName: 'Ing. Carlos Mendoza',
    documentNumber: '1020304050',
    email: testEmail,
    phone: '3157894561',
    address: 'Av. Industrial 45 # 12-08',
    city: 'Bogotá D.C.',
  },
  items: [{ productId: 'prod-001', quantity: 1 }], // $689.000 → supera $300k, flete $0
  shippingMethod: 'delivery',
});

assert.ok(orden1.orderNumber, 'Orden creada con éxito');
assert.equal(orden1.shippingFee, 0, 'Flete debe ser $0 por superar $300.000 COP');
console.log(`[PASS] Orden creada: ${orden1.orderNumber}, flete $0 por superar umbral`);

// Simular aprobación directamente en DB (sin llamada live a Wompi API)
db.prepare(
  `UPDATE orders SET status = 'APPROVED', wompi_transaction_id = 'tx-unit-test-01', updated_at = datetime('now') WHERE order_number = ?`
).run(orden1.orderNumber);

// Autenticación por primera vez con email + orderNumber
const authResult = orderService.authenticateCustomer({ email: testEmail, orderNumber: orden1.orderNumber });
assert.ok(authResult.token, 'Autenticación exitosa devuelve token de sesión');
assert.equal(authResult.email, testEmail, 'Token contiene el email correcto');
console.log('[PASS] Autenticación por primera vez con email + número de orden exitosa');

// Intentar autenticar con una orden de otro email debe fallar
assert.throws(
  () => orderService.authenticateCustomer({ email: 'hacker@externo.com', orderNumber: orden1.orderNumber }),
  /No se encontró ningún pedido/,
  'Acceso a orden ajena debe lanzar error'
);
console.log('[PASS] Intento de acceso cruzado a orden de otro cliente bloqueado');

// Consultar pedidos con sesión autenticada
const ordenes = orderService.getCustomerOrders({ email: testEmail, token: authResult.token });
assert.ok(Array.isArray(ordenes) && ordenes.length >= 1, 'Debe retornar al menos una orden');

const o1 = ordenes.find(o => o.orderNumber === orden1.orderNumber);
assert.ok(o1, 'La orden creada debe aparecer en el historial');
assert.equal(o1.status, 'APPROVED', 'Estado de pago debe ser APPROVED');
// Delivery + APPROVED → logístico = EN_PREPARACION
assert.equal(o1.logisticStatus, 'EN_PREPARACION', 'Estado logístico de delivery aprobado debe ser EN_PREPARACION');
assert.equal(o1.shippingFee, 0, 'shippingFee debe ser $0 por envío gratis');
console.log(`[PASS] Estados separados verificados → Pago: "${o1.status}", Logística: "${o1.logisticStatus}"`);

// Crear una orden pickup y verificar que su estado logístico es LISTO_PARA_RETIRO cuando sea APPROVED
const orden2 = orderService.createOrder({
  customer: {
    fullName: 'María Fernanda Torres',
    documentNumber: '52001234',
    email: testEmail,
    phone: '3109876543',
    address: 'N/A retiro en tienda',
    city: 'Medellín',
  },
  items: [{ productId: 'prod-005', quantity: 1 }], // $142.000 → flete $18k pero pickup → $0
  shippingMethod: 'pickup',
});

assert.equal(orden2.shippingFee, 0, 'Pickup debe tener flete $0 independiente del subtotal');
console.log('[PASS] Pickup: flete $0 garantizado');

db.prepare(
  `UPDATE orders SET status = 'APPROVED', wompi_transaction_id = 'tx-unit-test-02', updated_at = datetime('now') WHERE order_number = ?`
).run(orden2.orderNumber);

const ordenes2 = orderService.getCustomerOrders({ email: testEmail, token: authResult.token });
const o2 = ordenes2.find(o => o.orderNumber === orden2.orderNumber);
assert.ok(o2, 'La orden pickup debe aparecer en historial');
assert.equal(o2.logisticStatus, 'LISTO_PARA_RETIRO', 'Pickup aprobado → LISTO_PARA_RETIRO');
console.log(`[PASS] Pickup aprobado → logístico: "${o2.logisticStatus}"`);

// Orden DECLINED no debe aparecer como aprobada ni con estado logístico
const orden3 = orderService.createOrder({
  customer: {
    fullName: 'Cliente Rechazado',
    documentNumber: '99000001',
    email: testEmail,
    phone: '3001234567',
    address: 'Calle Falsa 123',
    city: 'Cali',
  },
  items: [{ productId: 'prod-004', quantity: 1 }],
  shippingMethod: 'delivery',
});

db.prepare(
  `UPDATE orders SET status = 'DECLINED', updated_at = datetime('now') WHERE order_number = ?`
).run(orden3.orderNumber);

const ordenes3 = orderService.getCustomerOrders({ email: testEmail, token: authResult.token });
const o3 = ordenes3.find(o => o.orderNumber === orden3.orderNumber);
assert.ok(o3, 'Orden DECLINED debe aparecer en historial (para que el cliente pueda ver el rechazo)');
assert.equal(o3.status, 'DECLINED', 'Status debe reflejar DECLINED');
assert.notEqual(o3.logisticStatus, 'EN_PREPARACION', 'Orden DECLINED no debe tener estado EN_PREPARACION');
console.log(`[PASS] Orden rechazada refleja DECLINED sin estado logístico de preparación`);

// ─────────────────────────────────────────────────────────────
// 4. Configuración Centralizada de Redes Sociales
// ─────────────────────────────────────────────────────────────
console.log('\n--- 4. Configuración Centralizada de Redes Sociales ---');

assert.ok(typeof SOCIAL_LINKS === 'object', 'SOCIAL_LINKS debe ser un objeto');
assert.ok('instagram' in SOCIAL_LINKS, 'Debe exportar instagram');
assert.ok('facebook' in SOCIAL_LINKS, 'Debe exportar facebook');
assert.ok('tiktok' in SOCIAL_LINKS, 'Debe exportar tiktok');
assert.equal(typeof SOCIAL_LINKS.instagram, 'string', 'instagram debe ser string (vacío o URL)');
assert.equal(typeof SOCIAL_LINKS.facebook, 'string', 'facebook debe ser string (vacío o URL)');
assert.equal(typeof SOCIAL_LINKS.tiktok, 'string', 'tiktok debe ser string (vacío o URL)');
// No inventar URLs: si están vacíos, está bien (se ocultan en footer)
console.log('[PASS] SOCIAL_LINKS exporta instagram, facebook y tiktok centralizados');
console.log('[PASS] Redes sin URL configurada → se ocultarán en footer (correcto)');

console.log('\n============================================================');
console.log(' TODAS LAS PRUEBAS DE CARRITO Y MIS COMPRAS COMPLETADAS CON ÉXITO');
console.log('============================================================');
