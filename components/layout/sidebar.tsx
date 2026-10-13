import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ROUTES } from "@/lib/routes";

/** Desktop sidebar. The mobile equivalent is rendered by MobileNav. */
export function Sidebar({ planLabel }: { planLabel: string }) {
  return (
    <aside className="glass backdrop-blur-xl fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-glass-border px-4 py-5 lg:flex">
      <Link
        href={ROUTES.dashboard}
        aria-label="SetupVault dashboard"
        className="mb-7 px-2"
      >
        <Logo />
      </Link>

      <SidebarNav />

      <div className="mt-6 rounded-xl border border-border bg-surface/60 p-3.5">
        <p className="text-xs text-fg-subtle">Current plan</p>
        <p className="mt-1 text-sm font-medium text-fg">{planLabel}</p>
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          Paid plans arrive once the setup library ships.
        </p>
      </div>
    </aside>
  );
}
