/**
 * Validates that the user-supplied string is a usable http/https URL.
 *
 * Returns a human-readable error message when invalid,
 * or null when the URL looks good and can be submitted.
 *
 * We use the built-in URL constructor for parsing — it handles all the edge
 * cases (missing scheme, malformed host, etc.) without a regex.
 */
export const validateUrl = (input: string): string | null => {
  // Trim whitespace so a URL pasted with a trailing space still passes
  const trimmed = input.trim();

  // Reject empty submissions — the user probably clicked submit by accident
  if (!trimmed) return "Please enter a URL.";

  let parsed: URL;

  try {
    // The URL constructor throws a TypeError for anything that isn't a valid URL
    parsed = new URL(trimmed);
  } catch {
    // Give a concrete example so the user knows what format we expect
    return "Please enter a valid URL (e.g. https://example.com/article).";
  }

  // Only allow http and https — ftp://, file://, javascript:// etc. are not safe to fetch
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https URLs are supported.";
  }

  // All checks passed — the URL is usable
  return null;
};
