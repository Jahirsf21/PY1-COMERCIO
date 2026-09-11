import { SearchInput } from "./SearchInput";

export function SearchBar() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <SearchInput />
      </div>
    </div>
  );
}
