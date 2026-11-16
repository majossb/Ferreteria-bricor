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
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="uk-container">
          <h2>No hay artículos en tu pedido</h2>
          <p style={{ color: 'var(--color-oliva)', marginBottom: '24px' }}>
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
          phoneNumber: formData.phone,
          phoneNumberPrefix: '+57',
          legalId: formData.documentNumber,
          legalIdType: 'CC',
        },
        shippingAddress: {
          addressLine1: formData.address,
          city: formData.city,
          phoneNumber: formData.phone,
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
      <div style={{ padding: '80px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '560px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-carbon)',
              borderRadius: 'var(--radius-xs)',
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <div data-uk-spinner="ratio: 2" style={{ color: 'var(--color-carbon)', marginBottom: '24px' }}></div>
            <span className="bricor-label">Paso 1 de 3</span>
            <h2 style={{ fontSize: '1.75rem', margin: '8px 0 16px 0' }}>Preparando Pedido</h2>
            <p style={{ color: 'var(--color-oliva)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
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
      <div style={{ padding: '80px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '560px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-oxido)',
              borderRadius: 'var(--radius-xs)',
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <div data-uk-spinner="ratio: 2" style={{ color: 'var(--color-oxido)', marginBottom: '24px' }}></div>
            <span className="bricor-label" style={{ color: 'var(--color-oxido)' }}>Paso 2 de 3</span>
            <h2 style={{ fontSize: '1.75rem', margin: '8px 0 16px 0' }}>Preparando Pago Seguro</h2>
            <p style={{ color: 'var(--color-oliva)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
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
      <div style={{ padding: '80px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '560px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-oxido)',
              borderRadius: 'var(--radius-xs)',
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <div data-uk-spinner="ratio: 2" style={{ color: 'var(--color-oxido)', marginBottom: '24px' }}></div>
            <span className="bricor-label" style={{ color: 'var(--color-oxido)' }}>Paso 3 de 3</span>
            <h2 style={{ fontSize: '1.75rem', margin: '8px 0 16px 0' }}>Abriendo Pasarela Wompi</h2>
            <p style={{ color: 'var(--color-oliva)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
              Cargando el Widget oficial de Wompi Colombia. Completa tu pago en la ventana emergente...
            </p>
            <div style={{ marginTop: '24px' }}>
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
      <div style={{ padding: '80px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '580px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-oxido)',
              borderRadius: 'var(--radius-xs)',
              padding: '48px 32px',
              textAlign: 'center',
            }}
          >
            <div data-uk-spinner="ratio: 2" style={{ color: 'var(--color-oxido)', marginBottom: '20px' }}></div>
            <span className="bricor-label" style={{ color: 'var(--color-oxido)' }}>
              Verificación en Curso
            </span>
            <h2 style={{ fontSize: '1.75rem', margin: '8px 0 16px 0' }}>Esperando Confirmación</h2>
            <p style={{ color: 'var(--color-carbon)', fontSize: 'var(--text-sm)', lineHeight: '1.6', marginBottom: '24px' }}>
              Orden <strong>#{activeOrder?.orderNumber}</strong> ({formatCurrency(activeOrder?.totalAmount)}).
              Verificando conciliación de la transacción con los servidores de BRICOR y Wompi...
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
      <div style={{ padding: '48px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '680px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-success)',
              borderRadius: 'var(--radius-xs)',
              padding: '40px 32px',
              textAlign: 'center',
            }}
          >
            <CheckCircle size={60} style={{ color: 'var(--color-success)', margin: '0 auto 16px' }} />
            <span
              className="bricor-badge"
              style={{
                backgroundColor: 'rgba(39, 174, 96, 0.12)',
                color: 'var(--color-success)',
                border: '1px solid rgba(39, 174, 96, 0.3)',
                padding: '4px 12px',
                fontSize: '0.75rem',
              }}
            >
              Confirmación Verificada Wompi Sandbox
            </span>

            <h1 style={{ fontSize: '2.1rem', margin: '12px 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              ¡Tu compra fue confirmada!
            </h1>

            <p style={{ color: 'var(--color-oliva)', fontSize: 'var(--text-sm)', marginBottom: '24px' }}>
              Gracias por tu compra, <strong>{activeOrder.customerName}</strong>. Tu pedido ha sido conciliado en el almacén oficial de BRICOR.
            </p>

            {/* Recuadro de detalles de la orden */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-piedra-light)',
                borderRadius: 'var(--radius-xs)',
                padding: '20px 24px',
                textAlign: 'left',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <span className="bricor-label">Número de Pedido</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-carbon)' }}>
                    #{activeOrder.orderNumber}
                  </div>
                </div>

                <div>
                  <span className="bricor-label">Fecha</span>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-carbon)' }}>
                    {formattedDate}
                  </div>
                </div>

                <div>
                  <span className="bricor-label">Total Pagado</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--color-oxido)' }}>
                    {formatCurrency(activeOrder.totalAmount)}
                  </div>
                </div>

                <div>
                  <span className="bricor-label">Método de Pago</span>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-carbon)' }}>
                    Pasarela Wompi Colombia (Ref: <code>{activeOrder.wompiReference}</code>)
                  </div>
                </div>
              </div>

              {/* Información de entrega */}
              <div style={{ borderTop: '1px dashed var(--color-piedra)', paddingTop: '14px', marginBottom: '16px', fontSize: 'var(--text-xs)' }}>
                <span className="bricor-label">Modalidad de Despacho</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', color: 'var(--color-carbon)', fontWeight: 500 }}>
                  <Truck size={16} style={{ color: 'var(--color-oxido)' }} />
                  <span>{activeOrder.deliveryMethod} — {activeOrder.shippingAddress || 'Dirección de obra registrada'}</span>
                </div>
              </div>

              {/* Resumen de productos */}
              {activeOrder.items && activeOrder.items.length > 0 && (
                <div style={{ borderTop: '1px solid var(--color-piedra-light)', paddingTop: '14px' }}>
                  <span className="bricor-label" style={{ marginBottom: '8px' }}>
                    Productos Adquiridos ({activeOrder.items.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeOrder.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                        <span style={{ color: 'var(--color-carbon)' }}>
                          <strong>{it.quantity}x</strong> {it.name}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(it.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                icon={Package}
                onClick={() => onNavigate('purchases')}
                style={{ padding: '12px 24px' }}
              >
                Ver mis compras
              </Button>
              <Button
                variant="secondary"
                onClick={() => onNavigate('catalog')}
                style={{ padding: '12px 24px' }}
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
      <div style={{ padding: '64px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '640px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-oxido)',
              borderRadius: 'var(--radius-xs)',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <XCircle size={56} style={{ color: 'var(--color-oxido)', margin: '0 auto 16px' }} />
            <span className="bricor-label" style={{ color: 'var(--color-oxido)' }}>
              Pago No Aprobado
            </span>
            <h1 style={{ fontSize: '2rem', margin: '8px 0 16px 0' }}>
              Transacción Rechazada
            </h1>

            <p style={{ color: 'var(--color-carbon)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
              La entidad bancaria o el medio de pago rechazó la transacción de la orden <strong>#{activeOrder.orderNumber}</strong>.
            </p>

            <div
              style={{
                backgroundColor: 'var(--color-marfil)',
                border: '1px solid var(--color-piedra)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px',
                margin: '24px 0',
                textAlign: 'left',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-oliva)',
              }}
            >
              <strong>Tu pedido no se ha perdido:</strong> Todos los productos continúan en tu carrito de compras sin alteración. Puedes reintentar utilizando otra tarjeta de crédito, PSE o Nequi.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
      <div style={{ padding: '64px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '640px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-oliva)',
              borderRadius: 'var(--radius-xs)',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <Clock size={56} style={{ color: 'var(--color-oliva)', margin: '0 auto 16px' }} />
            <span className="bricor-label" style={{ color: 'var(--color-oliva)' }}>
              Pago en Validación
            </span>
            <h1 style={{ fontSize: '2rem', margin: '8px 0 16px 0' }}>
              Pago Pendiente #{activeOrder.orderNumber}
            </h1>

            <p style={{ color: 'var(--color-carbon)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
              Tu transacción se encuentra en proceso de validación con la red financiera o el corresponsal bancario. Tan pronto como Wompi confirme la recepción, actualizaremos tu despacho.
            </p>

            <div
              style={{
                backgroundColor: 'var(--color-marfil)',
                border: '1px solid var(--color-piedra)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px',
                margin: '24px 0',
                textAlign: 'left',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-oliva)',
              }}
            >
              <strong>Referencia Wompi:</strong> <code>{activeOrder.wompiReference}</code>. Tus artículos continúan reservados en tu pedido.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
      <div style={{ padding: '64px 0 96px' }}>
        <div className="uk-container" style={{ maxWidth: '640px' }}>
          <div
            style={{
              backgroundColor: 'var(--color-marfil-card)',
              border: '1px solid var(--color-piedra-light)',
              borderTop: '5px solid var(--color-oxido)',
              borderRadius: 'var(--radius-xs)',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <AlertTriangle size={56} style={{ color: 'var(--color-oxido)', margin: '0 auto 16px' }} />
            <span className="bricor-label" style={{ color: 'var(--color-oxido)' }}>
              Incidencia en el Proceso
            </span>
            <h1 style={{ fontSize: '2rem', margin: '8px 0 16px 0' }}>
              No se pudo completar la operación
            </h1>

            <p style={{ color: 'var(--color-carbon)', fontSize: 'var(--text-base)', lineHeight: '1.6' }}>
              {errors.submit ||
                'Ocurrió una interrupción al comunicar con el servidor o la pasarela de pagos. Tus artículos no han sido cobrados.'}
            </p>

            <div
              style={{
                backgroundColor: 'var(--color-marfil)',
                border: '1px solid var(--color-piedra)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px',
                margin: '24px 0',
                textAlign: 'left',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-oliva)',
              }}
            >
              <strong>Tu pedido y carrito están a salvo:</strong> No se ha realizado ningún cobro. Puedes regresar al formulario para reintentar el pago o verificar tus datos.
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
    <div style={{ padding: '36px 0 80px' }}>
      <div className="uk-container">
        {/* Volver */}
        <div style={{ marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => onNavigate('cart')}
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
            <span>Volver al carrito</span>
          </button>
        </div>

        <div style={{ borderBottom: '2px solid var(--color-carbon)', paddingBottom: '16px', marginBottom: '32px' }}>
          <span className="bricor-label">Finalizar Compra</span>
          <h1 style={{ margin: '4px 0 0 0' }}>Datos de Entrega y Facturación</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="uk-grid uk-grid-large" data-uk-grid>
            {/* Formulario */}
            <div className="uk-width-expand@m">
              <div
                style={{
                  backgroundColor: 'var(--color-marfil-card)',
                  border: '1px solid var(--color-piedra-light)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '32px',
                  marginBottom: '24px',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.25rem',
                    marginBottom: '20px',
                    borderBottom: '1px solid var(--color-piedra-light)',
                    paddingBottom: '8px',
                  }}
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
                  style={{
                    fontSize: '1.25rem',
                    margin: '32px 0 20px 0',
                    borderBottom: '1px solid var(--color-piedra-light)',
                    paddingBottom: '8px',
                  }}
                >
                  2. Método de Despacho
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <label
                    style={{
                      border:
                        formData.shippingMethod === 'delivery'
                          ? '2px solid var(--color-oxido)'
                          : '1px solid var(--color-piedra-light)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '16px',
                      cursor: 'pointer',
                      background: formData.shippingMethod === 'delivery' ? 'var(--color-oxido-light)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="delivery"
                        checked={formData.shippingMethod === 'delivery'}
                        onChange={handleChange}
                        style={{ accentColor: 'var(--color-oxido)' }}
                      />
                      <Truck size={18} style={{ color: 'var(--color-oxido)' }} />
                      <strong style={{ fontSize: 'var(--text-sm)' }}>Despacho a Domicilio / Obra</strong>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', paddingLeft: '24px' }}>
                      Transporte de carga y entregas en destino.
                    </span>
                  </label>

                  <label
                    style={{
                      border:
                        formData.shippingMethod === 'pickup'
                          ? '2px solid var(--color-oxido)'
                          : '1px solid var(--color-piedra-light)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '16px',
                      cursor: 'pointer',
                      background: formData.shippingMethod === 'pickup' ? 'var(--color-oxido-light)' : 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="pickup"
                        checked={formData.shippingMethod === 'pickup'}
                        onChange={handleChange}
                        style={{ accentColor: 'var(--color-oxido)' }}
                      />
                      <Store size={18} style={{ color: 'var(--color-oliva)' }} />
                      <strong style={{ fontSize: 'var(--text-sm)' }}>Retiro en Punto BRICOR</strong>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', paddingLeft: '24px' }}>
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
                  placeholder="Ej. Ingreso por portón lateral de la bodega, horario de recepción hasta las 5:00 pm."
                />
              </div>

              {/* Nota de pasarela técnica */}
              <div
                style={{
                  backgroundColor: 'var(--color-marfil-muted)',
                  border: '1px dashed var(--color-piedra)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-oliva)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <ShieldCheck size={20} style={{ color: 'var(--color-oxido)', flexShrink: 0 }} />
                <span>
                  <strong>Pasarela oficial Wompi Sandbox:</strong> Tu pago se procesará a través del Widget seguro de Wompi Colombia (Bancolombia, Nequi, PSE, Tarjetas de Crédito/Débito) con firma de integridad SHA-256 generada en servidor.
                </span>
              </div>
            </div>

            {/* Resumen lateral de la orden */}
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
                <h3
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '1.25rem',
                    borderBottom: '1px solid var(--color-piedra-light)',
                    paddingBottom: '8px',
                  }}
                >
                  Resumen ({totalItemsCount} artículos)
                </h3>

                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginBottom: '16px',
                    borderBottom: '1px solid var(--color-piedra-light)',
                  }}
                >
                  {items.map((it) => (
                    <div
                      key={it.product.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 'var(--text-xs)',
                        padding: '6px 0',
                      }}
                    >
                      <span style={{ color: 'var(--color-carbon)' }}>
                        {it.quantity}x {it.product.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatCurrency(it.product.price * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span style={{ color: 'var(--color-oliva)' }}>Subtotal:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(subtotal)}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span style={{ color: 'var(--color-oliva)' }}>Despacho:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {formData.shippingMethod === 'pickup'
                      ? 'GRATIS (Retiro)'
                      : estimatedShipping === 0
                      ? 'GRATIS'
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
                    Total Pedido
                  </span>
                  <span
                    className="font-editorial"
                    style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-carbon)' }}
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
