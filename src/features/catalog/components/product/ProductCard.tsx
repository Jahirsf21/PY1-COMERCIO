import { Highlight } from "react-instantsearch";
import { Link } from "react-router-dom";
import { StarIcon } from "lucide-react";
import type { ProductHit } from "../../types";
import { ProductImagePreview } from "./ProductImagePreview";

export function ProductCard({ hit }: { hit: ProductHit }) {
  return (
    <ProductImagePreview image={hit.image} title={hit.title}>
      <p className="text-xs text-muted-foreground uppercase">{hit.brand}</p>
      <h2 className="text-sm font-medium">
        <Highlight attribute="title" hit={hit} />
      </h2>
      {hit.categories.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {hit.categories.join(" · ")}
        </p>
      )}
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
        {hit.currency} ₡{hit.b2c_price.toLocaleString("es-CR")}
      </p>
      <Link
        to={`/producto/${encodeURIComponent(hit.product_id)}?variante=${encodeURIComponent(hit.sku)}`}
        className="mt-auto inline-flex min-h-9 items-center justify-center rounded-full border border-input px-4 py-2 text-sm font-medium transition-colors hover:border-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ver detalles
      </Link>
    </ProductImagePreview>
  );
}
