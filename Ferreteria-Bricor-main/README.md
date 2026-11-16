# BRICOR — Ferretería, Herramientas y Suministros
### Tienda Online con Dirección Editorial Industrial Contemporánea

Plataforma de comercio electrónico para **BRICOR**, desarrollada desde cero con una arquitectura frontend modular en **React**, **JavaScript moderno (ES Modules)**, **Vite** y **UIkit 3**, complementada con un sistema de tokens de diseño y CSS propio.

---

## 1. Identidad y Sistema de Diseño

- **Carbón (`#252622`):** Header principal, fondos de alto contraste y estructura identitaria.
- **Marfil (`#F0EEE7`):** Fondo global de la tienda, tarjetas y superficies de lectura técnica.
- **Óxido (`#C25436`):** Llamados a la acción (CTAs), precios promocionales y detalles de marca.
- **Oliva Industrial (`#596252`):** Clasificación secundaria, etiquetas de categoría y metadatos.
- **Piedra (`#A6A49A`):** Bordes, divisores y elementos de baja jerarquía.

### Tipografía
- **Titulares y Mensajes Editoriales:** `Barlow Condensed`
- **Textos, Navegación y Formularios:** `Inter`
- **Referencias SKU y Datos Técnicos:** `IBM Plex Mono`

---

## 2. Estructura del Proyecto

```text
src/
  assets/
    brand/           # Logotipo oficial de BRICOR
  components/
    cart/            # Carrito lateral (Drawer) y componentes de carrito
    catalog/         # Tarjeta de producto, grilla, filtros y buscador
    layout/          # Header, Anuncios, Navegación, Menú Móvil y Footer
    ui/              # Botones industriales, insignias, selector de cantidad, logo y campos
  data/
    categories.js    # Dataset estructurado de categorías
    products.js      # Dataset estructurado de productos con especificaciones
  hooks/
    useCart.jsx      # Hook y Contexto de carrito con persistencia en localStorage
  pages/
    HomePage.jsx     # Portada editorial industrial
    CatalogPage.jsx  # Catálogo con filtrado reactivo y ordenamiento
    ProductPage.jsx  # Detalle con galería interactiva y tabla técnica
    CartPage.jsx     # Página completa de carrito y desglose
    CheckoutPage.jsx # Formulario accesible de entrega y facturación
  services/
    productService.js# Capa de abstracción de datos para conectar APIs REST
  styles/
    tokens.css       # Variables globales de diseño
    global.css       # Reseteos, tipografía y tablas técnicas
    layout.css       # Cabeceras, hero, navegación y pie de página
    components.css   # Estilos de botones, tarjetas, selector y badges
  utils/
    currency.js      # Formateo monetario en Pesos Colombianos (COP)
    validation.js    # Validaciones de formularios de cliente
  App.jsx            # Enrutamiento de vistas y orquestación
  main.jsx           # Inicialización de React y UIkit 3
```

---

## 3. Instrucciones de Ejecución

### Prerrequisitos
- Node.js (v18 o superior)
- npm

### Instalación de dependencias
```bash
npm install
```

### Ejecutar servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en: `http://localhost:5173`

### Compilación para producción
```bash
npm run build
```
Genera los archivos optimizados en la carpeta `dist/`.

---

## 4. Puntos de Integración Backend (Pendientes)

1. **Catálogo y Productos (`src/services/productService.js`):**
   - Reemplazar las funciones que consultan `data/products.js` por peticiones HTTP (`fetch` o `axios`) a los endpoints del backend (`GET /api/v1/products`, `GET /api/v1/categories`).
2. **Disponibilidad de Inventario:**
   - Conectar la consulta de stock en tiempo real con el ERP o sistema de bodegas de la ferretería.
3. **Pasarela de Pagos (`src/pages/CheckoutPage.jsx`):**
   - Enviar el payload de la orden al endpoint (`POST /api/v1/orders`) para iniciar la sesión de pago con el proveedor oficial (PSE, Wompi, PayU, etc.).
4. **Facturación Electrónica:**
   - El formulario recopila Cédula/NIT y razón social, listos para emitir la factura ante la DIAN mediante el servicio de facturación del backend.
