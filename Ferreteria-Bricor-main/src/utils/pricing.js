/**
 * BRICOR - Lógica y Reglas de Precios y Envíos
 * Fuente centralizada de cálculo de fletes y condiciones comerciales.
 */

export const FREE_SHIPPING_THRESHOLD = 300000; // Pedidos superiores a $300.000 COP tienen flete gratis
export const STANDARD_SHIPPING_FEE = 18000;    // Tarifa fija de despacho para pedidos menores

/**
 * Calcula el valor del flete según el subtotal y el método de despacho seleccionado.
 * 
 * @param {number} subtotal - Monto acumulado de los artículos
 * @param {'delivery' | 'pickup'} shippingMethod - Método de despacho ('delivery' o 'pickup')
 * @returns {number} Costo final del flete en COP
 */
export function calculateShippingFee(subtotal, shippingMethod = 'delivery') {
  if (!subtotal || subtotal <= 0) {
    return 0;
  }

  if (shippingMethod === 'pickup') {
    return 0;
  }

  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
}
