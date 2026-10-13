/**
 * Database and storage failures, translated. Postgres error codes are stable;
 * their messages mention table names and constraints, which users should never
 * see. The raw error is logged, the sentence below is what is shown.
 */
const CODE_MESSAGES: Record<string, string> = {
  "23505": "A setup like this already exists.",
  "23503": "That record no longer exists.",
  "23514": "Some of those values are not allowed. Check the numbers and try again.",
  "42501": "You do not have permission to do that.",
  PGRST116: "That setup could not be found.",
};

const STORAGE_MESSAGES: Record<string, string> = {
  "413": "That image is too large. The limit is 5 MB.",
  "409": "A file with that name already exists. Try again.",
};

export function toDataErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Try again in a moment.",
): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      code?: string;
      statusCode?: string;
      message?: string;
    };

    if (candidate.code && CODE_MESSAGES[candidate.code]) {
      return CODE_MESSAGES[candidate.code];
    }
    if (candidate.statusCode && STORAGE_MESSAGES[candidate.statusCode]) {
      return STORAGE_MESSAGES[candidate.statusCode];
    }
    if (candidate.message?.includes("Payload too large")) {
      return STORAGE_MESSAGES["413"];
    }
    if (candidate.message?.includes("mime type")) {
      return "That file type is not supported. Use PNG, JPG or WEBP.";
    }
    if (candidate.message?.includes("Bucket not found")) {
      return "Screenshot storage is not set up yet. Run the 0002_storage.sql migration.";
    }
    if (candidate.message?.includes("Failed to fetch")) {
      return "Could not reach the server. Check your connection and try again.";
    }
  }

  return fallback;
}
