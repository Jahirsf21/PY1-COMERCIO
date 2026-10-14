import { useCallback, useEffect, useMemo, useReducer, useRef } from "react"
import type { ReactNode } from "react"
import type { CartAction, CartContextValue, CartItem, CartProduct } from "@/lib/cart/types"
import { cart_reducer, create_cart_item, get_cart_add_quantity_limits, get_cart_item_id, get_cart_shipping_cost, get_cart_subtotal, get_cart_tax, get_cart_total, get_cart_total_units, is_valid_cart_quantity } from "@/lib/cart/cart"
import { getCartQuantityLimits } from "@/lib/catalog/catalog"
import CartContext from "@/lib/cart/cartContext"

/**
 * Recupera el carrito almacenado en localStorage al iniciar la aplicación.
 * Conserva únicamente los campos de las líneas; el stock se consulta por separado.
 * @returns Carrito persistido o un arreglo vacío si no existe o no puede interpretarse.
 */
function get_stored_cart(): CartItem[] {
  const stored_cart = window.localStorage.getItem("space-shop-cart")
  if (!stored_cart) return []

  try {
    const cart: unknown = JSON.parse(stored_cart)
    if (!Array.isArray(cart)) return []
    return cart.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      sku: item.sku,
      selected_size: item.selected_size,
      title: item.title,
      image: item.image,
      unit_price: item.unit_price,
      currency: item.currency,
      quantity: item.quantity,
    }))
  } catch {
    return []
  }
}

/**
 * Provee el estado global del carrito y sus acciones a los componentes descendientes.
 * Guarda los cambios en localStorage y calcula el subtotal, el envío, el impuesto, el total y el total de unidades.
 * Consulta reglas y stock antes de agregar productos o modificar sus cantidades.
 * @param props Propiedades del proveedor.
 * @param props.children Componentes que podrán consumir el contexto.
 * @returns Proveedor del contexto del carrito.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cart_reducer, [], get_stored_cart)
  const current_cart = useRef(cart)

  // Las consultas pueden resolverse juntas antes del siguiente render. Procesa
  // cada acción contra el último estado para no anunciar adiciones rechazadas.
  const apply_action = useCallback((action: CartAction): boolean => {
    const next_cart = cart_reducer(current_cart.current, action)
    if (next_cart === current_cart.current) return false
    current_cart.current = next_cart
    dispatch(action)
    return true
  }, [])

  // Guarda el carrito actualizado o elimina su persistencia cuando queda vacío.
  useEffect(() => {
    if (cart.length === 0) {
      window.localStorage.removeItem("space-shop-cart")
      return
    }
    window.localStorage.setItem("space-shop-cart", JSON.stringify(cart))
  }, [cart])

  // Recalcula los totales y las acciones del contexto cuando cambia el carrito.
  const value = useMemo<CartContextValue>(() => ({
    cart,
    subtotal: get_cart_subtotal(cart),
    shipping: get_cart_shipping_cost(cart),
    tax: get_cart_tax(cart),
    total: get_cart_total(cart),
    total_items: get_cart_total_units(cart),
    /**
     * Agrega unidades respetando las reglas vigentes y la cantidad acumulada de SKU+talla.
     * @param product Producto que se desea agregar.
     * @param selected_size Talla seleccionada por la persona usuaria.
     * @param quantity Unidades adicionales; por defecto, el mínimo inicial o un paso si la línea ya existe.
     * @returns true únicamente si el reducer acepta la adición.
     */
    add_to_cart: async (product: CartProduct, selected_size: string, quantity?: number) => {
      if (quantity !== undefined && (!Number.isSafeInteger(quantity) || quantity < 1)) return false
      const limits = await getCartQuantityLimits(product.product_id, product.sku, selected_size)
      if (!limits) return false
      const item_id = get_cart_item_id(product.sku, selected_size)
      const cart_quantity = current_cart.current.find((item) => item.id === item_id)?.quantity ?? 0
      const additional_limits = get_cart_add_quantity_limits(limits, cart_quantity)
      const additional_quantity = quantity ?? additional_limits?.min_quantity ?? 0
      if (!is_valid_cart_quantity(additional_quantity, additional_limits)) return false
      return apply_action({ type: "add", item: create_cart_item(product, selected_size, additional_quantity), limits })
    },
    /**
     * Solicita cambiar la cantidad con reglas y stock recién consultados.
     * Rechaza cantidades inválidas sin ajustarlas silenciosamente.
     * @param item_id Identificador de la línea que se actualizará.
     * @param quantity Cantidad entera solicitada por la persona usuaria.
     */
    set_quantity: async (item_id: string, quantity: number) => {
      if (!Number.isSafeInteger(quantity)) return
      const item = current_cart.current.find((product) => product.id === item_id)
      if (!item) return
      const limits = await getCartQuantityLimits(item.product_id, item.sku, item.selected_size)
      if (limits) apply_action({ type: "set_quantity", item_id, quantity, limits })
    },
    /**
     * Solicita aumentar un paso con los límites actuales de la variante y talla.
     * @param item_id Identificador de la línea que se incrementará.
     * @returns true si el reducer acepta el incremento.
     */
    increment_item: async (item_id: string) => {
      const item = current_cart.current.find((product) => product.id === item_id)
      if (!item) return false
      const limits = await getCartQuantityLimits(item.product_id, item.sku, item.selected_size)
      return limits ? apply_action({ type: "increment", item_id, limits }) : false
    },
    /**
     * Reduce un paso de la línea sin permitir cantidades inferiores al mínimo.
     * La eliminación completa se realiza mediante remove_item.
     * @param item_id Identificador de la línea que se reducirá.
     */
    decrement_item: async (item_id: string) => {
      const item = current_cart.current.find((product) => product.id === item_id)
      if (!item) return false
      const limits = await getCartQuantityLimits(item.product_id, item.sku, item.selected_size)
      return limits ? apply_action({ type: "decrement", item_id, limits }) : false
    },
    /**
     * Elimina por completo una línea del carrito.
     * @param item_id Identificador de la línea que se eliminará.
     */
    remove_item: (item_id: string) => {
      apply_action({ type: "remove", item_id })
    },
    /**
     * Vacía el carrito
     */
    clear_cart: () => {
      apply_action({ type: "clear" })
    },
  }), [cart, apply_action])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
