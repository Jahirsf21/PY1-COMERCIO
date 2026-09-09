import { InstantSearch } from "react-instantsearch";
import { searchClient } from "../../lib/searchClient";
import { SearchBar } from "./components/search/SearchBar";
import { FilterPanel } from "./components/filters/FilterPanel";
import { ResultsPanel } from "./components/results/ResultsPanel";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Catalog() {
  return (
    <InstantSearch indexName="grupo-04_products" searchClient={searchClient}>
      <div className="flex h-dvh flex-col">
        <header className="shrink-0 border-b border-input px-4 py-4 lg:px-6">
          <SearchBar />
        </header>
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
