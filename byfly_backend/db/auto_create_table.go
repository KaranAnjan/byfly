package db

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SchemaSQL is the complete ByFly database bootstrap with all tables and columns. It is idempotent and
// runs automatically when the API starts.
const SchemaSQL = `
-- ByFly PostgreSQL bootstrap. Safe to run repeatedly from the API startup.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SEQUENCE IF NOT EXISTS byfly_numeric_id_seq START 1000000000;
CREATE SEQUENCE IF NOT EXISTS byfly_category_no_seq START 1000000000;
CREATE SEQUENCE IF NOT EXISTS byfly_product_no_seq START 2000000000;
CREATE SEQUENCE IF NOT EXISTS byfly_order_no_seq START 3000000000;
CREATE SEQUENCE IF NOT EXISTS byfly_order_item_no_seq START 4000000000;
CREATE OR REPLACE FUNCTION byfly_next_id() RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN LPAD(nextval('byfly_numeric_id_seq')::text, 10, '0'); END $$;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL DEFAULT '', firebase_uid text UNIQUE, name text, phone text,
  is_active boolean NOT NULL DEFAULT true, is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid text;
CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_idx ON users(firebase_uid) WHERE firebase_uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (lower(email)) WHERE email <> '';
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_no bigint DEFAULT nextval('byfly_category_no_seq');
WITH numbered AS (SELECT id,1000000000 + ROW_NUMBER() OVER (ORDER BY created_at,id) - 1 AS value FROM categories)
UPDATE categories c SET category_no=n.value FROM numbered n WHERE c.id=n.id;
SELECT setval('byfly_category_no_seq', GREATEST(1000000000,COALESCE((SELECT MAX(category_no)+1 FROM categories),1000000000)), false);
ALTER TABLE categories ALTER COLUMN category_no SET DEFAULT nextval('byfly_category_no_seq');
CREATE UNIQUE INDEX IF NOT EXISTS categories_category_no_idx ON categories(category_no);
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_name text NOT NULL, product_code text NOT NULL UNIQUE, description text,
  image_url text, category_id text REFERENCES categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_no bigint DEFAULT nextval('byfly_product_no_seq');
WITH numbered AS (SELECT id,2000000000 + ROW_NUMBER() OVER (ORDER BY created_at,id) - 1 AS value FROM products)
UPDATE products p SET product_no=n.value FROM numbered n WHERE p.id=n.id;
SELECT setval('byfly_product_no_seq', GREATEST(2000000000,COALESCE((SELECT MAX(product_no)+1 FROM products),2000000000)), false);
ALTER TABLE products ALTER COLUMN product_no SET DEFAULT nextval('byfly_product_no_seq');
CREATE UNIQUE INDEX IF NOT EXISTS products_product_no_idx ON products(product_no);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
ALTER TABLE categories ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE products ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
CREATE TABLE IF NOT EXISTS product_images (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_key text NOT NULL,
  image_index smallint NOT NULL DEFAULT 1,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id,image_index),
  UNIQUE(product_id,image_key)
);
CREATE OR REPLACE FUNCTION byfly_limit_product_images() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM product_images WHERE product_id=NEW.product_id) >= 4
     AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id=NEW.product_id AND image_index=NEW.image_index) THEN
    RAISE EXCEPTION 'a product can have at most 4 images';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS product_images_limit_trigger ON product_images;
CREATE TRIGGER product_images_limit_trigger BEFORE INSERT ON product_images FOR EACH ROW EXECUTE FUNCTION byfly_limit_product_images();
ALTER TABLE product_images DROP CONSTRAINT IF EXISTS product_images_image_index_check;
CREATE TABLE IF NOT EXISTS product_prices (
  product_id text PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  cost numeric(12,2) NOT NULL DEFAULT 0, retail_price numeric(12,2), wholesale_price numeric(12,2), retail_mrp numeric(12,2), wholesale_mrp numeric(12,2),
  wholesale_min_order_qty integer NOT NULL DEFAULT 1 CHECK (wholesale_min_order_qty > 0), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS cost numeric(12,2) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS product_stock (
  product_id text PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  retail_quantity integer NOT NULL DEFAULT 0 CHECK (retail_quantity >= 0), wholesale_quantity integer NOT NULL DEFAULT 0 CHECK (wholesale_quantity >= 0), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wholesale_accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name text, is_active boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS address1 text;
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS address2 text;
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE wholesale_accounts ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address1 text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address2 text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email text;
INSERT INTO wholesale_accounts(user_id,phone,address1,address2,city,state,pincode)
SELECT u.id,COALESCE(u.phone,''),COALESCE(u.address1,u.address,''),COALESCE(u.address2,''),COALESCE(u.city,''),COALESCE(u.state,''),COALESCE(u.pincode,'')
FROM users u
WHERE COALESCE(u.phone,'')<>'' OR COALESCE(u.address1,u.address,'')<>'' OR COALESCE(u.city,'')<>'' OR COALESCE(u.pincode,'')<>''
ON CONFLICT(user_id) DO NOTHING;
UPDATE wholesale_accounts wa SET contact_email=COALESCE(NULLIF(wa.contact_email,''),u.contact_email,'') FROM users u WHERE u.id=wa.user_id;
ALTER TABLE users DROP COLUMN IF EXISTS contact_email;
ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users DROP COLUMN IF EXISTS address1;
ALTER TABLE users DROP COLUMN IF EXISTS address2;
ALTER TABLE users DROP COLUMN IF EXISTS city;
ALTER TABLE users DROP COLUMN IF EXISTS state;
ALTER TABLE users DROP COLUMN IF EXISTS pincode;
CREATE TABLE IF NOT EXISTS cart_items (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,product_id)
);
CREATE TABLE IF NOT EXISTS wishlists (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,product_id)
);
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, order_number text UNIQUE,
  user_id text NOT NULL REFERENCES users(id), total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','shipped','delivered','cancelled')),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending','packed','shipped','out_for_delivery','partially_delivered','delivered','cancelled')),
  customer_name text NOT NULL, customer_address text NOT NULL, customer_pincode text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address1 text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address2 text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_city text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_state text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_no bigint DEFAULT nextval('byfly_order_no_seq');
DROP INDEX IF EXISTS orders_order_no_idx;
WITH numbered AS (SELECT id,3000000000 + ROW_NUMBER() OVER (ORDER BY created_at,id) - 1 AS value FROM orders)
UPDATE orders o SET order_no=n.value FROM numbered n WHERE o.id=n.id;
SELECT setval('byfly_order_no_seq', GREATEST(3000000000,COALESCE((SELECT MAX(order_no)+1 FROM orders),3000000000)), false);
ALTER TABLE orders ALTER COLUMN order_no SET DEFAULT nextval('byfly_order_no_seq');
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_no_idx ON orders(order_no);
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id), quantity integer NOT NULL CHECK(quantity > 0), price numeric(12,2) NOT NULL CHECK(price >= 0),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending','packed','shipped','out_for_delivery','delivered','cancelled'))
);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_delivery_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_delivery_status_check CHECK(delivery_status IN ('pending','packed','shipped','out_for_delivery','partially_delivered','delivered','cancelled'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'pending';
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_delivery_status_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_delivery_status_check CHECK(delivery_status IN ('pending','packed','shipped','out_for_delivery','delivered','cancelled'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_item_no bigint DEFAULT nextval('byfly_order_item_no_seq');
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS order_no bigint;
UPDATE order_items oi SET order_no=o.order_no FROM orders o WHERE o.id=oi.order_id AND oi.order_no IS NULL;
CREATE INDEX IF NOT EXISTS order_items_order_no_idx ON order_items(order_no);
DROP INDEX IF EXISTS order_items_order_item_no_idx;
WITH numbered AS (SELECT id,4000000000 + ROW_NUMBER() OVER (ORDER BY id) - 1 AS value FROM order_items)
UPDATE order_items oi SET order_item_no=n.value FROM numbered n WHERE oi.id=n.id;
SELECT setval('byfly_order_item_no_seq', GREATEST(4000000000,COALESCE((SELECT MAX(order_item_no)+1 FROM order_items),4000000000)), false);
ALTER TABLE order_items ALTER COLUMN order_item_no SET DEFAULT nextval('byfly_order_item_no_seq');
CREATE UNIQUE INDEX IF NOT EXISTS order_items_order_item_no_idx ON order_items(order_item_no);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
ALTER TABLE wholesale_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE orders ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE order_items ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
CREATE OR REPLACE FUNCTION byfly_order_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.order_number := COALESCE(NEW.order_number, 'ORD-' || LPAD(nextval('order_number_seq')::text,5,'0')); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS orders_order_number_trigger ON orders;
CREATE TRIGGER orders_order_number_trigger BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION byfly_order_number();
`

// EnsureSchema creates all tables, indexes, sequence, and triggers required by ByFly.
func EnsureSchema(ctx context.Context, pool *pgxpool.Pool, maxProductImages int) error {
	if maxProductImages < 1 {
		maxProductImages = 4
	}
	// Remove legacy duplicate profile columns before the bootstrap. This is kept
	// outside the large schema batch so it is not rolled back if a later repair
	// statement fails.
	if _, err := pool.Exec(ctx, `ALTER TABLE users DROP COLUMN IF EXISTS address; ALTER TABLE users DROP COLUMN IF EXISTS address1; ALTER TABLE users DROP COLUMN IF EXISTS address2; ALTER TABLE users DROP COLUMN IF EXISTS city; ALTER TABLE users DROP COLUMN IF EXISTS state; ALTER TABLE users DROP COLUMN IF EXISTS pincode; ALTER TABLE users DROP COLUMN IF EXISTS contact_email;`); err != nil {
		return fmt.Errorf("legacy users column cleanup failed: %w", err)
	}
	if _, err := pool.Exec(ctx, SchemaSQL); err != nil {
		return err
	}
	_, err := pool.Exec(ctx, fmt.Sprintf(`
CREATE OR REPLACE FUNCTION byfly_limit_product_images() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM product_images WHERE product_id=NEW.product_id) >= %d
     AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id=NEW.product_id AND image_index=NEW.image_index) THEN
    RAISE EXCEPTION 'a product can have at most %d images';
  END IF;
  RETURN NEW;
END $$;`, maxProductImages, maxProductImages))
	return err
}
