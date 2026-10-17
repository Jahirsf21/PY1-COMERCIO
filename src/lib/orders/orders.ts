import type { CartItem } from "@/lib/cart/types"
import type { BuyerInfo, CheckoutFormData, DeliveryInfo } from "@/lib/checkout/types"
import type { OrderAction, OrderDetails, OrderItem, OrderStatus, OrdersStorageSnapshot } from "@/lib/orders/types"
import type { Payment } from "@/lib/payments/types"
import { get_cart_shipping_cost, get_cart_subtotal, get_cart_tax, get_cart_total, get_item_subtotal } from "@/lib/cart/cart"
import { get_stored_json, is_nonempty_string, is_positive_integer, is_record, is_valid_currency, is_valid_image, is_valid_price, save_stored_list } from "@/lib/shared/utils"

/**
 * Valida la información de la persona compradora de un pedido.
 * Requiere el nombre, el tipo y número de identificación, el correo y el teléfono; los contactos alternativos son opcionales.
 * @param buyer Información de la persona compradora sin validar.
 * @returns Información con los textos sin espacios externos, o null si es inválida.
 */
function parse_order_buyer(buyer: unknown): BuyerInfo | null {
  if (!is_record(buyer) || !is_nonempty_string(buyer.full_name) ||
    (buyer.identification_type !== "Nacional" && buyer.identification_type !== "Extranjero" && buyer.identification_type !== "Otro") ||
    !is_nonempty_string(buyer.identification_number) || !is_nonempty_string(buyer.email) || !is_nonempty_string(buyer.phone_number) ||
    (buyer.alternative_email !== undefined && typeof buyer.alternative_email !== "string") ||
    (buyer.alternative_phone_number !== undefined && typeof buyer.alternative_phone_number !== "string")) {
    return null
  }

  return {
    full_name: buyer.full_name.trim(),
    identification_type: buyer.identification_type,
    identification_number: buyer.identification_number.trim(),
    email: buyer.email.trim(),
    alternative_email: typeof buyer.alternative_email === "string" ? buyer.alternative_email.trim() : undefined,
    phone_number: buyer.phone_number.trim(),
    alternative_phone_number: typeof buyer.alternative_phone_number === "string" ? buyer.alternative_phone_number.trim() : undefined,
  }
}

/**
 * Valida la dirección de entrega de un pedido.
 * Requiere el país, la provincia, el cantón, el distrito, la dirección y el código postal; las indicaciones adicionales pueden estar vacías.
 * @param delivery Dirección de entrega sin validar.
 * @returns Dirección con los textos sin espacios externos, o null si es inválida.
 */
function parse_order_delivery(delivery: unknown): DeliveryInfo | null {
  if (!is_record(delivery) || !is_nonempty_string(delivery.country) || !is_nonempty_string(delivery.province) ||
    !is_nonempty_string(delivery.canton) || !is_nonempty_string(delivery.district) || !is_nonempty_string(delivery.address) ||
    !is_nonempty_string(delivery.postal_code) || typeof delivery.additional_information !== "string") {
    return null
  }

  return {
    country: delivery.country.trim(),
    province: delivery.province.trim(),
    canton: delivery.canton.trim(),
    district: delivery.district.trim(),
    address: delivery.address.trim(),
    postal_code: delivery.postal_code.trim(),
    additional_information: delivery.additional_information.trim(),
  }
}

/**
 * Valida un producto de un pedido.
 * Comprueba los identificadores, la talla, el título, la imagen, la cantidad, el precio unitario y el subtotal.
 * @param raw_item Producto sin validar.
 * @param order_id Identificador del pedido al que debe pertenecer.
 * @returns Producto con los textos sin espacios externos, o null si es inválido.
 */
function parse_order_item(raw_item: unknown, order_id: string): OrderItem | null {
  if (!is_record(raw_item) || !is_nonempty_string(raw_item.id) || raw_item.order_id !== order_id ||
    !is_nonempty_string(raw_item.product_id) || !is_nonempty_string(raw_item.sku) || !is_nonempty_string(raw_item.selected_size) ||
    !is_nonempty_string(raw_item.title) || !is_valid_image(raw_item.image) || !is_positive_integer(raw_item.quantity) ||
    !is_valid_price(raw_item.unit_price, raw_item.quantity) || !is_valid_price(raw_item.subtotal)) {
    return null
  }

  return {
    id: raw_item.id.trim(),
    order_id,
    product_id: raw_item.product_id.trim(),
    sku: raw_item.sku.trim(),
    selected_size: raw_item.selected_size.trim(),
    title: raw_item.title.trim(),
    image: { url: raw_item.image.url.trim(), alt: raw_item.image.alt },
    unit_price: raw_item.unit_price,
    quantity: raw_item.quantity,
    subtotal: raw_item.subtotal,
  }
}

/**
 * Valida el pago de un pedido.
 * Comprueba los identificadores, la fecha, el monto, la moneda y el estado, y que pertenezca al pedido y coincida con su total y moneda.
 * @param raw_payment Pago sin validar.
 * @param order Identificador, total y moneda del pedido.
 * @returns Pago validado, o null si es inválido.
 */
function parse_order_payment(raw_payment: unknown, order: Pick<OrderDetails, "id" | "total" | "currency">): Payment | null {
  if (!is_record(raw_payment) || !is_nonempty_string(raw_payment.id) || raw_payment.order_id !== order.id ||
    typeof raw_payment.created_at !== "string" || Number.isNaN(Date.parse(raw_payment.created_at)) ||
    !is_valid_price(raw_payment.amount) || raw_payment.amount !== order.total ||
    !is_valid_currency(raw_payment.currency) || raw_payment.currency !== order.currency ||
    (raw_payment.status !== "PENDING" && raw_payment.status !== "APPROVE" && raw_payment.status !== "DECLINED" && raw_payment.status !== "ERROR")) {
    return null
  }

  return {
    id: raw_payment.id.trim(),
    order_id: order.id,
    created_at: raw_payment.created_at,
    amount: raw_payment.amount,
    currency: raw_payment.currency,
    status: raw_payment.status,
  }
}

/**
 * Valida los datos de los pedidos y conserva los que tienen una estructura válida.
 * Por cada pedido:
 * - Valida el identificador, el número, la fecha, la moneda, los montos y el estado.
 * - Valida la persona compradora, la entrega y los productos mediante parse_order_buyer(), parse_order_delivery() y parse_order_item().
 * - Valida que payment sea null o un pago válido según parse_order_payment().
 * - Descarta los pedidos con un identificador o número repetido.
 * @param orders_data Datos de los pedidos sin validar.
 * @returns Pedidos validados.
 *   orders: pedidos válidos.
 *   discarded_orders: true si se descartó algún pedido o los datos no son un arreglo.
 *   storage_error: siempre false.
 */
export function parse_orders_data(orders_data: unknown): OrdersStorageSnapshot {
  const storage_snapshot: OrdersStorageSnapshot = { orders: [], discarded_orders: false, storage_error: false }
  if (!Array.isArray(orders_data)) return { ...storage_snapshot, discarded_orders: true }
  const orders_by_id = new Map<string, OrderDetails>()
  const order_numbers = new Set<number>()

  for (const raw_order of orders_data) {
    if (!is_record(raw_order) || !is_nonempty_string(raw_order.id) || !is_positive_integer(raw_order.order_number) ||
      typeof raw_order.created_at !== "string" || Number.isNaN(Date.parse(raw_order.created_at)) || !is_valid_currency(raw_order.currency) ||
      !is_valid_price(raw_order.subtotal) || !is_valid_price(raw_order.tax) || !is_valid_price(raw_order.shipping) || !is_valid_price(raw_order.total) ||
      (raw_order.status !== "PENDING" && raw_order.status !== "CONFIRMED" && raw_order.status !== "FAILED") ||
      !Array.isArray(raw_order.items) || raw_order.items.length === 0) {
      storage_snapshot.discarded_orders = true
      continue
    }

    const order_id = raw_order.id.trim()
    const buyer = parse_order_buyer(raw_order.buyer)
    const delivery = parse_order_delivery(raw_order.delivery)
    const items = raw_order.items.map((raw_item) => parse_order_item(raw_item, order_id))
    const payment = raw_order.payment === null ? null : parse_order_payment(raw_order.payment, { id: order_id, total: raw_order.total, currency: raw_order.currency })
    if (!buyer || !delivery || items.some((item) => item === null) || (raw_order.payment !== null && !payment) ||
      orders_by_id.has(order_id) || order_numbers.has(raw_order.order_number)) {
      storage_snapshot.discarded_orders = true
      continue
    }

    orders_by_id.set(order_id, {
      id: order_id,
      order_number: raw_order.order_number,
      created_at: raw_order.created_at,
      buyer,
      delivery,
      currency: raw_order.currency,
      subtotal: raw_order.subtotal,
      tax: raw_order.tax,
      shipping: raw_order.shipping,
      total: raw_order.total,
      status: raw_order.status,
      items: items.filter((item) => item !== null),
      payment,
    })
    order_numbers.add(raw_order.order_number)
  }
  storage_snapshot.orders = [...orders_by_id.values()]
  return storage_snapshot
}

/**
 * Obtiene los pedidos guardados en localStorage y los valida mediante parse_orders_data().
 * @returns Pedidos recuperados.
 *   orders: pedidos válidos; vacío si la clave no existe o no se puede leer.
 *   discarded_orders: true si el JSON es inválido o contiene pedidos descartados.
 *   storage_error: true si el navegador impide leer localStorage.
 */
export function get_stored_orders(): OrdersStorageSnapshot {
  const stored_orders = get_stored_json("space-shop-orders")
  if (stored_orders.status === "ok") return parse_orders_data(stored_orders.data)
  return { orders: [], discarded_orders: stored_orders.status === "invalid_json", storage_error: stored_orders.status === "storage_error" }
}

/**
 * Guarda los pedidos en localStorage, o elimina la clave si no hay pedidos.
 * @param orders Pedidos que se desean guardar.
 * @returns true si se guardó; false si el navegador rechaza la operación.
 */
export function save_orders(orders: OrderDetails[]): boolean {
  return save_stored_list("space-shop-orders", orders)
}

/**
 * Calcula el siguiente número consecutivo de pedido.
 * @param orders Pedidos existentes.
 * @returns Número mayor registrado más uno, o 1 si no hay pedidos.
 */
export function get_next_order_number(orders: OrderDetails[]): number {
  return orders.reduce((max_number, order) => Math.max(max_number, order.order_number), 0) + 1
}

/**
 * Crea un producto de pedido a partir de una línea del carrito.
 * @param item Línea del carrito.
 * @param order_id Identificador del pedido.
 * @returns Producto del pedido con el subtotal calculado mediante get_item_subtotal().
 */
export function create_order_item(item: CartItem, order_id: string): OrderItem {
  return {
    id: crypto.randomUUID(),
    order_id,
    product_id: item.product_id,
    sku: item.sku,
    selected_size: item.selected_size,
    title: item.title,
    image: { ...item.image },
    unit_price: item.unit_price,
    quantity: item.quantity,
    subtotal: get_item_subtotal(item),
  }
}

/**
 * Crea un pedido con estado PENDING a partir del formulario de compra y las líneas del carrito.
 * Calcula el subtotal, el impuesto, el envío y el total con las funciones del carrito.
 * @param form_data Información del comprador y la entrega.
 * @param cart Líneas del carrito.
 * @param order_number Número del pedido.
 * @returns Pedido creado sin pago, o null si el carrito está vacío o tiene más de una moneda.
 */
export function create_order(form_data: CheckoutFormData, cart: CartItem[], order_number: number): OrderDetails | null {
  if (cart.length === 0 || new Set(cart.map((item) => item.currency)).size !== 1) return null
  const order_id = crypto.randomUUID()
  return {
    id: order_id,
    order_number,
    created_at: new Date().toISOString(),
    buyer: { ...form_data.buyer },
    delivery: { ...form_data.delivery },
    currency: cart[0].currency,
    subtotal: get_cart_subtotal(cart),
    tax: get_cart_tax(cart),
    shipping: get_cart_shipping_cost(cart),
    total: get_cart_total(cart),
    status: "PENDING",
    items: cart.map((item) => create_order_item(item, order_id)),
    payment: null,
  }
}

/**
 * Agrega un pedido al inicio de la lista.
 * @param state Estado actual de los pedidos.
 * @param new_order Pedido que se desea agregar.
 * @returns Pedidos actualizados, o el mismo estado si ya existe un pedido con el mismo id o número.
 */
export function add_order(state: OrderDetails[], new_order: OrderDetails): OrderDetails[] {
  if (state.some((order) => order.id === new_order.id || order.order_number === new_order.order_number)) return state
  return [new_order, ...state]
}

/**
 * Actualiza el estado de un pedido.
 * @param state Estado actual de los pedidos.
 * @param order_id Identificador del pedido.
 * @param status Estado nuevo.
 * @returns Pedidos actualizados, o el mismo estado si el pedido no existe o ya tiene ese estado.
 */
export function set_order_status(state: OrderDetails[], order_id: string, status: OrderStatus): OrderDetails[] {
  const order = state.find((current_order) => current_order.id === order_id)
  if (!order || order.status === status) return state
  return state.map((current_order) =>
    current_order.id === order_id ? { ...current_order, status } : current_order,
  )
}

/**
 * Aplica una acción a los pedidos mediante la función correspondiente.
 * @param state Estado actual de los pedidos.
 * @param action Acción que se desea aplicar.
 * @returns Estado de los pedidos después de aplicar la acción.
 */
export function orders_reducer(state: OrderDetails[], action: OrderAction): OrderDetails[] {
  switch (action.type) {
    case "add":
      return add_order(state, action.order)
    case "set_status":
      return set_order_status(state, action.order_id, action.status)
  }
}
