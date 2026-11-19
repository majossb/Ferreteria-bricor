import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Truck,
  Store,
  CreditCard,
  Package,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';
import { formatCurrency } from '../utils/currency';
import { validateCheckoutForm } from '../utils/validation';
import { orderService } from '../services/orderService';

/**
 * Carga de forma segura y singleton el script oficial del Widget de Wompi Colombia.
 * Evita inyecciones duplicadas, gestiona eventos ya disparados y añade control de timeout.
 */
function loadWompiWidgetScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.WidgetCheckout) {
      return resolve(window.WidgetCheckout);
    }

    const scriptSrc = 'https://checkout.wompi.co/widget.js';
    const existingScript = document.querySelector(`script[src*="wompi.co/widget.js"]`);

    const timeout = setTimeout(() => {
      reject(
        new Error(
          'Tiempo de espera agotado al conectar con el Widget de Wompi. Comprueba tu conexión a internet o extensiones de bloqueo.'
        )
      );
    }, 10000);

    if (existingScript) {
      if (window.WidgetCheckout) {
        clearTimeout(timeout);
        return resolve(window.WidgetCheckout);
      }
      existingScript.addEventListener(
        'load',
        () => {
          clearTimeout(timeout);
          resolve(window.WidgetCheckout);
        },
        { once: true }
      );
      existingScript.addEventListener(
        'error',
        () => {
          clearTimeout(timeout);
          reject(new Error('No se pudo descargar el script oficial de Wompi desde checkout.wompi.co.'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = scriptSrc;
    script.type = 'text/javascript';
    script.async = true;

    script.onload = () => {
      clearTimeout(timeout);
      if (window.WidgetCheckout) {
        resolve(window.WidgetCheckout);
      } else {
        reject(new Error('El script de Wompi cargó pero el objeto WidgetCheckout no está disponible.'));
      }
    };

    script.onerror = () => {
      clearTimeout(timeout);
      reject(
        new Error('Fallo al cargar el script oficial de Wompi. Posible bloqueo por CSP o extensión del navegador.')
      );
    };

    document.head.appendChild(script);
  });
}

export default function CheckoutPage({ onNavigate }) {
  const {
    items,
    totalItemsCount,
    subtotal,
    estimatedShipping,
    grandTotal,
    clearCart,
    shippingMethod,
    setShippingMethod,
  } = useCart();

  const [formData, setFormData] = useState({
    fullName: '',
    documentNumber: '',
    email: '',
    phone: '',
    address: '',
    city: 'Bogotá D.C.',
    shippingMethod: shippingMethod || 'delivery',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * Estados visuales del ciclo de vida del checkout:
   * - 'idle': Formulario listo para ingreso de datos
   * - 'preparing_order': Backend validando precios, inventario y persistiendo orden
   * - 'preparing_payment': Generando firma criptográfica de integridad SHA-256
   * - 'opening_widget': Inicializando y desplegando el Widget modal de Wompi
   * - 'awaiting_confirmation': Esperando validación o webhook del servidor
   * - 'approved': Transacción confirmada y aprobada
   * - 'declined': Transacción rechazada por el medio de pago (carrito intacto)
   * - 'pending': Transacción pendiente en entidad bancaria (carrito intacto)
   * - 'error': Error de conexión o inicialización (carrito intacto)
   */
  const [paymentState, setPaymentState] = useState('idle');
  const [activeOrder, setActiveOrder] = useState(null);

  if (items.length === 0 && paymentState === 'idle') {
    return (
      <div className="uk-text-center u-padding-80px-0">
        <div className="uk-container">
          <h2>No hay artículos en tu pedido</h2>
          <p className="checkout-page-p-01">
            Tu carrito está vacío. Agrega productos para completar el proceso de pedido.
          </p>
          <Button variant="primary" onClick={() => onNavigate('catalog')}>
            Ir al catálogo
          </Button>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'shippingMethod') {
      setShippingMethod(value);
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  /**
   * Consulta el estado verificado de la transacción en el backend.
   * Regla de seguridad estricta:
   * - Nunca se confía únicamente en retornos locales del navegador.
   * - El carrito solo se vacía ante confirmación verificada de 'APPROVED'.
   */
  const verifyPaymentStatus = async (orderIdentifier, wompiTransactionId = null) => {
    setIsVerifying(true);
    try {
      // 1. Si tenemos un ID de transacción de Wompi, intentar reconciliación directa server-to-server
      if (wompiTransactionId) {
        try {
          const directReconcile = await orderService.verifyWompiTransaction(orderIdentifier, wompiTransactionId);
          if (directReconcile && directReconcile.status) {
            handleStatusTransition(directReconcile.status, directReconcile);
            return;
          }
        } catch (reconcileErr) {
          console.warn('[Checkout] Reconciliación directa server-to-server en espera:', reconcileErr.message);
        }
      }

      // 2. Polling seguro de estado hacia la API de BRICOR
      let finalStatus = 'PENDING';
      let lastStatusData = null;
      let attempts = 0;

      while (attempts < 6) {
        attempts++;
        const statusData = await orderService.getOrderStatus(orderIdentifier);
        if (statusData && statusData.status && statusData.status !== 'PENDING') {
          finalStatus = statusData.status;
          lastStatusData = statusData;
          break;
        }
        await new Promise((res) => setTimeout(res, 1200));
      }

      handleStatusTransition(finalStatus, lastStatusData);
    } catch (err) {
      console.error('[Checkout] Error verificando estado de orden:', err);
      setPaymentState('pending');
    } finally {
      setIsVerifying(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStatusTransition = (status, orderInfo = null) => {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'APPROVED') {
      setPaymentState('approved');
      clearCart(); // Regla obligatoria: Solo vaciar el carrito ante pago aprobado verificado

      // Guardar sesión para acceso directo e inmediato a "Mis compras"
      const emailToPersist = orderInfo?.customerEmail || activeOrder?.customerEmail;
      const tokenToPersist = orderInfo?.customerToken || activeOrder?.customerToken;
      if (emailToPersist && tokenToPersist) {
        try {
          sessionStorage.setItem('bricor_customer_email', emailToPersist);
          sessionStorage.setItem('bricor_customer_token', tokenToPersist);
        } catch {
          // Ignorar bloqueo de storage
        }
      }
    } else if (normalized === 'DECLINED') {
      setPaymentState('declined');
    } else if (normalized === 'VOIDED' || normalized === 'ERROR' || normalized === 'AMOUNT_MISMATCH') {
      setPaymentState('error');
    } else {
      setPaymentState('pending');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors: validationErrors } = validateCheckoutForm(formData);
    if (!isValid) {
      setErrors(validationErrors);
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // FASE 1: Preparando pedido
      setPaymentState('preparing_order');

      const orderResult = await orderService.createOrder({
        customer: formData,
        items,
        shippingMethod: formData.shippingMethod,
        notes: formData.notes,
      });

      const orderData = {
        orderNumber: orderResult.orderNumber,
        wompiReference: orderResult.wompi?.reference,
        totalAmount: orderResult.totalAmount || grandTotal,
        customerName: formData.fullName,
        customerEmail: formData.email,
        customerToken: orderResult.customerToken,
        itemsCount: totalItemsCount,
        items: items.map((it) => ({
          name: it.product.name,
          quantity: it.quantity,
          unitPrice: it.product.price,
          lineTotal: it.product.price * it.quantity,
        })),
        deliveryMethod: formData.shippingMethod === 'delivery' ? 'Despacho a Domicilio / Obra' : 'Retiro en mostrador',
        shippingAddress: `${formData.address}, ${formData.city}`,
        createdAt: new Date().toISOString(),
      };
      setActiveOrder(orderData);

      // Si se generó el token, registrarlo anticipadamente
      if (orderResult.customerToken && formData.email) {
        try {
          sessionStorage.setItem('bricor_customer_email', formData.email.trim().toLowerCase());
          sessionStorage.setItem('bricor_customer_token', orderResult.customerToken);
        } catch {
          // Ignorar
        }
      }

      // FASE 2: Preparando pago
      setPaymentState('preparing_payment');
      await new Promise((r) => setTimeout(r, 400)); // Breve pausa visual para confirmar firma lista

      // FASE 3: Abriendo Wompi
      setPaymentState('opening_widget');

      const WidgetClass = await loadWompiWidgetScript();

      if (!WidgetClass) {
        throw new Error('No se pudo inicializar el Widget oficial de Wompi. Por favor intenta de nuevo.');
      }

      if (!orderResult.wompi || !orderResult.wompi.publicKey || !orderResult.wompi.signature) {
        throw new Error('Parámetros de configuración Wompi incompletos devueltos por el servidor.');
      }

      // Instanciación oficial del WidgetCheckout con firma de integridad SHA-256
      const checkout = new WidgetClass({
        currency: orderResult.wompi.currency || 'COP',
        amountInCents: orderResult.wompi.amountInCents,
        reference: orderResult.wompi.reference,
        publicKey: orderResult.wompi.publicKey,
        signature: {
          integrity: orderResult.wompi.signature,
        },
        customerData: {
          email: formData.email,
          fullName: formData.fullName,
          phoneNumber: formData.phone.replace(/\D/g, '').slice(-10),
          phoneNumberPrefix: '+57',
          legalId: formData.documentNumber.replace(/\D/g, ''),
          legalIdType: 'CC',
        },
        shippingAddress: {
          addressLine1: formData.address,
          city: formData.city,
          phoneNumber: formData.phone.replace(/\D/g, '').slice(-10),
          region: 'Cundinamarca',
          country: 'CO',
        },
      });

      // Abrir el modal de Wompi
      checkout.open(async (result) => {
        // Callback al cerrar o finalizar en Wompi
        setPaymentState('awaiting_confirmation');
        const wompiTxId = result?.transaction?.id || null;
        await verifyPaymentStatus(orderResult.orderNumber, wompiTxId);
      });
    } catch (err) {
      console.error('[Checkout] Error en flujo de pago:', err);
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Error al conectar con la pasarela de pagos Wompi.',
      }));
      setPaymentState('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ESTADO: Preparando pedido
  if (paymentState === 'preparing_order') {
    return (
      <div className="u-padding-80px-0-96px">
        <div className="uk-container u-max-width-560px">
          <div
            className="uk-text-center checkout-page-div-01"
          >
            <div data-uk-spinner="ratio: 2" className="checkout-page-div-02"></div>
            <span className="bricor-label">Paso 1 de 3</span>
            <h2 className="checkout-page-h2-01">Preparando Pedido</h2>
            <p className="checkout-page-p-02">
              Validando disponibilidad de inventario en almacén y registrando orden en servidor...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Preparando pago
  if (paymentState === 'preparing_payment') {
    return (
      <div className="u-padding-80px-0-96px">
        <div className="uk-container u-max-width-560px">
          <div
            className="uk-text-center checkout-page-div-03"
          >
            <div data-uk-spinner="ratio: 2" className="checkout-page-div-04"></div>
            <span className="bricor-label u-color-oxido">Paso 2 de 3</span>
            <h2 className="checkout-page-h2-01">Preparando Pago Seguro</h2>
            <p className="checkout-page-p-02">
              Calculando totales y generando firma criptográfica de integridad SHA-256 para Wompi...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Abriendo Wompi
  if (paymentState === 'opening_widget') {
    return (
      <div className="u-padding-80px-0-96px">
        <div className="uk-container u-max-width-560px">
          <div
            className="uk-text-center checkout-page-div-03"
          >
            <div data-uk-spinner="ratio: 2" className="checkout-page-div-04"></div>
            <span className="bricor-label u-color-oxido">Paso 3 de 3</span>
            <h2 className="checkout-page-h2-01">Abriendo Pasarela Wompi</h2>
            <p className="checkout-page-p-02">
              Cargando el Widget oficial de Wompi Colombia. Completa tu pago en la ventana emergente...
            </p>
            <div className="u-margin-top-24px">
              <Button variant="secondary" onClick={() => setPaymentState('idle')}>
                Volver al formulario
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Esperando confirmación
  if (paymentState === 'awaiting_confirmation') {
    return (
      <div className="u-padding-80px-0-96px">
        <div className="uk-container u-max-width-580px">
          <div
            className="uk-text-center checkout-page-div-03"
          >
            <div data-uk-spinner="ratio: 2" className="uk-margin-bottom u-color-oxido"></div>
            <span className="bricor-label u-color-oxido">
              Verificación en Curso
            </span>
            <h2 className="checkout-page-h2-01">Esperando Confirmación</h2>
            <p className="checkout-page-p-03">
              Orden <strong>#{activeOrder?.orderNumber}</strong> ({formatCurrency(activeOrder?.totalAmount)}).
              Verificando conciliación de la transacción con los servidores de BRICOR y Wompi...
            </p>
            <div className="uk-flex uk-flex-center uk-flex-wrap u-gap-12px">
              <Button
                variant="primary"
                disabled={isVerifying}
                icon={RefreshCw}
                onClick={() => verifyPaymentStatus(activeOrder?.orderNumber)}
              >
                {isVerifying ? 'Verificando con servidor...' : 'Comprobar Estado del Pago'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPaymentState('idle')}
              >
                Volver al Formulario
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Pago Aprobado y Confirmado (Sección 6)
  if (paymentState === 'approved' && activeOrder) {
    const formattedDate = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="u-padding-48px-0-96px">
        <div className="uk-container u-max-width-680px">
          <div
            className="uk-text-center checkout-page-div-05"
          >
            <CheckCircle size={60} className="checkout-page-checkcircle-01" />
            <span
              className="bricor-badge checkout-page-span-01"
            >
              Confirmación Verificada Wompi Sandbox
            </span>

            <h1 className="uk-text-uppercase checkout-page-h1-01">
              ¡Tu compra fue confirmada!
            </h1>

            <p className="checkout-page-p-04">
              Gracias por tu compra, <strong>{activeOrder.customerName}</strong>. Tu pedido ha sido conciliado en el almacén oficial de BRICOR.
            </p>

            {/* Recuadro de detalles de la orden */}
            <div
              className="uk-text-left checkout-page-div-06"
            >
              <div className="checkout-page-div-07">
                <div>
                  <span className="bricor-label">Número de Pedido</span>
                  <div className="checkout-page-div-08">
                    #{activeOrder.orderNumber}
                  </div>
                </div>

                <div>
                  <span className="bricor-label">Fecha</span>
                  <div className="catalog-page-span-01">
                    {formattedDate}
                  </div>
                </div>

                <div>
                  <span className="bricor-label">Total Pagado</span>
                  <div className="checkout-page-div-09">
                    {formatCurrency(activeOrder.totalAmount)}
                  </div>
                </div>

                <div>
                  <span className="bricor-label">Método de Pago</span>
                  <div className="catalog-page-span-01">
                    Pasarela Wompi Colombia (Ref: <code>{activeOrder.wompiReference}</code>)
                  </div>
                </div>
              </div>

              {/* Información de entrega */}
              <div className="checkout-page-div-10">
                <span className="bricor-label">Modalidad de Despacho</span>
                <div className="uk-flex uk-flex-middle checkout-page-div-11">
                  <Truck size={16} className="u-color-oxido" />
                  <span>{activeOrder.deliveryMethod} — {activeOrder.shippingAddress || 'Dirección de obra registrada'}</span>
                </div>
              </div>

              {/* Resumen de productos */}
              {activeOrder.items && activeOrder.items.length > 0 && (
                <div className="checkout-page-div-12">
                  <span className="bricor-label u-margin-bottom-8px">
                    Productos Adquiridos ({activeOrder.items.length})
                  </span>
                  <div className="uk-flex uk-flex-column u-gap-6px">
                    {activeOrder.items.map((it, idx) => (
                      <div key={idx} className="uk-flex uk-flex-between u-font-size-xs">
                        <span className="u-color-carbon">
                          <strong>{it.quantity}x</strong> {it.name}
                        </span>
                        <span className="u-font-family-mono">{formatCurrency(it.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="uk-flex uk-flex-center uk-flex-wrap u-gap-12px">
              <Button
                variant="primary"
                icon={Package}
                onClick={() => onNavigate('purchases')}
                className="u-padding-12px-24px"
              >
                Ver mis compras
              </Button>
              <Button
                variant="secondary"
                onClick={() => onNavigate('catalog')}
                className="u-padding-12px-24px"
              >
                Seguir comprando
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Pago Rechazado (Conserva el carrito intacto)
  if (paymentState === 'declined' && activeOrder) {
    return (
      <div className="u-padding-64px-0-96px">
        <div className="uk-container u-max-width-640px">
          <div
            className="uk-text-center checkout-page-div-13"
          >
            <XCircle size={56} className="checkout-page-xcircle-01" />
            <span className="bricor-label u-color-oxido">
              Pago No Aprobado
            </span>
            <h1 className="checkout-page-h1-02">
              Transacción Rechazada
            </h1>

            <p className="checkout-page-p-05">
              La entidad bancaria o el medio de pago rechazó la transacción de la orden <strong>#{activeOrder.orderNumber}</strong>.
            </p>

            <div
              className="uk-text-left checkout-page-div-14"
            >
              <strong>Tu pedido no se ha perdido:</strong> Todos los productos continúan en tu carrito de compras sin alteración. Puedes reintentar utilizando otra tarjeta de crédito, PSE o Nequi.
            </div>

            <div className="uk-flex uk-flex-center uk-flex-wrap u-gap-12px">
              <Button variant="primary" onClick={() => setPaymentState('idle')}>
                Reintentar con otro medio de pago
              </Button>
              <Button variant="secondary" onClick={() => onNavigate('cart')}>
                Volver al carrito
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Pago Pendiente (Conserva el carrito intacto)
  if (paymentState === 'pending' && activeOrder) {
    return (
      <div className="u-padding-64px-0-96px">
        <div className="uk-container u-max-width-640px">
          <div
            className="uk-text-center checkout-page-div-15"
          >
            <Clock size={56} className="checkout-page-clock-01" />
            <span className="bricor-label u-color-oliva">
              Pago en Validación
            </span>
            <h1 className="checkout-page-h1-02">
              Pago Pendiente #{activeOrder.orderNumber}
            </h1>

            <p className="checkout-page-p-05">
              Tu transacción se encuentra en proceso de validación con la red financiera o el corresponsal bancario. Tan pronto como Wompi confirme la recepción, actualizaremos tu despacho.
            </p>

            <div
              className="uk-text-left checkout-page-div-14"
            >
              <strong>Referencia Wompi:</strong> <code>{activeOrder.wompiReference}</code>. Tus artículos continúan reservados en tu pedido.
            </div>

            <div className="uk-flex uk-flex-center uk-flex-wrap u-gap-12px">
              <Button
                variant="primary"
                disabled={isVerifying}
                icon={RefreshCw}
                onClick={() => verifyPaymentStatus(activeOrder.orderNumber)}
              >
                {isVerifying ? 'Consultando...' : 'Comprobar Estado Actual'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPaymentState('idle')}
              >
                Volver al Formulario
              </Button>
              <Button variant="secondary" onClick={() => onNavigate('home')}>
                Volver a la tienda
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Error en la transacción o inicialización (Conserva el carrito intacto)
  if (paymentState === 'error') {
    return (
      <div className="u-padding-64px-0-96px">
        <div className="uk-container u-max-width-640px">
          <div
            className="uk-text-center checkout-page-div-13"
          >
            <AlertTriangle size={56} className="checkout-page-xcircle-01" />
            <span className="bricor-label u-color-oxido">
              Incidencia en el Proceso
            </span>
            <h1 className="checkout-page-h1-02">
              No se pudo completar la operación
            </h1>

            <p className="checkout-page-p-05">
              {errors.submit ||
                'Ocurrió una interrupción al comunicar con el servidor o la pasarela de pagos. Tus artículos no han sido cobrados.'}
            </p>

            <div
              className="uk-text-left checkout-page-div-14"
            >
              <strong>Tu pedido y carrito están a salvo:</strong> No se ha realizado ningún cobro. Puedes regresar al formulario para reintentar el pago o verificar tus datos.
            </div>

            <div className="uk-flex uk-flex-center uk-flex-wrap checkout-page-div-16">
              <Button variant="primary" onClick={() => setPaymentState('idle')}>
                Volver al Formulario
              </Button>
              <Button variant="secondary" onClick={() => onNavigate('cart')}>
                Volver al Carrito
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ESTADO: Formulario de Checkout (idle)
  return (
    <div className="u-padding-36px-0-80px">
      <div className="uk-container">
        {/* Volver */}
        <div className="u-margin-bottom-24px">
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="uk-flex-inline uk-flex-middle checkout-page-button-01"
          >
            <ArrowLeft size={14} />
            <span>Volver al carrito</span>
          </button>
        </div>

        <div className="checkout-page-div-17">
          <span className="bricor-label">Finalizar Compra</span>
          <h1 className="u-margin-4px-0-0-0">Datos de Entrega y Facturación</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="uk-grid uk-grid-large" data-uk-grid>
            {/* Formulario */}
            <div className="uk-width-expand@m">
              <div
                className="checkout-page-div-18"
              >
                <h3
                  className="uk-margin-bottom checkout-page-h3-01"
                >
                  1. Información del Cliente / Razón Social
                </h3>

                <div className="uk-grid uk-grid-small uk-child-width-1-1 uk-child-width-1-2@s" data-uk-grid>
                  <div>
                    <FormField
                      label="Nombre completo o Empresa"
                      id="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      error={errors.fullName}
                      placeholder="Ej. Construcciones del Norte S.A.S."
                      required
                    />
                  </div>
                  <div>
                    <FormField
                      label="Cédula de Ciudadanía o NIT"
                      id="documentNumber"
                      value={formData.documentNumber}
                      onChange={handleChange}
                      error={errors.documentNumber}
                      placeholder="Ej. 901.234.567-8"
                      required
                    />
                  </div>
                  <div>
                    <FormField
                      label="Correo Electrónico (Factura Electrónica)"
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      error={errors.email}
                      placeholder="compras@empresa.com"
                      required
                    />
                  </div>
                  <div>
                    <FormField
                      label="Teléfono de Contacto en Obra"
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      error={errors.phone}
                      placeholder="310 000 0000"
                      required
                    />
                  </div>
                </div>

                <h3
                  className="checkout-page-h3-02"
                >
                  2. Método de Despacho
                </h3>

                <div className="checkout-page-div-19">
                  <label
                    className="uk-flex uk-flex-column checkout-page-label-01" style={{ border: formData.shippingMethod === 'delivery'
                          ? '2px solid var(--color-oxido)'
                          : '1px solid var(--color-piedra-light)', borderRadius: 'var(--radius-xs)', background: formData.shippingMethod === 'delivery' ? 'var(--color-oxido-light)' : 'transparent' }}
                  >
                    <div className="uk-flex uk-flex-middle u-gap-8px">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="delivery"
                        checked={formData.shippingMethod === 'delivery'}
                        onChange={handleChange}
                        className="u-accent-color-oxido"
                      />
                      <Truck size={18} className="u-color-oxido" />
                      <strong className="u-font-size-sm">Despacho a Domicilio / Obra</strong>
                    </div>
                    <span className="checkout-page-span-02">
                      Transporte de carga y entregas en destino.
                    </span>
                  </label>

                  <label
                    className="uk-flex uk-flex-column checkout-page-label-01" style={{ border: formData.shippingMethod === 'pickup'
                          ? '2px solid var(--color-oxido)'
                          : '1px solid var(--color-piedra-light)', borderRadius: 'var(--radius-xs)', background: formData.shippingMethod === 'pickup' ? 'var(--color-oxido-light)' : 'transparent' }}
                  >
                    <div className="uk-flex uk-flex-middle u-gap-8px">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="pickup"
                        checked={formData.shippingMethod === 'pickup'}
                        onChange={handleChange}
                        className="u-accent-color-oxido"
                      />
                      <Store size={18} className="u-color-oliva" />
                      <strong className="u-font-size-sm">Retiro en Punto BRICOR</strong>
                    </div>
                    <span className="checkout-page-span-02">
                      Sin costo de envío en almacén principal.
                    </span>
                  </label>
                </div>

                <div className="uk-grid uk-grid-small uk-child-width-1-1 uk-child-width-1-2@s" data-uk-grid>
                  <div>
                    <FormField
                      label="Dirección de Entrega"
                      id="address"
                      value={formData.address}
                      onChange={handleChange}
                      error={errors.address}
                      placeholder="Calle / Carrera / Lote de Obra"
                      required
                    />
                  </div>
                  <div>
                    <FormField
                      label="Ciudad o Municipio"
                      id="city"
                      value={formData.city}
                      onChange={handleChange}
                      error={errors.city}
                      required
                    />
                  </div>
                </div>

                <FormField
                  label="Instrucciones o Referencias para el Transportador"
                  id="notes"
                  as="textarea"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  error={errors.notes}
                  placeholder="Ej. Ingreso por portón lateral de la bodega, horario de recepción hasta las 5:00 pm."
                />
              </div>

              {/* Nota de pasarela técnica */}
              <div
                className="uk-flex uk-flex-middle checkout-page-div-20"
              >
                <ShieldCheck size={20} className="checkout-page-shieldcheck-01" />
                <span>
                  <strong>Pasarela oficial Wompi Sandbox:</strong> Tu pago se procesará a través del Widget seguro de Wompi Colombia (Bancolombia, Nequi, PSE, Tarjetas de Crédito/Débito) con firma de integridad SHA-256 generada en servidor.
                </span>
              </div>
            </div>

            {/* Resumen lateral de la orden */}
            <div className="uk-width-1-3@m">
              <div
                className="cart-page-div-03"
              >
                <h3
                  className="cart-page-h3-01"
                >
                  Resumen ({totalItemsCount} artículos)
                </h3>

                <div
                  className="checkout-page-div-21"
                >
                  {items.map((it) => (
                    <div
                      key={it.product.id}
                      className="uk-flex uk-flex-between checkout-page-div-22"
                    >
                      <span className="u-color-carbon">
                        {it.quantity}x {it.product.name}
                      </span>
                      <span className="cart-page-span-01">
                        {formatCurrency(it.product.price * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="uk-flex uk-flex-between checkout-page-div-23"
                >
                  <span className="u-color-oliva">Subtotal:</span>
                  <span className="u-font-family-mono">{formatCurrency(subtotal)}</span>
                </div>

                <div
                  className="uk-flex uk-flex-between cart-page-div-05"
                >
                  <span className="u-color-oliva">Despacho:</span>
                  <span className="u-font-family-mono">
                    {formData.shippingMethod === 'pickup'
                      ? 'GRATIS (Retiro)'
                      : estimatedShipping === 0
                      ? 'GRATIS'
                      : formatCurrency(estimatedShipping)}
                  </span>
                </div>

                <div
                  className="uk-flex uk-flex-between cart-page-div-06"
                >
                  <span className="font-editorial u-font-size-1-25rem">
                    Total Pedido
                  </span>
                  <span
                    className="font-editorial cart-page-span-02"
                  >
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  block
                  disabled={isSubmitting}
                  icon={CreditCard}
                >
                  {isSubmitting ? 'Procesando orden...' : 'Proceder al Pago con Wompi'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
