import { useHits, useInstantSearch } from "react-instantsearch";
import { ProductCard } from "../product/ProductCard";
import type { ProductHit } from "../../types";

export function ProductGrid() {
  const { items } = useHits<ProductHit>();
  const { results, status } = useInstantSearch();

  if (status === "idle" && !results.__isArtificial && results.nbHits === 0) {
    return (
      <div role="status" className="rounded-lg border border-input px-4 py-12 text-center">
        <p className="font-medium">No hay productos disponibles</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Prueba otra búsqueda o ajusta los filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {items.map((hit) => (
        <ProductCard key={hit.objectID} hit={hit} />
      ))}
    </div>
  );
}
