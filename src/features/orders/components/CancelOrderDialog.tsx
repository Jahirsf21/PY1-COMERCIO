import { useRef, useState } from "react"
import { LoaderCircleIcon, TriangleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { useOrders } from "@/lib/orders/ordersContext"
import type { OrderDetails } from "@/lib/orders/types"

type CancelOrderDialogProps = {
  order: OrderDetails
}

/**
 * Solicita confirmación antes de cancelar un pedido mediante el servicio de órdenes.
 * Conserva el cuadro abierto y muestra un error si no se puede guardar la cancelación.
 * @param props Propiedades del cuadro de cancelación.
 * @param props.order Pedido pendiente que se desea cancelar.
 * @returns Acción de cancelación y cuadro de confirmación.
 */
export function CancelOrderDialog({ order }: CancelOrderDialogProps) {
  const { cancel_order } = useOrders()
  const [open, set_open] = useState(false)
  const [is_cancelling, set_is_cancelling] = useState(false)
  const [error_message, set_error_message] = useState<string | null>(null)
  const cancelling = useRef(false)

  /**
   * Cancela el pedido una sola vez y anuncia el éxito únicamente si se guarda correctamente.
   * @returns Promesa que termina al recibir el resultado de la cancelación.
   */
  async function confirm_cancellation(): Promise<void> {
    if (cancelling.current) return
    cancelling.current = true
    set_is_cancelling(true)
    set_error_message(null)
    try {
      if (!await cancel_order(order.id)) {
        set_error_message("No pudimos cancelar el pedido. Revisa su estado e intenta nuevamente.")
        return
      }
      set_open(false)
      toast.add({ title: `Pedido #${order.order_number} cancelado`, type: "success" })
    } catch {
      set_error_message("No pudimos cancelar el pedido. Intenta nuevamente.")
    } finally {
      cancelling.current = false
      set_is_cancelling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next_open) => {
      if (cancelling.current) return
      set_open(next_open)
      if (next_open) set_error_message(null)
    }}>
      <DialogTrigger render={<Button type="button" variant="outline" className="cursor-pointer text-destructive" />}>
        Cancelar pedido
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="motion-reduce:animate-none">
        <DialogHeader>
          <DialogTitle>¿Cancelar el pedido #{order.order_number}?</DialogTitle>
          <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>
        {error_message && (
          <Alert variant="destructive">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertDescription>{error_message}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={is_cancelling} className="cursor-pointer" />}>
            Volver
          </DialogClose>
          <Button type="button" variant="destructive" disabled={is_cancelling} className="cursor-pointer" onClick={() => { void confirm_cancellation() }}>
            {is_cancelling && <LoaderCircleIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
            {is_cancelling ? "Cancelando…" : "Cancelar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
