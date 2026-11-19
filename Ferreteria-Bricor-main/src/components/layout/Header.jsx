import React from 'react';
import { ShoppingCart, Menu, BookOpen, PackageCheck } from 'lucide-react';
import Logo from '../ui/Logo';
import SearchBar from '../catalog/SearchBar';
import { useCart } from '../../hooks/useCart';

export default function Header({ onNavigate, onSearch, currentSearch = '', onToggleMobileMenu }) {
  const { totalItemsCount, openDrawer } = useCart();

  return (
    <header className="bricor-header">
      <div className="uk-container">
        <div className="bricor-header-inner">
          {/* Botón menú móvil */}
          <button
            type="button"
            className="bricor-header-action-btn uk-hidden@m u-padding-8px"
            onClick={onToggleMobileMenu}
            aria-label="Abrir menú de navegación"
          >
            <Menu size={22} />
          </button>

          {/* Logo BRICOR Oficial */}
          <Logo onClick={() => onNavigate('home')} />

          {/* Buscador amplio */}
          <div className="uk-visible@s uk-flex-1 header-div-01">
            <SearchBar onSearch={onSearch} initialQuery={currentSearch} />
          </div>

          {/* Acciones de cabecera */}
          <div className="bricor-header-actions">
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="bricor-header-action-btn uk-visible@m"
              title="Ver catálogo completo de ferretería"
            >
              <BookOpen size={17} />
              <span>Catálogo</span>
            </button>

            {/* Consulta de pedidos / Mis compras */}
            <button
              type="button"
              onClick={() => onNavigate('purchases')}
              className="bricor-header-action-btn uk-visible@s"
              title="Consultar estado de pedidos y compras"
            >
              <PackageCheck size={18} />
              <span>Mis compras</span>
            </button>

            {/* Carrito con contador y apertura de drawer */}
            <button
              type="button"
              onClick={openDrawer}
              className="bricor-header-action-btn"
              aria-label={`Ver carrito de compras con ${totalItemsCount} artículos`}
              style={{
                backgroundColor: totalItemsCount > 0 ? '#343630' : 'transparent',
                borderColor: totalItemsCount > 0 ? 'var(--color-oxido)' : 'transparent',
              }}
            >
              <ShoppingCart size={19} />
              <span className="uk-visible@s">Carrito</span>
              {totalItemsCount > 0 && (
                <span className="bricor-cart-badge">{totalItemsCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Buscador visible solo en móviles debajo del logo */}
        <div className="uk-hidden@s u-padding-bottom-12px">
          <SearchBar onSearch={onSearch} initialQuery={currentSearch} />
        </div>
      </div>
    </header>
  );
}
