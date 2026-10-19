import {
  AnimatedGrid,
  AnimatedGridItem,
} from "@/features/setups/components/animated-grid";
import { SetupCard } from "@/features/setups/components/setup-card";
import { SetupRow } from "@/features/setups/components/setup-row";
import type { SetupFilters } from "@/features/setups/filters";
import type { SetupListItem } from "@/services/setups.service";

/**
 * The library, at whichever density was asked for.
 *
 * Both views read the same rows and the same screenshots; only the shape
 * changes. Cards are for browsing, rows are for finding.
 */
export function SetupGrid({
  setups,
  userId,
  screenshotUrls,
  view = "cards",
  resetKey = "",
}: {
  setups: SetupListItem[];
  userId: string;
  screenshotUrls: Record<string, string>;
  view?: SetupFilters["view"];
  /** Serialised filter state, so a new result set re-animates. */
  resetKey?: string;
}) {
  const urlFor = (setup: SetupListItem) =>
    setup.screenshot_path ? (screenshotUrls[setup.screenshot_path] ?? null) : null;

  if (view === "rows") {
    return (
      <AnimatedGrid
        resetKey={resetKey}
        stagger={false}
        className="flex flex-col gap-2"
      >
        {setups.map((setup) => (
          <SetupRow
            key={setup.id}
            setup={setup}
            userId={userId}
            screenshotUrl={urlFor(setup)}
          />
        ))}
      </AnimatedGrid>
    );
  }

  return (
    <AnimatedGrid resetKey={resetKey}>
      {setups.map((setup) => (
        <AnimatedGridItem key={setup.id}>
          <SetupCard
            setup={setup}
            userId={userId}
            screenshotUrl={urlFor(setup)}
          />
        </AnimatedGridItem>
      ))}
    </AnimatedGrid>
  );
}
