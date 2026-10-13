"use client";

import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { getPageTitle } from "@/lib/navigation";

export function Topbar({
  name,
  email,
  avatarUrl,
  planLabel,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  planLabel: string;
}) {
  const pathname = usePathname();

  return (
    <header className="glass backdrop-blur-xl sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-glass-border px-4 sm:px-6">
      <MobileNav planLabel={planLabel} />

      <h1 className="flex-1 truncate text-sm font-medium text-fg">
        {getPageTitle(pathname)}
      </h1>

      <UserMenu name={name} email={email} avatarUrl={avatarUrl} />
    </header>
  );
}
