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
          className="bricor-badge"
          style={{
            backgroundColor: 'rgba(39, 174, 96, 0.12)',
            color: 'var(--color-success)',
            border: '1px solid rgba(39, 174, 96, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <CheckCircle size={12} /> Pago Aprobado
        </span>
      );
    }
    if (s === 'DECLINED') {
      return (
        <span
          className="bricor-badge"
          style={{
            backgroundColor: 'rgba(197, 65, 41, 0.12)',
            color: 'var(--color-error)',
            border: '1px solid rgba(197, 65, 41, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <XCircle size={12} /> Pago Rechazado
        </span>
      );
    }
    return (
      <span
        className="bricor-badge"
        style={{
          backgroundColor: 'rgba(90, 98, 86, 0.12)',
          color: 'var(--color-oliva)',
          border: '1px solid rgba(90, 98, 86, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
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
    <div style={{ padding: '40px 0 96px', minHeight: '70vh' }}>
      <div className="uk-container" style={{ maxWidth: '960px' }}>
        {/* Encabezado editorial de la página */}
        <div style={{ borderBottom: '2px solid var(--color-carbon)', paddingBottom: '16px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="bricor-label">Historial de Clientes</span>
              <h1 style={{ margin: '4px 0 0 0', fontSize: '2.2rem' }}>Mis Compras</h1>
            </div>
            {session && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', fontFamily: 'var(--font-mono)' }}>
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
          <div style={{ maxWidth: '540px', margin: '40px auto 0' }}>
            <div
              style={{
                backgroundColor: 'var(--color-marfil-card)',
                border: '1px solid var(--color-piedra-light)',
                borderTop: '5px solid var(--color-carbon)',
                borderRadius: 'var(--radius-xs)',
                padding: '36px 32px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <ShieldCheck size={26} style={{ color: 'var(--color-oxido)' }} />
                <h3 style={{ margin: 0, fontSize: '1.35rem' }}>Consulta Segura de Pedidos</h3>
              </div>
              <p style={{ color: 'var(--color-oliva)', fontSize: 'var(--text-sm)', lineHeight: '1.6', marginBottom: '24px' }}>
                Para proteger tu privacidad, ingresa el <strong>correo electrónico</strong> utilizado en tus compras y el <strong>número de orden</strong> de cualquiera de tus pedidos (ej. <code>BCR-123456</code>).
              </p>

              {authError && (
                <div
                  style={{
                    backgroundColor: 'rgba(197, 65, 41, 0.1)',
                    border: '1px solid var(--color-error)',
                    color: 'var(--color-error)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 'var(--text-xs)',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit}>
                <div style={{ marginBottom: '16px' }}>
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

                <div style={{ marginBottom: '24px' }}>
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

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('catalog')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-oliva)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    textDecoration: 'underline',
                  }}
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
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div data-uk-spinner="ratio: 2" style={{ color: 'var(--color-oxido)' }}></div>
                <p style={{ marginTop: '16px', color: 'var(--color-oliva)', fontSize: 'var(--text-sm)' }}>
                  Cargando tus compras registradas...
                </p>
              </div>
            ) : error ? (
              <div
                style={{
                  backgroundColor: 'rgba(197, 65, 41, 0.1)',
                  border: '1px solid var(--color-error)',
                  padding: '24px',
                  borderRadius: 'var(--radius-xs)',
                  textAlign: 'center',
                  color: 'var(--color-error)',
                }}
              >
                <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
                <h4>Ocurrió un error al consultar tus pedidos</h4>
                <p style={{ fontSize: 'var(--text-sm)' }}>{error}</p>
                <Button variant="secondary" onClick={handleLogout} style={{ marginTop: '12px' }}>
                  Volver a autenticar
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--color-marfil-card)',
                  border: '1px solid var(--color-piedra-light)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '48px 24px',
                  textAlign: 'center',
                }}
              >
                <ShoppingBag size={48} style={{ color: 'var(--color-piedra)', marginBottom: '16px' }} />
                <h3>No hay pedidos registrados con esta cuenta</h3>
                <p style={{ color: 'var(--color-oliva)', fontSize: 'var(--text-sm)', marginBottom: '24px' }}>
                  No encontramos compras confirmadas para <strong>{session.email}</strong>.
                </p>
                <Button variant="primary" onClick={() => onNavigate('catalog')}>
                  Ir al Catálogo de Productos
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                      style={{
                        backgroundColor: 'var(--color-marfil-card)',
                        border: '1px solid var(--color-piedra-light)',
                        borderTop: '3px solid var(--color-carbon)',
                        borderRadius: 'var(--radius-xs)',
                        overflow: 'hidden',
                        transition: 'box-shadow var(--transition-fast)',
                      }}
                    >
                      {/* Cabecera resumida del pedido */}
                      <div
                        style={{
                          padding: '20px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '16px',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'var(--color-marfil)' : 'transparent',
                        }}
                        onClick={() => toggleOrderDetails(order.orderNumber)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div>
                            <span className="bricor-label" style={{ marginBottom: '2px' }}>
                              Orden
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '1.15rem',
                                color: 'var(--color-carbon)',
                              }}
                            >
                              #{order.orderNumber}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-oliva)', fontSize: 'var(--text-xs)' }}>
                            <Calendar size={14} />
                            <span>{formattedDate}</span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {renderPaymentBadge(order.status)}
                            {renderLogisticBadge(order.logisticStatus, order.logisticStatusLabel)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span className="bricor-label" style={{ marginBottom: '2px' }}>
                              Total Pagado
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: '1.25rem',
                                color: 'var(--color-carbon)',
                              }}
                            >
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="bricor-btn bricor-btn-secondary bricor-btn-sm"
                            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                          style={{
                            padding: '24px',
                            borderTop: '1px solid var(--color-piedra-light)',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', borderBottom: '1px solid var(--color-piedra-light)', paddingBottom: '8px' }}>
                            Artículos en esta orden ({order.items?.length || 0})
                          </h4>

                          <div style={{ marginBottom: '20px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-piedra)', textAlign: 'left', color: 'var(--color-oliva)', fontSize: 'var(--text-xs)' }}>
                                  <th style={{ padding: '8px 4px' }}>Producto</th>
                                  <th style={{ padding: '8px 4px', textAlign: 'center' }}>SKU</th>
                                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Cant.</th>
                                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Precio Unit.</th>
                                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items?.map((it) => (
                                  <tr key={it.productId} style={{ borderBottom: '1px solid var(--color-piedra-light)' }}>
                                    <td style={{ padding: '12px 4px', fontWeight: 500 }}>
                                      {it.productName}
                                    </td>
                                    <td style={{ padding: '12px 4px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-oliva)' }}>
                                      {it.productSku}
                                    </td>
                                    <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                      {it.quantity}
                                    </td>
                                    <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                      {formatCurrency(it.unitPrice)}
                                    </td>
                                    <td style={{ padding: '12px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                      {formatCurrency(it.lineTotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Fila de entrega y resumen */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', paddingTop: '16px', borderTop: '1px dashed var(--color-piedra)' }}>
                            <div>
                              <span className="bricor-label">Modalidad de Despacho</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: 'var(--text-sm)' }}>
                                {order.shippingMethod === 'pickup' ? (
                                  <>
                                    <Store size={18} style={{ color: 'var(--color-oxido)' }} />
                                    <span>Retiro en mostrador Almacén BRICOR</span>
                                  </>
                                ) : (
                                  <>
                                    <Truck size={18} style={{ color: 'var(--color-carbon)' }} />
                                    <span>Despacho a obra / Domicilio ({order.shippingCity || 'Colombia'})</span>
                                  </>
                                )}
                              </div>
                              {order.notes && (
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', marginTop: '6px' }}>
                                  <strong>Notas:</strong> {order.notes}
                                </p>
                              )}
                            </div>

                            <div>
                              <span className="bricor-label">Pasarela Wompi Colombia</span>
                              <div style={{ marginTop: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-oliva)' }}>
                                <div>Referencia: <code style={{ fontFamily: 'var(--font-mono)' }}>{order.wompiReference}</code></div>
                                {order.wompiTransactionId && (
                                  <div>ID Transacción: <code style={{ fontFamily: 'var(--font-mono)' }}>{order.wompiTransactionId}</code></div>
                                )}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', marginBottom: '4px' }}>
                                Subtotal: {formatCurrency(order.subtotal)}
                              </div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-oliva)', marginBottom: '6px' }}>
                                Despacho: {order.shippingFee === 0 ? 'GRATIS' : formatCurrency(order.shippingFee)}
                              </div>
                              <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-carbon)' }}>
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
