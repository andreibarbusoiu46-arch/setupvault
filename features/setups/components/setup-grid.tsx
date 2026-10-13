import {
  AnimatedGrid,
  AnimatedGridItem,
} from "@/features/setups/components/animated-grid";
import { SetupCard } from "@/features/setups/components/setup-card";
import type { SetupListItem } from "@/services/setups.service";

export function SetupGrid({
  setups,
  userId,
  screenshotUrls,
  resetKey = "",
}: {
  setups: SetupListItem[];
  userId: string;
  screenshotUrls: Record<string, string>;
  /** Serialised filter state, so a new result set re-animates. */
  resetKey?: string;
}) {
  return (
    <AnimatedGrid resetKey={resetKey}>
      {setups.map((setup) => (
        <AnimatedGridItem key={setup.id}>
          <SetupCard
            setup={setup}
            userId={userId}
            screenshotUrl={
              setup.screenshot_path
                ? (screenshotUrls[setup.screenshot_path] ?? null)
                : null
            }
          />
        </AnimatedGridItem>
      ))}
    </AnimatedGrid>
  );
}
