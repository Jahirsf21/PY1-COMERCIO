/**
 * Crea las tablas y sus estados.
 */
begin;

/**
 * Define los estados disponibles para un pedido.
 */
create type order_status as enum (
  'PENDING',
  'CONFIRMED',
  'FAILED'
);

/**
 * Define los estados disponibles para un pago.
 */
create type payment_status as enum (
  'PENDING',
  'APPROVE',
  'DECLINED',
  'ERROR'
);

/**
 * Guarda los datos del pedido, comprador, entrega y montos de la compra.
 * Genera el número del pedido y guarda los montos calculados en el carrito.
 */
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer generated always as identity unique,
  created_at timestamptz not null default now(),
  buyer jsonb not null check (jsonb_typeof(buyer) = 'object'),
  delivery jsonb not null check (jsonb_typeof(delivery) = 'object'),
  currency text not null default 'CRC' check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  tax numeric(12, 2) not null check (tax >= 0),
  shipping numeric(12, 2) not null check (shipping >= 0),
  total numeric(12, 2) not null check (total >= 0),
  status order_status not null default 'PENDING'
);

/**
 * Guarda los productos, tallas, cantidades y precios de cada pedido.
 * Guarda el subtotal calculado en el carrito.
 */
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text not null check (length(btrim(product_id)) > 0),
  sku text not null check (length(btrim(sku)) > 0),
  selected_size text not null check (length(btrim(selected_size)) > 0),
  title text not null check (length(btrim(title)) > 0),
  image jsonb not null check (jsonb_typeof(image) = 'object'),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  constraint order_items_variant_unique unique (order_id, sku, selected_size)
);

/**
 * Guarda el monto, la moneda y el estado del pago de cada pedido.
 * Permite un pago por pedido y evita borrar pedidos con pagos registrados.
 */
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete restrict,
  created_at timestamptz not null default now(),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'CRC' check (currency ~ '^[A-Z]{3}$'),
  status payment_status not null default 'PENDING'
);

/**
 * Agiliza las consultas de pedidos ordenados por fecha.
 */
create index orders_created_at_idx on orders (created_at desc);

/**
 * Desactiva RLS para simplificar el acceso a las tablas
 */
alter table orders disable row level security;
alter table order_items disable row level security;
alter table payments disable row level security;

/**
 * Confirma los cambios realizados.
 */
commit;
