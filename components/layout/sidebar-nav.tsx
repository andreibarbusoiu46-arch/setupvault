"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * `roomy` is the drawer's density. The desktop rail is a persistent piece of
 * chrome and wants to be quiet — small text, tight rows. The mobile drawer is
 * a destination you deliberately opened, it is the only thing on screen, and
 * every row is a thumb target, so it gets larger type and 48px rows. Same
 * component, same source array, different density.
 */
function NavLink({
  item,
  onNavigate,
  roomy = false,
}: {
  item: NavItem;
  onNavigate?: () => void;
  roomy?: boolean;
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
          "group flex items-center rounded-lg transition-colors",
          roomy
            ? "gap-3.5 px-3 py-3 text-[16px] font-medium"
            : "gap-3 px-3 py-2 text-sm",
          active
            ? "bg-surface-hover text-fg"
            : // Muted is right for a rail you are ignoring; in the drawer the
              // links are the content, so they take the foreground colour.
              roomy
              ? "text-fg hover:bg-surface-hover/60"
              : "text-fg-muted hover:bg-surface-hover/60 hover:text-fg",
        )}
      >
        <Icon
          className={cn(
            "shrink-0",
            roomy ? "size-[18px]" : "size-4",
            active ? "text-accent" : "text-fg-subtle",
          )}
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

export function SidebarNav({
  onNavigate,
  roomy = false,
}: {
  onNavigate?: () => void;
  roomy?: boolean;
}) {
  return (
    <nav aria-label="Application" className="flex flex-1 flex-col gap-6">
      <ul className="flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            onNavigate={onNavigate}
            roomy={roomy}
          />
        ))}
      </ul>

      <div>
        <p className="px-3 pb-2 text-xs text-fg-subtle">Account</p>
        <ul className="flex flex-col gap-0.5">
          {SECONDARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              onNavigate={onNavigate}
              roomy={roomy}
            />
          ))}
        </ul>
      </div>
    </nav>
  );
}
