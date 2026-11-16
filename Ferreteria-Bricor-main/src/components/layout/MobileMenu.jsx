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
        className={`bricor-cart-drawer is-open`}
        style={{ left: 0, right: 'auto', transform: 'none' }}
        aria-label="Menú principal móvil"
      >
        <div className="bricor-cart-drawer-header">
          <Logo onClick={() => { onNavigate('home'); onClose(); }} />
          <button
            type="button"
            onClick={onClose}
            className="bricor-btn bricor-btn-outline-white bricor-btn-sm"
            aria-label="Cerrar menú"
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="bricor-cart-drawer-body">
          <div style={{ marginBottom: '24px' }}>
            <span className="bricor-label" style={{ color: 'var(--color-oxido)' }}>
              Navegación
            </span>
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
              <li style={{ borderBottom: '1px solid var(--color-piedra-light)' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '12px 0',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'var(--font-editorial)',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: 'var(--color-carbon)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onClick={() => {
                    onNavigate('home');
                    onClose();
                  }}
                >
                  <ShoppingBag size={18} style={{ color: 'var(--color-oxido)' }} />
                  Inicio
                </button>
              </li>
              <li style={{ borderBottom: '1px solid var(--color-piedra-light)' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '12px 0',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'var(--font-editorial)',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: 'var(--color-carbon)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onClick={() => {
                    onSelectCategory(null);
                    onNavigate('catalog');
                    onClose();
                  }}
                >
                  <Layers size={18} style={{ color: 'var(--color-oliva)' }} />
                  Catálogo Completo
                </button>
              </li>
              <li style={{ borderBottom: '1px solid var(--color-piedra-light)' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '12px 0',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'var(--font-editorial)',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: 'var(--color-carbon)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onClick={() => {
                    onNavigate('purchases');
                    onClose();
                  }}
                >
                  <PackageCheck size={18} style={{ color: 'var(--color-oxido)' }} />
                  Mis compras
                </button>
              </li>
            </ul>
          </div>

          <div>
            <span className="bricor-label" style={{ color: 'var(--color-oxido)' }}>
              Categorías Especializadas
            </span>
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
              {CATEGORIES.map((cat) => (
                <li key={cat.id} style={{ borderBottom: '1px solid var(--color-piedra-light)' }}>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '10px 0',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      color: 'var(--color-carbon)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onNavigate('catalog');
                      onClose();
                    }}
                  >
                    <span>{cat.name}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-piedra-dark)',
                      }}
                    >
                      {cat.itemCount} refs
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bricor-cart-drawer-footer" style={{ fontSize: '0.8rem', color: 'var(--color-oliva)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <ShieldCheck size={16} />
            <strong>BRICOR Ferretería</strong>
          </div>
          <p style={{ margin: 0 }}>Despachos para obras, profesionales y particulares.</p>
        </div>
      </aside>
    </>
  );
}
