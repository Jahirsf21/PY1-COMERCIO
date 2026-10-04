import { InstantSearch } from "react-instantsearch"
import { algolia_indices, searchClient } from "@/lib/searchClient"
import { SearchBar } from "@/features/catalog/components/search/SearchBar"
import { FilterPanel } from "@/features/catalog/components/filters/FilterPanel"
import { ResultsPanel } from "@/features/catalog/components/results/ResultsPanel"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShopHeader } from "@/components/shop-header"

export default function Catalog() {
  return (
    <InstantSearch
      indexName={algolia_indices.main}
      searchClient={searchClient}
      routing
    >
      <div className="flex h-dvh flex-col">
        <ShopHeader />
        <div className="shrink-0 border-b border-input px-4 py-4 lg:px-6">
          <SearchBar />
        </div>
        <div className="flex min-h-0 flex-1 gap-6 overflow-hidden p-4 lg:p-6">
          <ScrollArea className="hidden w-64 shrink-0 lg:block">
            <FilterPanel />
          </ScrollArea>
          <ResultsPanel />
        </div>
      </div>
    </InstantSearch>
  );
}
