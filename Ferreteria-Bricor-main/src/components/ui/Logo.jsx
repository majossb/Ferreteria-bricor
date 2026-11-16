import React from 'react';

/**
 * Logotipo oficial de BRICOR
 * Integración nativa sin contenedor adhesivo artificial.
 * Conserva estrictamente las proporciones, el símbolo oficial y los colores de marca.
 */
export default function Logo({ className = '', variant = 'header', onClick }) {
  const isLightBackground = variant === 'light' || variant === 'dark-text';
  const logoSrc = isLightBackground
    ? '/brand/bricor-logo-cropped.png'
    : '/brand/bricor-logo-light.png';

  return (
    <div
      onClick={onClick}
      className={`bricor-logo-wrapper ${className}`}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center' }}
      title="BRICOR — Ferretería, Herramientas y Suministros"
    >
      <div className="bricor-logo-link">
        <img
          src={logoSrc}
          alt="BRICOR Ferretería y Suministros"
          className="bricor-logo-img"
          loading="eager"
        />
      </div>
    </div>
  );
}
