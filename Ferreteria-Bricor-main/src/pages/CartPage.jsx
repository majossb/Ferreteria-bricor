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
      <div className="u-padding-80px-0">
        <div className="uk-container uk-text-center u-max-width-560px">
          <ShoppingBag size={56} className="uk-margin-bottom u-color-piedra" />
          <h2 className="u-margin-bottom-12px">Tu carrito está actualmente vacío</h2>
          <p className="cart-page-p-01">
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
    <div className="u-padding-40px-0-80px">
      <div className="uk-container">
        {/* Cabecera */}
        <div
          className="uk-flex uk-flex-between uk-flex-wrap cart-page-div-01"
        >
          <div>
            <span className="bricor-label">Resumen de Compras</span>
            <h1 className="u-margin-4px-0-0-0">Carrito de Compras ({totalItemsCount} artículos)</h1>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="uk-flex uk-flex-middle cart-page-button-01"
          >
            <Trash2 size={13} />
            <span>Vaciar todo el carrito</span>
          </button>
        </div>

        <div className="uk-grid uk-grid-large" data-uk-grid>
          {/* Listado de Productos */}
          <div className="uk-width-expand@m">
            <div
              className="cart-page-div-02"
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

              <div className="uk-flex uk-flex-between uk-flex-middle u-margin-top-24px">
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
              className="cart-page-div-03"
            >
              <h3 className="cart-page-h3-01">
                Total del Pedido
              </h3>

              <div className="uk-flex uk-flex-between cart-page-div-04">
                <span className="u-color-oliva">Subtotal artículos:</span>
                <span className="cart-page-span-01">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="uk-flex uk-flex-between cart-page-div-05">
                <span className="u-color-oliva">Despacho estimado:</span>
                <span className="cart-page-span-01" style={{ color: estimatedShipping === 0 ? 'var(--color-success)' : 'var(--color-carbon)' }}>
                  {estimatedShipping === 0
                    ? shippingMethod === 'pickup'
                      ? 'GRATIS (Retiro en punto BRICOR)'
                      : 'GRATIS (Pedido > $300k)'
                    : formatCurrency(estimatedShipping)}
                </span>
              </div>

              <div
                className="uk-flex uk-flex-between cart-page-div-06"
              >
                <span className="font-editorial u-font-size-1-25rem">
                  Total a Pagar
                </span>
                <span
                  className="font-editorial cart-page-span-02"
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

              <div className="uk-margin-top cart-page-div-07">
                <div className="uk-flex uk-flex-middle footer-div-04">
                  <ShieldCheck size={16} className="u-color-oxido" />
                  <span>Factura legal electrónica disponible con NIT</span>
                </div>
                <div className="uk-flex uk-flex-middle u-gap-8px">
                  <Truck size={16} className="u-color-oliva" />
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
