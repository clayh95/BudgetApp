import { IVendorLogoRule } from './utilities';

export function getVendorPatternsForFilter(vendorFilter: string, vendorMappings: IVendorLogoRule[]): RegExp[] {
  if (!vendorFilter) {
    return [];
  }
  return vendorMappings
    .filter((mapping) => (mapping?.vendorName || '').trim().toLowerCase() === vendorFilter)
    .map((mapping) => (mapping?.pattern || '').trim())
    .filter((pattern) => !!pattern && isSafeVendorPattern(pattern))
    .map((pattern) => {
      try {
        return new RegExp(pattern, 'i');
      } catch {
        // Ignore patterns that fail to compile
        return null;
      }
    })
    .filter((regex): regex is RegExp => !!regex);
}

/**
 * Best-effort safety check for user-provided vendor regex patterns to avoid
 * catastrophic backtracking and other pathological behavior.
 */
function isSafeVendorPattern(pattern: string): boolean {
  // Enforce a reasonable maximum length to limit regex complexity.
  if (pattern.length > 256) {
    return false;
  }

  // Disallow lookbehind assertions, which are more complex and can be costly.
  if (/\(\?<| \(\?<=|\(\?<!/.test(pattern)) {
    return false;
  }

  // Disallow backreferences like \1, \2, etc., which can contribute to complexity.
  if (/\\[1-9]/.test(pattern)) {
    return false;
  }

  // Disallow runs of multiple ".*" sequences, which are a common source of
  // catastrophic backtracking when combined with other quantifiers.
  if (/(\.\*){2,}/.test(pattern)) {
    return false;
  }

  // Disallow obvious nested or adjacent quantifiers such as "++", "+*", "*+",
  // or "{m,n}+" which are often problematic.
  if (/(\+|\*|\{[^}]+\})\s*(\+|\*|\{[^}]+\})/.test(pattern)) {
    return false;
  }

  return true;
}

export function matchesVendorPattern(description: string, vendorPatterns: RegExp[], hasVendorFilter: boolean): boolean {
  if (!hasVendorFilter) {
    return true;
  }
  if (!vendorPatterns.length) {
    return false;
  }
  const normalizedDescription = `${description || ''}`.trim();
  if (!normalizedDescription) {
    return false;
  }
  return vendorPatterns.some((pattern) => pattern.test(normalizedDescription));
}
