import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ROUTES } from "@/lib/routes";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "#capture" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Log in", href: ROUTES.login },
      { label: "Create account", href: ROUTES.signup },
      { label: "Reset password", href: ROUTES.forgotPassword },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
            A searchable library for the setups you actually trade.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <p className="text-sm font-medium text-fg">{column.heading}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} SetupVault</p>
          <p>
            SetupVault is a record-keeping tool. Nothing in it is financial
            advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
