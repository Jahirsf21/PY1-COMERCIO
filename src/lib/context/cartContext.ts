import { createContext } from "react"
import type { CartContextValue } from "@/lib/types/cart"

/**
 * Contexto global que comparte el estado y las acciones del carrito.
 * Su valor es undefined hasta que CartProvider envuelve la aplicación.
 */
const CartContext = createContext<CartContextValue | undefined>(undefined)

export default CartContext
