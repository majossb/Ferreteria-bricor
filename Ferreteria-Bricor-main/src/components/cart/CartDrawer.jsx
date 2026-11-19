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
          <div className="uk-flex uk-flex-middle u-gap-10px">
            <ShoppingBag size={20} className="u-color-oxido" />
            <h3
              className="uk-margin-remove uk-text-uppercase cart-drawer-h3-01"
            >
              Tu Carrito {totalItemsCount > 0 && `(${totalItemsCount})`}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="bricor-btn bricor-btn-outline-white bricor-btn-sm cart-drawer-button-01"
            aria-label="Cerrar carrito"
          >
            <X size={18} />
          </button>
        </div>

        {/* SECCIÓN 2: Barra de progreso para envío gratis */}
        {items.length > 0 && (
          <div className="bricor-shipping-progress-banner">
            <div className="uk-flex uk-flex-middle uk-flex-between u-font-size-xs">
              <div className="uk-flex uk-flex-middle u-gap-6px">
                {hasFreeShipping ? (
                  <CheckCircle size={15} className="u-color-success" />
                ) : (
                  <Truck size={15} className="u-color-oxido" />
                )}
                <span className="u-font-weight-500">
                  {isPickup
                    ? 'Modalidad Retiro en Punto BRICOR seleccionada (flete $0)'
                    : hasFreeShipping
                    ? '¡Excelente! Tu envío a obra es GRATIS'
                    : `¡Te faltan ${formatCurrency(amountRemaining)} para envío GRATIS!`}
                </span>
              </div>
              {!isPickup && (
                <span className="cart-drawer-span-01">
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
            <div className="uk-text-center cart-drawer-div-01">
              <ShoppingBag size={52} className="cart-drawer-shoppingbag-01" />
              <h4 className="cart-drawer-h4-01">Tu carrito está vacío</h4>
              <p
                className="cart-drawer-p-01"
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
                    className="uk-flex uk-flex-middle uk-flex-between u-margin-bottom-8px"
                  >
                    <span
                      className="uk-text-uppercase cart-drawer-span-02"
                    >
                      Complemento para tu compra
                    </span>
                    <span className="cart-drawer-span-03">Compatible</span>
                  </div>

                  <div className="bricor-cross-sell-card">
                    <img
                      src={complementaryProduct.primaryImage}
                      alt={complementaryProduct.name}
                      className="bricor-cross-sell-thumb"
                      loading="lazy"
                    />
                    <div className="uk-flex-1 u-min-width-0">
                      <h5
                        className="uk-text-nowrap uk-overflow-hidden cart-drawer-h5-01"
                        title={complementaryProduct.name}
                      >
                        {complementaryProduct.name}
                      </h5>
                      <span
                        className="cart-drawer-span-04"
                      >
                        {formatCurrency(complementaryProduct.price)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => addToCart(complementaryProduct, 1)}
                      className="bricor-btn bricor-btn-secondary bricor-btn-sm cart-drawer-button-02"
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
            <div className="uk-flex uk-flex-column cart-drawer-div-02">
              <div className="uk-flex uk-flex-between cart-drawer-div-03">
                <span>Subtotal:</span>
                <span className="u-font-family-mono">{formatCurrency(subtotal)}</span>
              </div>

              <div className="uk-flex uk-flex-between cart-drawer-div-03">
                <span>Despacho:</span>
                <span className="u-font-family-mono">
                  {isPickup
                    ? 'GRATIS (Retiro)'
                    : shippingFee === 0
                    ? 'GRATIS'
                    : formatCurrency(shippingFee)}
                </span>
              </div>

              <div
                className="uk-flex uk-flex-between cart-drawer-div-04"
              >
                <span className="font-editorial cart-drawer-span-05">
                  Total Pedido
                </span>
                <span
                  className="font-editorial cart-drawer-span-06"
                >
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Información financiera transparente */}
            <div
              className="uk-flex uk-flex-middle cart-drawer-div-05"
            >
              <CreditCard size={14} className="cart-drawer-creditcard-01" />
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
              className="cart-drawer-button-03"
            >
              {isNavigating ? 'Cargando checkout...' : `Continuar al pago seguro (${formatCurrency(grandTotal)})`}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
