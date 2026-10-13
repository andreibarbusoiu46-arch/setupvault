import {
  DEFAULT_FILTERS,
  filtersHref,
  toMarket,
  type SetupFilters,
} from "@/features/setups/filters";
import type { SemanticQuery } from "@/features/ai/schemas";

/**
 * Converts a validated semantic query into the existing filter model.
 *
 * This is the boundary where model output stops being text and becomes a
 * query. Nothing here is concatenated into SQL: every field is either an enum
 * the schema already restricted, a date matched against a fixed pattern, or a
 * free-text term that the data layer passes to a parameterised `ilike`. The
 * model cannot reach the database except through the same filter object the
 * normal UI produces.
 */
export function semanticQueryToFilters(query: SemanticQuery): SetupFilters {
  const market = toMarket(query.market) ?? "all";

  // Tags are not a filter dimension yet, so rather than dropping them they
  // fold into the search term, which already covers the tags column.
  const term = [query.q, ...query.tags].filter(Boolean).join(" ").trim();

  return {
    ...DEFAULT_FILTERS,
    q: term.slice(0, 120),
    direction: query.direction,
    result: query.result,
    market,
    strategy: query.strategy || "all",
    favorites: query.favorites,
    range: query.range,
    from: query.range === "custom" ? query.from : null,
    to: query.range === "custom" ? query.to : null,
    rr: query.rr,
  };
}

export function semanticQueryToHref(query: SemanticQuery): string {
  return filtersHref(semanticQueryToFilters(query));
}
