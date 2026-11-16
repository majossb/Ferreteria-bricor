import React, { useState, useEffect } from 'react';
import { CartProvider } from './hooks/useCart';
import AnnouncementBar from './components/layout/AnnouncementBar';
import Header from './components/layout/Header';
import MainNavigation from './components/layout/MainNavigation';
import Footer from './components/layout/Footer';
import MobileMenu from './components/layout/MobileMenu';
import CartDrawer from './components/cart/CartDrawer';

// Páginas de la tienda
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PurchasesPage from './pages/PurchasesPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'catalog', 'product', 'cart', 'checkout', 'purchases'
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll to top en cambio de página
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    setCurrentPage('catalog');
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage('catalog');
  };

  const handleViewProduct = (productId) => {
    setSelectedProductId(productId);
    setCurrentPage('product');
  };

  return (
    <CartProvider>
      <div className="bricor-app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Barra superior de anuncios */}
        <AnnouncementBar />

        {/* Header principal BRICOR con logo oficial */}
        <Header
          onNavigate={handleNavigate}
          onSearch={handleSearch}
          currentSearch={searchQuery}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Navegación por categorías de demostración */}
        <MainNavigation
          activeCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        {/* Contenido dinámico de la página */}
        <main style={{ flex: 1 }}>
          {currentPage === 'home' && (
            <HomePage
              onNavigate={handleNavigate}
              onSelectCategory={handleSelectCategory}
              onViewProduct={handleViewProduct}
            />
          )}

          {currentPage === 'catalog' && (
            <CatalogPage
              initialCategory={selectedCategory}
              initialSearch={searchQuery}
              onViewProduct={handleViewProduct}
              onBackHome={() => handleNavigate('home')}
            />
          )}

          {currentPage === 'product' && (
            <ProductPage
              productId={selectedProductId}
              onBackToCatalog={() => handleNavigate('catalog')}
              onViewProduct={handleViewProduct}
            />
          )}

          {currentPage === 'cart' && (
            <CartPage
              onNavigate={handleNavigate}
              onViewProduct={handleViewProduct}
            />
          )}

          {currentPage === 'checkout' && (
            <CheckoutPage
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'purchases' && (
            <PurchasesPage
              onNavigate={handleNavigate}
              onViewProduct={handleViewProduct}
            />
          )}
        </main>

        {/* Footer industrial */}
        <Footer
          onNavigate={handleNavigate}
          onSelectCategory={handleSelectCategory}
        />

        {/* Panel lateral deslizable del Carrito */}
        <CartDrawer
          onNavigate={handleNavigate}
          onViewProduct={handleViewProduct}
        />

        {/* Menú offcanvas para dispositivos móviles */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onSelectCategory={handleSelectCategory}
          onNavigate={handleNavigate}
        />
      </div>
    </CartProvider>
  );
}
