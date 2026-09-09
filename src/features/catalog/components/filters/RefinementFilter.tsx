import { useId } from "react";
import { useRefinementList, type UseRefinementListProps } from "react-instantsearch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type RefinementFilterProps = {
  attribute: string;
  transformItems?: UseRefinementListProps["transformItems"];
};

export function RefinementFilter({ attribute, transformItems }: RefinementFilterProps) {
  const id = useId();
  const { items, refine } = useRefinementList({ attribute, transformItems });
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Label
          key={item.value}
          htmlFor={`${id}-${item.value}`}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 leading-snug transition-colors duration-150 hover:bg-muted focus-within:bg-muted focus-within:inset-ring-2 focus-within:inset-ring-ring active:bg-accent `has-data-checked:bg-accent motion-reduce:transition-none"
        >
          <Checkbox
            id={`${id}-${item.value}`}
            className="cursor-pointer"
            checked={item.isRefined}
            onCheckedChange={() => refine(item.value)}
          />
          <span>
            {item.label} ({item.count})
          </span>
        </Label>
      ))}
    </div>
  );
}
