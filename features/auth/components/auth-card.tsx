import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ROUTES } from "@/lib/routes";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-sm">
      <Link
        href={ROUTES.home}
        aria-label="SetupVault home"
        className="mb-8 inline-flex"
      >
        <Logo />
      </Link>

      <div className="glass backdrop-blur-xl rounded-2xl p-6 shadow-elevated sm:p-7">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </div>

      {footer ? (
        <p className="mt-6 text-center text-sm text-fg-muted">{footer}</p>
      ) : null}
    </div>
  );
}
