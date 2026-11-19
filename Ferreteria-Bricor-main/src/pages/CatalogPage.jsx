import React, { useState, useEffect } from 'react';
import ProductGrid from '../components/catalog/ProductGrid';
import ProductFilters from '../components/catalog/ProductFilters';
import { productService } from '../services/productService';
import { CATEGORIES } from '../data/categories';
import { SlidersHorizontal, ArrowLeft } from 'lucide-react';

export default function CatalogPage({
  initialCategory = null,
  initialSearch = '',
  onViewProduct,
  onBackHome,
}) {
  const [filters, setFilters] = useState({
    categoryId: initialCategory,
    searchQuery: initialSearch,
    brand: null,
    maxPrice: null,
    inStockOnly: false,
    sortBy: 'featured',
  });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const availableBrands = productService.getAvailableBrands();

  // Si cambia la categoría inicial o búsqueda pasada por prop
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      categoryId: initialCategory,
      searchQuery: initialSearch,
    }));
  }, [initialCategory, initialSearch]);

  // Cargar productos con filtros
  useEffect(() => {
    let isMounted = true;

    async function fetchCatalog() {
      try {
        setLoading(true);
        setError(null);
        const data = await productService.getProducts(filters);
        if (isMounted) {
          setProducts(data);
        }
      } catch {
        if (isMounted) {
          setError('Ocurrió un error al cargar los productos del catálogo.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCatalog();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      categoryId: null,
      searchQuery: '',
      brand: null,
      maxPrice: null,
      inStockOnly: false,
      sortBy: 'featured',
    });
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.id === filters.categoryId);

  return (
    <div className="u-padding-36px-0-64px">
      <div className="uk-container">
        {/* Cabecera de Catálogo */}
        <div className="u-margin-bottom-28px">
          <div className="uk-flex uk-flex-middle footer-div-04">
            <button
              type="button"
              onClick={onBackHome}
              className="uk-flex-inline uk-flex-middle catalog-page-button-01"
            >
              <ArrowLeft size={13} />
              <span>Volver a Inicio</span>
            </button>
            <span className="u-color-piedra">/</span>
            <span className="catalog-page-span-01">
              Catálogo General
            </span>
            {currentCategoryObj && (
              <>
                <span className="u-color-piedra">/</span>
                <span className="catalog-page-span-02">
                  {currentCategoryObj.name}
                </span>
              </>
            )}
          </div>

          <div
            className="uk-flex uk-flex-between uk-flex-bottom uk-flex-wrap catalog-page-div-01"
          >
            <div>
              <span className="bricor-section-stamp">[ CATÁLOGO TÉCNICO OFICIAL ]</span>
              <h1 className="u-margin-4px-0-0-0">
                {currentCategoryObj ? currentCategoryObj.name : 'Catálogo de Ferretería'}
              </h1>
              {currentCategoryObj && (
                <p className="catalog-page-p-01">
                  {currentCategoryObj.description}
                </p>
              )}
            </div>

            <div className="uk-flex uk-flex-middle u-gap-12px">
              <span
                className="catalog-page-span-03"
              >
                {products.length} artículos encontrados
              </span>

              {/* Botón para filtros en móviles */}
              <button
                type="button"
                className="uk-hidden@m bricor-btn bricor-btn-secondary bricor-btn-sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <SlidersHorizontal size={14} />
                <span>{showMobileFilters ? 'Ocultar Filtros' : 'Filtrar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Estructura con Sidebar y Grilla */}
        <div className="uk-grid uk-grid-medium" data-uk-grid>
          {/* Columna Filtros en Desktop */}
          <div className="uk-width-1-4@m uk-visible@m">
            <div className="catalog-page-div-02">
              <ProductFilters
                filters={filters}
                onChange={setFilters}
                onReset={handleResetFilters}
                availableBrands={availableBrands}
              />
            </div>
          </div>

          {/* Filtros colapsables en móvil */}
          {showMobileFilters && (
            <div className="uk-width-1-1 uk-hidden@m u-margin-bottom-24px">
              <ProductFilters
                filters={filters}
                onChange={(f) => {
                  setFilters(f);
                  setShowMobileFilters(false);
                }}
                onReset={handleResetFilters}
                availableBrands={availableBrands}
              />
            </div>
          )}

          {/* Grilla de Productos */}
          <div className="uk-width-expand@m">
            {filters.searchQuery && (
              <div
                className="uk-margin-bottom uk-flex uk-flex-between uk-flex-middle catalog-page-div-03"
              >
                <span>
                  Resultados para: <strong>"{filters.searchQuery}"</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, searchQuery: '' })}
                  className="catalog-page-button-02"
                >
                  Quitar búsqueda
                </button>
              </div>
            )}

            <ProductGrid
              products={products}
              loading={loading}
              error={error}
              onResetFilters={handleResetFilters}
              onViewDetails={onViewProduct}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
