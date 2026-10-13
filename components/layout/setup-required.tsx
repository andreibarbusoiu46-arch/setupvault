import { Database } from "lucide-react";

import { Card } from "@/components/ui/card";

/**
 * Shown when the app is authenticated but the database schema is not in place
 * yet. It replaces a stack trace with something the developer can act on.
 */
export function SetupRequired({ detail }: { detail: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <Card className="max-w-lg p-7">
        <Database className="size-5 text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold text-fg">
          The database is not ready yet
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{detail}</p>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          Run{" "}
          <code className="rounded bg-canvas-subtle px-1.5 py-0.5 text-xs text-fg">
            supabase/migrations/0001_init.sql
          </code>{" "}
          in the Supabase SQL editor, then reload this page. The full walkthrough
          is in{" "}
          <code className="rounded bg-canvas-subtle px-1.5 py-0.5 text-xs text-fg">
            SUPABASE_SETUP.md
          </code>
          .
        </p>
      </Card>
    </main>
  );
}
