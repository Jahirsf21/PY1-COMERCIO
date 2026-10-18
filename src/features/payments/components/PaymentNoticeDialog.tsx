import { useRef, useState } from "react"
import { LoaderCircleIcon, TriangleAlertIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"

type PaymentNoticeDialogProps = {
  open: boolean
  title: string
  message: string
  on_open_change: (open: boolean) => void
  on_retry?: () => Promise<boolean>
}

/**
 * Presenta un aviso de pago fuera del formulario mediante un Dialog con el Alert existente.
 * El reintento opcional corresponde únicamente al guardado del resultado, nunca a un nuevo pago.
 * @param props Estado, contenido y acciones del aviso.
 * @returns Aviso emergente con cierre y, cuando corresponde, la opción Reintentar.
 */
export function PaymentNoticeDialog({ open, title, message, on_open_change, on_retry }: PaymentNoticeDialogProps) {
  const retrying = useRef(false)
  const [is_retrying, set_is_retrying] = useState(false)

  /**
   * Reintenta la acción de guardado y cierra el aviso solo cuando termina correctamente.
   * @returns Promesa que termina al recibir el resultado del guardado.
   */
  async function retry_save(): Promise<void> {
    if (!on_retry || retrying.current) return
    retrying.current = true
    set_is_retrying(true)
    try {
      if (await on_retry()) on_open_change(false)
    } catch {
      return
    } finally {
      retrying.current = false
      set_is_retrying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={on_open_change}>
      <DialogContent showCloseButton={false} className="motion-reduce:animate-none">
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle><DialogTitle>{title}</DialogTitle></AlertTitle>
          <AlertDescription><DialogDescription>{message}</DialogDescription></AlertDescription>
        </Alert>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant={on_retry ? "outline" : "default"} disabled={is_retrying} className="cursor-pointer" />}>
            {on_retry ? "Cerrar" : "Aceptar"}
          </DialogClose>
          {on_retry && (
            <Button type="button" onClick={() => { void retry_save() }} disabled={is_retrying} className="cursor-pointer">
              {is_retrying && <LoaderCircleIcon aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
              {is_retrying ? "Guardando…" : "Reintentar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
