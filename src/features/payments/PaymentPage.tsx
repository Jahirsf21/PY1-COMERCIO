import { useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ShopHeader } from "@/components/shop-header"
import { OrderProducts } from "@/features/orders/components/OrderProducts"
import { PaymentForm } from "@/features/payments/components/PaymentForm"
import { PaymentOrderSummary } from "@/features/payments/components/PaymentOrderSummary"
import { PaymentNoticeDialog } from "@/features/payments/components/PaymentNoticeDialog"
import { get_order_payment_block } from "@/lib/orders/orders"
import { useOrders } from "@/lib/orders/ordersContext"
import type { PayOrderResult } from "@/lib/orders/types"
import type { PaymentStatus } from "@/lib/payments/types"

type PaymentFeedback = {
  key: string
  order_id: string
  payment_id: string | null
  payment_status: PaymentStatus | null
  title: string
  message: string
}

/**
 * Muestra el pago y la confirmación de una orden recuperada mediante su identificador.
 * Usa la orden guardada para funcionar al recargar o con el carrito vacío.
 * Permite reintentar el guardado de un resultado sin repetir el pago ni anunciar una confirmación todavía no persistida.
 * Reemplaza la ruta de pago por el detalle cuando la orden ya está confirmada o cancelada y guardada.
 * @returns Página de pago, confirmación o aviso si la orden no está disponible.
 */
export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { get_order, storage_error, notice, dismiss_notice, unsaved_order_ids, retry_save_orders } = useOrders()
  const [feedback, set_feedback] = useState<PaymentFeedback | null>(null)
  const [dismissed_notice_key, set_dismissed_notice_key] = useState<string | null>(null)
  const order = orderId ? get_order(orderId) : undefined
  const has_unsaved_result = order !== undefined && unsaved_order_ids.includes(order.id)
  const is_confirmed = !has_unsaved_result && order?.status === "CONFIRMED" && order.payment?.status === "APPROVE"
  const is_blocked = order && (order.status !== "PENDING" || order.payment?.status === "APPROVE")
  const current_feedback = !is_confirmed && !is_blocked && feedback?.order_id === order?.id &&
    feedback?.payment_id === (order?.payment?.id ?? null) && feedback?.payment_status === (order?.payment?.status ?? null) ? feedback : null
  const current_notice = has_unsaved_result ? {
    key: `unsaved:${order.id}:${order.payment?.id}:${order.payment?.status}`,
    title: "Resultado pendiente de guardar",
    message: "No pudimos guardar el resultado del pago. Al reintentar no se realizará otro pago.",
  } : current_feedback ? current_feedback
    : order?.payment?.status === "DECLINED" || order?.payment?.status === "ERROR" ? {
      key: `payment:${order.id}:${order.payment.id}:${order.payment.status}`,
      title: order.payment.status === "DECLINED" ? "Pago rechazado" : "No se pudo completar el pago",
      message: order.payment.status === "DECLINED" ? "Revisa los datos de tu tarjeta o utiliza otra para reintentar."
        : "El pago se interrumpió o no pudo completarse. Puedes intentarlo nuevamente.",
    } : storage_error ? {
      key: "storage",
      title: "No pudimos guardar o recuperar tus pedidos",
      message: "Revisa los permisos de almacenamiento de tu navegador antes de continuar.",
    } : notice ? { key: `notice:${notice}`, title: "Revisa tus pedidos", message: notice } : null

  /**
   * Presenta los resultados no aprobados en un aviso emergente asociado al intento vigente.
   * Los resultados sin guardar se muestran mediante el estado compartido de pedidos.
   * @param result Resultado recibido del servicio.
   * @returns No retorna ningún valor.
   */
  function handle_payment_result(result: PayOrderResult): void {
    if (!orderId || result.status === "unsaved" || (result.status === "processed" && result.payment.status === "APPROVE")) return
    const current_order = get_order(orderId)
    set_feedback({
      key: crypto.randomUUID(),
      order_id: orderId,
      payment_id: result.status === "rejected" ? current_order?.payment?.id ?? null : result.payment.id,
      payment_status: result.status === "rejected" ? current_order?.payment?.status ?? null : result.payment.status,
      title: result.status === "rejected" ? "No pudimos iniciar el pago" : result.payment.status === "DECLINED" ? "Pago rechazado" : "No se pudo completar el pago",
      message: result.message,
    })
  }

  /**
   * Cierra el aviso actual sin modificar el estado ni el resultado del pago.
   * @param open Indica si el cuadro debe permanecer abierto.
   * @returns No retorna ningún valor.
   */
  function change_notice_open(open: boolean): void {
    if (open || !current_notice) return
    set_dismissed_notice_key(current_notice.key)
    if (current_notice.key.startsWith("notice:")) dismiss_notice()
  }

  if (order && !has_unsaved_result && (is_confirmed || order.status === "CANCELLED")) {
    return <Navigate to={`/pedido/${encodeURIComponent(order.id)}`} replace />
  }

  return (
    <div className="min-h-dvh bg-background">
      <ShopHeader sticky />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
        {!order ? (
          <section className="rounded-xl border border-input bg-card p-6">
            <h1 className="text-2xl font-semibold">No encontramos esta orden</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verifica el enlace y utiliza el navegador donde realizaste la compra.
            </p>
          </section>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Pago de tu orden</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <p className="text-muted-foreground">Orden #{order.order_number}</p>
              <Link to={`/pedido/${encodeURIComponent(order.id)}`} className="rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Ver pedido
              </Link>
            </div>
            <div className="mt-6 space-y-6">
              <div className="grid items-start gap-6 lg:grid-cols-2">
                {has_unsaved_result ? (
                  <section aria-labelledby="payment-save-title" className="rounded-xl border border-input bg-card p-5 sm:p-6">
                    <h2 id="payment-save-title" className="text-lg font-semibold">Confirmación pendiente</h2>
                    <Button type="button" onClick={() => set_dismissed_notice_key(null)} className="mt-6 cursor-pointer">
                      Ver aviso
                    </Button>
                  </section>
                ) : is_blocked ? (
                  <section className="rounded-xl border border-input bg-card p-5 sm:p-6">
                    <h2 className="text-lg font-semibold">Esta orden no admite pagos</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{get_order_payment_block(order)}</p>
                  </section>
                ) : (
                  <PaymentForm
                    key={order.id}
                    order={order}
                    on_result={handle_payment_result}
                    on_error={() => handle_payment_result({ status: "rejected", message: "No pudimos completar el pago. Revisa el estado de tu orden antes de continuar." })}
                  />
                )}
                <PaymentOrderSummary order={order} />
              </div>
              <OrderProducts key={order.id} order={order} />
            </div>
          </>
        )}
      </main>
      <PaymentNoticeDialog
        open={current_notice !== null && dismissed_notice_key !== current_notice.key}
        title={current_notice?.title ?? "Aviso del pago"}
        message={current_notice?.message ?? ""}
        on_open_change={change_notice_open}
        on_retry={has_unsaved_result ? retry_save_orders : undefined}
      />
    </div>
  )
}
