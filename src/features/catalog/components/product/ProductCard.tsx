import { Highlight } from "react-instantsearch"
import { Link } from "react-router-dom"
import { StarIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProductHit } from "@/lib/types/product"
import { ProductImagePreview } from "@/features/catalog/components/product/ProductImagePreview"
import { AddToCartDialog } from "@/features/catalog/components/product/AddToCartDialog"
import { format_price } from "@/lib/utils"
import { get_product_unit_price } from "@/lib/cart"

export function ProductCard({ hit }: { hit: ProductHit }) {
  return (
    <Card className="gap-2 pt-4 transition-[border-color,box-shadow] duration-150 hover:border-ring hover:shadow-md motion-reduce:transition-none">
      <CardContent>
        <ProductImagePreview image={hit.image} title={hit.title} />
      </CardContent>
      <CardHeader className="gap-2">
        <CardDescription className="text-xs uppercase">{hit.brand}</CardDescription>
        <CardTitle className="text-sm font-medium">
          <h2>
            <Highlight attribute="title" hit={hit} />
          </h2>
        </CardTitle>
        {hit.categories.length > 0 && (
          <CardDescription className="text-xs">
            {hit.categories.join(" · ")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        <p
          className="flex items-center gap-1 text-sm font-medium"
          aria-label={`Calificación: ${hit.rating} de 5`}
        >
          <StarIcon
            aria-hidden="true"
            className="size-4 fill-amber-400 text-amber-500"
          />
          {hit.rating}
        </p>
        <p className="text-sm font-semibold">
          {format_price(get_product_unit_price(hit), hit.currency)}
        </p>
        {hit.on_discount && hit.b2c_discount && (
          <p className="text-xs text-muted-foreground">
            <span className="line-through">{format_price(hit.b2c_price, hit.currency)}</span> · {hit.b2c_discount.percentage}% de descuento
          </p>
        )}
      </CardContent>
      <CardFooter className="mt-auto flex-col gap-2">
        <AddToCartDialog hit={hit} />
        <Link
          to={`/producto/${encodeURIComponent(hit.product_id)}?variante=${encodeURIComponent(hit.sku)}`}
          className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium transition-colors hover:border-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver detalles
        </Link>
      </CardFooter>
    </Card>
  );
}
