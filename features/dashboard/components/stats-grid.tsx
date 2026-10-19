import { MetricCard } from "@/components/ui/metric-card";
import { formatRatio } from "@/lib/risk-reward";
import type { SetupStats } from "@/services/setups.service";

/**
 * Four headline figures, all read from the database.
 *
 * There is no "Setup Score" card: nothing in the product computes one yet, and
 * a score is the kind of number a trader would act on. It arrives when the
 * review feature does.
 */
export function StatsGrid({ stats }: { stats: SetupStats }) {
  const decided = stats.wins + stats.losses;

  return (
    <section aria-label="Library statistics">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Total setups"
          value={String(stats.total)}
          note={
            stats.total === 0
              ? "Nothing saved yet"
              : `${stats.pending} still open`
          }
        />

        <MetricCard
          label="Win rate"
          value={stats.winRate === null ? "—" : `${stats.winRate}%`}
          note={
            stats.winRate === null
              ? "No decided results yet"
              : `${stats.wins} wins · ${stats.losses} losses`
          }
          tone={
            stats.winRate === null
              ? "default"
              : stats.winRate >= 50
                ? "positive"
                : "negative"
          }
        />

        <MetricCard
          label="Average R:R"
          value={formatRatio(stats.averageRiskReward) ?? "—"}
          note={
            stats.averageRiskReward === null
              ? "Needs a setup with levels"
              : "Across every setup with a ratio"
          }
          tone={stats.averageRiskReward === null ? "default" : "accent"}
        />

        <MetricCard
          label="Results recorded"
          value={String(decided + stats.breakeven)}
          note={
            decided + stats.breakeven === 0
              ? "Outcomes appear once you log them"
              : `${stats.breakeven} break even · ${stats.favorites} starred`
          }
        />
      </div>
    </section>
  );
}
