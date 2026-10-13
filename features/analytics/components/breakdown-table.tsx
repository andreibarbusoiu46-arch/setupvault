import { Card } from "@/components/ui/card";
import { formatRr, formatWinRate, type GroupStats } from "@/features/analytics/utils/compute";
import { cn } from "@/lib/utils";

/** Below this, a win rate is noise rather than a finding. */
const SMALL_SAMPLE = 5;

export function BreakdownTable({
  title,
  description,
  rows,
  emptyMessage,
}: {
  title: string;
  description?: string;
  rows: GroupStats[];
  emptyMessage: string;
}) {
  return (
    <Card glass className="overflow-hidden p-0">
      <div className="border-b border-glass backdrop-blur-xl-border px-5 py-4">
        <h3 className="text-sm font-medium text-fg">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-fg-subtle">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="eyebrow px-5 py-2.5 font-normal">Name</th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-right font-normal">Setups</th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-right font-normal">W</th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-right font-normal">L</th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-right font-normal">BE</th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-right font-normal">Win rate</th>
                <th scope="col" className="eyebrow px-5 py-2.5 text-right font-normal">Avg R:R</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const small = row.resolved > 0 && row.resolved < SMALL_SAMPLE;
                return (
                  <tr key={row.key} className="hover:bg-surface-hover/60">
                    <th
                      scope="row"
                      className="max-w-[14rem] truncate px-5 py-3 text-left font-normal text-fg"
                    >
                      {row.label}
                    </th>
                    <td className="numeric px-3 py-3 text-right text-fg-muted">{row.total}</td>
                    <td className="numeric px-3 py-3 text-right text-positive">{row.wins}</td>
                    <td className="numeric px-3 py-3 text-right text-negative">{row.losses}</td>
                    <td className="numeric px-3 py-3 text-right text-fg-subtle">{row.breakeven}</td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "numeric",
                          row.winRate === null
                            ? "text-fg-subtle"
                            : row.winRate >= 50
                              ? "text-positive"
                              : "text-negative",
                        )}
                      >
                        {formatWinRate(row.winRate)}
                      </span>
                      {small ? (
                        <span
                          className="ml-1.5 text-xs text-fg-subtle"
                          title="Too few resolved setups to read much into"
                        >
                          ({row.resolved} resolved)
                        </span>
                      ) : null}
                    </td>
                    <td className="numeric px-5 py-3 text-right text-fg-muted">
                      {formatRr(row.avgRiskReward)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
