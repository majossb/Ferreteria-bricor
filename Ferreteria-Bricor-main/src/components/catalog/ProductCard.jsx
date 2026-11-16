import React from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import Price from '../ui/Price';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useCart } from '../../hooks/useCart';

export default function ProductCard({ product, onViewDetails }) {
  const { addToCart } = useCart();
  const [added, setAdded] = React.useState(false);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="bricor-product-card" onClick={() => onViewDetails(product.id)}>
      {/* Contenedor de Fotografía de Producto */}
      <div className="bricor-product-image-container">
        <img
          src={product.primaryImage}
          alt={product.name}
          className="bricor-product-image"
          loading="lazy"
        />

        {/* Badge promocional discreto y funcional */}
        {product.isPromo && (
          <div className="bricor-product-badge-corner">
            <Badge variant="oxido">Oferta</Badge>
          </div>
        )}
      </div>

      {/* Cuerpo Técnico de la Ficha */}
      <div className="bricor-product-body">
        {/* Metadatos: Marca y Referencia SKU */}
        <div className="bricor-product-meta">
          <span className="bricor-product-brand">{product.brand}</span>
          <span className="bricor-product-sku">{product.sku}</span>
        </div>

        {/* Nombre del Producto */}
        <h3 className="bricor-product-title" title={product.name}>
          <a
            href={`#${product.id}`}
            onClick={(e) => {
              e.preventDefault();
              onViewDetails(product.id);
            }}
          >
            {product.name}
          </a>
        </h3>

        {/* Indicador de Disponibilidad en Inventario */}
        <div className="bricor-product-stock-line">
          <span className={`bricor-stock-dot ${product.inStock ? 'is-in-stock' : 'is-out-of-stock'}`} />
          <span className="bricor-stock-text">
            {product.inStock ? 'En inventario disponible' : 'Agotado temporal'}
          </span>
        </div>

        {/* Pie de Ficha: Precio y Acción de Compra */}
        <div className="bricor-product-footer">
          <Price price={product.price} originalPrice={product.originalPrice} />

          <Button
            size="sm"
            variant={added ? 'dark' : 'primary'}
            onClick={handleAddToCart}
            aria-label={`Añadir ${product.name} al pedido`}
            icon={added ? Check : ShoppingCart}
          >
            {added ? 'Listo' : 'Añadir'}
          </Button>
        </div>
      </div>
    </article>
  );
}
