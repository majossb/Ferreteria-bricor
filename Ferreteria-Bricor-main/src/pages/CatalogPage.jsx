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
    <div style={{ padding: '36px 0 64px' }}>
      <div className="uk-container">
        {/* Cabecera de Catálogo */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={onBackHome}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-oliva)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <ArrowLeft size={13} />
              <span>Volver a Inicio</span>
            </button>
            <span style={{ color: 'var(--color-piedra)' }}>/</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-carbon)' }}>
              Catálogo General
            </span>
            {currentCategoryObj && (
              <>
                <span style={{ color: 'var(--color-piedra)' }}>/</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oxido)', fontWeight: 600 }}>
                  {currentCategoryObj.name}
                </span>
              </>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '16px',
              borderBottom: '2px solid var(--color-carbon)',
              paddingBottom: '16px',
            }}
          >
            <div>
              <span className="bricor-section-stamp">[ CATÁLOGO TÉCNICO OFICIAL ]</span>
              <h1 style={{ margin: '4px 0 0 0' }}>
                {currentCategoryObj ? currentCategoryObj.name : 'Catálogo de Ferretería'}
              </h1>
              {currentCategoryObj && (
                <p style={{ margin: '6px 0 0 0', color: 'var(--color-oliva)', fontSize: 'var(--text-sm)' }}>
                  {currentCategoryObj.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-piedra-dark)',
                  background: 'var(--color-marfil-muted)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                }}
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
            <div style={{ position: 'sticky', top: '90px' }}>
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
            <div className="uk-width-1-1 uk-hidden@m" style={{ marginBottom: '24px' }}>
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
                style={{
                  padding: '10px 16px',
                  background: 'var(--color-marfil-muted)',
                  borderRadius: 'var(--radius-xs)',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <span>
                  Resultados para: <strong>"{filters.searchQuery}"</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, searchQuery: '' })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-oxido)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    textDecoration: 'underline',
                  }}
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
