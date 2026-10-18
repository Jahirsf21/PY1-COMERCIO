import { InfoIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useOrders } from "@/lib/orders/ordersContext"

/**
 * Informa problemas de almacenamiento o recuperación al consultar los pedidos.
 * @returns Avisos de pedidos, o null si no hay problemas que mostrar.
 */
export function OrdersNotice() {
  const { storage_error, notice, dismiss_notice } = useOrders()
  if (!storage_error && !notice) return null

  return (
    <div className="mb-6 space-y-3">
      {storage_error && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos guardar o recuperar tus pedidos</AlertTitle>
          <AlertDescription>Revisa los permisos de almacenamiento de tu navegador.</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertTitle>Revisa tus pedidos</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
          <AlertAction>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar aviso de pedidos" className="cursor-pointer" onClick={dismiss_notice}>
              <XIcon aria-hidden="true" />
            </Button>
          </AlertAction>
        </Alert>
      )}
    </div>
  )
}
