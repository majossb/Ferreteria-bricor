import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Check, ShieldCheck, Truck, FileText } from 'lucide-react';
import { productService } from '../services/productService';
import Price from '../components/ui/Price';
import Badge from '../components/ui/Badge';
import QuantitySelector from '../components/ui/QuantitySelector';
import Button from '../components/ui/Button';
import ProductCard from '../components/catalog/ProductCard';
import { useCart } from '../hooks/useCart';

export default function ProductPage({ productId, onBackToCatalog, onViewProduct }) {
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { addToCart } = useCart();

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setQuantity(1);
        const item = await productService.getProductById(productId);
        if (item) {
          setProduct(item);
          setActiveImage(item.primaryImage);
          // Cargar productos relacionados de la misma categoría
          const allFromCat = await productService.getProducts({ categoryId: item.categoryId });
          setRelatedProducts(allFromCat.filter((p) => p.id !== item.id).slice(0, 3));
        }
      } catch (err) {
        console.error('Error al cargar detalle del producto', err);
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      loadProduct();
      window.scrollTo(0, 0);
    }
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div data-uk-spinner="ratio: 2" style={{ color: 'var(--color-oxido)' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--color-oliva)', fontFamily: 'var(--font-mono)' }}>
          Cargando especificaciones técnicas...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="uk-container" style={{ padding: '64px 0', textAlign: 'center' }}>
        <h3>Producto no encontrado</h3>
        <p style={{ color: 'var(--color-oliva)' }}>
          La referencia solicitada no existe o no se encuentra activa en el catálogo.
        </p>
        <Button variant="primary" onClick={onBackToCatalog}>
          Volver al catálogo
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 0 64px' }}>
      <div className="uk-container">
        {/* Breadcrumb de navegación */}
        <div style={{ marginBottom: '24px' }}>
          <button
            type="button"
            onClick={onBackToCatalog}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-oliva)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <ArrowLeft size={14} />
            <span>Volver al Catálogo</span>
          </button>
        </div>

        {/* Ficha Principal de Producto */}
        <div
          className="uk-grid uk-grid-large"
          data-uk-grid
          style={{
            backgroundColor: 'var(--color-marfil-card)',
            border: '1px solid var(--color-piedra-light)',
            borderRadius: 'var(--radius-xs)',
            padding: '32px 24px',
            marginBottom: '48px',
          }}
        >
          {/* Galería de imágenes */}
          <div className="uk-width-1-1 uk-width-1-2@m">
            <div
              style={{
                backgroundColor: '#F8F7F3',
                border: '1px solid var(--color-piedra-light)',
                borderRadius: 'var(--radius-xs)',
                height: '420px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '16px',
              }}
            >
              <img
                src={activeImage}
                alt={product.name}
                style={{
                  maxHeight: '380px',
                  maxWidth: '90%',
                  objectFit: 'contain',
                  transition: 'transform var(--transition-fast)',
                }}
              />
              <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
                {product.badge && (
                  <Badge variant={product.isPromo ? 'oxido' : 'oliva'}>
                    {product.badge}
                  </Badge>
                )}
              </div>
            </div>

            {/* Miniaturas */}
            {product.gallery && product.gallery.length > 1 && (
              <div style={{ display: 'flex', gap: '12px' }}>
                {product.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    style={{
                      width: '74px',
                      height: '74px',
                      padding: '4px',
                      backgroundColor: '#F8F7F3',
                      border: activeImage === img ? '2px solid var(--color-oxido)' : '1px solid var(--color-piedra-light)',
                      borderRadius: 'var(--radius-xs)',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={img}
                      alt={`Vista ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información técnica y compra */}
          <div className="uk-width-1-1 uk-width-1-2@m">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="bricor-product-brand" style={{ fontSize: 'var(--text-sm)' }}>
                {product.brand}
              </span>
              <span className="bricor-product-sku" style={{ fontSize: 'var(--text-xs)' }}>
                {product.sku}
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.3rem)',
                margin: '0 0 16px 0',
                lineHeight: 1.15,
              }}
            >
              {product.name}
            </h1>

            {/* Disponibilidad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              {product.inStock ? (
                <Badge variant="stock">En inventario ({product.stockCount} disponibles)</Badge>
              ) : (
                <Badge variant="lowstock">Agotado temporalmente</Badge>
              )}
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-piedra-dark)' }}>
                Categoría: <strong>{product.categoryName}</strong>
              </span>
            </div>

            {/* Precios */}
            <div
              style={{
                padding: '16px 0',
                borderTop: '1px solid var(--color-piedra-light)',
                borderBottom: '1px solid var(--color-piedra-light)',
                marginBottom: '24px',
              }}
            >
              <Price price={product.price} originalPrice={product.originalPrice} size="lg" />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', marginTop: '4px', display: 'block' }}>
                Precio con IVA incluido • Cotización para contratistas disponible
              </span>
            </div>

            {/* Descripción */}
            <div style={{ marginBottom: '28px' }}>
              <h4 style={{ fontSize: '1.05rem', margin: '0 0 8px 0', color: 'var(--color-carbon)' }}>
                Descripción del Producto
              </h4>
              <p style={{ color: 'var(--color-carbon)', lineHeight: '1.6', fontSize: 'var(--text-base)', margin: 0 }}>
                {product.description}
              </p>
            </div>

            {/* Selector de cantidad y CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '28px',
              }}
            >
              <div>
                <span className="bricor-label" style={{ marginBottom: '4px' }}>
                  Cantidad
                </span>
                <QuantitySelector
                  value={quantity}
                  max={product.stockCount || 99}
                  onChange={setQuantity}
                />
              </div>

              <div style={{ flex: 1, minWidth: '200px', marginTop: '16px' }}>
                <Button
                  variant={added ? 'dark' : 'primary'}
                  block
                  icon={added ? Check : ShoppingCart}
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                >
                  {added ? 'Añadido al pedido' : 'Añadir al carrito'}
                </Button>
              </div>
            </div>

            {/* Garantías de compra */}
            <div
              style={{
                backgroundColor: 'var(--color-marfil)',
                padding: '16px',
                borderRadius: 'var(--radius-xs)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-oliva)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-oxido)' }} />
                <span>Garantía oficial y soporte directo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} style={{ color: 'var(--color-oliva)' }} />
                <span>Despacho seguro para herramientas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Especificaciones Técnicas */}
        {product.specifications && product.specifications.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ borderBottom: '2px solid var(--color-carbon)', paddingBottom: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--color-oxido)' }} />
                <h3 style={{ margin: 0 }}>Especificaciones Técnicas</h3>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="bricor-specs-table">
                <tbody>
                  {product.specifications.map((spec, i) => (
                    <tr key={i}>
                      <th>{spec.label}</th>
                      <td>{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Productos Relacionados */}
        {relatedProducts.length > 0 && (
          <div>
            <div style={{ borderBottom: '2px solid var(--color-carbon)', paddingBottom: '12px', marginBottom: '24px' }}>
              <span className="bricor-label">Complementos de categoría</span>
              <h3 style={{ margin: 0 }}>Productos Relacionados</h3>
            </div>

            <div className="uk-grid uk-grid-medium uk-child-width-1-1 uk-child-width-1-3@m" data-uk-grid>
              {relatedProducts.map((rel) => (
                <div key={rel.id}>
                  <ProductCard product={rel} onViewDetails={onViewProduct} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
