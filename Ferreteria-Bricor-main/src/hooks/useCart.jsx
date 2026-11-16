import { createContext, useContext, useState, useEffect } from 'react';
import {
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
} from '../utils/pricing';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'bricor_cart_v1';
const SHIPPING_STORAGE_KEY = 'bricor_shipping_v1';

/**
 * Normaliza y sanea un ítem del carrito proveniente de almacenamiento local o fuentes externas.
 */
function sanitizeCartItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') return null;

  // Formato estándar: { product: { id, name, price, ... }, quantity }
  if (rawItem.product && typeof rawItem.product === 'object' && rawItem.product.id) {
    const qty = parseInt(rawItem.quantity, 10);
    return {
      product: {
        ...rawItem.product,
        price: Number(rawItem.product.price) || 0,
        stockCount: rawItem.product.stockCount || 99,
      },
      quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
    };
  }

  // Formato plano legado: { id, name, price, ..., quantity }
  if (rawItem.id && rawItem.price !== undefined) {
    const { quantity, ...productData } = rawItem;
    const qty = parseInt(quantity, 10);
    return {
      product: {
        ...productData,
        price: Number(productData.price) || 0,
        stockCount: productData.stockCount || 99,
      },
      quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
    };
  }

  return null;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeCartItem).filter(Boolean);
    } catch {
      return [];
    }
  });

  const [shippingMethod, setShippingMethodState] = useState(() => {
    try {
      const stored = localStorage.getItem(SHIPPING_STORAGE_KEY);
      return stored === 'pickup' ? 'pickup' : 'delivery';
    } catch {
      return 'delivery';
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Manejo silencioso en caso de bloqueo de almacenamiento local
    }
  }, [items]);

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.id) return;
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item?.product?.id === product.id);

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const currentQty = updated[existingIndex]?.quantity || 0;
        const maxStock = product.stockCount || 99;
        const newQty = Math.min(currentQty + qtyToAdd, maxStock);
        updated[existingIndex] = {
          product: {
            ...product,
            price: Number(product.price) || 0,
          },
          quantity: newQty,
        };
        return updated;
      }

      return [
        ...prevItems,
        {
          product: {
            ...product,
            price: Number(product.price) || 0,
          },
          quantity: Math.min(qtyToAdd, product.stockCount || 99),
        },
      ];
    });

    setIsDrawerOpen(true);
  };

  const removeFromCart = (productId) => {
    setItems((prev) => prev.filter((item) => item?.product?.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item?.product?.id === productId) {
          const maxStock = item.product.stockCount || 99;
          return {
            ...item,
            quantity: Math.min(Math.max(1, qty), maxStock),
          };
        }
        return item;
      })
    );
  };

  const setShippingMethod = (method) => {
    const validMethod = method === 'pickup' ? 'pickup' : 'delivery';
    setShippingMethodState(validMethod);
    try {
      localStorage.setItem(SHIPPING_STORAGE_KEY, validMethod);
    } catch {
      // Manejo silencioso en caso de bloqueo de almacenamiento local
    }
  };

  const clearCart = () => {
    setItems([]);
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  // Totales centralizados y seguros contra datos corruptos
  const totalItemsCount = items.reduce((sum, item) => sum + (item?.quantity || 0), 0);

  const subtotal = items.reduce((sum, item) => {
    const price = Number(item?.product?.price) || 0;
    const qty = Number(item?.quantity) || 0;
    return sum + price * qty;
  }, 0);

  // Flete coherente y sincronizado con el método de entrega seleccionado
  const shippingFee = calculateShippingFee(subtotal, shippingMethod);
  const estimatedShipping = shippingFee; // Alias para compatibilidad
  const grandTotal = subtotal + shippingFee;

  return (
    <CartContext.Provider
      value={{
        items,
        totalItemsCount,
        subtotal,
        shippingFee,
        estimatedShipping,
        grandTotal,
        shippingMethod,
        setShippingMethod,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        standardShippingFee: STANDARD_SHIPPING_FEE,
        isDrawerOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        openDrawer,
        closeDrawer,
        toggleDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return context;
}
