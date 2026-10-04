import { useEffect, useMemo, useReducer } from "react"
import type { ReactNode } from "react"
import type { CartContextValue, CartItem, CartProduct } from "@/lib/types/cart"
import { cart_reducer, create_cart_item, get_cart_item_id, get_cart_subtotal, get_cart_total_units } from "@/lib/cart"
import { getProductVariants } from "@/lib/getProductVariants"
import { getAvailableQuantityBySize } from "@/lib/getProductStock"
import CartContext from "@/lib/context/cartContext"

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
 * Consulta las variantes del producto y obtiene el stock actual de la talla seleccionada.
 * Suma las unidades disponibles de esa talla en todos los locales de la variante.
 * @param product_id Identificador del producto cuyas variantes se consultan.
 * @param sku Identificador de la variante seleccionada.
 * @param selected_size Talla cuya disponibilidad se consulta.
 * @returns Cantidad disponible para la talla, o cero si no se encuentra la variante.
 */
async function get_current_available_quantity(product_id: string, sku: string, selected_size: string): Promise<number> {
  const variants = await getProductVariants(product_id)
  const variant = variants.find((product) => product.sku === sku)
  return variant ? getAvailableQuantityBySize(variant.b2c_stock_by_location, selected_size) : 0
}

/**
 * Provee el estado global del carrito y sus acciones a los componentes descendientes.
 * Guarda los cambios en localStorage y calcula el subtotal y el total de unidades.
 * Consulta el stock antes de agregar productos o aumentar sus cantidades.
 * @param props Propiedades del proveedor.
 * @param props.children Componentes que podrán consumir el contexto.
 * @returns Proveedor del contexto del carrito.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cart_reducer, [], get_stored_cart)

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
    total_items: get_cart_total_units(cart),
    /**
     * Solicita agregar la cantidad indicada de la variante y talla sin superar el stock consultado.
     * Tiene en cuenta las unidades de esa misma línea que ya están en el carrito.
     * @param product Producto que se desea agregar.
     * @param selected_size Talla seleccionada por la persona usuaria.
     * @param quantity Cantidad de unidades que se agregarán; por defecto, una.
     * @returns true si se envía la acción de agregar; false si la cantidad es inválida o el stock es insuficiente.
     */
    add_to_cart: async (product: CartProduct, selected_size: string, quantity = 1) => {
      if (!Number.isInteger(quantity) || quantity < 1) return false
      const max_quantity = await get_current_available_quantity(product.product_id, product.sku, selected_size)
      const item_id = get_cart_item_id(product.sku, selected_size)
      const cart_quantity = cart.find((item) => item.id === item_id)?.quantity ?? 0
      if (cart_quantity + quantity > max_quantity) return false
      dispatch({ type: "add", item: create_cart_item(product, selected_size, quantity), max_quantity })
      return true
    },
    /**
     * Solicita cambiar la cantidad y delega al reducer el límite de stock recién consultado.
     * Ignora cantidades no enteras y líneas que no existen en el carrito.
     * @param item_id Identificador de la línea que se actualizará.
     * @param quantity Cantidad entera solicitada por la persona usuaria.
     */
    set_quantity: async (item_id: string, quantity: number) => {
      if (!Number.isInteger(quantity)) return
      const item = cart.find((product) => product.id === item_id)
      if (!item) return
      const max_quantity = await get_current_available_quantity(item.product_id, item.sku, item.selected_size)
      dispatch({ type: "set_quantity", item_id, quantity, max_quantity })
    },
    /**
     * Solicita aumentar una unidad usando el stock actual de la variante y la talla.
     * El reducer mantiene la cantidad si la siguiente unidad supera el stock consultado.
     * @param item_id Identificador de la línea que se incrementará.
     */
    increment_item: async (item_id: string) => {
      const item = cart.find((product) => product.id === item_id)
      if (!item) return
      const max_quantity = await get_current_available_quantity(item.product_id, item.sku, item.selected_size)
      dispatch({ type: "increment", item_id, max_quantity })
    },
    /**
     * Reduce una unidad de la línea sin permitir cantidades inferiores a uno.
     * La eliminación completa se realiza mediante remove_item.
     * @param item_id Identificador de la línea que se reducirá.
     */
    decrement_item: (item_id: string) => {
      dispatch({ type: "decrement", item_id })
    },
    /**
     * Elimina por completo una línea del carrito.
     * @param item_id Identificador de la línea que se eliminará.
     */
    remove_item: (item_id: string) => {
      dispatch({ type: "remove", item_id })
    },
    /**
     * Vacía el carrito
     */
    clear_cart: () => {
      dispatch({ type: "clear" })
    },
  }), [cart])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
