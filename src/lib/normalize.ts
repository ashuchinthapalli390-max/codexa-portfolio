/**
 * Standard access key normalization helper.
 * - Trim outer whitespace
 * - Convert to uppercase
 * - Preserve internal hyphens
 * - Reject empty input (return null)
 */
export function normalizeAccessKey(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}
