/**
 * Formateador de moneda para BRICOR
 * Configurado por defecto para Pesos Colombianos (COP) sin decimales superfluos.
 * Cumple con la directriz de formato monetario centralizado y consistente.
 */

export function formatCurrency(amount, includeCurrencyCode = false) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$ 0';
  }

  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Formato tipo "$ 185.000" o con sufijo COP si se solicita
  if (includeCurrencyCode) {
    return `${formatted} COP`;
  }

  return formatted;
}

/**
 * Calcula el porcentaje de descuento si existe un precio original
 */
export function calculateDiscount(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
  return discount;
}
