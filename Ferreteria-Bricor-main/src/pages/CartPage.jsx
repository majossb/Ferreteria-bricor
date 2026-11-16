import React from 'react';
import { ShoppingBag, ArrowLeft, ArrowRight, Trash2, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import CartItem from '../components/cart/CartItem';
import Button from '../components/ui/Button';
import { formatCurrency } from '../utils/currency';

export default function CartPage({ onNavigate, onViewProduct }) {
  const {
    items,
    totalItemsCount,
    subtotal,
    estimatedShipping,
    grandTotal,
    shippingMethod,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  if (items.length === 0) {
    return (
      <div style={{ padding: '80px 0' }}>
        <div className="uk-container" style={{ textAlign: 'center', maxWidth: '560px' }}>
          <ShoppingBag size={56} style={{ color: 'var(--color-piedra)', marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '12px' }}>Tu carrito está actualmente vacío</h2>
          <p style={{ color: 'var(--color-oliva)', fontSize: 'var(--text-base)', lineHeight: '1.6', marginBottom: '32px' }}>
            Aún no has agregado herramientas, fijaciones o materiales a tu pedido. Explora nuestro catálogo con inventario disponible para entrega.
          </p>
          <Button variant="primary" icon={ArrowRight} onClick={() => onNavigate('catalog')}>
            Explorar catálogo de ferretería
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="uk-container">
        {/* Cabecera */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '2px solid var(--color-carbon)',
            paddingBottom: '16px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <span className="bricor-label">Resumen de Compras</span>
            <h1 style={{ margin: '4px 0 0 0' }}>Carrito de Compras ({totalItemsCount} artículos)</h1>
          </div>
          <button
            type="button"
            onClick={clearCart}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-error)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Trash2 size={13} />
            <span>Vaciar todo el carrito</span>
          </button>
        </div>

        <div className="uk-grid uk-grid-large" data-uk-grid>
          {/* Listado de Productos */}
          <div className="uk-width-expand@m">
            <div
              style={{
                backgroundColor: 'var(--color-marfil-card)',
                border: '1px solid var(--color-piedra-light)',
                borderRadius: 'var(--radius-xs)',
                padding: '24px',
              }}
            >
              {items.map((item) => (
                <CartItem
                  key={item.product.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  onViewProduct={onViewProduct}
                />
              ))}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ArrowLeft}
                  onClick={() => onNavigate('catalog')}
                >
                  Seguir agregando productos
                </Button>
              </div>
            </div>
          </div>

          {/* Resumen y Totales */}
          <div className="uk-width-1-3@m">
            <div
              style={{
                backgroundColor: 'var(--color-marfil-card)',
                border: '1px solid var(--color-piedra-light)',
                borderRadius: 'var(--radius-xs)',
                padding: '24px',
                position: 'sticky',
                top: '90px',
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', borderBottom: '1px solid var(--color-piedra-light)', paddingBottom: '8px' }}>
                Total del Pedido
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--color-oliva)' }}>Subtotal artículos:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--color-oliva)' }}>Despacho estimado:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: estimatedShipping === 0 ? 'var(--color-success)' : 'var(--color-carbon)' }}>
                  {estimatedShipping === 0
                    ? shippingMethod === 'pickup'
                      ? 'GRATIS (Retiro en punto BRICOR)'
                      : 'GRATIS (Pedido > $300k)'
                    : formatCurrency(estimatedShipping)}
                </span>
              </div>

              <div
                style={{
                  borderTop: '2px solid var(--color-carbon)',
                  paddingTop: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span className="font-editorial" style={{ fontSize: '1.25rem' }}>
                  Total a Pagar
                </span>
                <span
                  className="font-editorial"
                  style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-carbon)' }}
                >
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <Button
                variant="primary"
                block
                icon={ArrowRight}
                onClick={() => onNavigate('checkout')}
              >
                Proceder al Checkout
              </Button>

              <div style={{ marginTop: '20px', fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--color-oxido)' }} />
                  <span>Factura legal electrónica disponible con NIT</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={16} style={{ color: 'var(--color-oliva)' }} />
                  <span>Entregas consolidadas en obra</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
