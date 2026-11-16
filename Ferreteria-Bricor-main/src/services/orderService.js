/**
 * BRICOR - Servicio de Gestión de Pedidos y Pagos
 * 
 * Diseñado con fetch nativo según directrices de arquitectura:
 * 1. Fuente de datos confiable: El frontend envía únicamente `productId` y `quantity`.
 *    El backend valida en servidor los precios oficiales y la disponibilidad de inventario.
 * 2. Cero secretos en cliente: Los secretos de integridad y eventos de Wompi residen
 *    exclusivamente en el backend.
 */

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '/api/v1';

export const orderService = {
  /**
   * Crea una orden en el sistema.
   */
  async createOrder({ customer, items, shippingMethod, notes = '' }) {
    const orderPayload = {
      customer: {
        fullName: customer.fullName?.trim(),
        documentNumber: customer.documentNumber?.trim(),
        email: customer.email?.trim(),
        phone: customer.phone?.trim(),
        address: customer.address?.trim(),
        city: customer.city?.trim(),
      },
      shippingMethod,
      notes: notes?.trim() || '',
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Error del servidor (${response.status})`);
    }

    const result = await response.json();
    return result.data || result;
  },

  /**
   * Consulta pública y segura del estado de una orden.
   */
  async getOrderStatus(orderIdentifier) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderIdentifier)}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`No fue posible consultar el pedido ${orderIdentifier}`);
    }

    const result = await response.json();
    return result.data || result;
  },

  /**
   * Reconcilia la orden directamente con la API de Wompi a través del backend.
   */
  async verifyWompiTransaction(orderIdentifier, transactionId) {
    const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderIdentifier)}/verify-wompi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ transactionId }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Error al verificar transacción (${response.status})`);
    }

    const result = await response.json();
    return result.data || result;
  },

  /**
   * Solicita acceso seguro a "Mis compras" validando correo y un pedido asociado.
   */
  async authCustomer(email, orderNumber) {
    const response = await fetch(`${API_BASE_URL}/orders/customer/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, orderNumber }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Error de validación (${response.status})`);
    }

    const result = await response.json();
    return result.data || result;
  },

  /**
   * Consulta las compras de un cliente autenticado mediante token de alta entropía.
   * Email y token viajan como query params (no como headers custom) para evitar
   * que el preflight CORS falle en navegadores cuando el backend corre en otro puerto.
   */
  async getCustomerOrders(email, token) {
    const query = new URLSearchParams({ email, token }).toString();
    const response = await fetch(`${API_BASE_URL}/orders/customer/history?${query}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `Error al consultar compras (${response.status})`);
    }

    const result = await response.json();
    return result.data || [];
  },
};
