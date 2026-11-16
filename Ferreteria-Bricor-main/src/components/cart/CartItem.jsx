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
      style={{
        display: 'flex',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--color-piedra-light)',
        alignItems: 'center',
      }}
    >
      {/* Miniatura */}
      <div
        style={{
          width: compact ? '64px' : '80px',
          height: compact ? '64px' : '80px',
          backgroundColor: '#F8F7F3',
          border: '1px solid var(--color-piedra-light)',
          borderRadius: 'var(--radius-xs)',
          flexShrink: 0,
          cursor: onViewProduct ? 'pointer' : 'default',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => onViewProduct && onViewProduct(product.id)}
      >
        <img
          src={product.primaryImage}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-oliva)',
            display: 'block',
          }}
        >
          {product.sku}
        </span>
        <h4
          style={{
            margin: '2px 0 6px 0',
            fontSize: compact ? '0.88rem' : '0.95rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: onViewProduct ? 'pointer' : 'default',
          }}
          onClick={() => onViewProduct && onViewProduct(product.id)}
          title={product.name}
        >
          {product.name}
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <QuantitySelector
            value={quantity}
            max={product.stockCount || 99}
            onChange={(newQty) => onUpdateQuantity(product.id, newQty)}
          />

          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                fontFamily: 'var(--font-editorial)',
                fontSize: compact ? '1.1rem' : '1.25rem',
                fontWeight: 700,
                color: 'var(--color-carbon)',
              }}
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
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-piedra-dark)',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: 'var(--radius-xs)',
          transition: 'color var(--transition-fast)',
        }}
        title="Eliminar del pedido"
        aria-label={`Eliminar ${product.name} del carrito`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
