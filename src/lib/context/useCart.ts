import { useContext } from "react"
import type { CartContextValue } from "@/lib/types/cart"
import CartContext from "@/lib/context/cartContext"

/**
 * Obtiene el estado y las acciones disponibles del carrito.
 * @returns {CartContextValue} Valor actual del contexto del carrito.
 * @throws {Error} Si se utiliza fuera de CartProvider.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error("useCart debe utilizarse dentro de CartProvider")
  }

  return context
}
