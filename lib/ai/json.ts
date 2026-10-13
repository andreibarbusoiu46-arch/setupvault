/**
 * Models occasionally wrap JSON in a markdown fence or add a sentence around
 * it, even when told not to. One conservative recovery pass is worth it; more
 * than that means the output is not trustworthy and should fail loudly.
 */
export function extractJson(raw: string): unknown {
  const text = raw.trim();

  try {
    return JSON.parse(text);
  } catch {
    // fall through to recovery
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // fall through
    }
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {
      // fall through
    }
  }

  return null;
}
