import { createContext, useContext } from "react"
import type { OrdersContextValue } from "@/lib/orders/types"

/**
 * Contexto que comparte los pedidos y sus acciones.
 */
const OrdersContext = createContext<OrdersContextValue | undefined>(undefined)

export default OrdersContext

/**
 * Obtiene los pedidos y sus acciones.
 * @returns Valor del contexto de pedidos.
 * @throws Si se usa fuera de OrdersProvider.
 */
export function useOrders(): OrdersContextValue {
  const orders_context = useContext(OrdersContext)
  if (!orders_context) {
    throw new Error("useOrders debe utilizarse dentro de OrdersProvider")
  }
  return orders_context
}
