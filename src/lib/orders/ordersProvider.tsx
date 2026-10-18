import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { CartItem } from "@/lib/cart/types"
import type { CheckoutFormData } from "@/lib/checkout/types"
import type { OrderAction, OrderDetails, OrdersContextValue, PayOrderResult } from "@/lib/orders/types"
import type { CardPaymentData, PaymentResult } from "@/lib/payments/types"
import { create_order, create_order_payment, get_next_order_number, get_order_payment_block, get_stored_orders, orders_reducer, recover_interrupted_payments, save_orders } from "@/lib/orders/orders"
import { process_payment, validate_card_payment_data } from "@/lib/payments/payments"
import OrdersContext from "@/lib/orders/ordersContext"

/**
 * Obtiene los pedidos guardados y cambia a ERROR los pagos interrumpidos mediante recover_interrupted_payments().
 * @returns Pedidos recuperados.
 *   orders: pedidos válidos con los pagos interrumpidos en ERROR.
 *   discarded_orders: true si se descartó algún pedido.
 *   storage_error: true si el navegador impide leer localStorage.
 *   recovered_order_ids: identificadores de los pedidos cuyos pagos interrumpidos cambiaron a ERROR y deben guardarse.
 */
function get_initial_orders() {
  const stored_snapshot = get_stored_orders()
  const orders = recover_interrupted_payments(stored_snapshot.orders)
  const recovered_order_ids = stored_snapshot.orders.filter((order) => order.payment?.status === "PENDING").map((order) => order.id)
  return { ...stored_snapshot, orders, recovered_order_ids }
}

/**
 * Provee los pedidos y sus acciones a los componentes descendientes.
 * Recupera los pedidos de localStorage y los guarda al aplicar cada acción.
 * @param props Propiedades del proveedor.
 * @param props.children Componentes que consumen el contexto.
 * @returns Proveedor del contexto de pedidos.
 */
export function OrdersProvider({ children }: { children: ReactNode }) {
  const [initial_orders] = useState(get_initial_orders)
  const [orders, set_orders] = useState(initial_orders.orders)
  const current_orders = useRef(orders)
  const [storage_error, set_storage_error] = useState(initial_orders.storage_error)
  const [notice, set_notice] = useState<string | null>(initial_orders.discarded_orders ? "No pudimos recuperar algunos de tus pedidos." : null)
  const [unsaved_order_ids, set_unsaved_order_ids] = useState(initial_orders.recovered_order_ids)
  const current_unsaved_order_ids = useRef(unsaved_order_ids)

  /**
   * Guarda los pedidos y retira los bloqueos de guardado si la escritura es exitosa.
   * @param orders_to_save Pedidos que se desean guardar.
   * @returns true si se guardaron; false si el navegador rechazó la escritura.
   */
  const persist_orders = useCallback((orders_to_save: OrderDetails[]): boolean => {
    const is_saved = save_orders(orders_to_save)
    set_storage_error(!is_saved)
    if (is_saved && current_unsaved_order_ids.current.length > 0) {
      current_unsaved_order_ids.current = []
      set_unsaved_order_ids([])
    }
    return is_saved
  }, [])

  useEffect(() => {
    if (initial_orders.recovered_order_ids.length === 0 || initial_orders.storage_error) return
    let is_effect_active = true
    queueMicrotask(() => {
      if (is_effect_active) persist_orders(current_orders.current)
    })
    return () => { is_effect_active = false }
  }, [initial_orders, persist_orders])

  /**
   * Aplica una acción a los pedidos mediante orders_reducer(), la guarda en localStorage y actualiza el estado.
   * Si require_save es true y no se puede guardar, descarta el cambio.
   * Si es false, conserva el resultado en memoria y bloquea el pedido hasta guardarlo correctamente.
   * @param action Acción que se desea aplicar.
   * @param require_save Indica si el cambio solo se aplica cuando se guarda; por defecto, true.
   * @returns true si los pedidos cambiaron; false si no hubo cambios o no se pudo guardar un cambio que lo requería.
   */
  const apply_action = useCallback((action: OrderAction, require_save = true): boolean => {
    const next_orders = orders_reducer(current_orders.current, action)
    if (next_orders === current_orders.current) return false
    const is_saved = persist_orders(next_orders)
    if (!is_saved && require_save) return false
    if (!is_saved) {
      const order_id = action.type === "add" ? action.order.id : action.order_id
      const next_unsaved_order_ids = [...new Set([...current_unsaved_order_ids.current, order_id])]
      current_unsaved_order_ids.current = next_unsaved_order_ids
      set_unsaved_order_ids(next_unsaved_order_ids)
    }
    current_orders.current = next_orders
    set_orders(next_orders)
    return true
  }, [persist_orders])

  const context_value = useMemo<OrdersContextValue>(() => ({
    orders,
    storage_error,
    notice,
    unsaved_order_ids,
    /**
     * Cierra el aviso de los pedidos.
     * @returns No retorna ningún valor.
     */
    dismiss_notice: () => set_notice(null),
    /**
     * Reintenta guardar los pedidos actuales sin ejecutar otro pago.
     * @returns true si se guardaron; false si el navegador rechazó la escritura.
     */
    retry_save_orders: () => persist_orders(current_orders.current),
    /**
     * Obtiene un pedido por su identificador.
     * @param order_id Identificador del pedido.
     * @returns Pedido encontrado, o undefined si no existe.
     */
    get_order: (order_id: string) => current_orders.current.find((order) => order.id === order_id),
    /**
     * Crea un pedido con el siguiente número consecutivo y lo agrega a los pedidos solo si se guarda en localStorage.
     * @param form_data Información del comprador y la entrega.
     * @param cart Líneas del carrito.
     * @returns Pedido creado y guardado, o null si no se pudo crear o guardar.
     */
    create_order: (form_data: CheckoutFormData, cart: CartItem[]) => {
      const new_order = create_order(form_data, cart, get_next_order_number(current_orders.current))
      if (!new_order) return null
      return apply_action({ type: "add", order: new_order }, true) ? new_order : null
    },
    /**
     * Cancela un pedido pendiente y conserva sus productos fuera del carrito.
     * Impide cancelar si su resultado de pago todavía no se ha guardado.
     * @param order_id Identificador del pedido.
     * @returns true si la cancelación se guardó; false si el pedido no admite cancelación o no se pudo guardar.
     */
    cancel_order: (order_id: string) => {
      if (current_unsaved_order_ids.current.includes(order_id)) return false
      return apply_action({ type: "cancel", order_id })
    },
    /**
     * Paga un pedido con el sandbox de pagos.
     * 1. Busca el pedido guardado y comprueba que admita un pago mediante get_order_payment_block().
     * 2. Valida los datos de la tarjeta mediante validate_card_payment_data().
     * 3. Crea y guarda un pago PENDING por el total y la moneda del pedido guardado.
     * 4. Procesa el pago mediante process_payment().
     * 5. Registra el resultado; el pedido cambia a CONFIRMED si el pago se aprueba y sigue en PENDING si se rechaza o falla.
     * 6. Si falla el guardado final, conserva el resultado en memoria e impide nuevos intentos hasta guardarlo.
     * @param order_id Identificador del pedido.
     * @param card_data Datos de la tarjeta.
     * @returns Resultado del pago.
     *   processed: pago con su estado final y el mensaje del sandbox.
     *   unsaved: resultado conservado en memoria que requiere reintentar su guardado, no el pago.
     *   rejected: mensaje si el pago no se inició o su respuesta ya no corresponde al pago vigente.
     */
    pay_order: async (order_id: string, card_data: CardPaymentData): Promise<PayOrderResult> => {
      const order = current_orders.current.find((current_order) => current_order.id === order_id)
      if (!order) return { status: "rejected", message: "No encontramos la orden." }
      if (current_unsaved_order_ids.current.includes(order_id)) return { status: "rejected", message: "Guarda el resultado pendiente antes de continuar." }
      const payment_block = get_order_payment_block(order)
      if (payment_block) return { status: "rejected", message: payment_block }
      if (Object.keys(validate_card_payment_data(card_data)).length > 0) return { status: "rejected", message: "Revisa los datos de la tarjeta." }

      const payment = create_order_payment(order)
      if (!apply_action({ type: "start_payment", order_id, payment }, true)) {
        return { status: "rejected", message: "No pudimos registrar el pago. Revisa que tu navegador permita guardar datos e intenta nuevamente." }
      }

      let payment_result: PaymentResult
      try {
        payment_result = await process_payment(card_data, { total: payment.amount, currency: payment.currency })
      } catch {
        payment_result = { status: "ERROR", message: "La pasarela de pago no respondió. Intenta nuevamente." }
      }
      if (!apply_action({ type: "complete_payment", order_id, payment_id: payment.id, result: payment_result }, false)) {
        return { status: "rejected", message: "Este intento de pago ya no está vigente." }
      }
      const is_saved = !current_unsaved_order_ids.current.includes(order_id)
      return {
        status: is_saved ? "processed" : "unsaved",
        payment: { ...payment, status: payment_result.status },
        message: is_saved ? payment_result.message : "No pudimos guardar el resultado del pago. Intenta guardarlo nuevamente.",
      }
    },
  }), [orders, storage_error, notice, unsaved_order_ids, apply_action, persist_orders])

  return (
    <OrdersContext.Provider value={context_value}>
      {children}
    </OrdersContext.Provider>
  )
}
