import { Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { useCart } from "@/lib/context/useCart"
import type { CartItem } from "@/lib/types/cart"

type RemoveCartItemDialogProps = {
  item: CartItem
}

/**
 * Botón para eliminar una línea del carrito que pide confirmación antes de hacerlo.
 * Si la persona cancela o cierra el cuadro, el producto permanece en el carrito.
 */
export function RemoveCartItemDialog({ item }: RemoveCartItemDialogProps) {
  const { remove_item } = useCart()

  /**
   * Elimina la línea del carrito y confirma la acción con un aviso.
   */
  function handleConfirm() {
    remove_item(item.id)
    toast.add({
      title: "Producto eliminado del carrito",
      description: `${item.title} · Talla ${item.selected_size}`,
      type: "success",
    })
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" className="shrink-0 cursor-pointer text-muted-foreground hover:text-destructive" />}
      >
        <Trash2Icon aria-hidden="true" />
        Eliminar<span className="sr-only"> {item.title} del carrito</span>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="motion-reduce:animate-none">
        <DialogHeader>
          <DialogTitle>¿Está seguro de que desea eliminar este producto?</DialogTitle>
          <DialogDescription>
            {item.title} · Talla {item.selected_size}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="cursor-pointer" />}>
            Cancelar
          </DialogClose>
          <Button type="button" variant="destructive" className="cursor-pointer" onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
