
export interface IVendorLogoRule {
  pattern: string;
  vendorName: string;
  logoUrl: string;
}

export interface IVendorMatch {
  vendorName: string;
  logoUrl: string;
  pattern: string;
}

export const DEFAULT_VENDOR_MAPPINGS: IVendorLogoRule[] = [
  { pattern: 'target\\.com|target t\\-', vendorName: 'Target', logoUrl: 'assets/images/target-logo.png' },
  { pattern: 'wal-?mart', vendorName: 'Walmart', logoUrl: 'assets/images/walmart-logo.png' },
  { pattern: 'chick-?fil-?a', vendorName: 'Chick-fil-A', logoUrl: 'assets/images/chick-fil-a-logo.png' },
  { pattern: 'tyler tech', vendorName: 'Tyler Tech', logoUrl: 'assets/images/tyler-logo.png' },
  { pattern: 'mcdonald\'s', vendorName: "McDonald\'s", logoUrl: 'assets/images/mcdonalds-logo.png' },
  { pattern: 'whataburger', vendorName: 'Whataburger', logoUrl: 'assets/images/whataburger-logo.png' },
  { pattern: 'campus crusade', vendorName: 'Campus Crusade', logoUrl: 'assets/images/cru-logo.png' },
  { pattern: 'grace bible church', vendorName: 'Grace Bible Church', logoUrl: 'assets/images/grace-logo.png' },
  { pattern: 'amzn\\.com|amazon payme|prime video', vendorName: 'Amazon', logoUrl: 'assets/images/amazon-a-logo.png' },
  { pattern: 'costco (whse|gas|com)', vendorName: 'Costco', logoUrl: 'assets/images/costco-c.png' },
  { pattern: 'venmo', vendorName: 'Venmo', logoUrl: 'assets/images/venmo-logo.png' },
  { pattern: 'sonic', vendorName: 'Sonic', logoUrl: 'assets/images/sonic-logo.png' },
  { pattern: 'chevron', vendorName: 'Chevron', logoUrl: 'assets/images/chevron-logo.png' },
  { pattern: 'google', vendorName: 'Google', logoUrl: 'assets/images/google-logo.png' },
  { pattern: 'h-e-b', vendorName: 'H-E-B', logoUrl: 'assets/images/heb-logo.png' },
  { pattern: 'aggieland lawn', vendorName: 'Aggieland Lawn', logoUrl: 'assets/images/aggieland-lawn-logo.png' },
  { pattern: 'koppe bridge', vendorName: 'Koppe Bridge', logoUrl: 'assets/images/koppe-bridge-logo.png' }
];

export function getIcon(description: string, vendorMappings: IVendorLogoRule[] = []): string {
  const match = getVendorMatch(description, vendorMappings);
  return match?.logoUrl || '';
}

export function getVendorMatch(description: string, vendorMappings: IVendorLogoRule[] = []): IVendorMatch | null {
  if (!description) { return null; }
  const normalizedDescription = `${description}`.trim();
  if (!normalizedDescription || !vendorMappings?.length) { return null; }

  for (const mapping of vendorMappings) {
    const pattern = (mapping?.pattern || '').trim();
    if (!pattern) { continue; }
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, 'i');
    } catch {
      continue;
    }
    if (regex.test(normalizedDescription)) {
      return {
        vendorName: (mapping.vendorName || '').trim(),
        logoUrl: (mapping.logoUrl || '').trim(),
        pattern
      };
    }
  }
  return null;
}

export function getPosNegColor(val1:number, val2:number) {
  if (val1 - val2 < 0) {
    return 'red'
  } else {
    return 'green'
  }
}

export function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined) { return null; }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (cleaned.trim() === '') { return null; }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export type Comparable = string | number | bigint | Date;

export function compare<T extends Comparable>(a: T, b: T, isAsc: boolean): number {
  if (a === b) { return 0; }
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

export function compareString(a: unknown, b: unknown, isAsc: boolean): number {
  const left = (a || '').toString().toLowerCase();
  const right = (b || '').toString().toLowerCase();
  if (left === right) { return 0; }
  return (left < right ? -1 : 1) * (isAsc ? 1 : -1);
}
