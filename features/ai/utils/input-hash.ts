import { createHash } from "node:crypto";

/**
 * A stable fingerprint of everything an analysis was derived from.
 *
 * Keys are sorted so property order cannot change the hash, and the screenshot
 * is represented by its storage path — replacing the image changes the path,
 * which correctly invalidates the cache.
 */
export function buildInputHash(input: Record<string, unknown>): string {
  const normalise = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalise);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, entry]) => entry !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, normalise(entry)]),
      );
    }
    return value;
  };

  return createHash("sha256")
    .update(JSON.stringify(normalise(input)))
    .digest("hex");
}
