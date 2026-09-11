import { usePagination } from "react-instantsearch";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function PaginationControls({ onPageChange }: { onPageChange: () => void }) {
  const { currentRefinement, nbPages, isFirstPage, isLastPage, refine, canRefine } = usePagination();

  function changePage(page: number) {
    if (page === currentRefinement) return;

    refine(page);
    onPageChange();
  }

  if (!canRefine) {
    return null;
  }

  const visiblePageCount = Math.min(5, nbPages);
  const firstVisiblePage = Math.min(
    Math.max(currentRefinement - Math.floor(visiblePageCount / 2), 0),
    nbPages - visiblePageCount,
  );
  const visiblePages = Array.from(
    { length: visiblePageCount },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <Pagination className="mt-2 shrink-0 flex-wrap items-center gap-3 border-t border-input bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <PaginationContent className="flex-wrap justify-center">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={isFirstPage}
            className={isFirstPage ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (!isFirstPage) changePage(currentRefinement - 1);
            }}
          />
        </PaginationItem>

        {visiblePages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              isActive={page === currentRefinement}
              onClick={(e) => {
                e.preventDefault();
                changePage(page);
              }}
            >
              {page + 1}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            aria-disabled={isLastPage}
            className={isLastPage ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (!isLastPage) changePage(currentRefinement + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
