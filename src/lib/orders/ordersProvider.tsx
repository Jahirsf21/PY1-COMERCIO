import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { CartItem } from "@/lib/cart/types"
import type { CheckoutFormData } from "@/lib/checkout/types"
import type { OrderDetails, OrdersContextValue, PayOrderResult } from "@/lib/orders/types"
import type { CardPaymentData, PaymentResult } from "@/lib/payments/types"
import { acquire_order_payment_lock, create_order, create_order_payment, get_next_order_number, get_order_payment_block, get_stored_orders, merge_unsaved_orders, orders_reducer, recover_interrupted_payments, save_orders, with_orders_lock } from "@/lib/orders/orders"
import { process_payment, validate_card_payment_data } from "@/lib/payments/payments"
import OrdersContext from "@/lib/orders/ordersContext"

/**
 * Provee los pedidos y coordina su persistencia y los pagos entre pestañas.
 * Conserva los resultados sin guardar y recupera únicamente simulaciones que ya no tienen una pestaña propietaria.
 * @param props Propiedades del proveedor.
 * @param props.children Componentes que consumen el contexto.
 * @returns Proveedor del contexto de pedidos.
 */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const [initial_orders] = useState(get_stored_orders)
  const [orders, set_orders] = useState(initial_orders.orders)
  const current_orders = useRef(orders)
  const [storage_error, set_storage_error] = useState(initial_orders.storage_error)
  const [notice, set_notice] = useState<string | null>(initial_orders.discarded_orders ? "No pudimos recuperar algunos de tus pedidos." : null)
  const [unsaved_order_ids, set_unsaved_order_ids] = useState<string[]>([])
  const current_unsaved_order_ids = useRef<string[]>([])
  const [is_creating_order, set_is_creating_order] = useState(false)
  const creating_order = useRef(false)
  const payment_locks = useRef(new Map<string, () => void>())
  const recovery_requests = useRef(new Map<string, AbortController>())
  const lifecycle_generation = useRef(0)

  /**
   * Libera un bloqueo de pago que pertenece a esta pestaña.
   * @param order_id Identificador del pedido.
   * @returns No retorna ningún valor.
   */
  const release_payment_lock = useCallback((order_id: string): void => {
    payment_locks.current.get(order_id)?.()
    payment_locks.current.delete(order_id)
  }, [])

  /**
   * Actualiza los pedidos sin guardar y libera los bloqueos de los resultados que ya están resueltos.
   * @param order_ids Identificadores que todavía requieren guardado.
   * @returns No retorna ningún valor.
   */
  const update_unsaved_orders = useCallback((order_ids: string[]): void => {
    for (const order_id of current_unsaved_order_ids.current) {
      if (!order_ids.includes(order_id)) release_payment_lock(order_id)
    }
    current_unsaved_order_ids.current = order_ids
    set_unsaved_order_ids(order_ids)
  }, [release_payment_lock])

  /**
   * Recupera los pedidos actuales y combina únicamente los resultados locales que siguen vigentes.
   * Debe llamarse dentro del bloqueo compartido cuando se va a escribir.
   * @returns Pedidos actuales, o null si el almacenamiento no se puede leer.
   */
  const read_current_orders = useCallback((): OrderDetails[] | null => {
    const snapshot = get_stored_orders()
    if (snapshot.storage_error) {
      set_storage_error(true)
      return null
    }
    if (snapshot.discarded_orders) set_notice("No pudimos recuperar algunos de tus pedidos.")
    const next_orders = merge_unsaved_orders(snapshot.orders, current_orders.current, current_unsaved_order_ids.current)
    const next_unsaved_ids = current_unsaved_order_ids.current.filter((order_id) =>
      next_orders.some((order) => order.id === order_id && order === current_orders.current.find((local_order) => local_order.id === order_id)),
    )
    if (next_unsaved_ids.length !== current_unsaved_order_ids.current.length) update_unsaved_orders(next_unsaved_ids)
    return next_orders
  }, [update_unsaved_orders])

  /**
   * Aplica una modificación sobre la última versión persistida bajo un bloqueo compartido.
   * Los resultados finales pueden conservarse en memoria si falla su escritura; los demás cambios requieren guardado.
   * @param update Función que modifica los pedidos actuales.
   * @param unsaved_order_id Pedido cuyo resultado debe conservarse si falla el guardado.
   * @returns true si el cambio se aplicó, o false si no cambió nada o no se pudo completar la operación.
   */
  const commit_orders = useCallback(async (update: (state: OrderDetails[]) => OrderDetails[], unsaved_order_id?: string): Promise<boolean> => {
    const generation = lifecycle_generation.current
    try {
      return await with_orders_lock(() => {
        if (generation !== lifecycle_generation.current) return false
        const latest_orders = read_current_orders()
        if (!latest_orders) {
          if (!unsaved_order_id) return false
          const next_orders = update(current_orders.current)
          if (next_orders === current_orders.current) return false
          update_unsaved_orders([...new Set([...current_unsaved_order_ids.current, unsaved_order_id])])
          current_orders.current = next_orders
          set_orders(next_orders)
          return true
        }
        const next_orders = update(latest_orders)
        if (next_orders === latest_orders) {
          current_orders.current = latest_orders
          set_orders(latest_orders)
          return false
        }
        const is_saved = save_orders(next_orders)
        set_storage_error(!is_saved)
        if (!is_saved && !unsaved_order_id) {
          current_orders.current = latest_orders
          set_orders(latest_orders)
          return false
        }
        if (is_saved) update_unsaved_orders([])
        else update_unsaved_orders([...new Set([...current_unsaved_order_ids.current, unsaved_order_id!])])
        current_orders.current = next_orders
        set_orders(next_orders)
        return true
      })
    } catch {
      if (unsaved_order_id && generation === lifecycle_generation.current) {
        const next_orders = update(current_orders.current)
        if (next_orders !== current_orders.current) {
          update_unsaved_orders([...new Set([...current_unsaved_order_ids.current, unsaved_order_id])])
          current_orders.current = next_orders
          set_orders(next_orders)
          set_storage_error(true)
          return true
        }
      }
      set_notice("Tu navegador no permite completar esta operación. Intenta nuevamente en un navegador compatible.")
      return false
    }
  }, [read_current_orders, update_unsaved_orders])

  /**
   * Espera a que el pago deje de pertenecer a otra pestaña antes de recuperar una simulación interrumpida.
   * Si la otra pestaña guarda un resultado final, lo conserva sin convertirlo a ERROR.
   * @param order_id Identificador del pedido.
   * @param payment_id Identificador del intento observado.
   * @returns No retorna ningún valor.
   */
  const schedule_payment_recovery = useCallback((order_id: string, payment_id: string): void => {
    if (payment_locks.current.has(order_id) || recovery_requests.current.has(order_id)) return
    const controller = new AbortController()
    const generation = lifecycle_generation.current
    recovery_requests.current.set(order_id, controller)
    void (async () => {
      let release: (() => void) | null = null
      try {
        release = await acquire_order_payment_lock(order_id, true, controller.signal)
        if (!release) return
        if (controller.signal.aborted || generation !== lifecycle_generation.current) return
        payment_locks.current.set(order_id, release)
        await commit_orders((state) => {
          const order = state.find((current_order) => current_order.id === order_id)
          if (!order || order.payment?.id !== payment_id || order.payment.status !== "PENDING") return state
          const recovered_order = recover_interrupted_payments([order])[0]
          return state.map((current_order) => current_order.id === order_id ? recovered_order : current_order)
        }, order_id)
      } catch {
        if (!controller.signal.aborted) set_notice("No pudimos recuperar el estado del pago. Intenta nuevamente.")
      } finally {
        if (recovery_requests.current.get(order_id) === controller) recovery_requests.current.delete(order_id)
        if (!current_unsaved_order_ids.current.includes(order_id)) {
          if (payment_locks.current.get(order_id) === release) release_payment_lock(order_id)
          else release?.()
        }
      }
    })()
  }, [commit_orders, release_payment_lock])

  useEffect(() => {
    const handle_storage = (event: StorageEvent): void => {
      if (event.storageArea !== window.localStorage || (event.key !== "space-shop-orders" && event.key !== null)) return
      const latest_orders = read_current_orders()
      if (!latest_orders) return
      current_orders.current = latest_orders
      set_orders(latest_orders)
    }
    window.addEventListener("storage", handle_storage)
    const generation = lifecycle_generation.current
    queueMicrotask(() => {
      if (generation !== lifecycle_generation.current) return
      const latest_orders = read_current_orders()
      if (!latest_orders) return
      current_orders.current = latest_orders
      set_orders(latest_orders)
    })
    const owned_locks = payment_locks.current
    const pending_recoveries = recovery_requests.current
    return () => {
      lifecycle_generation.current += 1
      window.removeEventListener("storage", handle_storage)
      for (const controller of pending_recoveries.values()) controller.abort()
      pending_recoveries.clear()
      for (const release of owned_locks.values()) release()
      owned_locks.clear()
    }
  }, [read_current_orders])

  useEffect(() => {
    for (const order of orders) {
      if (order.payment?.status === "PENDING") schedule_payment_recovery(order.id, order.payment.id)
    }
  }, [orders, schedule_payment_recovery])

  const context_value = useMemo<OrdersContextValue>(() => ({
    orders,
    is_creating_order,
    storage_error,
    notice,
    unsaved_order_ids,
    /**
     * Cierra el aviso de pedidos.
     * @returns No retorna ningún valor.
     */
    dismiss_notice: () => set_notice(null),
    /**
     * Reintenta guardar los resultados locales sobre la versión actual de los pedidos, sin ejecutar otro pago.
     * @returns true si se guardaron; false si no se pudo guardar.
     */
    retry_save_orders: () => commit_orders((state) => [...state]),
    /**
     * Obtiene un pedido por su identificador.
     * @param order_id Identificador del pedido.
     * @returns Pedido encontrado, o undefined si no existe.
     */
    get_order: (order_id: string) => current_orders.current.find((order) => order.id === order_id),
    /**
     * Crea y guarda un pedido con el consecutivo calculado bajo el bloqueo compartido.
     * Impide solicitudes repetidas de creación dentro de esta pestaña.
     * @param form_data Información del comprador y la entrega.
     * @param cart Líneas del carrito.
     * @returns Pedido guardado, o null si no se pudo crear o guardar.
     */
    create_order: async (form_data: CheckoutFormData, cart: CartItem[]) => {
      if (creating_order.current) return null
      creating_order.current = true
      set_is_creating_order(true)
      let new_order: OrderDetails | null = null
      try {
        const is_created = await commit_orders((state) => {
          new_order = create_order(form_data, cart, get_next_order_number(state))
          return new_order ? orders_reducer(state, { type: "add", order: new_order }) : state
        })
        return is_created ? new_order : null
      } finally {
        creating_order.current = false
        set_is_creating_order(false)
      }
    },
    /**
     * Cancela y guarda una orden pendiente solo si ninguna pestaña está procesando su pago.
     * @param order_id Identificador del pedido.
     * @returns true si la cancelación se guardó; false si no admite cancelación o no se pudo guardar.
     */
    cancel_order: async (order_id: string) => {
      if (current_unsaved_order_ids.current.includes(order_id) || payment_locks.current.has(order_id)) return false
      let release: (() => void) | null = null
      try {
        release = await acquire_order_payment_lock(order_id)
        if (!release) return false
        return await commit_orders((state) => orders_reducer(state, { type: "cancel", order_id }))
      } catch {
        set_notice("No pudimos cancelar la orden. Intenta nuevamente.")
        return false
      } finally {
        release?.()
      }
    },
    /**
     * Paga una orden bajo un bloqueo exclusivo compartido con las otras pestañas.
     * Guarda el inicio y el resultado sobre los pedidos actuales sin sobrescribir otras compras.
     * Conserva el bloqueo si el resultado final requiere reintentar únicamente su guardado.
     * @param order_id Identificador del pedido.
     * @param card_data Datos de la tarjeta, conservados solo durante esta operación.
     * @returns Resultado persistido, pendiente de guardar o rechazo de la solicitud.
     */
    pay_order: async (order_id: string, card_data: CardPaymentData): Promise<PayOrderResult> => {
      if (current_unsaved_order_ids.current.includes(order_id)) return { status: "rejected", message: "Guarda el resultado pendiente antes de continuar." }
      if (Object.keys(validate_card_payment_data(card_data)).length > 0) return { status: "rejected", message: "Revisa los datos de la tarjeta." }
      const generation = lifecycle_generation.current
      let release: (() => void) | null = null
      try {
        release = await acquire_order_payment_lock(order_id)
        if (!release) return { status: "rejected", message: "Ya hay un pago en proceso para esta orden." }
        if (generation !== lifecycle_generation.current) return { status: "rejected", message: "Este intento de pago ya no está vigente." }
        payment_locks.current.set(order_id, release)
        let payment_block = ""
        let payment: ReturnType<typeof create_order_payment> | null = null
        const is_started = await commit_orders((state) => {
          const order = state.find((current_order) => current_order.id === order_id)
          if (!order) {
            payment_block = "No encontramos la orden."
            return state
          }
          payment_block = get_order_payment_block(order) ?? ""
          if (payment_block) return state
          payment = create_order_payment(order)
          return orders_reducer(state, { type: "start_payment", order_id, payment })
        })
        if (!is_started || !payment) return { status: "rejected", message: payment_block || "No pudimos registrar el pago. Intenta nuevamente." }
        const current_payment = payment as ReturnType<typeof create_order_payment>
        let payment_result: PaymentResult
        try {
          payment_result = await process_payment(card_data, { total: current_payment.amount, currency: current_payment.currency })
        } catch {
          payment_result = { status: "ERROR", message: "La pasarela de pago no respondió. Intenta nuevamente." }
        }
        if (generation !== lifecycle_generation.current) return { status: "rejected", message: "Este intento de pago ya no está vigente." }
        const is_completed = await commit_orders((state) => orders_reducer(state, {
          type: "complete_payment", order_id, payment_id: current_payment.id, result: payment_result,
        }), order_id)
        if (!is_completed) return { status: "rejected", message: "No pudimos registrar el resultado del pago. Revisa el estado de la orden antes de continuar." }
        const is_saved = !current_unsaved_order_ids.current.includes(order_id)
        return {
          status: is_saved ? "processed" : "unsaved",
          payment: { ...current_payment, status: payment_result.status },
          message: is_saved ? payment_result.message : "No pudimos guardar el resultado del pago. Al reintentar no se realizará otro pago.",
        }
      } catch {
        return { status: "rejected", message: "Tu navegador no permite iniciar el pago. Intenta nuevamente en un navegador compatible." }
      } finally {
        if (!current_unsaved_order_ids.current.includes(order_id)) {
          if (payment_locks.current.get(order_id) === release) release_payment_lock(order_id)
          else release?.()
        }
      }
    },
  }), [orders, is_creating_order, storage_error, notice, unsaved_order_ids, commit_orders, release_payment_lock])

  return (
    <OrdersContext.Provider value={context_value}>
      {children}
    </OrdersContext.Provider>
  )
}
