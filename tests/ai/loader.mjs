import { existsSync } from "node:fs";

/**
 * Resolves the project's "@/" path alias for the standalone test runner.
 *
 * The app relies on the bundler for this; the runner has no bundler, so the
 * same mapping is reproduced here. That keeps the tests pointed at the real
 * source files rather than at copies that could drift out of step.
 */
const root = new URL("../../", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), root);
    const candidates = [base.href, `${base.href}.ts`, `${base.href}/index.ts`];

    for (const candidate of candidates) {
      if (existsSync(new URL(candidate))) return next(candidate, context);
    }
  }

  // `server-only` is a build-time guard with no runtime behaviour worth
  // exercising here, and it refuses to load outside a bundler.
  if (specifier === "server-only") {
    return { url: `data:text/javascript,export {}`, shortCircuit: true };
  }

  return next(specifier, context);
}
