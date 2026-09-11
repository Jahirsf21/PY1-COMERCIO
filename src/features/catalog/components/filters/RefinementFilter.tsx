import { useId } from "react";
import {
  useRefinementList,
  type UseRefinementListProps,
} from "react-instantsearch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type RefinementFilterProps = {
  attribute: string;
  transformItems?: UseRefinementListProps["transformItems"];
};

export function RefinementFilter({ attribute, transformItems }: RefinementFilterProps) {
  const id = useId();
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } =
    useRefinementList({
      attribute,
      transformItems,
      limit: 10,
      showMore: true,
      showMoreLimit: 100,
    });

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
      {canToggleShowMore && (
        <button
          type="button"
          className="w-full cursor-pointer rounded-md px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          onClick={toggleShowMore}
        >
          {isShowingMore ? "Mostrar menos" : "Mostrar más"}
        </button>
      )}
    </div>
  );
}
