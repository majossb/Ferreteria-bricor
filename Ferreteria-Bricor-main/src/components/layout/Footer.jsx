import React from 'react';
import Logo from '../ui/Logo';
import { CATEGORIES } from '../../data/categories';
import { Clock, MapPin, PackageCheck } from 'lucide-react';
import { SOCIAL_LINKS } from '../../config/socialLinks';

const CURRENT_YEAR = new Date().getFullYear();

// Iconos SVG industriales y limpios para redes sociales
function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TikTokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export default function Footer({ onNavigate, onSelectCategory }) {
  // Solo mostramos redes sociales que tengan configurada una URL oficial válida
  const socialItems = [
    { key: 'instagram', label: 'Instagram', url: SOCIAL_LINKS?.instagram, icon: <InstagramIcon /> },
    { key: 'facebook', label: 'Facebook', url: SOCIAL_LINKS?.facebook, icon: <FacebookIcon /> },
    { key: 'tiktok', label: 'TikTok', url: SOCIAL_LINKS?.tiktok, icon: <TikTokIcon /> },
  ].filter((item) => typeof item.url === 'string' && item.url.trim().length > 0);

  return (
    <footer className="bricor-footer">
      <div className="bricor-footer-top">
        <div className="uk-container">
          <div className="uk-grid uk-grid-large" data-uk-grid>
            {/* Columna Marca & Identidad */}
            <div className="uk-width-1-1 uk-width-1-3@m">
              <Logo variant="footer" onClick={() => onNavigate('home')} />
              <p
                className="footer-p-01"
              >
                Ferretería especializada en herramientas de alto desempeño, suministros industriales, fijaciones y materiales para construcción, remodelación e industria pesada.
              </p>
              
              <div className="uk-flex uk-flex-column footer-div-01">
                <span className="bricor-badge bricor-badge-oliva footer-span-01">
                  Canal Profesional & Hogar
                </span>

                {/* Redes sociales oficiales configurables (solo se muestran si tienen URL) */}
                {socialItems.length > 0 && (
                  <div className="uk-flex uk-flex-middle footer-div-02">
                    <span className="uk-text-uppercase footer-span-02">
                      Síguenos:
                    </span>
                    <div className="uk-flex u-gap-8px">
                      {socialItems.map((social) => (
                        <a
                          key={social.key}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Visitar canal oficial de BRICOR en ${social.label}`}
                          className="uk-flex-inline uk-flex-middle uk-flex-center footer-a-01"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-oxido)';
                            e.currentTarget.style.borderColor = 'var(--color-oxido)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-piedra)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          }}
                        >
                          {social.icon}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Categorías */}
            <div className="uk-width-1-2 uk-width-1-4@m">
              <h4 className="bricor-footer-title">Categorías</h4>
              <ul className="bricor-footer-links">
                {CATEGORIES.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <a
                      href={`#${cat.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectCategory(cat.id);
                        onNavigate('catalog');
                      }}
                    >
                      {cat.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Columna Servicio y Soporte */}
            <div className="uk-width-1-2 uk-width-1-4@m">
              <h4 className="bricor-footer-title">Servicio y Asesoría</h4>
              <ul className="bricor-footer-links">
                <li>
                  <a
                    href="#mis-compras"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('purchases');
                    }}
                    className="footer-a-02"
                  >
                    <PackageCheck size={14} className="uk-display-inline footer-packagecheck-01" />
                    Mis compras y seguimiento
                  </a>
                </li>
                <li>
                  <a href="#catalogo" onClick={(e) => { e.preventDefault(); onNavigate('catalog'); }}>
                    Catálogo técnico completo
                  </a>
                </li>
                <li>
                  <a href="#cotizaciones" onClick={(e) => { e.preventDefault(); alert('Módulo de cotizaciones para empresas e instaladores disponible a través de nuestros canales de venta.'); }}>
                    Cotizaciones por volumen
                  </a>
                </li>
                <li>
                  <a href="#despachos" onClick={(e) => { e.preventDefault(); alert('Despachos a nivel nacional. Envíos gratis en pedidos superiores a $300.000 COP.'); }}>
                    Condiciones de despacho
                  </a>
                </li>
                <li>
                  <a href="#garantias" onClick={(e) => { e.preventDefault(); alert('Todas las herramientas eléctricas y equipos cuentan con garantía oficial de fábrica.'); }}>
                    Garantías de fabricante
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna Información de Punto Físico */}
            <div className="uk-width-1-1 uk-width-1-6@m">
              <h4 className="bricor-footer-title">Punto Comercial</h4>
              <div className="footer-div-03">
                <div className="uk-flex footer-div-04">
                  <MapPin size={14} className="footer-mappin-01" />
                  <span>Sede principal y punto de venta BRICOR (Dirección oficial sujeta a confirmación local)</span>
                </div>
                <div className="uk-flex u-gap-8px">
                  <Clock size={14} className="footer-clock-01" />
                  <span>Lunes a Sábado: Horario comercial continuado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bricor-footer-bottom">
        <div className="uk-container">
          <div>
            © {CURRENT_YEAR} BRICOR® Ferretería y Suministros. Todos los derechos reservados.
          </div>
          <div className="uk-flex u-gap-16px">
            <span className="u-color-piedra-dark">
              Editorial Industrial Contemporánea • UIkit 3 + React
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
