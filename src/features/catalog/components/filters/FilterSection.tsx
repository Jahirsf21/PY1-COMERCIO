import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type FilterSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function FilterSection({ title, defaultOpen = true, children }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-input pb-4">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-ring active:bg-accent motion-reduce:transition-none">
        {title}
        <ChevronDownIcon
          className={cn("size-4 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
