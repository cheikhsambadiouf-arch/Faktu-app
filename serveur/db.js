// db.js — Connexion et schéma SQLite pour FAKTU
// Utilise "better-sqlite3" (API synchrone, quasi identique à node:sqlite)
// plutôt que le module natif node:sqlite : ce dernier est encore
// expérimental et exige Node 22.5+, une version que plusieurs hébergeurs
// gratuits (Render, Railway) n'ont pas réussi à garantir de façon fiable
// malgré les réglages de version — better-sqlite3 fonctionne sur des
// versions de Node bien plus larges et évite ce problème à la racine.

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'faktu.db');
const db = new Database(DB_PATH);

db.exec(`PRAGMA foreign_keys = ON;`);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  legal_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  ninea TEXT,
  logo TEXT,
  signature TEXT,
  cachet TEXT,
  tva_rate REAL DEFAULT 18,
  currency_name TEXT DEFAULT 'francs CFA',
  theme_primary TEXT,
  theme_accent TEXT,
  wave_payment_link TEXT,
  om_merchant_number TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  phone TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference TEXT,
  category TEXT,
  price REAL NOT NULL DEFAULT 0,
  cost_price REAL,
  stock INTEGER NOT NULL DEFAULT 0,
  alert_threshold INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drivers_company ON drivers(company_id);

CREATE TABLE IF NOT EXISTS counters (
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, type)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  client_name_snapshot TEXT,
  type TEXT NOT NULL DEFAULT 'FAC',
  number TEXT NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  subject TEXT,
  client_notes TEXT,
  discount_pct REAL NOT NULL DEFAULT 0,
  tva_rate REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'brouillon',
  amount_paid REAL NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_ref TEXT,
  payment_date TEXT,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  delivery_status TEXT,
  public_token TEXT UNIQUE,
  paydunya_token TEXT,
  client_validated INTEGER NOT NULL DEFAULT 0,
  client_validated_at INTEGER,
  payment_reported INTEGER NOT NULL DEFAULT 0,
  payment_reported_at INTEGER,
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  date TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_notes TEXT,
  tva_rate REAL NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'impayé',
  amount_paid REAL NOT NULL DEFAULT 0,
  payment_date TEXT,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  delivery_status TEXT,
  public_token TEXT UNIQUE,
  paydunya_token TEXT,
  client_validated INTEGER NOT NULL DEFAULT 0,
  client_validated_at INTEGER,
  payment_reported INTEGER NOT NULL DEFAULT 0,
  payment_reported_at INTEGER,
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_public_token ON sales(public_token);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
`);

module.exports = db;
