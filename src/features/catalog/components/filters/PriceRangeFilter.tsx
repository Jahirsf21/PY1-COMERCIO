import { useState } from "react";
import { useRange } from "react-instantsearch";
import { Slider } from "@/components/ui/slider";

function formatPrice(value: number) {
  return value.toLocaleString("es-CR");
}

export function PriceRangeFilter() {
  const { start, range, canRefine, refine } = useRange({ attribute: "b2c_price" });
  const min = range.min ?? 0;
  const max = range.max ?? 0;
  const from = Math.max(min, Number.isFinite(start[0] as number) ? (start[0] as number) : min);
  const to = Math.min(max, Number.isFinite(start[1] as number) ? (start[1] as number) : max);
  const [value, setValue] = useState<number[]>([from, to]);
  const [prevFrom, setPrevFrom] = useState(from);
  const [prevTo, setPrevTo] = useState(to);

  if (from !== prevFrom || to !== prevTo) {
    setPrevFrom(from);
    setPrevTo(to);
    setValue([from, to]);
  }

  if (!canRefine) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Slider
        min={min}
        max={max}
        value={value}
        onValueChange={(next) => setValue(next as number[])}
        onValueCommitted={(next) => {
          const [nextFrom, nextTo] = next as number[];
          refine([nextFrom, nextTo]);
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>₡{formatPrice(value[0])}</span>
        <span>₡{formatPrice(value[1])}</span>
      </div>
    </div>
  );
}
