import { usePagination } from "react-instantsearch";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function PaginationControls({ onPageChange }: { onPageChange: () => void }) {
  const { pages, currentRefinement, nbPages, isFirstPage, isLastPage, refine, canRefine } = usePagination();

  function changePage(page: number) {
    if (page === currentRefinement) return;

    refine(page);
    onPageChange();
  }

  if (!canRefine) {
    return null;
  }

  const showFirst = pages[0] > 0;
  const showFirstEllipsis = pages[0] > 1;
  const showLast = pages[pages.length - 1] < nbPages - 1;
  const showLastEllipsis = pages[pages.length - 1] < nbPages - 2;

  return (
    <Pagination className="mt-2 shrink-0 border-t border-input bg-background p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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

        {showFirst && (
          <PaginationItem>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                changePage(0);
              }}
            >
              1
            </PaginationLink>
          </PaginationItem>
        )}
        {showFirstEllipsis && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {pages.map((page) => (
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

        {showLastEllipsis && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        {showLast && (
          <PaginationItem>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                changePage(nbPages - 1);
              }}
            >
              {nbPages}
            </PaginationLink>
          </PaginationItem>
        )}

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
