import { useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MobileFilterSheet } from "../filters/MobileFilterSheet";
import { ProductGrid } from "./ProductGrid";
import { PaginationControls } from "./PaginationControls";
import { HitsPerPageSelect } from "./HitsPerPageSelect";
import { SortBySelect } from "./SortBySelect";

export function ResultsPanel() {
  const resultsRef = useRef<HTMLDivElement>(null);

  function scrollToResults() {
    resultsRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-end gap-3">
        <SortBySelect />
        <HitsPerPageSelect />
      </div>
      <div className="relative min-h-0 flex-1">
        <ScrollArea ref={resultsRef} className="h-full">
          <div className="p-1 pr-3 pb-20 lg:pb-1">
            <ProductGrid />
          </div>
        </ScrollArea>
        <MobileFilterSheet />
      </div>
      <PaginationControls onPageChange={scrollToResults} />
    </div>
  );
}
