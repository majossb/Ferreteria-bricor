import React, { useEffect, useState } from 'react';
import {
  X,
  ShoppingBag,
  ArrowRight,
  Truck,
  CheckCircle,
  Plus,
  CreditCard,
} from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import CartItem from './CartItem';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/currency';
import { getComplementaryProduct } from '../../data/crossSellRules';

export default function CartDrawer({ onNavigate, onViewProduct }) {
  const {
    items,
    totalItemsCount,
    subtotal,
    shippingFee,
    grandTotal,
    shippingMethod,
    freeShippingThreshold,
    isDrawerOpen,
    closeDrawer,
    addToCart,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const [isNavigating, setIsNavigating] = useState(false);

  // 1. Bloqueo de scroll del body y atajo tecla Escape
  useEffect(() => {
    if (!isDrawerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  // 2. Cálculo de barra de progreso para envío gratis
  const isPickup = shippingMethod === 'pickup';
  const amountRemaining = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const hasFreeShipping = subtotal >= freeShippingThreshold && !isPickup;

  // 3. Recomendación complementaria (Cross-Selling contextual de 1 solo producto)
  const complementaryProduct = getComplementaryProduct(items);

  const handleCheckoutClick = () => {
    setIsNavigating(true);
    closeDrawer();
    onNavigate('checkout');
    setIsNavigating(false);
  };

  return (
    <>
      {/* Fondo oscurecido con cierre al hacer clic */}
      <div
        className="bricor-drawer-backdrop"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside
        className="bricor-cart-drawer is-open"
        aria-label="Tu carrito de compras BRICOR"
        role="dialog"
        aria-modal="true"
      >
        {/* SECCIÓN 1: Encabezado */}
        <div className="bricor-cart-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={20} style={{ color: 'var(--color-oxido)' }} />
            <h3
              style={{
                margin: 0,
                color: '#FFFFFF',
                fontFamily: 'var(--font-editorial)',
                fontSize: '1.35rem',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              Tu Carrito {totalItemsCount > 0 && `(${totalItemsCount})`}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="bricor-btn bricor-btn-outline-white bricor-btn-sm"
            aria-label="Cerrar carrito"
            style={{ padding: '6px', lineHeight: 1 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* SECCIÓN 2: Barra de progreso para envío gratis */}
        {items.length > 0 && (
          <div className="bricor-shipping-progress-banner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {hasFreeShipping ? (
                  <CheckCircle size={15} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <Truck size={15} style={{ color: 'var(--color-oxido)' }} />
                )}
                <span style={{ fontWeight: 500 }}>
                  {isPickup
                    ? 'Modalidad Retiro en Punto BRICOR seleccionada (flete $0)'
                    : hasFreeShipping
                    ? '¡Excelente! Tu envío a obra es GRATIS'
                    : `¡Te faltan ${formatCurrency(amountRemaining)} para envío GRATIS!`}
                </span>
              </div>
              {!isPickup && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#a0a39b' }}>
                  {progressPercent}%
                </span>
              )}
            </div>

            {!isPickup && (
              <div className="bricor-shipping-progress-track">
                <div
                  className={`bricor-shipping-progress-fill ${hasFreeShipping ? 'is-free' : ''}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 3: Lista de productos agregados */}
        <div className="bricor-cart-drawer-body">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-oliva)' }}>
              <ShoppingBag size={52} style={{ color: 'var(--color-piedra)', marginBottom: '16px' }} />
              <h4 style={{ marginBottom: '8px', fontSize: '1.25rem' }}>Tu carrito está vacío</h4>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-piedra-dark)',
                  marginBottom: '24px',
                  maxWidth: '280px',
                  margin: '0 auto 24px',
                }}
              >
                Explora nuestras herramientas profesionales, tornillería y suministros para iniciar tu pedido.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  closeDrawer();
                  onNavigate('catalog');
                }}
              >
                Explorar catálogo
              </Button>
            </div>
          ) : (
            <>
              <div>
                {items.map((item) => (
                  <CartItem
                    key={item.product.id}
                    item={item}
                    compact
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    onViewProduct={(id) => {
                      closeDrawer();
                      onViewProduct(id);
                    }}
                  />
                ))}
              </div>

              {/* SECCIÓN 4: Recomendación de producto complementario (1 producto contextual) */}
              {complementaryProduct && (
                <div className="bricor-drawer-cross-sell">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        color: 'var(--color-oxido)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Complemento para tu compra
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-oliva)' }}>Compatible</span>
                  </div>

                  <div className="bricor-cross-sell-card">
                    <img
                      src={complementaryProduct.primaryImage}
                      alt={complementaryProduct.name}
                      className="bricor-cross-sell-thumb"
                      loading="lazy"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h5
                        style={{
                          margin: '0 0 2px 0',
                          fontSize: 'var(--text-xs)',
                          lineHeight: '1.3',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={complementaryProduct.name}
                      >
                        {complementaryProduct.name}
                      </h5>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-carbon)',
                        }}
                      >
                        {formatCurrency(complementaryProduct.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(complementaryProduct, 1)}
                      className="bricor-btn bricor-btn-secondary bricor-btn-sm"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                      title={`Agregar ${complementaryProduct.name} al pedido`}
                    >
                      <Plus size={14} />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* SECCIÓN 5: Resumen financiero y Botón fijo inferior */}
        {items.length > 0 && (
          <div className="bricor-cart-drawer-footer">
            {/* Desglose financiero */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-oliva)' }}>
                <span>Subtotal:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-oliva)' }}>
                <span>Despacho:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {isPickup
                    ? 'GRATIS (Retiro)'
                    : shippingFee === 0
                    ? 'GRATIS'
                    : formatCurrency(shippingFee)}
                </span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--color-piedra-light)',
                  paddingTop: '8px',
                  marginTop: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span className="font-editorial" style={{ fontSize: '1.2rem', color: 'var(--color-carbon)' }}>
                  Total Pedido
                </span>
                <span
                  className="font-editorial"
                  style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-carbon)' }}
                >
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Información financiera transparente */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.7rem',
                color: 'var(--color-oliva)',
                marginBottom: '14px',
                padding: '6px 8px',
                backgroundColor: 'rgba(90, 98, 86, 0.08)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <CreditCard size={14} style={{ flexShrink: 0, color: 'var(--color-oxido)' }} />
              <span>
                Difiere hasta en 36 cuotas con tu tarjeta en Wompi (según condiciones de tu emisor).
              </span>
            </div>

            {/* Botón inferior fijo */}
            <Button
              variant="primary"
              block
              icon={ArrowRight}
              disabled={isNavigating || items.length === 0}
              onClick={handleCheckoutClick}
              style={{ padding: '12px 18px', fontSize: '0.95rem' }}
            >
              {isNavigating ? 'Cargando checkout...' : `Continuar al pago seguro (${formatCurrency(grandTotal)})`}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
