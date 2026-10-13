import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
      <p className="numeric text-sm text-fg-subtle">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-fg">
        There is nothing on this shelf
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-fg-muted">
        The page you asked for does not exist. It may have moved, or the link
        may be wrong.
      </p>
      <Button asChild variant="secondary">
        <Link href={ROUTES.home}>Back to the home page</Link>
      </Button>
    </main>
  );
}
