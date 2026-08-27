-- ============================================================
-- FAKTU — Seed de démonstration (ÉTAPE 5)
-- Correspond exactement à l'exemple officiel du prompt maître.
-- Non exécuté dans cet environnement (pas de PostgreSQL disponible).
-- UUIDs fixes pour pouvoir être référencés facilement en dev/tests.
-- ============================================================

INSERT INTO businesses (id, name, country, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'Boutique Test FAKTU', 'SN', 'XOF');

INSERT INTO users (id, full_name, phone, password_hash)
VALUES ('00000000-0000-0000-0000-000000000002', 'Utilisateur Test', '+221770000000', 'REPLACE_WITH_REAL_HASH');

INSERT INTO roles (id, code, label) VALUES
  ('00000000-0000-0000-0000-000000000010', 'OWNER', 'Propriétaire'),
  ('00000000-0000-0000-0000-000000000011', 'SELLER', 'Vendeur');

INSERT INTO business_members (business_id, user_id, role_id)
VALUES ('00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000010');

INSERT INTO customers (id, business_id, name, phone)
VALUES ('00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'Mamadou Ndiaye', '+221771111111');

INSERT INTO products (id, business_id, name, unit, purchase_price, sale_price, tax_rate)
VALUES ('00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'Ciment 50 kg', 'sac', 4800, 6500, 0);

INSERT INTO stock_balances (product_id, quantity)
VALUES ('00000000-0000-0000-0000-000000000004', 100);
