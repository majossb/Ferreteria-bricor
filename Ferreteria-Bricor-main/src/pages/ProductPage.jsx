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
      <div className="uk-text-center u-padding-100px-0">
        <div data-uk-spinner="ratio: 2" className="u-color-oxido"></div>
        <p className="product-page-p-01">
          Cargando especificaciones técnicas...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="uk-container uk-text-center u-padding-64px-0">
        <h3>Producto no encontrado</h3>
        <p className="u-color-oliva">
          La referencia solicitada no existe o no se encuentra activa en el catálogo.
        </p>
        <Button variant="primary" onClick={onBackToCatalog}>
          Volver al catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="u-padding-32px-0-64px">
      <div className="uk-container">
        {/* Breadcrumb de navegación */}
        <div className="u-margin-bottom-24px">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="uk-flex-inline uk-flex-middle checkout-page-button-01"
          >
            <ArrowLeft size={14} />
            <span>Volver al Catálogo</span>
          </button>
        </div>

        {/* Ficha Principal de Producto */}
        <div
          className="uk-grid uk-grid-large product-page-div-01"
          data-uk-grid
        >
          {/* Galería de imágenes */}
          <div className="uk-width-1-1 uk-width-1-2@m">
            <div
              className="uk-flex uk-flex-middle uk-flex-center uk-position-relative uk-overflow-hidden product-page-div-02"
            >
              <img
                src={activeImage}
                alt={product.name}
                className="product-page-img-01"
              />
              <div className="uk-position-absolute product-page-div-03">
                {product.badge && (
                  <Badge variant={product.isPromo ? 'oxido' : 'oliva'}>
                    {product.badge}
                  </Badge>
                )}
              </div>
            </div>

            {/* Miniaturas */}
            {product.gallery && product.gallery.length > 1 && (
              <div className="uk-flex u-gap-12px">
                {product.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className="product-page-button-01" style={{ border: activeImage === img ? '2px solid var(--color-oxido)' : '1px solid var(--color-piedra-light)', borderRadius: 'var(--radius-xs)' }}
                  >
                    <img
                      src={img}
                      alt={`Vista ${idx + 1}`}
                      className="product-page-img-02"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información técnica y compra */}
          <div className="uk-width-1-1 uk-width-1-2@m">
            <div className="uk-flex uk-flex-between uk-flex-middle u-margin-bottom-8px">
              <span className="bricor-product-brand u-font-size-sm">
                {product.brand}
              </span>
              <span className="bricor-product-sku u-font-size-xs">
                {product.sku}
              </span>
            </div>

            <h1
              className="product-page-h1-01"
            >
              {product.name}
            </h1>

            {/* Disponibilidad */}
            <div className="uk-flex uk-flex-middle uk-margin-bottom u-gap-12px">
              {product.inStock ? (
                <Badge variant="stock">En inventario ({product.stockCount} disponibles)</Badge>
              ) : (
                <Badge variant="lowstock">Agotado temporalmente</Badge>
              )}
              <span className="form-field-span-01">
                Categoría: <strong>{product.categoryName}</strong>
              </span>
            </div>

            {/* Precios */}
            <div
              className="product-page-div-04"
            >
              <Price price={product.price} originalPrice={product.originalPrice} size="lg" />
              <span className="uk-display-block product-page-span-01">
                Precio con IVA incluido • Cotización para contratistas disponible
              </span>
            </div>

            {/* Descripción */}
            <div className="u-margin-bottom-28px">
              <h4 className="product-page-h4-01">
                Descripción del Producto
              </h4>
              <p className="uk-margin-remove product-page-p-02">
                {product.description}
              </p>
            </div>

            {/* Selector de cantidad y CTA */}
            <div
              className="uk-flex uk-flex-middle uk-flex-wrap product-page-div-05"
            >
              <div>
                <span className="bricor-label u-margin-bottom-4px">
                  Cantidad
                </span>
                <QuantitySelector
                  value={quantity}
                  max={product.stockCount || 99}
                  onChange={setQuantity}
                />
              </div>

              <div className="uk-flex-1 product-page-div-06">
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
              className="product-page-div-07"
            >
              <div className="uk-flex uk-flex-middle u-gap-8px">
                <ShieldCheck size={18} className="u-color-oxido" />
                <span>Garantía oficial y soporte directo</span>
              </div>
              <div className="uk-flex uk-flex-middle u-gap-8px">
                <Truck size={18} className="u-color-oliva" />
                <span>Despacho seguro para herramientas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Especificaciones Técnicas */}
        {product.specifications && product.specifications.length > 0 && (
          <div className="u-margin-bottom-48px">
            <div className="uk-margin-bottom product-page-div-08">
              <div className="uk-flex uk-flex-middle u-gap-8px">
                <FileText size={18} className="u-color-oxido" />
                <h3 className="uk-margin-remove">Especificaciones Técnicas</h3>
              </div>
            </div>

            <div className="u-overflow-x-auto">
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
            <div className="product-page-div-09">
              <span className="bricor-label">Complementos de categoría</span>
              <h3 className="uk-margin-remove">Productos Relacionados</h3>
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
