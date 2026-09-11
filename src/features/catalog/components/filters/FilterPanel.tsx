import { FilterSection } from "./FilterSection";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { RefinementFilter } from "./RefinementFilter";

export function FilterPanel() {
  return (
    <div className="space-y-4 py-1 pl-1 pr-4">
      <FilterSection title="Categorías">
        <RefinementFilter attribute="categories" />
      </FilterSection>
      <FilterSection title="Precio">
        <PriceRangeFilter />
      </FilterSection>
      <FilterSection title="Marca">
        <RefinementFilter attribute="brand" />
      </FilterSection>
      <FilterSection title="Género">
        <RefinementFilter attribute="facets.gender" />
      </FilterSection>
      <FilterSection title="Talla">
        <RefinementFilter attribute="facets.size" />
      </FilterSection>
      <FilterSection title="Color">
        <RefinementFilter attribute="facets.color" />
      </FilterSection>
      <FilterSection title="Uso recomendado">
        <RefinementFilter attribute="facets.recommend_use" />
      </FilterSection>
      <FilterSection title="En Descuento">
        <RefinementFilter
          attribute="on_discount"
          transformItems={(items) =>
            items.map((item) => ({
              ...item,
              label: item.label === "true" ? "Con Descuento" : "Sin Descuento",
            }))
          }
        />
      </FilterSection>
      <FilterSection title="Provincias">
        <RefinementFilter attribute="provinces" />
      </FilterSection>
    </div>
  );
}
