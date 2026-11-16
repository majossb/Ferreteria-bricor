import { PRODUCTS } from './products.js';

/**
 * Matriz de compatibilidad y venta cruzada (Cross-Selling) para BRICOR.
 * Basada estrictamente en relaciones de afinidad técnica y compatibilidad de obra entre productos reales del catálogo.
 */
const COMPATIBILITY_MAP = {
  // Taladro Percutor -> Pernos de fijación mecánica, o Amoladora para preparación
  'prod-001': ['prod-004', 'prod-002', 'prod-003'],
  // Amoladora Industrial -> Esmalte anticorrosivo (acabado metal), o Pernos grado 8
  'prod-002': ['prod-007', 'prod-004', 'prod-003'],
  // Herramientas manuales -> Pernos Grado 8 o Breaker eléctrico
  'prod-003': ['prod-004', 'prod-008', 'prod-006'],
  // Pernos Grado 8 -> Herramientas mecánicas para apriete, o Taladro
  'prod-004': ['prod-003', 'prod-001', 'prod-005'],
  // Mortero impermeabilizante -> Válvula de bola para instalaciones hidrosanitarias
  'prod-005': ['prod-006', 'prod-007', 'prod-004'],
  // Válvula de bola -> Pernos de ensamble o Mortero
  'prod-006': ['prod-004', 'prod-005', 'prod-003'],
  // Esmalte anticorrosivo -> Amoladora (preparación de superficie) o Pernos
  'prod-007': ['prod-002', 'prod-004', 'prod-003'],
  // Breaker eléctrico -> Juego de herramientas mecánicas para tableros
  'prod-008': ['prod-003', 'prod-004', 'prod-001'],
};

/**
 * Obtiene exactamente UN producto complementario relevante que no esté presente en el carrito.
 * 
 * @param {Array} cartItems - Lista de ítems en el carrito [{ product, quantity }]
 * @returns {Object|null} El producto complementario o null si no aplica
 */
export function getComplementaryProduct(cartItems = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return null;

  const cartProductIds = new Set(cartItems.map((item) => item?.product?.id).filter(Boolean));

  // 1. Buscar según afinidad directa de los productos en el carrito (de más reciente a más antiguo)
  const candidateIds = [];
  for (let i = cartItems.length - 1; i >= 0; i--) {
    const pId = cartItems[i]?.product?.id;
    const related = COMPATIBILITY_MAP[pId] || [];
    for (const relId of related) {
      if (!cartProductIds.has(relId) && !candidateIds.includes(relId)) {
        candidateIds.push(relId);
      }
    }
  }

  // 2. Localizar el primer candidato disponible en inventario
  for (const candidateId of candidateIds) {
    const product = PRODUCTS.find((p) => p.id === candidateId);
    if (product && product.inStock && (product.stockCount === undefined || product.stockCount > 0)) {
      return product;
    }
  }

  // 3. Fallback: cualquier producto en stock que no esté en el carrito
  const fallback = PRODUCTS.find(
    (p) => !cartProductIds.has(p.id) && p.inStock && (p.stockCount === undefined || p.stockCount > 0)
  );

  return fallback || null;
}

export const getCrossSellRecommendation = getComplementaryProduct;
export { COMPATIBILITY_MAP as CROSS_SELL_RULES };
export default getComplementaryProduct;
