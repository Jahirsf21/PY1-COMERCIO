import { SearchInput } from "@/features/catalog/components/search/SearchInput";

export function SearchBar() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <SearchInput />
      </div>
    </div>
  );
}
