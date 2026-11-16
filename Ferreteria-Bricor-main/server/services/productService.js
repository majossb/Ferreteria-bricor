import { db } from '../database/db.js';

export const productService = {
  /**
   * Obtiene todos los productos del inventario autoritativo en SQLite
   */
  getAllProducts() {
    const stmt = db.prepare(`
      SELECT 
        id, sku, name, brand, category_id as categoryId, 
        price, original_price as originalPrice, stock, in_stock as inStock, 
        short_description as shortDescription
      FROM products
      ORDER BY name ASC
    `);
    return stmt.all();
  },

  /**
   * Obtiene un producto individual por su ID
   */
  getProductById(id) {
    const stmt = db.prepare(`
      SELECT 
        id, sku, name, brand, category_id as categoryId, 
        price, original_price as originalPrice, stock, in_stock as inStock, 
        short_description as shortDescription
      FROM products
      WHERE id = ?
    `);
    return stmt.get(id) || null;
  },

  /**
   * Valida autoritativamente una lista de ítems solicitados por el cliente.
   * Regla de arquitectura: El servidor consulta el precio y stock en la base de datos
   * y rechaza cualquier solicitud con stock insuficiente o producto inexistente.
   * 
   * @param {Array<{productId: string, quantity: number}>} items
   * @returns {{validatedItems: Array, subtotal: number}}
   */
  validateAndCalculateItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('El pedido debe incluir al menos un producto válido.');
    }

    const validatedItems = [];
    let subtotal = 0;

    const findStmt = db.prepare(`
      SELECT id, sku, name, price, stock, in_stock
      FROM products
      WHERE id = ?
    `);

    for (const item of items) {
      const { productId, quantity } = item;
      const parsedQty = parseInt(quantity, 10);

      if (!productId || isNaN(parsedQty) || parsedQty <= 0) {
        throw new Error(`Ítem inválido en el pedido (ID: ${productId}, Cantidad: ${quantity})`);
      }

      const product = findStmt.get(productId);

      if (!product) {
        throw new Error(`El producto con ID '${productId}' no existe en el catálogo oficial.`);
      }

      if (!product.in_stock || product.stock <= 0) {
        throw new Error(`El producto '${product.name}' (${product.sku}) se encuentra agotado.`);
      }

      if (product.stock < parsedQty) {
        throw new Error(
          `Stock insuficiente para '${product.name}'. Solicitado: ${parsedQty}, disponible en almacén: ${product.stock}.`
        );
      }

      const lineTotal = product.price * parsedQty;
      subtotal += lineTotal;

      validatedItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unitPrice: product.price,
        quantity: parsedQty,
        lineTotal,
      });
    }

    return {
      validatedItems,
      subtotal,
    };
  },
};
