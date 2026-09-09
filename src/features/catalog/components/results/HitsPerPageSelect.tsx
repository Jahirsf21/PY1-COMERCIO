import { useId } from "react";
import { useHitsPerPage } from "react-instantsearch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HITS_PER_PAGE_ITEMS = [
  { label: "10 por página", value: 10, default: true },
  { label: "15 por página", value: 15 },
  { label: "20 por página", value: 20 },
  { label: "30 por página", value: 30 },
];

export function HitsPerPageSelect() {
  const id = useId();
  const { items, refine } = useHitsPerPage({ items: HITS_PER_PAGE_ITEMS });
  const current = items.find((item) => item.isRefined)?.value ?? null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label id={`${id}-label`} htmlFor={id}>Elementos por página</Label>
      <Select value={current} onValueChange={(value) => value !== null && refine(value)}>
        <SelectTrigger id={id} size="sm" aria-labelledby={`${id}-label`}>
          <SelectValue placeholder="Por página" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side="bottom" align="end">
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
