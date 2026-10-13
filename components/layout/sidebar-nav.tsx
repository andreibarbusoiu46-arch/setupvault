"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-surface-hover text-fg"
            : "text-fg-muted hover:bg-surface-hover/60 hover:text-fg",
        )}
      >
        <Icon
          className={cn("size-4 shrink-0", active ? "text-accent" : "")}
          aria-hidden="true"
        />
        <span className="flex-1 truncate">{item.label}</span>
        {item.available ? null : (
          <Badge className="px-1.5 py-0 text-[10px]">Soon</Badge>
        )}
      </Link>
    </li>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Application" className="flex flex-1 flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </ul>

      <div>
        <p className="px-3 pb-2 text-xs text-fg-subtle">Account</p>
        <ul className="flex flex-col gap-0.5">
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </ul>
      </div>
    </nav>
  );
}
