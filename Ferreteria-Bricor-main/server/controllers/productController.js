import { productService } from '../services/productService.js';

export const productController = {
  /**
   * GET /api/v1/products
   * Retorna el catálogo autoritativo con stock disponible en tiempo real
   */
  async getProducts(req, res, next) {
    try {
      const products = productService.getAllProducts();
      return res.status(200).json({
        success: true,
        data: products,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/products/:id
   */
  async getProductById(req, res, next) {
    try {
      const product = productService.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Producto no encontrado.',
        });
      }
      return res.status(200).json({
        success: true,
        data: product,
      });
    } catch (err) {
      next(err);
    }
  },
};
