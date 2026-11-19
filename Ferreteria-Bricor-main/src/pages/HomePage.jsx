import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'uikit'; // necesario para que data-uk-slider / data-uk-grid se inicialicen
import { ArrowRight, ChevronLeft, ChevronRight, Wrench, ShieldCheck, Truck, Package } from 'lucide-react';
import Button from '../components/ui/Button';
import CategoryCard from '../components/catalog/CategoryCard';
import ProductCard from '../components/catalog/ProductCard';
import Price from '../components/ui/Price';
import imagenFerreteria from '../assets/images/imagen-ferreteria.png';
import { productService } from '../services/productService';

gsap.registerPlugin(ScrollTrigger);

export default function HomePage({ onNavigate, onSelectCategory, onViewProduct }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const rootRef = useRef(null);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        const [cats, prods] = await Promise.all([
          productService.getCategories(),
          productService.getFeaturedProducts(),
        ]);
        setCategories(cats);
        setFeaturedProducts(prods);
      } catch (err) {
        console.error('Error cargando datos de inicio', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  // GSAP: timeline de entrada del hero (al montar)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.bricor-hero-bg', { scale: 1.15, duration: 2.2, ease: 'power2.out' }, 0)
        .from('.bricor-hero-tag', { y: 24, opacity: 0, duration: 0.7 }, 0.1)
        .from('.bricor-hero-title', { y: 40, opacity: 0, duration: 0.9 }, 0.25)
        .from('.bricor-hero-desc', { y: 30, opacity: 0, duration: 0.8 }, 0.5)
        .from('.bricor-hero-actions > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.12 }, 0.75);
    }, rootRef);

    return () => ctx.revert();
  }, []);

  // GSAP: animaciones al hacer scroll (cuando ya hay datos renderizados)
  useLayoutEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Encabezados de sección
      gsap.utils.toArray('.gsap-section-head').forEach((el) => {
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });

      // Tarjetas (categorías, productos, bloque de confianza) en cascada
      gsap.set('.gsap-card', { opacity: 0, y: 50 });
      ScrollTrigger.batch('.gsap-card', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' }),
      });

      // Bloque promocional: imagen entra por la izquierda, texto por la derecha
      if (document.querySelector('.bricor-promo-block')) {
        const promo = gsap.timeline({
          scrollTrigger: { trigger: '.bricor-promo-block', start: 'top 80%', once: true },
          defaults: { ease: 'power3.out', duration: 0.9 },
        });
        promo
          .from('.gsap-promo-img', { x: -60, opacity: 0 })
          .from('.gsap-promo-text', { x: 60, opacity: 0 }, '<0.1');
      }
    }, rootRef);

    return () => ctx.revert();
  }, [loading, categories, featuredProducts]);

  // Producto estrella para el bloque editorial destacado
  const heroProduct = featuredProducts[0];

  return (
    <div className="bricor-home-page" ref={rootRef}>
      {/* =========================================================================
          HERO EDITORIAL
          ========================================================================= */}
      <section className="bricor-hero">
        <img
          src="/images/bricor-hero-workshop.png"
          alt="Amoladora angular profesional con disco de corte, herramienta de alta precisión para taller y construcción"
          className="bricor-hero-bg"
        />
        <div className="bricor-hero-gradient" />

        <div className="uk-container">
          <div className="bricor-hero-content">
            <div className="bricor-hero-tag">
              <Wrench size={13} />
              <span>Herramientas y Suministros</span>
            </div>

            <h1 className="bricor-hero-title">
              Todo para construir, reparar y mejorar.
            </h1>

            <p className="bricor-hero-desc">
              Herramientas y materiales de precisión para profesionales, técnicos de la construcción y proyectos de taller de alto rendimiento.
            </p>

            <div className="bricor-hero-actions">
              <Button
                variant="primary"
                icon={ArrowRight}
                onClick={() => onNavigate('catalog')}
              >
                Explorar catálogo
              </Button>
              <Button
                variant="outline-white"
                onClick={() => {
                  const catSec = document.getElementById('categorias-principales');
                  if (catSec) catSec.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Ver categorías
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CATEGORÍAS DESTACADAS
          ========================================================================= */}
      <section
        id="categorias-principales"
        className="home-page-section-01"
      >
        <div className="uk-container">
          <div
            className="gsap-section-head home-page-div-01"
          >
            <div>
              <span className="bricor-section-stamp">[ 01 — SUMINISTROS Y RAMAS ]</span>
              <h2 className="uk-margin-remove">Categorías Especializadas</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="uk-text-uppercase uk-flex-inline uk-flex-middle home-page-button-01"
            >
              <span>Ver todas</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div
            className="uk-grid uk-grid-medium uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-3@l"
            data-uk-grid
          >
            {categories.slice(0, 6).map((category) => (
              <div key={category.id} className="gsap-card">
                <CategoryCard
                  category={category}
                  onSelect={(id) => {
                    onSelectCategory(id);
                    onNavigate('catalog');
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          CAMPAÑA EDITORIAL / PRODUCTO DESTACADO
          ========================================================================= */}
      {heroProduct && (
        <section className="home-page-section-02">
          <div className="uk-container">
            <div className="bricor-promo-block">
              <div className="uk-grid uk-grid-collapse uk-flex-middle" data-uk-grid>
                {/* Imagen del producto */}
                <div
                  className="uk-width-1-1 uk-width-1-2@m gsap-promo-img u-background-color-1a1b17"
                >
                  <div className="uk-position-relative uk-text-center u-padding-36px">
                    <img
                      src={heroProduct.primaryImage}
                      alt={heroProduct.name}
                      className="home-page-img-01"
                    />
                    <div
                      className="uk-position-absolute home-page-div-02"
                    >
                      <span className="bricor-badge bricor-badge-oxido">
                        Selección Técnica del Mes
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenido editorial del producto */}
                <div
                  className="uk-width-1-1 uk-width-1-2@m gsap-promo-text u-padding-40px-48px"
                >
                  <div className="uk-flex uk-flex-middle footer-div-04">
                    <span className="bricor-product-brand u-color-piedra">
                      {heroProduct.brand}
                    </span>
                    <span className="u-color-piedra-dark">•</span>
                    <span className="bricor-product-sku u-color-piedra">
                      {heroProduct.sku}
                    </span>
                  </div>

                  <h3
                    className="uk-text-uppercase home-page-h3-01"
                  >
                    {heroProduct.name}
                  </h3>

                  <p
                    className="home-page-p-01"
                  >
                    {heroProduct.description}
                  </p>

                  <div className="u-margin-bottom-28px">
                    <Price
                      price={heroProduct.price}
                      originalPrice={heroProduct.originalPrice}
                      size="lg"
                    />
                  </div>

                  <div className="uk-flex uk-flex-wrap u-gap-16px">
                    <Button
                      variant="primary"
                      icon={ArrowRight}
                      onClick={() => onViewProduct(heroProduct.id)}
                    >
                      Consultar ficha técnica
                    </Button>
                    <Button
                      variant="outline-white"
                      onClick={() => onNavigate('catalog')}
                    >
                      Ver más herramientas
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          PRODUCTOS DESTACADOS
          ========================================================================= */}
      <section className="u-padding-64px-0">
        <div className="uk-container">
          <div
            className="gsap-section-head home-page-div-01"
          >
            <div>
              <span className="bricor-section-stamp">[ 02 — INVENTARIO PROBADO EN FAENA ]</span>
              <h2 className="uk-margin-remove">Productos Destacados</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="uk-text-uppercase uk-flex-inline uk-flex-middle home-page-button-01"
            >
              <span>Ver catálogo completo</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {featuredProducts.length > 0 && (
            <div className="gsap-card" data-uk-slider="finite: true">
              <div className="uk-slider-container u-padding-bottom-8px">
                <ul className="uk-slider-items uk-grid uk-grid-medium uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l">
                  {featuredProducts.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} onViewDetails={onViewProduct} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Controles: flecha anterior, puntos, flecha siguiente */}
              <div
                className="uk-flex uk-flex-middle uk-flex-center home-page-div-03"
              >
                <button
                  type="button"
                  aria-label="Productos anteriores"
                  data-uk-slider-item="previous"
                  className="uk-flex-inline uk-flex-middle uk-flex-center home-page-button-02"
                >
                  <ChevronLeft size={20} />
                </button>

                <ul className="uk-slider-nav uk-dotnav uk-margin-remove" />

                <button
                  type="button"
                  aria-label="Productos siguientes"
                  data-uk-slider-item="next"
                  className="uk-flex-inline uk-flex-middle uk-flex-center home-page-button-02"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          BLOQUE DE CONFIANZA Y VALORES DE OFICIO
          ========================================================================= */}
      <section
        className="home-page-section-03"
      >
        <div className="uk-container">
          <div
            className="gsap-section-head home-page-div-04"
          >
            <span className="bricor-section-stamp">[ 03 — ESTÁNDAR OPERATIVO BRICOR ]</span>
            <h2 className="uk-margin-remove">Criterio de Oficio y Atención Profesional</h2>
          </div>
          <div className="uk-grid uk-grid-large uk-flex-middle" data-uk-grid>
            {/* Imagen (izquierda) */}
            <div className="uk-width-1-1 uk-width-2-5@m">
              <div
                className="gsap-card home-page-div-05"
              >
                <img
                  src={imagenFerreteria}
                  alt="Asesor de mostrador sonriendo"
                  className="uk-display-block home-page-img-02"
                />
              </div>
            </div>

            {/* Criterios (derecha) */}
            <div className="uk-width-1-1 uk-width-3-5@m">
              <div className="uk-flex uk-flex-column u-gap-28px">
                <div className="bricor-trust-item gsap-card">
                  <div className="bricor-trust-icon">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="home-page-h4-01">
                      Asesoría de Mostrador Especializada
                    </h4>
                    <p className="uk-margin-remove home-page-p-02">
                      Orientación directa para instaladores, mecánicos y constructores. Selección de calibres, potencias y fijaciones según la necesidad de la obra.
                    </p>
                  </div>
                </div>
                <div className="bricor-trust-item gsap-card">
                  <div className="bricor-trust-icon">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h4 className="home-page-h4-01">
                      Despacho Programado y Logística
                    </h4>
                    <p className="uk-margin-remove home-page-p-02">
                      Entregas directas a pie de obra para materiales pesados y suministros continuos, optimizando los tiempos del proyecto.
                    </p>
                  </div>
                </div>
                <div className="bricor-trust-item gsap-card">
                  <div className="bricor-trust-icon">
                    <Package size={24} />
                  </div>
                  <div>
                    <h4 className="home-page-h4-01">
                      Inventario Real y Trazabilidad
                    </h4>
                    <p className="uk-margin-remove home-page-p-02">
                      Especificaciones técnicas y códigos SKU verificados para reposición precisa sin confusiones en obra.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}