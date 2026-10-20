import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { Section } from "@/features/marketing/components/section";

export function Cta() {
  return (
    <Section className="border-t border-border">
      <div className="glass backdrop-blur-xl relative overflow-hidden rounded-2xl px-6 py-14 text-center sm:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-40 w-full max-w-[600px] sm:h-56 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgb(91 124 250 / 0.18), transparent)",
          }}
        />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Start the library you wish you had three years ago
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-fg-muted">
            Create an account, save your first setup when the vault opens, and
            let the record build itself from there.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={ROUTES.signup}>Start free</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="#how">See how it works</Link>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
