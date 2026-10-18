"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "cn";
import { areaLevelLabel, categoryLabel } from "@/lib/i18nLabels";
import { getCategoryById } from "@/lib/heatIndex";
import type { AreaReading } from "@/lib/heatAreasTypes";
import { searchPlaces } from "@/lib/placeSearch";

interface PlaceSearchProps {
  areas: Record<string, AreaReading> | null;
  onSelect: (psgc: string) => void;
}

export function PlaceSearch({ areas, onSelect }: PlaceSearchProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const catalog = useMemo(() => (areas ? Object.values(areas) : []), [areas]);
  const results = useMemo(() => searchPlaces(catalog, query, 8), [catalog, query]);
  const trimmed = query.trim();

  function pick(psgc: string) {
    onSelect(psgc);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        aria-label={t("map.search")}
        className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "size-11 rounded-full bg-card shadow-md")}
      >
        <Search aria-hidden className="size-5" />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-[min(20rem,calc(100vw-1.5rem))] p-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (results[0]) pick(results[0].psgc);
          }}
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("map.searchPlaceholder")}
            aria-label={t("map.search")}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </form>
        <div className="mt-2" role="listbox" aria-label={t("map.search")}>
          {trimmed.length > 0 && trimmed.length < 2 && (
            <p className="px-1 py-2 text-sm text-muted-foreground">{t("map.searchHint")}</p>
          )}
          {trimmed.length >= 2 && results.length === 0 && (
            <p className="px-1 py-2 text-sm text-muted-foreground">{t("map.searchEmpty")}</p>
          )}
          {results.length > 0 && (
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {results.map((place) => {
                const category = getCategoryById(place.majorityCategory);
                return (
                  <li key={place.psgc}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
                      onClick={() => pick(place.psgc)}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: category.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{place.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {areaLevelLabel(t, place.level)} · {categoryLabel(t, category.id)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {Math.round(place.heatIndexC)}°
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
