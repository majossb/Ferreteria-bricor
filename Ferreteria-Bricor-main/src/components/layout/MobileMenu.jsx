import React from 'react';
import { X, Layers, ShoppingBag, ShieldCheck, PackageCheck } from 'lucide-react';
import Logo from '../ui/Logo';
import { CATEGORIES } from '../../data/categories';

export default function MobileMenu({ isOpen, onClose, onSelectCategory, onNavigate }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="bricor-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className={`bricor-cart-drawer is-open mobile-menu-aside-01`}
        aria-label="Menú principal móvil"
      >
        <div className="bricor-cart-drawer-header">
          <Logo onClick={() => { onNavigate('home'); onClose(); }} />
          <button
            type="button"
            onClick={onClose}
            className="bricor-btn bricor-btn-outline-white bricor-btn-sm u-padding-6px"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bricor-cart-drawer-body">
          <div className="u-margin-bottom-24px">
            <span className="bricor-label u-color-oxido">
              Navegación
            </span>
            <ul className="uk-padding-remove mobile-menu-ul-01">
              <li className="u-border-bottom-1px-solid-piedra-light">
                <button
                  type="button"
                  className="uk-text-left uk-flex uk-flex-middle mobile-menu-button-01"
                  onClick={() => {
                    onNavigate('home');
                    onClose();
                  }}
                >
                  <ShoppingBag size={18} className="u-color-oxido" />
                  Inicio
                </button>
              </li>
              <li className="u-border-bottom-1px-solid-piedra-light">
                <button
                  type="button"
                  className="uk-text-left uk-flex uk-flex-middle mobile-menu-button-01"
                  onClick={() => {
                    onSelectCategory(null);
                    onNavigate('catalog');
                    onClose();
                  }}
                >
                  <Layers size={18} className="u-color-oliva" />
                  Catálogo Completo
                </button>
              </li>
              <li className="u-border-bottom-1px-solid-piedra-light">
                <button
                  type="button"
                  className="uk-text-left uk-flex uk-flex-middle mobile-menu-button-01"
                  onClick={() => {
                    onNavigate('purchases');
                    onClose();
                  }}
                >
                  <PackageCheck size={18} className="u-color-oxido" />
                  Mis compras
                </button>
              </li>
            </ul>
          </div>

          <div>
            <span className="bricor-label u-color-oxido">
              Categorías Especializadas
            </span>
            <ul className="uk-padding-remove mobile-menu-ul-01">
              {CATEGORIES.map((cat) => (
                <li key={cat.id} className="u-border-bottom-1px-solid-piedra-light">
                  <button
                    type="button"
                    className="uk-text-left uk-flex uk-flex-between uk-flex-middle mobile-menu-button-02"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onNavigate('catalog');
                      onClose();
                    }}
                  >
                    <span>{cat.name}</span>
                    <span
                      className="footer-span-02"
                    >
                      {cat.itemCount} refs
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bricor-cart-drawer-footer mobile-menu-div-01">
          <div className="uk-flex uk-flex-middle mobile-menu-div-02">
            <ShieldCheck size={16} />
            <strong>BRICOR Ferretería</strong>
          </div>
          <p className="uk-margin-remove">Despachos para obras, profesionales y particulares.</p>
        </div>
      </aside>
    </>
  );
}
