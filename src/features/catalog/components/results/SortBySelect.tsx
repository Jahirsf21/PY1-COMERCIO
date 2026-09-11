import { useId } from "react";
import { useSortBy } from "react-instantsearch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { algolia_indices } from "@/lib/searchClient";

const SORT_ITEMS = [
  { label: "Relevancia", value: algolia_indices.main },
  { label: "Precio: menor a mayor", value: algolia_indices.priceAsc },
  { label: "Precio: mayor a menor", value: algolia_indices.priceDesc },
];

export function SortBySelect() {
  const id = useId();
  const { currentRefinement, options, refine } = useSortBy({ items: SORT_ITEMS });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label id={`${id}-label`} htmlFor={id}>Ordenar por</Label>
      <Select
        items={options}
        value={currentRefinement}
        onValueChange={(value) => value !== null && refine(value)}
      >
        <SelectTrigger
          id={id}
          size="sm"
          className="w-52"
          aria-labelledby={`${id}-label`}
        >
          <SelectValue placeholder="Selecciona el orden" />
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          side="bottom"
          align="end"
          className="w-52"
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
