"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The full error stays on the server log; users see the summary below.
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-7">
      <AlertTriangle className="size-5 text-negative" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-fg">
        This page could not load
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        Something went wrong while reading your vault. Your data has not been
        changed.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-fg-subtle">
          Reference: <span className="numeric">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-6">
        <Button onClick={reset}>Try again</Button>
      </div>
    </Card>
  );
}
