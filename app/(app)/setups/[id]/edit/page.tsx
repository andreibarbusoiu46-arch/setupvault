import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { getSetupById } from "@/services/setups.service";
import { createScreenshotUrl } from "@/services/storage.service";
import { SetupForm } from "@/features/setups/components/setup-form";

export const metadata: Metadata = { title: "Edit setup" };

export default async function EditSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const setup = await getSetupById(supabase, user.id, id);
  if (!setup) notFound();

  const screenshotUrl = await createScreenshotUrl(
    supabase,
    setup.screenshot_path,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`${ROUTES.setups}/${setup.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to the setup
        </Link>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fg">
          Edit setup
        </h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          Changes are saved straight to your vault.
        </p>
      </div>

      <SetupForm
        userId={user.id}
        setup={setup}
        existingScreenshotUrl={screenshotUrl}
      />
    </div>
  );
}
