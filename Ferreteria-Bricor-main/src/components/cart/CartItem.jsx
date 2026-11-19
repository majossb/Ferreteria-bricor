import React from 'react';
import { Trash2 } from 'lucide-react';
import QuantitySelector from '../ui/QuantitySelector';
import { formatCurrency } from '../../utils/currency';

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  onViewProduct,
  compact = false,
}) {
  const { product, quantity } = item;
  const lineTotal = product.price * quantity;

  return (
    <div
      className="uk-flex uk-flex-middle cart-item-div-01"
    >
      {/* Miniatura */}
      <div
        className="uk-overflow-hidden uk-flex uk-flex-middle uk-flex-center cart-item-div-02" style={{ width: compact ? '64px' : '80px', height: compact ? '64px' : '80px', cursor: onViewProduct ? 'pointer' : 'default' }}
        onClick={() => onViewProduct && onViewProduct(product.id)}
      >
        <img
          src={product.primaryImage}
          alt={product.name}
          className="cart-item-img-01"
        />
      </div>

      {/* Info */}
      <div className="uk-flex-1 u-min-width-0">
        <span
          className="uk-display-block cart-item-span-01"
        >
          {product.sku}
        </span>
        <h4
          className="uk-text-nowrap uk-overflow-hidden cart-item-h4-01" style={{ fontSize: compact ? '0.88rem' : '0.95rem', fontFamily: 'var(--font-body)', fontWeight: 600, cursor: onViewProduct ? 'pointer' : 'default' }}
          onClick={() => onViewProduct && onViewProduct(product.id)}
          title={product.name}
        >
          {product.name}
        </h4>

        <div className="uk-flex uk-flex-middle uk-flex-between uk-flex-wrap u-gap-8px">
          <QuantitySelector
            value={quantity}
            max={product.stockCount || 99}
            onChange={(newQty) => onUpdateQuantity(product.id, newQty)}
          />

          <div className="uk-text-right">
            <span
              className="u-color-carbon" style={{ fontFamily: 'var(--font-editorial)', fontSize: compact ? '1.1rem' : '1.25rem', fontWeight: 700 }}
            >
              {formatCurrency(lineTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Eliminar */}
      <button
        type="button"
        onClick={() => onRemove(product.id)}
        className="cart-item-button-01"
        title="Eliminar del pedido"
        aria-label={`Eliminar ${product.name} del carrito`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
