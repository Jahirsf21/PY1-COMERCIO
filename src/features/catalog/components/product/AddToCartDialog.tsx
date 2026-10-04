import { useEffect, useId, useState } from "react"
import type { SubmitEvent } from "react"
import { Link } from "react-router-dom"
import { LoaderCircleIcon, ShoppingCartIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/ui/toast"
import { get_cart_item_id, get_product_unit_price } from "@/lib/cart"
import { useCart } from "@/lib/context/useCart"
import { getProductVariants } from "@/lib/getProductVariants"
import { getAvailableQuantityBySize, getSizesFromStock } from "@/lib/getProductStock"
import type { ProductHit, VariantsResult } from "@/lib/types/product"
import { cn } from "@/lib/utils"

export function AddToCartDialog({ hit }: { hit: ProductHit }) {
  const id = useId()
  const { cart, add_to_cart } = useCart()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<VariantsResult>()
  const [selectedSku, setSelectedSku] = useState(hit.sku)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true

    getProductVariants(hit.product_id)
      .then((variants) => {
        if (active) setResult({ productId: hit.product_id, variants, error: false })
      })
      .catch(() => {
        if (active) setResult({ productId: hit.product_id, variants: [], error: true })
      })

    return () => { active = false }
  }, [open, hit.product_id])

  const isLoading = result?.productId !== hit.product_id
  const variants = isLoading ? [] : result.variants
  const selectedVariant = variants.find((variant) => variant.sku === selectedSku) ?? variants[0]
  const preview = selectedVariant ?? hit
  const locations = selectedVariant?.b2c_stock_by_location ?? []
  const sizes = getSizesFromStock(locations)
  const availableSizes = sizes.filter((size) => getAvailableQuantityBySize(locations, size) > 0).length
  const availableQuantity = selectedSize ? getAvailableQuantityBySize(locations, selectedSize) : 0
  const cartQuantity = selectedVariant && selectedSize
    ? cart.find((item) => item.id === get_cart_item_id(selectedVariant.sku, selectedSize))?.quantity ?? 0
    : 0
  const canAdd = Boolean(selectedVariant && selectedSize && availableQuantity > cartQuantity && !isSubmitting)
  const priceFormatter = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: preview.currency,
    maximumFractionDigits: 0,
  })
  const detailParams = new URLSearchParams({ variante: preview.sku })
  if (selectedSize) detailParams.set("talla", selectedSize)

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return
    setOpen(nextOpen)
    if (nextOpen) {
      setResult(undefined)
      setSelectedSku(hit.sku)
      setSelectedSize(null)
      setError(null)
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedVariant || !selectedSize || !canAdd) return
    setIsSubmitting(true)
    setError(null)

    try {
      const accepted = await add_to_cart(selectedVariant, selectedSize)
      if (!accepted) {
        setError("No hay suficientes unidades disponibles de esta talla. Prueba otra talla o color.")
        return
      }
      setOpen(false)
      toast.add({ title: "Producto agregado al carrito", type: "success" })
    } catch {
      setError("No pudimos agregar el producto. Intenta nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          aria-label={`Agregar ${hit.title} al carrito`}
          render={<Button className="w-full cursor-pointer" size="lg" />}
        >
          <ShoppingCartIcon aria-hidden="true" />
          Agregar al carrito
        </DialogTrigger>
        <DialogContent showCloseButton={false} className="flex max-h-[90dvh] flex-col overflow-hidden p-5 sm:max-w-lg sm:p-6 motion-reduce:animate-none">
          <DialogHeader className="shrink-0 pr-10">
            <DialogTitle>Agregar al carrito</DialogTitle>
            <DialogDescription>Elige el color y la talla del producto.</DialogDescription>
          </DialogHeader>
          <DialogClose
            aria-label="Cerrar selección de producto"
            render={<Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 cursor-pointer" disabled={isSubmitting} />}
          >
            <XIcon aria-hidden="true" />
          </DialogClose>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5" aria-busy={isLoading || isSubmitting}>
            <ScrollArea className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="space-y-5 pr-3">
                <div className="flex items-start gap-4">
                  <img src={preview.image.url} alt={preview.image.alt} className="size-24 shrink-0 rounded-lg object-contain" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">{preview.brand}</p>
                    <p className="font-medium leading-snug">{preview.title}</p>
                    <Link
                      to={`/producto/${encodeURIComponent(preview.product_id)}?${detailParams}`}
                      aria-disabled={isSubmitting}
                      tabIndex={isSubmitting ? -1 : undefined}
                      className="inline-block rounded-sm text-sm underline underline-offset-4 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(event) => {
                        if (isSubmitting) event.preventDefault()
                        else setOpen(false)
                      }}
                    >
                      Ver todos los detalles del producto
                    </Link>
                  </div>
                </div>

                {isLoading && (
                  <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                    Cargando colores y tallas…
                  </p>
                )}
                {result?.error && (
                  <p role="alert" className="text-sm text-destructive">
                    No pudimos cargar las variantes. Cierra el modal y vuelve a intentarlo.
                  </p>
                )}
                {!isLoading && !result?.error && variants.length === 0 && (
                  <p role="alert" className="text-sm text-destructive">Este producto no tiene variantes disponibles.</p>
                )}

                <div className="space-y-4 border-t border-input pt-5">
                  <section aria-labelledby={`${id}-color-title`}>
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 id={`${id}-color-title`} className="font-medium">Selecciona un color</h3>
                      <span className="min-w-0 text-sm wrap-anywhere text-muted-foreground">{preview.facets.color}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {variants.map((variant) => (
                        <button
                          key={variant.objectID}
                          type="button"
                          aria-pressed={variant.sku === selectedVariant?.sku}
                          aria-label={`Color ${variant.facets.color}`}
                          title={variant.facets.color}
                          disabled={isSubmitting}
                          className={cn(
                            "cursor-pointer overflow-hidden rounded-lg border-2 bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
                            variant.sku === selectedVariant?.sku
                              ? "border-foreground"
                              : "border-transparent hover:border-ring",
                          )}
                          onClick={() => {
                            setSelectedSku(variant.sku)
                            setSelectedSize(null)
                            setError(null)
                          }}
                        >
                          <img src={variant.image.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </section>
                  <section aria-labelledby={`${id}-size-title`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 id={`${id}-size-title`} className="font-medium">Selecciona una talla</h3>
                      <span className="text-xs text-muted-foreground">{availableSizes} disponibles</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {sizes.map((size) => {
                        const isAvailable = getAvailableQuantityBySize(locations, size) > 0
                        return (
                          <button
                            key={size}
                            type="button"
                            aria-pressed={selectedSize === size}
                            aria-label={isAvailable ? size : `${size} · Agotada`}
                            disabled={!isAvailable || isSubmitting}
                            className={cn(
                              "min-h-12 cursor-pointer rounded-md border px-2 py-2 text-sm outline-none transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
                              selectedSize === size
                                ? "border-foreground bg-foreground text-background"
                                : "border-input",
                            )}
                            onClick={() => { setSelectedSize(size); setError(null) }}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-semibold">{priceFormatter.format(get_product_unit_price(preview))}</p>
                  {preview.on_discount && preview.b2c_discount && (
                    <p className="text-sm text-muted-foreground">
                      <span className="line-through">{priceFormatter.format(preview.b2c_price)}</span> · {preview.b2c_discount.percentage}% de descuento
                    </p>
                  )}
                  {!isLoading && selectedVariant && (
                    <p className="text-sm text-muted-foreground">
                      {!selectedSize
                        ? sizes.length > 0 ? "Selecciona una talla para agregar el producto." : "Este color no tiene tallas disponibles."
                        : availableQuantity <= 0
                          ? "Esta talla está agotada."
                          : cartQuantity >= availableQuantity
                            ? `No puedes añadir más al carrito — tenemos ${availableQuantity} ${availableQuantity === 1 ? "unidad disponible" : "unidades disponibles"} y ya has añadido ${cartQuantity} ${cartQuantity === 1 ? "unidad" : "unidades"} a tu carrito.`
                            : `${availableQuantity} ${availableQuantity === 1 ? "unidad disponible" : "unidades disponibles"}`}
                    </p>
                  )}
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </div>
            </ScrollArea>

            <DialogFooter className="m-0 shrink-0 border-0 bg-transparent p-0 pt-1">
              <DialogClose render={<Button type="button" variant="outline" size="lg" className="cursor-pointer" disabled={isSubmitting} />}>
                Cancelar
              </DialogClose>
              <Button type="submit" size="lg" className="cursor-pointer" disabled={!canAdd}>
                {isSubmitting ? <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <ShoppingCartIcon aria-hidden="true" />}
                {isSubmitting ? "Agregando…" : "Agregar al carrito"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
