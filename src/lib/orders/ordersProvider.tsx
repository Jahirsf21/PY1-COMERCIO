import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { CartItem } from "@/lib/cart/types"
import type { CheckoutFormData } from "@/lib/checkout/types"
import type { OrderAction, OrdersContextValue, OrderStatus, PayOrderResult } from "@/lib/orders/types"
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
 *   has_recovered_payments: true si se cambió algún pago a ERROR.
 */
function get_initial_orders() {
  const stored_snapshot = get_stored_orders()
  const orders = recover_interrupted_payments(stored_snapshot.orders)
  return { ...stored_snapshot, orders, has_recovered_payments: orders !== stored_snapshot.orders }
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

  useEffect(() => {
    if (!initial_orders.has_recovered_payments || initial_orders.storage_error) return
    queueMicrotask(() => set_storage_error(!save_orders(current_orders.current)))
  }, [initial_orders])

  /**
   * Aplica una acción a los pedidos mediante orders_reducer(), la guarda en localStorage y actualiza el estado.
   * Si require_save es true y no se puede guardar, descarta el cambio.
   * @param action Acción que se desea aplicar.
   * @param require_save Indica si el cambio solo se aplica cuando se guarda; por defecto, false.
   * @returns true si los pedidos cambiaron; false si no hubo cambios o no se pudo guardar un cambio que lo requería.
   */
  const apply_action = useCallback((action: OrderAction, require_save = false): boolean => {
    const next_orders = orders_reducer(current_orders.current, action)
    if (next_orders === current_orders.current) return false
    const is_saved = save_orders(next_orders)
    set_storage_error(!is_saved)
    if (!is_saved && require_save) return false
    current_orders.current = next_orders
    set_orders(next_orders)
    return true
  }, [])

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
     * Actualiza el estado de un pedido sin confirmarlo, mediante set_order_status().
     * @param order_id Identificador del pedido.
     * @param status Estado nuevo.
     * @returns true si el estado cambió.
     */
    update_order_status: (order_id: string, status: OrderStatus) => {
      return apply_action({ type: "set_status", order_id, status })
    },
    /**
     * Paga un pedido con el sandbox de pagos.
     * 1. Busca el pedido guardado y comprueba que admita un pago mediante get_order_payment_block().
     * 2. Valida los datos de la tarjeta mediante validate_card_payment_data().
     * 3. Crea y guarda un pago PENDING por el total y la moneda del pedido guardado.
     * 4. Procesa el pago mediante process_payment().
     * 5. Registra el resultado; el pedido cambia a CONFIRMED si el pago se aprueba y sigue en PENDING si se rechaza o falla.
     * @param order_id Identificador del pedido.
     * @param card_data Datos de la tarjeta.
     * @returns Resultado del pago.
     *   processed: pago con su estado final y el mensaje del sandbox.
     *   rejected: mensaje si el pago no se inició o su respuesta ya no corresponde al pago vigente.
     */
    pay_order: async (order_id: string, card_data: CardPaymentData): Promise<PayOrderResult> => {
      const order = current_orders.current.find((current_order) => current_order.id === order_id)
      if (!order) return { status: "rejected", message: "No encontramos la orden." }
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
      if (!apply_action({ type: "complete_payment", order_id, payment_id: payment.id, result: payment_result })) {
        return { status: "rejected", message: "Este intento de pago ya no está vigente." }
      }
      return { status: "processed", payment: { ...payment, status: payment_result.status }, message: payment_result.message }
    },
  }), [orders, storage_error, notice, apply_action])

  return (
    <OrdersContext.Provider value={context_value}>
      {children}
    </OrdersContext.Provider>
  )
}
