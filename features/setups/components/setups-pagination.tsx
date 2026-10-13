import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { filtersHref, type SetupFilters } from "@/features/setups/filters";

/**
 * Page links rather than a "load more" button: the whole view already lives in
 * the URL, so a page number is one more parameter and the result stays
 * shareable and restorable on refresh.
 */
export function SetupsPagination({
  filters,
  page,
  pageCount,
}: {
  filters: SetupFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-border pt-5"
    >
      {page > 1 ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={filtersHref({ ...filters, page: page - 1 })} rel="prev">
            <ChevronLeft aria-hidden="true" />
            Previous
          </Link>
        </Button>
      ) : (
        <Button variant="secondary" size="sm" disabled>
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
      )}

      <p className="text-xs text-fg-muted" aria-live="polite">
        Page <span className="numeric text-fg">{page}</span> of{" "}
        <span className="numeric text-fg">{pageCount}</span>
      </p>

      {page < pageCount ? (
        <Button asChild variant="secondary" size="sm">
          <Link href={filtersHref({ ...filters, page: page + 1 })} rel="next">
            Next
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button variant="secondary" size="sm" disabled>
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      )}
    </nav>
  );
}
