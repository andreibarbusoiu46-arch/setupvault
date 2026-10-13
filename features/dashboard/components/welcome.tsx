"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

function greeting(hour: number) {
  if (hour < 5) return "Late session";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Welcome({ name }: { name: string }) {
  // Read from the browser clock, not the server's. The server renders a
  // different greeting than the client will, so the mismatch is suppressed
  // rather than papered over with an effect.
  const label = greeting(new Date().getHours());

  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2
          suppressHydrationWarning
          className="text-[1.6rem] font-semibold tracking-tight text-fg sm:text-3xl"
        >
          {label}
          {name ? `, ${name}` : ""}
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          Save a setup while it is still fresh in your head.
        </p>
      </div>

      <Button asChild>
        <Link href={`${ROUTES.setups}/new`}>
          <Plus aria-hidden="true" />
          New setup
        </Link>
      </Button>
    </section>
  );
}
