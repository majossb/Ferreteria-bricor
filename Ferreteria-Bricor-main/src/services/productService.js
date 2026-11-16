/**
 * BRICOR - Servicio de Catálogo de Productos
 * Abstracción de datos locales con emulación asíncrona para facilitar
 * el reemplazo futuro por llamadas fetch/axios a la API backend.
 */

import { PRODUCTS } from '../data/products';
import { CATEGORIES } from '../data/categories';

export const productService = {
  /**
   * Obtiene todos los productos con soporte para filtros y ordenamiento
   */
  async getProducts({
    categoryId = null,
    searchQuery = '',
    brand = null,
    maxPrice = null,
    inStockOnly = false,
    sortBy = 'featured', // 'featured', 'price-asc', 'price-desc', 'name'
  } = {}) {
    // Simulación de latencia de red controlada (50ms)
    await new Promise((resolve) => setTimeout(resolve, 50));

    let results = [...PRODUCTS];

    if (categoryId) {
      results = results.filter((p) => p.categoryId === categoryId);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q)
      );
    }

    if (brand) {
      results = results.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
    }

    if (maxPrice !== null && !isNaN(maxPrice)) {
      results = results.filter((p) => p.price <= maxPrice);
    }

    if (inStockOnly) {
      results = results.filter((p) => p.inStock);
    }

    // Ordenamiento
    if (sortBy === 'price-asc') {
      results.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      results.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  },

  /**
   * Obtiene un producto individual por su ID
   */
  async getProductById(id) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    return PRODUCTS.find((p) => p.id === id) || null;
  },

  /**
   * Obtiene productos destacados para portada
   */
  async getFeaturedProducts() {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return PRODUCTS.filter((p) => p.isFeatured);
  },

  /**
   * Obtiene todas las categorías
   */
  async getCategories() {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return CATEGORIES;
  },

  /**
   * Obtiene lista única de marcas disponibles en el catálogo
   */
  getAvailableBrands() {
    const brands = new Set(PRODUCTS.map((p) => p.brand));
    return Array.from(brands).sort();
  },
};
