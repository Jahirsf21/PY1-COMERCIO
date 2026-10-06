import { useId } from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { ArrowUpDownIcon } from "lucide-react"
import { useSortBy } from "react-instantsearch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { algolia_indices } from "@/lib/searchClient"

const SORT_ITEMS = [
  { label: "Relevancia", value: algolia_indices.main },
  { label: "Precio: menor a mayor", value: algolia_indices.priceAsc },
  { label: "Precio: mayor a menor", value: algolia_indices.priceDesc },
];

export function SortBySelect({ floating = false }: { floating?: boolean }) {
  const id = useId();
  const { currentRefinement, options, refine } = useSortBy({ items: SORT_ITEMS });

  return (
    <div className={floating ? "" : "hidden flex-wrap items-center gap-2 lg:flex"}>
      <Label id={`${id}-label`} htmlFor={id} className={floating ? "sr-only" : undefined}>Ordenar por</Label>
      <Select
        items={options}
        value={currentRefinement}
        onValueChange={(value) => value !== null && refine(value)}
      >
        {floating ? (
          <SelectPrimitive.Trigger
            id={id}
            aria-labelledby={`${id}-label ${id}-value`}
            render={
              <Button className="h-10 w-full cursor-pointer gap-1.5 rounded-full px-4 text-xs shadow-lg hover:shadow-xl motion-reduce:transition-none" />
            }
          >
            <ArrowUpDownIcon aria-hidden="true" className="size-3.5" />
            Ordenar
            <SelectValue id={`${id}-value`} className="sr-only" />
          </SelectPrimitive.Trigger>
        ) : (
          <SelectTrigger
            id={id}
            size="sm"
            className="w-52"
            aria-labelledby={`${id}-label`}
          >
            <SelectValue placeholder="Selecciona el orden" />
          </SelectTrigger>
        )}
        <SelectContent
          alignItemWithTrigger={false}
          side={floating ? "top" : "bottom"}
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
