CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, phone text NOT NULL DEFAULT '',
  password_hash text NOT NULL, role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS password_resets (
  token text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, details jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS collections (slug text PRIMARY KEY, name text NOT NULL);
CREATE TABLE IF NOT EXISTS products (
  slug text PRIMARY KEY, name text NOT NULL, description text NOT NULL, material text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price > 0), weight integer NOT NULL CHECK (weight > 0),
  images jsonb NOT NULL, collection text REFERENCES collections, position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  seo text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS variants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, product_slug text NOT NULL REFERENCES products ON DELETE CASCADE,
  size text NOT NULL, stock integer NOT NULL CHECK (stock >= 0), active boolean NOT NULL DEFAULT true, UNIQUE(product_slug,size)
);
CREATE TABLE IF NOT EXISTS cart_items (
  owner text NOT NULL, variant_id bigint NOT NULL REFERENCES variants ON DELETE CASCADE,
  qty integer NOT NULL CHECK(qty BETWEEN 1 AND 99), PRIMARY KEY(owner,variant_id)
);
CREATE TABLE IF NOT EXISTS vouchers (
  code text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('percent','fixed')), value integer NOT NULL CHECK(value > 0),
  min_purchase integer NOT NULL DEFAULT 0, starts_at timestamptz, ends_at timestamptz,
  quota integer CHECK(quota >= 0), reserved integer NOT NULL DEFAULT 0 CHECK(reserved >= 0)
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY, request_id uuid NOT NULL UNIQUE, user_id uuid REFERENCES users, guest_owner text,
  number text UNIQUE NOT NULL, email text NOT NULL, address jsonb NOT NULL, items jsonb NOT NULL,
  subtotal integer NOT NULL, shipping integer NOT NULL, discount integer NOT NULL, total integer NOT NULL,
  voucher text REFERENCES vouchers, courier jsonb NOT NULL, origin jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','complete','cancelled')),
  tracking text, shipping_id text, payment_url text, provider_status text, paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_pending_idx ON orders(expires_at) WHERE status = 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
CREATE TABLE IF NOT EXISTS outbox (
  event_key text PRIMARY KEY, kind text NOT NULL, order_id uuid NOT NULL REFERENCES orders,
  sent_at timestamptz, leased_at timestamptz
);
CREATE TABLE IF NOT EXISTS pages (slug text PRIMARY KEY, title text NOT NULL, content text NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS newsletter (email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
