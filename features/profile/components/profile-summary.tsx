import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { planLabel } from "@/lib/plans";
import { formatDate, getInitials } from "@/lib/utils";
import type { ProfileRow } from "@/types/database";

export function ProfileSummary({
  profile,
  lastSignInAt,
}: {
  profile: ProfileRow;
  lastSignInAt: string | null;
}) {
  const joined = formatDate(profile.created_at);
  const lastSeen = formatDate(lastSignInAt);

  return (
    <Card glass className="p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar className="size-16">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-base">
            {getInitials(profile.full_name, profile.email)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="truncate text-lg font-semibold text-fg">
              {profile.full_name ?? "Unnamed trader"}
            </h2>
            <Badge variant="accent">{planLabel(profile.subscription_tier)}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-fg-muted">{profile.email}</p>
          {profile.bio ? (
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-fg-subtle">Member since</dt>
          <dd className="mt-1 text-sm text-fg">{joined ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Last signed in</dt>
          <dd className="mt-1 text-sm text-fg">{lastSeen ?? "This session"}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Billing</dt>
          <dd className="mt-1 text-sm text-fg">Nothing to pay</dd>
        </div>
      </dl>
    </Card>
  );
}
