import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Library, Plus, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getFilterFacets, querySetups } from "@/services/setups.service";
import { createScreenshotUrls } from "@/services/storage.service";
import {
  DEFAULT_FILTERS,
  filtersHref,
  hasActiveFilters,
  parseFilters,
} from "@/features/setups/filters";
import { SetupGrid } from "@/features/setups/components/setup-grid";
import { SetupsPagination } from "@/features/setups/components/setups-pagination";
import { SetupsToolbar } from "@/features/setups/components/setups-toolbar";

export const metadata: Metadata = { title: "My Setups" };

export default async function SetupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  // Malformed or hand-edited parameters fall back to defaults rather than
  // throwing — the schema uses .catch() on every field.
  const filters = parseFilters(await searchParams);

  const [page, facets] = await Promise.all([
    querySetups(supabase, user.id, filters),
    getFilterFacets(supabase, user.id),
  ]);

  // Signed URLs only for the rows on this page.
  const screenshotUrls = await createScreenshotUrls(
    supabase,
    page.rows.map((setup) => setup.screenshot_path),
  );

  const filtered = hasActiveFilters(filters);
  const emptyLibrary = page.libraryTotal === 0;

  const summary = emptyLibrary
    ? "Your trading history, organised."
    : filtered
      ? `Showing ${page.total} of ${page.libraryTotal} setups.`
      : `${page.libraryTotal} ${page.libraryTotal === 1 ? "setup" : "setups"} saved.`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[1.6rem] font-semibold tracking-tight text-fg sm:text-3xl">
            My Setups
          </h2>
          <p className="mt-2 text-sm text-fg-muted" aria-live="polite">
            {summary}
          </p>
        </div>

        <Button asChild>
          <Link href={`${ROUTES.setups}/new`}>
            <Plus aria-hidden="true" />
            New setup
          </Link>
        </Button>
      </div>

      {/* The toolbar is pointless until there is something to search. */}
      {emptyLibrary ? null : (
        <Suspense fallback={null}>
          <SetupsToolbar filters={filters} facets={facets} />
        </Suspense>
      )}

      {emptyLibrary ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState
            icon={Library}
            title="Your vault is empty"
            description="Save the chart, the levels and what you were thinking. In six months this is the record you will want."
            action={
              <Button asChild>
                <Link href={`${ROUTES.setups}/new`}>Create your first setup</Link>
              </Button>
            }
          />
        </div>
      ) : page.rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState
            icon={SearchX}
            title="No setups match your filters"
            description="Nothing in your library fits every condition at once. Loosen one of them, or clear them all."
            action={
              <Button asChild variant="secondary">
                <Link href={filtersHref(DEFAULT_FILTERS)}>Clear filters</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <SetupGrid
            setups={page.rows}
            userId={user.id}
            screenshotUrls={screenshotUrls}
            resetKey={filtersHref(filters)}
          />
          <SetupsPagination
            filters={filters}
            page={page.page}
            pageCount={page.pageCount}
          />
        </>
      )}
    </div>
  );
}
