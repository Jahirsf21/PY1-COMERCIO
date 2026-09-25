import { useEffect, useMemo, useReducer } from "react"
import type { ReactNode } from "react"
import type { CartContextValue, CartItem, CartProduct } from "@/lib/types/cart"
import { can_add_product, cart_reducer, create_cart_item, get_item_subtotal } from "@/lib/cart"
import CartContext from "@/lib/context/cartContext"

/**
 * Recupera el carrito almacenado en localStorage al iniciar la aplicación.
 * @returns {CartItem[]} Carrito persistido o un arreglo vacío si no existe o es inválido.
 */
function get_stored_cart(): CartItem[] {
  const stored_cart = window.localStorage.getItem("space-shop-cart")
  if (!stored_cart) return []

  try {
    const cart: unknown = JSON.parse(stored_cart)
    return Array.isArray(cart) ? cart as CartItem[] : []
  } catch {
    return []
  }
}

/**
 * Provee el estado global del carrito y sus acciones a los componentes descendientes.
 * Guarda los cambios en localStorage y calcula el subtotal y el total de unidades.
 * @param {{ children: ReactNode }} props Componentes que podrán consumir el contexto.
 * @returns {ReactNode} Proveedor del contexto del carrito.
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

  const value = useMemo<CartContextValue>(() => ({
    cart,
    subtotal: cart.reduce((total, item) => total + get_item_subtotal(item), 0),
    total_items: cart.reduce((total, item) => total + item.quantity, 0),
    add_to_cart: (product: CartProduct, selected_size: string) => {
      if (!can_add_product(product)) return
      dispatch({ type: "add", item: create_cart_item(product, selected_size) })
    },
    set_quantity: (item_id: string, quantity: number) => {
      dispatch({ type: "set_quantity", item_id, quantity })
    },
    increment_item: (item_id: string) => {
      dispatch({ type: "increment", item_id })
    },
    decrement_item: (item_id: string) => {
      dispatch({ type: "decrement", item_id })
    },
    remove_item: (item_id: string) => {
      dispatch({ type: "remove", item_id })
    },
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
