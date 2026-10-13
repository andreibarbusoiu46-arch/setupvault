import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { SetupForm } from "@/features/setups/components/setup-form";

export const metadata: Metadata = { title: "New setup" };

export default async function NewSetupPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={ROUTES.setups}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to my setups
        </Link>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
          New setup
        </h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          Save it while it is still fresh. You can edit anything later.
        </p>
      </div>

      <SetupForm userId={user.id} />
    </div>
  );
}
