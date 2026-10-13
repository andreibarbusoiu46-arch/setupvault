import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { querySetups } from "@/services/setups.service";
import { createScreenshotUrls } from "@/services/storage.service";
import { filtersHref, parseFilters } from "@/features/setups/filters";
import { SetupGrid } from "@/features/setups/components/setup-grid";
import { SetupsPagination } from "@/features/setups/components/setups-pagination";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  // Same query layer as the library, with the favourite condition pinned on.
  const filters = {
    ...parseFilters(await searchParams),
    favorites: "only" as const,
  };

  const page = await querySetups(supabase, user.id, filters);
  const screenshotUrls = await createScreenshotUrls(
    supabase,
    page.rows.map((setup) => setup.screenshot_path),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[1.6rem] font-semibold tracking-tight text-fg sm:text-3xl">
            Favorites
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            The setups you starred for another look.
            {page.total > 0 ? (
              <span className="text-fg-subtle">
                {" "}
                {page.total} {page.total === 1 ? "setup" : "setups"}.
              </span>
            ) : null}
          </p>
        </div>

        {page.total > 0 ? (
          <Button asChild variant="secondary">
            <Link
              href={filtersHref({ ...filters, favorites: "only", page: 1 })}
            >
              Search and filter these
            </Link>
          </Button>
        ) : null}
      </div>

      {page.rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState
            icon={Star}
            title="No favourites yet"
            description="Star a setup from your library and it will show up here, ready before your next session."
            action={
              <Button asChild variant="secondary">
                <Link href={ROUTES.setups}>Go to my setups</Link>
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
