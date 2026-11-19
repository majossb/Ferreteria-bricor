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
      className="product-filters-div-01"
    >
      <div
        className="uk-flex uk-flex-between uk-flex-middle product-filters-div-02"
      >
        <div className="uk-flex uk-flex-middle u-gap-8px">
          <Filter size={16} className="u-color-oxido" />
          <h4 className="uk-margin-remove u-font-size-1-1rem">Filtros</h4>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="uk-flex uk-flex-middle product-filters-button-01"
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
        <div className="uk-flex uk-flex-between uk-flex-middle">
          <label className="bricor-label" htmlFor="filter-price">
            Presupuesto máx.
          </label>
          <span className="product-filters-span-01">
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
          className="product-filters-input-01"
        />
        <div className="uk-flex uk-flex-between product-filters-div-03">
          <span>$ 50.000</span>
          <span>$ 1.000.000</span>
        </div>
      </div>

      {/* Disponibilidad inmediata */}
      <div className="product-filters-div-04">
        <label className="uk-flex uk-flex-middle product-filters-label-01">
          <input
            type="checkbox"
            checked={!!filters.inStockOnly}
            onChange={handleStockChange}
            className="u-accent-color-oxido"
          />
          <span>Solo artículos en inventario</span>
        </label>
      </div>
    </div>
  );
}
