import { SlidersHorizontalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet"
import { FilterPanel } from "@/features/catalog/components/filters/FilterPanel"

export function MobileFilterSheet() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button className="h-10 cursor-pointer gap-1.5 rounded-full px-4 text-xs shadow-lg hover:shadow-xl motion-reduce:transition-none" />
        }
      >
        <SlidersHorizontalIcon aria-hidden="true" className="size-3.5" />
        Filtros
      </SheetTrigger>
      <SheetContent
        side="left"
        className="max-h-dvh overflow-hidden p-0 data-[side=left]:h-dvh data-[side=left]:w-4/5"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 overflow-hidden">
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <FilterPanel />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
