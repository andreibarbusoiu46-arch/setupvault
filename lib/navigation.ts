import {
  BarChart3,
  LayoutDashboard,
  Library,
  Settings,
  Star,
  User,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/lib/routes";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** False while the destination is a placeholder for a later phase. */
  available: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard, available: true },
  { href: ROUTES.setups, label: "My Setups", icon: Library, available: true },
  { href: ROUTES.favorites, label: "Favorites", icon: Star, available: true },
  { href: ROUTES.analytics, label: "Analytics", icon: BarChart3, available: true },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: ROUTES.profile, label: "Profile", icon: User, available: true },
  { href: ROUTES.settings, label: "Settings", icon: Settings, available: true },
];

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

export function getPageTitle(pathname: string) {
  const match = ALL_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? "SetupVault";
}
