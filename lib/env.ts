/**
 * Environment access.
 *
 * Validation happens lazily (on first use) rather than at module load so that
 * `next build` never depends on real credentials being present. When a variable
 * is missing the error names the variable and the file it belongs in.
 */

class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Missing environment variable: ${name}. Add it to .env.local — see .env.example and SUPABASE_SETUP.md.`,
    );
    this.name = "MissingEnvError";
  }
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") throw new MissingEnvError(name);
  return value.trim();
}

/**
 * Public Supabase config. Safe to reach the browser: the anon key is designed
 * to be public and is only useful in combination with Row Level Security.
 *
 * The `process.env.X` references must stay static so Next can inline them.
 */
export function getPublicEnv() {
  return {
    supabaseUrl: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabaseAnonKey: required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

/**
 * Server-only secret. Never import this from a client component — it is read
 * exclusively inside route handlers and server actions.
 */
export function getServiceRoleKey() {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Absolute origin used to build auth redirect links in emails. */
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && configured.trim() !== "") {
    return configured.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
