import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.js';
import { PRODUCTS } from '../../src/data/products.js';

// Asegurar existencia del directorio de datos
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(config.dbPath);

// Configuración de rendimiento y llaves foráneas en SQLite
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Inicialización de esquemas de tablas
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category_id TEXT NOT NULL,
      price INTEGER NOT NULL,
      original_price INTEGER,
      stock INTEGER NOT NULL DEFAULT 0,
      in_stock INTEGER NOT NULL DEFAULT 1,
      short_description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_document TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_method TEXT NOT NULL,
      notes TEXT,
      subtotal INTEGER NOT NULL,
      shipping_fee INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'COP',
      wompi_reference TEXT UNIQUE NOT NULL,
      wompi_signature TEXT NOT NULL,
      wompi_transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_sku TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_total INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS processed_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      transaction_id TEXT,
      reference TEXT,
      status TEXT,
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_wompi_ref ON orders(wompi_reference);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_processed_events_tx ON processed_events(transaction_id);
  `);

  // Sembrado inicial de catálogo de productos si la tabla está vacía
  const countRow = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (countRow.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO products (
        id, sku, name, brand, category_id, price, original_price, stock, in_stock, short_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      for (const p of PRODUCTS) {
        insertStmt.run(
          p.id,
          p.sku,
          p.name,
          p.brand,
          p.categoryId,
          p.price,
          p.originalPrice || null,
          p.stockCount ?? 15,
          p.inStock ? 1 : 0,
          p.shortDescription || ''
        );
      }
      db.exec('COMMIT');
      console.log(`[Database] Se han sembrado ${PRODUCTS.length} productos autoritativos en SQLite.`);
    } catch (err) {
      db.exec('ROLLBACK');
      console.error('[Database] Error al sembrar productos:', err);
    }
  }
}
