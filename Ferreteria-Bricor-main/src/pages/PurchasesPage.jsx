import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Calendar,
  Truck,
  Store,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { formatCurrency } from '../utils/currency';
import { orderService } from '../services/orderService';

const SESSION_EMAIL_KEY = 'bricor_customer_email';
const SESSION_TOKEN_KEY = 'bricor_customer_token';

export default function PurchasesPage({ onNavigate, onViewProduct: _onViewProduct }) {
  const [session, setSession] = useState(() => {
    try {
      const email = sessionStorage.getItem(SESSION_EMAIL_KEY);
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      return email && token ? { email, token } : null;
    } catch {
      return null;
    }
  });

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Formulario de acceso por primera vez
  const [authForm, setAuthForm] = useState({
    email: '',
    orderNumber: '',
  });
  const [authError, setAuthError] = useState(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Pedido expandido para vista de detalle
  const [expandedOrderNumber, setExpandedOrderNumber] = useState(null);

  // Cierre de sesión de Mis compras (declarado antes del efecto para evitar forward reference)
  const handleLogout = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_EMAIL_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // Ignorar errores de sessionStorage en contextos privados
    }
    setSession(null);
    setOrders([]);
    setExpandedOrderNumber(null);
  }, []);

  // Cargar órdenes cuando hay sesión activa
  useEffect(() => {
    if (!session?.email || !session?.token) {
      setOrders([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    orderService
      .getCustomerOrders(session.email, session.token)
      .then((data) => {
        if (isMounted) {
          setOrders(data);
          if (data.length > 0) {
            setExpandedOrderNumber(data[0].orderNumber);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Error al consultar tus compras.');
          // Si el token expiró, limpiar sesión para pedir login nuevamente
          if (err.message?.includes('expirado') || err.message?.includes('inválido')) {
            handleLogout();
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, handleLogout]);

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
    if (authError) setAuthError(null);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authForm.email?.trim() || !authForm.orderNumber?.trim()) {
      setAuthError('Por favor completa todos los campos.');
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const result = await orderService.authCustomer(authForm.email, authForm.orderNumber);
      if (result.success && result.token) {
        sessionStorage.setItem(SESSION_EMAIL_KEY, result.email);
        sessionStorage.setItem(SESSION_TOKEN_KEY, result.token);
        setSession({ email: result.email, token: result.token });
      } else {
        setAuthError('No se pudo verificar la información ingresada.');
      }
    } catch (err) {
      setAuthError(err.message || 'Verifica que el correo y el número de pedido coincidan.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const toggleOrderDetails = (orderNumber) => {
    setExpandedOrderNumber((prev) => (prev === orderNumber ? null : orderNumber));
  };

  const renderPaymentBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') {
      return (
        <span
          className="bricor-badge purchases-page-span-01"
        >
          <CheckCircle size={12} /> Pago Aprobado
        </span>
      );
    }
    if (s === 'DECLINED') {
      return (
        <span
          className="bricor-badge purchases-page-span-02"
        >
          <XCircle size={12} /> Pago Rechazado
        </span>
      );
    }
    return (
      <span
        className="bricor-badge purchases-page-span-03"
      >
        <Clock size={12} /> Pago Pendiente
      </span>
    );
  };

  const renderLogisticBadge = (logisticStatus, label) => {
    let color = 'var(--color-carbon)';
    let bg = 'rgba(30, 30, 30, 0.08)';
    let Icon = Package;

    if (logisticStatus === 'LISTO_PARA_RETIRO') {
      color = 'var(--color-oxido)';
      bg = 'var(--color-oxido-light)';
      Icon = Store;
    } else if (logisticStatus === 'EN_PREPARACION') {
      color = 'var(--color-oliva)';
      bg = 'rgba(90, 98, 86, 0.12)';
      Icon = Package;
    } else if (logisticStatus === 'CANCELADO') {
      color = 'var(--color-error)';
      bg = 'rgba(197, 65, 41, 0.08)';
      Icon = XCircle;
    }

    return (
      <span
        className="bricor-badge"
        style={{
          backgroundColor: bg,
          color,
          border: `1px solid ${color}33`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <Icon size={12} /> {label}
      </span>
    );
  };

  return (
    <div className="purchases-page-div-01">
      <div className="uk-container u-max-width-960px">
        {/* Encabezado editorial de la página */}
        <div className="checkout-page-div-17">
          <div className="uk-flex uk-flex-between uk-flex-bottom uk-flex-wrap u-gap-12px">
            <div>
              <span className="bricor-label">Historial de Clientes</span>
              <h1 className="purchases-page-h1-01">Mis Compras</h1>
            </div>
            {session && (
              <div className="uk-flex uk-flex-middle u-gap-12px">
                <span className="purchases-page-span-04">
                  {session.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={LogOut}
                  onClick={handleLogout}
                  title="Cerrar sesión actual"
                >
                  Cambiar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* CASO 1: No hay sesión activa -> Formulario seguro con token temporal */}
        {!session ? (
          <div className="purchases-page-div-02">
            <div
              className="purchases-page-div-03"
            >
              <div className="uk-flex uk-flex-middle purchases-page-div-04">
                <ShieldCheck size={26} className="u-color-oxido" />
                <h3 className="uk-margin-remove u-font-size-1-35rem">Consulta Segura de Pedidos</h3>
              </div>
              <p className="purchases-page-p-01">
                Para proteger tu privacidad, ingresa el <strong>correo electrónico</strong> utilizado en tus compras y el <strong>número de orden</strong> de cualquiera de tus pedidos (ej. <code>BCR-123456</code>).
              </p>

              {authError && (
                <div
                  className="uk-margin-bottom uk-flex uk-flex-middle purchases-page-div-05"
                >
                  <AlertCircle size={16} className="u-flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit}>
                <div className="u-margin-bottom-16px">
                  <FormField
                    label="Correo Electrónico de Facturación"
                    id="email"
                    name="email"
                    type="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder="compras@tuempresa.com"
                    required
                  />
                </div>

                <div className="u-margin-bottom-24px">
                  <FormField
                    label="Número de Pedido o Referencia Wompi"
                    id="orderNumber"
                    name="orderNumber"
                    value={authForm.orderNumber}
                    onChange={handleAuthChange}
                    placeholder="Ej. BCR-849506"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  block
                  disabled={isSubmittingAuth}
                  icon={ArrowRight}
                >
                  {isSubmittingAuth ? 'Verificando identidad...' : 'Ver Mis Compras'}
                </Button>
              </form>

              <div className="uk-margin-top uk-text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('catalog')}
                  className="purchases-page-button-01"
                >
                  ¿No tienes pedidos aún? Explorar el catálogo
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CASO 2: Sesión activa -> Listado de pedidos */
          <div>
            {isLoading ? (
              <div className="uk-text-center u-padding-60px-0">
                <div data-uk-spinner="ratio: 2" className="u-color-oxido"></div>
                <p className="purchases-page-p-02">
                  Cargando tus compras registradas...
                </p>
              </div>
            ) : error ? (
              <div
                className="uk-text-center purchases-page-div-06"
              >
                <AlertCircle size={32} className="u-margin-0-auto-12px" />
                <h4>Ocurrió un error al consultar tus pedidos</h4>
                <p className="u-font-size-sm">{error}</p>
                <Button variant="secondary" onClick={handleLogout} className="u-margin-top-12px">
                  Volver a autenticar
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div
                className="uk-text-center purchases-page-div-07"
              >
                <ShoppingBag size={48} className="cart-drawer-shoppingbag-01" />
                <h3>No hay pedidos registrados con esta cuenta</h3>
                <p className="checkout-page-p-04">
                  No encontramos compras confirmadas para <strong>{session.email}</strong>.
                </p>
                <Button variant="primary" onClick={() => onNavigate('catalog')}>
                  Ir al Catálogo de Productos
                </Button>
              </div>
            ) : (
              <div className="uk-flex uk-flex-column u-gap-20px">
                {orders.map((order) => {
                  const isExpanded = expandedOrderNumber === order.orderNumber;
                  const formattedDate = new Date(order.createdAt).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={order.orderNumber}
                      className="uk-overflow-hidden purchases-page-div-08"
                    >
                      {/* Cabecera resumida del pedido */}
                      <div
                        className="uk-flex uk-flex-middle uk-flex-between uk-flex-wrap purchases-page-div-09" style={{ backgroundColor: isExpanded ? 'var(--color-marfil)' : 'transparent' }}
                        onClick={() => toggleOrderDetails(order.orderNumber)}
                      >
                        <div className="uk-flex uk-flex-middle uk-flex-wrap u-gap-16px">
                          <div>
                            <span className="bricor-label u-margin-bottom-2px">
                              Orden
                            </span>
                            <span
                              className="purchases-page-span-05"
                            >
                              #{order.orderNumber}
                            </span>
                          </div>

                          <div className="uk-flex uk-flex-middle purchases-page-div-10">
                            <Calendar size={14} />
                            <span>{formattedDate}</span>
                          </div>

                          <div className="uk-flex uk-flex-wrap u-gap-8px">
                            {renderPaymentBadge(order.status)}
                            {renderLogisticBadge(order.logisticStatus, order.logisticStatusLabel)}
                          </div>
                        </div>

                        <div className="uk-flex uk-flex-middle u-gap-20px">
                          <div className="uk-text-right">
                            <span className="bricor-label u-margin-bottom-2px">
                              Total Pagado
                            </span>
                            <span
                              className="purchases-page-span-06"
                            >
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="bricor-btn bricor-btn-secondary bricor-btn-sm purchases-page-button-02"
                            aria-expanded={isExpanded}
                          >
                            <span>{isExpanded ? 'Ocultar' : 'Ver detalle'}</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Vista de detalle desplegable */}
                      {isExpanded && (
                        <div
                          className="purchases-page-div-11"
                        >
                          <h4 className="purchases-page-h4-01">
                            Artículos en esta orden ({order.items?.length || 0})
                          </h4>

                          <div className="uk-margin-bottom">
                            <table className="purchases-page-table-01">
                              <thead>
                                <tr className="uk-text-left purchases-page-tr-01">
                                  <th className="u-padding-8px-4px">Producto</th>
                                  <th className="uk-text-center u-padding-8px-4px">SKU</th>
                                  <th className="uk-text-right u-padding-8px-4px">Cant.</th>
                                  <th className="uk-text-right u-padding-8px-4px">Precio Unit.</th>
                                  <th className="uk-text-right u-padding-8px-4px">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items?.map((it) => (
                                  <tr key={it.productId} className="u-border-bottom-1px-solid-piedra-light">
                                    <td className="purchases-page-td-01">
                                      {it.productName}
                                    </td>
                                    <td className="uk-text-center purchases-page-td-02">
                                      {it.productSku}
                                    </td>
                                    <td className="uk-text-right purchases-page-td-03">
                                      {it.quantity}
                                    </td>
                                    <td className="uk-text-right purchases-page-td-03">
                                      {formatCurrency(it.unitPrice)}
                                    </td>
                                    <td className="uk-text-right purchases-page-td-04">
                                      {formatCurrency(it.lineTotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Fila de entrega y resumen */}
                          <div className="purchases-page-div-12">
                            <div>
                              <span className="bricor-label">Modalidad de Despacho</span>
                              <div className="uk-flex uk-flex-middle purchases-page-div-13">
                                {order.shippingMethod === 'pickup' ? (
                                  <>
                                    <Store size={18} className="u-color-oxido" />
                                    <span>Retiro en mostrador Almacén BRICOR</span>
                                  </>
                                ) : (
                                  <>
                                    <Truck size={18} className="u-color-carbon" />
                                    <span>Despacho a obra / Domicilio ({order.shippingCity || 'Colombia'})</span>
                                  </>
                                )}
                              </div>
                              {order.notes && (
                                <p className="purchases-page-p-03">
                                  <strong>Notas:</strong> {order.notes}
                                </p>
                              )}
                            </div>

                            <div>
                              <span className="bricor-label">Pasarela Wompi Colombia</span>
                              <div className="purchases-page-div-14">
                                <div>Referencia: <code className="u-font-family-mono">{order.wompiReference}</code></div>
                                {order.wompiTransactionId && (
                                  <div>ID Transacción: <code className="u-font-family-mono">{order.wompiTransactionId}</code></div>
                                )}
                              </div>
                            </div>

                            <div className="uk-text-right">
                              <div className="purchases-page-div-15">
                                Subtotal: {formatCurrency(order.subtotal)}
                              </div>
                              <div className="purchases-page-div-16">
                                Despacho: {order.shippingFee === 0 ? 'GRATIS' : formatCurrency(order.shippingFee)}
                              </div>
                              <div className="purchases-page-div-17">
                                Total: {formatCurrency(order.totalAmount)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
