import { createContext, useContext } from "react"
import type { CartContextValue } from "@/lib/cart/types"

/**
 * Contexto que comparte el estado y las acciones del carrito.
 */
const CartContext = createContext<CartContextValue | undefined>(undefined)

export default CartContext

/**
 * Obtiene el estado y las acciones del carrito.
 * @returns Valor del contexto del carrito.
 * @throws Si se usa fuera de CartProvider.
 */
export function useCart(): CartContextValue {
  const cart_context = useContext(CartContext)
  if (!cart_context) {
    throw new Error("useCart debe utilizarse dentro de CartProvider")
  }
  return cart_context
}
