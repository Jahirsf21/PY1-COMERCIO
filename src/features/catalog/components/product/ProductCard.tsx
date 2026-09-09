import { Highlight } from "react-instantsearch";
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
      <p className="text-sm font-semibold">
        {hit.currency} {hit.b2c_price.toLocaleString("es-CR")}
      </p>
    </ProductImagePreview>
  );
}
