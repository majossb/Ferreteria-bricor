/**
 * BRICOR - Motor del asistente virtual 
 * Para agregar un tema nuevo: añade un objeto a INTENTS y su respuesta en ANSWERS.
 * -----------------------------------------------------------------------------
 */
import { PRODUCTS } from './products.js';
import { CATEGORIES } from './categories.js';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from '../utils/pricing.js';
import { formatCurrency } from '../utils/currency.js';

// ----------------------------------------------------------- normalización
export const normalize = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Plural simple: "taladros" -> "taladro", "cables" -> "cable"
const stem = (w) => {
  if (w.length > 5 && /(ones|ores|ales|ades)$/.test(w)) return w.slice(0, -2); // devoluciones, asesores, materiales
  return w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;                 // taladros, cables
};

// Palabras que no ayudan a buscar productos
const STOPWORDS = new Set((
  'de la el los las un una unos unas y o a en con por para que es son me mi mis tu tus se lo al del ' +
  'quiero quisiera necesito busco buscar tienen tiene hay tengo puedo podria favor ver dime dame como cual ' +
  'cuales cuanto cuanta cuesta cuestan vale valen precio precios estan esta este esto esa ese si no mas menos ' +
  'muy algo algun alguna sobre info informacion tienda venden vende producto productos articulo articulos ' +
  'hola buenas gracias ya aqui alla soy estoy comprar compro necesitar necesitamos quieren puede pueden hacer ' +
  'cuantos cuantas tienes tenemos bcr'
).split(' '));

const contentStems = (text) =>
  normalize(text).split(' ').filter((w) => w.length >= 2 && !STOPWORDS.has(w)).map(stem);

const tokenSet = (text) => new Set(normalize(text).split(' ').filter(Boolean).map(stem));

// Coincidencia exacta o por prefijo (≥5 letras): "impermeabilizante" ~ "impermeabilizantes"
const similar = (a, b) =>
  a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a)));

// ------------------------------------------------------ pistas por categoría
// Palabras que el cliente usa para pedir algo, ligadas a la categoría del catálogo.
const CATEGORY_HINTS = {
  'herramientas-electricas': ['taladro', 'amoladora', 'pulidora', 'esmeril', 'sierra', 'rotomartillo', 'inalambrico', 'bateria', 'perforar', 'cortar', 'pulir', 'dewalt', 'bosch'],
  'herramientas-manuales': ['martillo', 'alicate', 'destornillador', 'pinza', 'manual', 'juego', 'kit', 'stanley', 'mecanica', 'llave inglesa', 'juego de llaves', 'llaves mixtas'],
  'tornilleria-fijacion': ['tornillo', 'perno', 'tuerca', 'arandela', 'anclaje', 'fijacion', 'chazo', 'tornilleria', 'teknor', 'sujetar'],
  'pinturas-acabados': ['pintura', 'pintar', 'esmalte', 'anticorrosivo', 'brocha', 'rodillo', 'recubrimiento', 'acabado', 'barniz', 'pintuco', 'oxido', 'galon'],
  'plomeria-griferia': ['tubo', 'tuberia', 'valvula', 'llave de paso', 'grifo', 'griferia', 'plomeria', 'agua', 'pvc', 'codo', 'fuga', 'pavco'],
  'electricidad-industrial': ['cable', 'breaker', 'interruptor', 'luz', 'luces', 'iluminacion', 'electricidad', 'tablero', 'totalizador', 'corriente', 'schneider', 'toma', 'bombillo', 'led', 'thhn'],
  'materiales-construccion': ['cemento', 'mortero', 'impermeabilizante', 'humedad', 'filtracion', 'construccion', 'obra', 'concreto', 'aditivo', 'sika', 'estuco', 'arena'],
};

const HINT_INDEX = Object.entries(CATEGORY_HINTS).map(([id, hints]) => ({
  id,
  singles: new Set(hints.filter((h) => !h.includes(' ')).map((h) => stem(normalize(h)))),
  phrases: hints.filter((h) => h.includes(' ')).map(normalize),
}));

const CATEGORY_NAME_TOKENS = CATEGORIES.map((c) => ({
  id: c.id,
  tokens: [...tokenSet(c.name)].filter((t) => t.length > 2),
}));

function detectCategories(norm, stems) {
  const found = new Set();
  const padded = ` ${norm} `;
  for (const h of HINT_INDEX) {
    if ([...stems].some((s) => h.singles.has(s)) || h.phrases.some((p) => padded.includes(` ${p} `))) found.add(h.id);
  }
  for (const c of CATEGORY_NAME_TOKENS) {
    if (c.tokens.some((t) => [...stems].some((s) => similar(s, t)))) found.add(c.id);
  }
  return found;
}

// ------------------------------------------------------- búsqueda de catálogo
const PRODUCT_INDEX = PRODUCTS.map((p) => ({
  p,
  name: tokenSet(p.name),
  brand: tokenSet(p.brand),
  sku: tokenSet(p.sku),
  cat: tokenSet(p.categoryName),
  desc: tokenSet(`${p.shortDescription || ''}`),
}));

const slim = (p) => ({
  id: p.id, name: p.name, brand: p.brand, categoryName: p.categoryName, price: p.price,
  originalPrice: p.originalPrice, isPromo: !!p.isPromo, inStock: !!p.inStock, stockCount: p.stockCount,
});

function searchCatalog(text) {
  const norm = normalize(text);
  const stems = contentStems(text);
  const stemSet = new Set(stems);
  const categories = detectCategories(norm, stemSet);
  if (!stems.length) return { products: [], categories };

  const has = (set, q) => set.has(q) || [...set].some((t) => similar(t, q));
  const scored = PRODUCT_INDEX.map((e) => {
    let score = 0;
    for (const q of stems) {
      if (e.name.has(q)) score += 4; else if (has(e.name, q)) score += 3;
      if (has(e.brand, q)) score += 4;
      if (has(e.sku, q)) score += 4;
      if (has(e.cat, q)) score += 2;
      if (has(e.desc, q)) score += 1;
    }
    if (categories.has(e.p.categoryId)) score += 3;
    return { p: e.p, score };
  }).filter((x) => x.score >= 3);

  const cheapest = /\b(barat|economic)/.test(norm);
  scored.sort((a, b) => (cheapest ? a.p.price - b.p.price : b.score - a.score || (b.p.isBestSeller ? 1 : 0) - (a.p.isBestSeller ? 1 : 0)));
  const top = scored.length ? Math.max(...scored.map((x) => x.score)) : 0;
  const strong = cheapest ? scored : scored.filter((x) => x.score >= top * 0.5);
  return { products: strong.slice(0, 3).map((x) => slim(x.p)), categories };
}

// ------------------------------------------------------------------ intenciones
// words: palabras sueltas (valen 1) | phrases: frases (valen 2). Todo sin tildes.
const INTENTS = [
  { id: 'orders', words: ['seguimiento', 'rastrear', 'rastreo', 'historial'], phrases: ['mis compras', 'mis pedidos', 'estado de mi', 'estado del pedido', 'donde esta mi pedido', 'numero de pedido', 'mi orden'] },
  { id: 'cart', words: ['carrito', 'checkout', 'finalizar'], phrases: ['mi pedido', 'mi compra', 'ir a pagar', 'mi carrito'] },
  { id: 'payment', words: ['pago', 'pagar', 'tarjeta', 'credito', 'debito', 'pse', 'nequi', 'bancolombia', 'wompi', 'cuotas', 'transferencia', 'efectivo', 'contraentrega'], phrases: ['medios de pago', 'formas de pago', 'metodos de pago'] },
  { id: 'deliveryTime', words: ['demora', 'tarda', 'tardan', 'demoran'], phrases: ['tiempo de entrega', 'cuando llega', 'cuanto tarda', 'cuanto demora', 'dias de entrega', 'cuantos dias'] },
  { id: 'pickup', words: ['retiro', 'retirar', 'recoger', 'recojo', 'mostrador'], phrases: ['en tienda', 'en la tienda', 'pasar por'] },
  { id: 'shipping', words: ['envio', 'despacho', 'domicilio', 'entrega', 'flete', 'enviar', 'envian', 'mandan', 'transporte', 'despachan'], phrases: ['a pie de obra', 'costo de envio', 'a domicilio'] },
  { id: 'warranty', words: ['garantia', 'defectuoso', 'defecto', 'danado', 'fallo', 'falla'], phrases: ['garantia de fabrica'] },
  { id: 'returns', words: ['devolucion', 'devolver', 'reembolso', 'reclamo', 'cambio', 'cambiar'], phrases: ['politica de devolucion'] },
  { id: 'hours', words: ['horario', 'horarios', 'abren', 'abierto', 'cierran', 'atienden', 'atencion'], phrases: ['a que hora', 'dias de atencion', 'abren los domingos'] },
  { id: 'location', words: ['ubicacion', 'direccion', 'ubicados', 'queda', 'mapa', 'visitar'], phrases: ['donde estan', 'donde queda', 'punto de venta', 'sede principal'] },
  { id: 'advisor', words: ['asesor', 'asesoria', 'contacto', 'contactar', 'telefono', 'celular', 'whatsapp', 'correo', 'mayorista', 'mayoreo', 'instalador', 'cotizacion', 'cotizar'], phrases: ['hablar con', 'persona real', 'por mayor', 'atencion al cliente'] },
  { id: 'offers', words: ['oferta', 'ofertas', 'promocion', 'promociones', 'promo', 'descuento', 'descuentos', 'rebaja', 'rebajas', 'liquidacion'], phrases: ['en oferta'] },
  { id: 'bestsellers', words: ['popular', 'populares', 'recomendado', 'recomiendas', 'recomendacion', 'destacado', 'destacados', 'favorito'], phrases: ['mas vendido', 'mas vendidos', 'lo mejor'] },
  { id: 'categories', words: ['categoria', 'categorias', 'catalogo', 'secciones'], phrases: ['que venden', 'que productos', 'que tienen', 'tipos de productos'] },
  { id: 'help', words: ['ayuda', 'opciones', 'menu'], phrases: ['que puedes hacer', 'que haces', 'como funcionas', 'en que me ayudas'] },
  { id: 'thanks', words: ['gracias', 'perfecto', 'genial', 'excelente', 'listo'], phrases: ['muchas gracias', 'muy amable'] },
  { id: 'bye', words: ['adios', 'chao', 'chau'], phrases: ['hasta luego', 'nos vemos'] },
  // El saludo va al final: si el mensaje trae un tema ("hola, ¿hacen envíos?"), gana el tema.
  { id: 'greeting', words: ['hola', 'holi', 'buenas', 'buenos', 'saludos', 'hey', 'ola'], phrases: ['buen dia', 'buenos dias', 'buenas tardes', 'buenas noches'] },
];

function detectIntent(text) {
  const norm = normalize(text);
  const padded = ` ${norm} `;
  const stems = tokenSet(text);
  let best = null;
  for (const it of INTENTS) {
    let score = it.phrases.filter((p) => padded.includes(` ${p} `)).length * 2;
    score += it.words.filter((w) => stems.has(stem(w))).length;
    if (score > 0 && (!best || score > best.score)) best = { id: it.id, score };
  }
  return best ? best.id : null;
}

// ---------------------------------------------------------------- respuestas
const money = formatCurrency;
const q = (label, send) => ({ label, send });
const go = (label, action) => ({ label, action });

const MENU_QUICK = [q('Ver categorías', 'Ver categorías'), q('Envíos y despacho', 'Envíos'), q('Medios de pago', 'Medios de pago'), q('Ofertas', 'Ofertas')];

export function getWelcome() {
  return {
    text: 'Hola, soy el asistente virtual de BRICOR. Puedo ayudarte a encontrar productos y resolver dudas sobre envíos, pagos, garantías y horarios. ¿Qué necesitas?',
    quick: MENU_QUICK,
  };
}

const catQuick = (ids) =>
  [...ids].slice(0, 2).map((id) => {
    const c = CATEGORIES.find((x) => x.id === id);
    return c ? go(`Ver ${c.name}`, { type: 'category', id }) : null;
  }).filter(Boolean);

const ANSWERS = {
  greeting: () => getWelcome(),

  thanks: () => ({ text: 'Con gusto. Si necesitas algo más, aquí estoy.', quick: MENU_QUICK }),

  bye: () => ({ text: 'Hasta pronto. Gracias por visitar BRICOR.' }),

  help: () => ({
    text: 'Puedo ayudarte con:\n• Buscar productos y ver precios (por ejemplo: "taladro" o "pintura")\n• Envíos, retiro en mostrador y medios de pago\n• Garantías, horarios y ubicación\n• Ofertas y tu carrito',
    quick: MENU_QUICK,
  }),

  shipping: () => ({
    text: `Hacemos despachos a nivel nacional, a pie de obra y con entregas consolidadas.\n• Flete gratis en pedidos desde ${money(FREE_SHIPPING_THRESHOLD)}.\n• Por debajo de ese valor, el flete es de ${money(STANDARD_SHIPPING_FEE)}.\n• El retiro en mostrador no tiene costo.`,
    quick: [q('Retiro en mostrador', 'Retiro en mostrador'), q('Medios de pago', 'Medios de pago'), q('Ver mi carrito', 'Mi carrito')],
  }),

  pickup: () => ({
    text: 'Puedes retirar tu pedido en mostrador sin costo: en el checkout elige "Retiro en mostrador" como método de despacho.',
    quick: [q('Envíos y despacho', 'Envíos'), q('Horarios', 'Horario'), q('Ver mi carrito', 'Mi carrito')],
  }),

  deliveryTime: () => ({
    text: 'Todavía no hay tiempos de entrega publicados en el sitio. Te recomiendo confirmarlo con la sede principal al hacer tu pedido.',
    quick: [q('Envíos y despacho', 'Envíos'), q('Horarios', 'Horario')],
  }),

  payment: () => ({
    text: 'El pago se hace en línea con Wompi: tarjetas de crédito y débito, PSE, Nequi y Bancolombia.\nCon tarjeta de crédito puedes diferir hasta en 36 cuotas, según las condiciones de tu emisor.\nPor ahora el sitio no ofrece pago en efectivo ni contraentrega.',
    quick: [q('Envíos y despacho', 'Envíos'), q('Ver mi carrito', 'Mi carrito')],
  }),

  warranty: () => ({
    text: 'Las herramientas eléctricas y los equipos cuentan con garantía oficial de fábrica. Las condiciones de cada producto aparecen en su ficha cuando aplican.',
    quick: [q('Ver categorías', 'Ver categorías'), q('Devoluciones', 'Devoluciones')],
  }),

  returns: () => ({
    text: 'El sitio todavía no tiene una política de devoluciones publicada. Para cambios o reclamos de garantía te recomiendo consultarlo directamente con la sede principal.',
    quick: [q('Garantías', 'Garantía'), q('Ubicación', 'Ubicación')],
  }),

  hours: () => ({
    text: 'Atendemos de lunes a sábado en horario comercial continuado. Aún no tengo publicadas las horas exactas de apertura y cierre.',
    quick: [q('Ubicación', 'Ubicación'), q('Retiro en mostrador', 'Retiro en mostrador')],
  }),

  location: () => ({
    text: 'Nuestra sede principal y punto de venta está en proceso de confirmación de dirección: la dirección oficial aún no está publicada en el sitio. Puedes revisar el pie de página para ver si ya fue actualizada.',
    quick: [q('Horarios', 'Horario'), q('Asesoría técnica', 'Asesoría')],
  }),

  advisor: () => ({
    text: 'Ofrecemos asesoría técnica para compras mayoristas e instaladores. En el sitio todavía no hay un teléfono ni un correo publicados, así que la forma de acceder es en la sede principal, de lunes a sábado en horario comercial.',
    quick: [q('Horarios', 'Horario'), q('Ubicación', 'Ubicación')],
  }),

  orders: () => ({
    text: 'Puedes revisar el estado de tus pedidos en la sección "Mis compras". Ten a la mano tu número de pedido.',
    quick: [go('Ir a Mis compras', { type: 'page', page: 'purchases' }), q('Medios de pago', 'Medios de pago')],
  }),

  categories: () => ({
    text: `Estas son nuestras categorías:\n${CATEGORIES.map((c) => `• ${c.name}`).join('\n')}\nElige una para verla, o escríbeme lo que buscas.`,
    quick: CATEGORIES.map((c) => go(c.shortName || c.name, { type: 'category', id: c.id })),
  }),
};

function answerCart(cart) {
  const n = cart?.totalItemsCount || 0;
  if (!n) {
    return {
      text: 'Tu carrito está vacío por ahora. Puedes explorar las categorías o revisar las ofertas.',
      quick: [q('Ver categorías', 'Ver categorías'), q('Ofertas', 'Ofertas')],
    };
  }
  const subtotal = cart.subtotal || 0;
  const threshold = cart.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD;
  const fee = cart.standardShippingFee ?? STANDARD_SHIPPING_FEE;
  let shipping;
  if (cart.shippingMethod === 'pickup') shipping = 'Con retiro en mostrador no pagas flete.';
  else if (subtotal >= threshold) shipping = 'Tu despacho a domicilio es gratis.';
  else shipping = `Te faltan ${money(threshold - subtotal)} para tener flete gratis (hoy el flete es de ${money(fee)}).`;
  return {
    text: `Tienes ${n} ${n === 1 ? 'artículo' : 'artículos'} en tu carrito por ${money(subtotal)}.\n${shipping}`,
    quick: [go('Abrir carrito', { type: 'openCart' }), go('Ir a pagar', { type: 'page', page: 'checkout' })],
  };
}

function answerOffers(text) {
  const { products: found } = searchCatalog(text);
  const promos = PRODUCTS.filter((p) => p.isPromo).map(slim);
  const filtered = found.filter((p) => p.isPromo);
  const list = (filtered.length ? filtered : promos).slice(0, 3);
  if (!list.length) return { text: 'Por ahora no tengo ofertas activas. Puedes revisar el catálogo completo.', quick: MENU_QUICK };
  return {
    text: filtered.length || !found.length ? 'Estas son las ofertas vigentes:' : 'No encontré ofertas de eso, pero estas son las ofertas vigentes:',
    products: list,
    quick: [q('Ver categorías', 'Ver categorías'), q('Envíos y despacho', 'Envíos')],
  };
}

function answerBestsellers() {
  const list = PRODUCTS.filter((p) => p.isBestSeller || p.isFeatured).slice(0, 3).map(slim);
  return { text: 'Estos son nuestros productos más buscados:', products: list, quick: [q('Ver categorías', 'Ver categorías'), q('Ofertas', 'Ofertas')] };
}

function answerProducts(text, search) {
  const { products, categories } = search;
  if (!products.length) return null;
  const many = products.length > 1;
  return {
    text: many ? `Encontré ${products.length} productos que pueden servirte:` : 'Esto es lo que encontré:',
    products,
    quick: [...catQuick(categories), q('Envíos y despacho', 'Envíos')],
  };
}

function answerFallback(text) {
  const clean = String(text).trim().slice(0, 40);
  return {
    text: 'No estoy seguro de haberte entendido. Puedo ayudarte a buscar productos (por ejemplo "taladro", "pintura" o "tornillos") y resolver dudas de envíos, pagos, garantías y horarios.',
    quick: [
      ...(clean.length >= 3 ? [go(`Buscar "${clean}" en el catálogo`, { type: 'search', query: clean })] : []),
      q('Ver categorías', 'Ver categorías'),
      q('Envíos y despacho', 'Envíos'),
      q('Medios de pago', 'Medios de pago'),
    ],
  };
}

/**
 * Respuesta del asistente.
 * @param {string} text  Mensaje del cliente.
 * @param {{ cart?: object }} ctx  Datos de contexto (el carrito de useCart).
 */
export function getReply(text, ctx = {}) {
  const intent = detectIntent(text);

  // Un saludo con una búsqueda ("hola, busco taladros") debe buscar, no solo saludar.
  if (intent === 'greeting') {
    const s = searchCatalog(text);
    if (s.products.length) return answerProducts(text, s);
  }

  if (intent === 'cart') return answerCart(ctx.cart);
  if (intent === 'offers') return answerOffers(text);
  if (intent === 'bestsellers') return answerBestsellers();
  if (intent && ANSWERS[intent]) return ANSWERS[intent]();

  const search = searchCatalog(text);
  const found = answerProducts(text, search);
  if (found) return found;
  if (/\b(barat|economic)/.test(normalize(text))) {
    const cheapest = [...PRODUCTS].sort((a, b) => a.price - b.price).slice(0, 3).map(slim);
    return { text: 'Estos son los productos más económicos del catálogo:', products: cheapest, quick: [q('Ver categorías', 'Ver categorías'), q('Ofertas', 'Ofertas')] };
  }
  return answerFallback(text);
}
