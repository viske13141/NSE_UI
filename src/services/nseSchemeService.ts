import { nseApi } from './nseApi';
import { getNseCustomerSchemeMasterText } from './nseCustomerSso';

export interface NSEScheme {
  id: string;
  schemeCode: string;
  name: string;
  amc: string;
  amcCode: string;
  isin: string;
  category: string;
  subcategory: string;
  plan: string;
  active: boolean;
  purchaseAllowed: boolean;
  sipAllowed: boolean;
  switchAllowed?: boolean;
  purchaseMode: string;
  minPurchase: number | null;
  minAdditionalPurchase: number | null;
  maxAdditionalPurchase: number | null;
  purchaseMultiplier: number | null;
  settlementType: string;
}
const numeric = (value: string): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
export function parseNSESchemeMaster(text: string): NSEScheme[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) throw new Error('Mutual funds returned an empty scheme master file');
  const headers = lines[0].split('|').map(value => value.trim().toUpperCase());
  for (const required of ['SCHEME CODE', 'SCHEME NAME', 'AMC CODE', 'SCHEME TYPE', 'PURCHASE ALLOWED', 'SIP ALLOWED', 'AMC ACTIVE FLAG']) {
    if (!headers.includes(required)) throw new Error(`Mutual funds scheme master is missing ${required}`);
  }
  const seen = new Set<string>();
  const schemes = lines.slice(1).map((line): NSEScheme | null => {
    const values = line.split('|');
    if (values.length < headers.length) throw new Error('Mutual funds returned an incomplete scheme master row. Refresh the catalog.');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || '']));
    if (!row['SCHEME CODE'] || !row['SCHEME NAME']) return null;
    const id = row['UNIQUE SR NO'] || row['SCHEME CODE'];
    if (seen.has(id)) return null;
    seen.add(id);
    const amcCode = row['AMC CODE'];
    const name = row['SCHEME NAME'];
    return {
      id, schemeCode: row['SCHEME CODE'], name,
      amc: amcCode.replace(/_MF$/i, '').replace(/_/g, ' '), amcCode,
      isin: row.ISIN, category: row['SCHEME TYPE'], subcategory: row['SETTLEMENT TYPE'],
      // NORMAL describes the master plan type; use explicit plan names only.
      plan: /\bDIRECT\b/i.test(name) ? 'Direct' : /\bREGULAR\b/i.test(name) ? 'Regular' : row['PLAN TYPE'] || 'Unspecified',
      active: row['AMC ACTIVE FLAG'] === 'Y',
      purchaseAllowed: row['PURCHASE ALLOWED'] === 'Y', sipAllowed: row['SIP ALLOWED'] === 'Y',
      switchAllowed: row['SWITCH ALLOWED'] === 'Y',
      purchaseMode: row['PURCHASE TRANSACTION MODE'],
      minPurchase: numeric(row['NEW PURCHASE MIN AMOUNT']),
      minAdditionalPurchase: numeric(row['ADDITIONAL PURCHASE MIN AMOUNT']),
      maxAdditionalPurchase: numeric(row['ADDITIONAL PURCHASE MAX AMOUNT']),
      purchaseMultiplier: numeric(row['PURCHASE AMOUNT MULTIPLIER']),
      settlementType: row['SETTLEMENT TYPE'],
    } satisfies NSEScheme;
  }).filter((scheme): scheme is NSEScheme => scheme !== null);
  if (!schemes.length) throw new Error('Mutual funds returned no scheme records');
  return schemes;
}
export async function getNSESchemeMaster(): Promise<NSEScheme[]> {
  return parseNSESchemeMaster(await nseApi.downloadMaster({ file_type: 'SCH' }));
}

/**
 * getPublicSchemeMaster
 *
 * Fetches the NSE scheme catalogue through the FastAPI customer route.
 * The browser sends the existing HttpOnly SSO cookie; NSE credentials remain server-side.
 *
 * Use this function in customer-facing pages (e.g. MutualFundsDashboard)
 * instead of getNSESchemeMaster(), which requires an NSE admin session.
 */
export async function getPublicSchemeMaster(): Promise<NSEScheme[]> {
  return parseNSESchemeMaster(await getNseCustomerSchemeMasterText());
}
