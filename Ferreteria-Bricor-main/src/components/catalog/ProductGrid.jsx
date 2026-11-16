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
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <div data-uk-spinner="ratio: 1.8" style={{ color: 'var(--color-oxido)' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--color-oliva)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
          Cargando catálogo técnico...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px var(--space-4)',
          background: 'var(--color-marfil-card)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-xs)',
        }}
      >
        <p style={{ color: 'var(--color-error)', fontWeight: 600 }}>{error}</p>
        <Button variant="secondary" size="sm" onClick={onResetFilters}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '64px var(--space-4)',
          background: 'var(--color-marfil-card)',
          border: '1px dashed var(--color-piedra)',
          borderRadius: 'var(--radius-xs)',
        }}
      >
        <PackageX size={44} style={{ color: 'var(--color-piedra-dark)', margin: '0 auto 16px' }} />
        <h3 style={{ marginBottom: '8px' }}>No se encontraron productos</h3>
        <p style={{ color: 'var(--color-oliva)', maxWidth: '420px', margin: '0 auto 24px', fontSize: 'var(--text-sm)' }}>
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
