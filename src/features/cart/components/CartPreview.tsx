import { Link } from "react-router-dom"
import { ShoppingCartIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { get_item_subtotal } from "@/lib/cart"
import { useCart } from "@/lib/context/useCart"

function formatPrice(value: number, currency: string) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency }).format(value)
}

export function CartPreview({ onClose }: { onClose: () => void }) {
  const { cart, subtotal, shipping, tax, total } = useCart()
  const currency = cart[0]?.currency ?? "CRC"

  return (
    <SheetContent
      side="right"
      showCloseButton={false}
      className="max-h-dvh gap-0 overflow-hidden p-0 data-[side=right]:h-dvh data-[side=right]:w-full data-[side=right]:sm:max-w-md motion-reduce:transition-none"
    >
      <SheetHeader className="shrink-0 border-b border-input pr-14">
        <SheetTitle>Carrito</SheetTitle>
      </SheetHeader>
      <SheetClose
        aria-label="Cerrar vista previa del carrito"
        render={<Button type="button" variant="ghost" size="icon" className="absolute top-3 right-3 cursor-pointer" />}
      >
        <XIcon aria-hidden="true" />
      </SheetClose>

      {cart.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <ShoppingCartIcon aria-hidden="true" className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Tu carrito está vacío</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Explora nuestro catálogo y agrega los productos que quieras comprar.
          </p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1 overflow-hidden">
          <ul aria-label="Productos en la vista previa del carrito" className="divide-y divide-input px-4">
            {cart.map((item) => (
              <li key={item.id} className="flex gap-3 py-4">
                <img
                  src={item.image.url}
                  alt={item.image.alt}
                  className="size-16 shrink-0 rounded-lg bg-muted object-contain"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/producto/${encodeURIComponent(item.product_id)}?${new URLSearchParams({ variante: item.sku, talla: item.selected_size })}`}
                    onClick={onClose}
                    className="rounded-sm font-medium leading-snug break-words hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">Talla: {item.selected_size}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-xs text-muted-foreground">Cantidad: {item.quantity}</span>
                    <span className="break-words text-sm font-semibold">
                      {formatPrice(get_item_subtotal(item), item.currency)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}

      <SheetFooter className="shrink-0 gap-4 border-t border-input pb-[max(1rem,env(safe-area-inset-bottom))]">
        {cart.length > 0 && (
          <dl className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="break-words font-medium">{formatPrice(subtotal, currency)}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Impuestos (13 %)</dt>
              <dd className="break-words font-medium">{formatPrice(tax, currency)}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">Envío</dt>
              <dd className="break-words font-medium">{shipping === 0 ? "Gratis" : formatPrice(shipping, currency)}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-input pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="break-words text-lg font-semibold">{formatPrice(total, currency)}</dd>
            </div>
          </dl>
        )}
        <div className="flex flex-col gap-2">
          <Link
            to="/carrito"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver carrito
          </Link>
          <SheetClose render={<Button type="button" variant="outline" className="h-10 cursor-pointer" />}>
            Seguir comprando
          </SheetClose>
        </div>
      </SheetFooter>
    </SheetContent>
  )
}
