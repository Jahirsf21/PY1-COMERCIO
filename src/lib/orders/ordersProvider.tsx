import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { CartItem } from "@/lib/cart/types"
import type { CheckoutFormData } from "@/lib/checkout/types"
import type { OrderAction, OrdersContextValue, OrderStatus } from "@/lib/orders/types"
import { create_order, get_next_order_number, get_stored_orders, orders_reducer, save_orders } from "@/lib/orders/orders"
import OrdersContext from "@/lib/orders/ordersContext"

/**
 * Provee los pedidos y sus acciones a los componentes descendientes.
 * Recupera los pedidos de localStorage y los guarda en cada cambio.
 * @param props Propiedades del proveedor.
 * @param props.children Componentes que consumen el contexto.
 * @returns Proveedor del contexto de pedidos.
 */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const [stored_snapshot] = useState(get_stored_orders)
  const [orders, set_orders] = useState(stored_snapshot.orders)
  const current_orders = useRef(orders)
  const [storage_error, set_storage_error] = useState(stored_snapshot.storage_error)
  const [notice, set_notice] = useState<string | null>(stored_snapshot.discarded_orders ? "No pudimos recuperar algunos de tus pedidos." : null)
  const has_user_changes = useRef(false)

  /**
   * Aplica una acción a los pedidos mediante orders_reducer() y actualiza el estado.
   * @param action Acción que se desea aplicar.
   * @returns true si los pedidos cambiaron; false si no hubo cambios.
   */
  const apply_action = useCallback((action: OrderAction): boolean => {
    const next_orders = orders_reducer(current_orders.current, action)
    if (next_orders === current_orders.current) return false
    has_user_changes.current = true
    current_orders.current = next_orders
    set_orders(next_orders)
    return true
  }, [])

  useEffect(() => {
    let is_effect_active = true
    queueMicrotask(() => {
      if (!is_effect_active || (stored_snapshot.storage_error && !has_user_changes.current)) return
      set_storage_error(!save_orders(orders))
    })
    return () => { is_effect_active = false }
  }, [orders, stored_snapshot.storage_error])

  const context_value = useMemo<OrdersContextValue>(() => ({
    orders,
    storage_error,
    notice,
    /**
     * Cierra el aviso de los pedidos.
     * @returns No retorna ningún valor.
     */
    dismiss_notice: () => set_notice(null),
    /**
     * Obtiene un pedido por su identificador.
     * @param order_id Identificador del pedido.
     * @returns Pedido encontrado, o undefined si no existe.
     */
    get_order: (order_id: string) => current_orders.current.find((order) => order.id === order_id),
    /**
     * Crea un pedido con el siguiente número consecutivo y lo agrega a los pedidos.
     * @param form_data Información del comprador y la entrega.
     * @param cart Líneas del carrito.
     * @returns Pedido creado, o null si no se pudo crear.
     */
    create_order: (form_data: CheckoutFormData, cart: CartItem[]) => {
      const new_order = create_order(form_data, cart, get_next_order_number(current_orders.current))
      if (!new_order) return null
      return apply_action({ type: "add", order: new_order }) ? new_order : null
    },
    /**
     * Actualiza el estado de un pedido.
     * @param order_id Identificador del pedido.
     * @param status Estado nuevo.
     * @returns true si el estado cambió.
     */
    update_order_status: (order_id: string, status: OrderStatus) => {
      return apply_action({ type: "set_status", order_id, status })
    },
  }), [orders, storage_error, notice, apply_action])

  return (
    <OrdersContext.Provider value={context_value}>
      {children}
    </OrdersContext.Provider>
  )
}
