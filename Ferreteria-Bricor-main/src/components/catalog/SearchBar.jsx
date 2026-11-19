import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ onSearch, initialQuery = '', className = '', placeholder = 'Buscar por nombre, referencia (SKU), herramienta...' }) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`bricor-search-form ${className}`} role="search">
      <input
        type="search"
        className="bricor-search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar productos y referencias"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="bricor-search-submit u-right-40px"
          aria-label="Limpiar búsqueda"
        >
          <X size={15} />
        </button>
      )}
      <button type="submit" className="bricor-search-submit" aria-label="Ejecutar búsqueda">
        <Search size={17} />
      </button>
    </form>
  );
}
