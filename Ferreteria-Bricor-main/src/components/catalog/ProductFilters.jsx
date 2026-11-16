import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { CATEGORIES } from '../../data/categories';
import { formatCurrency } from '../../utils/currency';

export default function ProductFilters({
  filters,
  onChange,
  onReset,
  availableBrands = [],
}) {
  const handleCategoryChange = (e) => {
    onChange({ ...filters, categoryId: e.target.value || null });
  };

  const handleBrandChange = (e) => {
    onChange({ ...filters, brand: e.target.value || null });
  };

  const handlePriceChange = (e) => {
    const val = e.target.value ? Number(e.target.value) : null;
    onChange({ ...filters, maxPrice: val });
  };

  const handleStockChange = (e) => {
    onChange({ ...filters, inStockOnly: e.target.checked });
  };

  const handleSortChange = (e) => {
    onChange({ ...filters, sortBy: e.target.value });
  };

  return (
    <div
      style={{
        background: 'var(--color-marfil-card)',
        border: '1px solid var(--color-piedra-light)',
        borderRadius: 'var(--radius-xs)',
        padding: 'var(--space-5)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-piedra-light)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--color-oxido)' }} />
          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Filtros</h4>
        </div>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-oliva)',
            fontSize: 'var(--text-xs)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-mono)',
          }}
          title="Restablecer filtros"
        >
          <RotateCcw size={12} />
          <span>Limpiar</span>
        </button>
      </div>

      {/* Ordenamiento */}
      <div className="bricor-form-group">
        <label className="bricor-label" htmlFor="filter-sort">
          Ordenar por
        </label>
        <select
          id="filter-sort"
          className="bricor-select"
          value={filters.sortBy || 'featured'}
          onChange={handleSortChange}
        >
          <option value="featured">Relevancia / Destacados</option>
          <option value="price-asc">Precio: Menor a Mayor</option>
          <option value="price-desc">Precio: Mayor a Menor</option>
          <option value="name">Alfabético: A - Z</option>
        </select>
      </div>

      {/* Categoría */}
      <div className="bricor-form-group">
        <label className="bricor-label" htmlFor="filter-category">
          Categoría
        </label>
        <select
          id="filter-category"
          className="bricor-select"
          value={filters.categoryId || ''}
          onChange={handleCategoryChange}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Marca */}
      <div className="bricor-form-group">
        <label className="bricor-label" htmlFor="filter-brand">
          Marca
        </label>
        <select
          id="filter-brand"
          className="bricor-select"
          value={filters.brand || ''}
          onChange={handleBrandChange}
        >
          <option value="">Todas las marcas</option>
          {availableBrands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      {/* Precio Máximo */}
      <div className="bricor-form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="bricor-label" htmlFor="filter-price">
            Presupuesto máx.
          </label>
          <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-carbon)' }}>
            {filters.maxPrice ? formatCurrency(filters.maxPrice) : 'Sin límite'}
          </span>
        </div>
        <input
          type="range"
          id="filter-price"
          min={50000}
          max={1000000}
          step={25000}
          value={filters.maxPrice || 1000000}
          onChange={handlePriceChange}
          style={{ width: '100%', accentColor: 'var(--color-oxido)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-piedra-dark)' }}>
          <span>$ 50.000</span>
          <span>$ 1.000.000</span>
        </div>
      </div>

      {/* Disponibilidad inmediata */}
      <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px dashed var(--color-piedra-light)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-carbon)' }}>
          <input
            type="checkbox"
            checked={!!filters.inStockOnly}
            onChange={handleStockChange}
            style={{ accentColor: 'var(--color-oxido)' }}
          />
          <span>Solo artículos en inventario</span>
        </label>
      </div>
    </div>
  );
}
