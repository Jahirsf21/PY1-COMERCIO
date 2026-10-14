import { createContext, useContext } from "react"
import type { CartContextValue } from "@/lib/cart/types"

/**
 * Contexto global que comparte el estado y las acciones del carrito.
 * Su valor es undefined hasta que CartProvider envuelve la aplicación.
 */
const CartContext = createContext<CartContextValue | undefined>(undefined)

export default CartContext

/**
 * Obtiene el estado y las acciones del carrito.
 * @returns Estado, totales, validaciones y acciones compartidas por CartProvider.
 * @throws Si el consumidor no está dentro de CartProvider.
 */
export function useCart(): CartContextValue {
  const cart_context = useContext(CartContext)
  if (!cart_context) {
    throw new Error("useCart debe utilizarse dentro de CartProvider")
  }
  return cart_context
}
