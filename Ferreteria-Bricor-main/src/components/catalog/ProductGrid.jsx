import React from 'react';
import ProductCard from './ProductCard';
import { PackageX, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';

export default function ProductGrid({
  products = [],
  loading = false,
  error = null,
  onResetFilters,
  onViewDetails,
}) {
  if (loading) {
    return (
      <div className="uk-text-center u-padding-64px-0">
        <div data-uk-spinner="ratio: 1.8" className="u-color-oxido"></div>
        <p className="product-grid-p-01">
          Cargando catálogo técnico...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="uk-text-center product-grid-div-01"
      >
        <p className="product-grid-p-02">{error}</p>
        <Button variant="secondary" size="sm" onClick={onResetFilters}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        className="uk-text-center product-grid-div-02"
      >
        <PackageX size={44} className="product-grid-packagex-01" />
        <h3 className="u-margin-bottom-8px">No se encontraron productos</h3>
        <p className="product-grid-p-03">
          No hay artículos que coincidan con los criterios de búsqueda o filtros seleccionados en este momento.
        </p>
        {onResetFilters && (
          <Button variant="primary" icon={RefreshCw} onClick={onResetFilters}>
            Restablecer todos los filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="uk-grid uk-grid-medium uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-3@l"
      data-uk-grid
    >
      {products.map((product) => (
        <div key={product.id}>
          <ProductCard product={product} onViewDetails={onViewDetails} />
        </div>
      ))}
    </div>
  );
}
