import { nseApi } from './nseApi';
import type { RedemptionStatementRequest, StatementReportResponse } from '@/types/nse';
export const NSE_REDEMPTION_FILTERS = {
  order_type: ['ALL', 'NRM', 'STP', 'SWP'], sub_order_type: ['ALL', 'NRM', 'SWITCH', 'STP'],
  transaction_type: ['', 'P', 'R'], order_status: ['', 'All', 'VALID', 'INVALID'],
  settlement_type: ['', 'ALL', 'L0', 'L1', 'OTHERS'],
} as const;
export interface NSERedemptionRow {
  key: string; orderId: string; clientCode: string; schemeCode: string; schemeName: string;
  orderDate: string; reportDate: string; folio: string; units: number | null; nav: number | null;
  allottedAmount: number | null; orderAmount: number | null; valid: boolean; confirmed: boolean;
  remark: string; memberReference: string; clientName: string; requestedUnits: number | null; load: number | null; tax: number | null; stt: number | null;
}
export function buildNSERedemptionRequest(input: RedemptionStatementRequest): RedemptionStatementRequest {
  const date = (value: string) => {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) throw new Error('Redemption dates must use DD-MM-YYYY');
    const [day, month, year] = value.split('-');
    const iso = `${year}-${month}-${day}`; const time = Date.parse(`${iso}T00:00:00Z`);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== iso) throw new Error('Enter valid redemption dates');
    return time;
  };
  const start = date(input.from_date), end = date(input.to_date);
  if (end < start || end - start > 30 * 86400000) throw new Error('Redemption dates must have a gap of at most 30 days');
  const base = { from_date: input.from_date, to_date: input.to_date };
  if (input.order_ids?.trim()) {
    const ids = input.order_ids.split(',').map(id => id.trim());
    if (ids.length > 50 || ids.some(id => !/^\d+$/.test(id))) throw new Error('Use at most 50 numeric order IDs');
    return { ...base, order_ids: ids.join(',') };
  }
  if (input.member_unique_ids?.trim()) {
    const ids = input.member_unique_ids.split(',').map(id => id.trim());
    if (ids.length > 50 || ids.some(id => !id || id.length > 25)) throw new Error('Use at most 50 member references of at most 25 characters');
    return { ...base, member_unique_ids: ids.join(',') };
  }
  const result: RedemptionStatementRequest = { ...base };
  for (const [key, options] of Object.entries(NSE_REDEMPTION_FILTERS)) {
    const value = input[key as keyof RedemptionStatementRequest] || (key === 'order_type' || key === 'sub_order_type' ? 'ALL' : '');
    if (!(options as readonly string[]).includes(value)) throw new Error(`Invalid ${key.replace(/_/g, ' ')} filter`);
    if (value) result[key as keyof RedemptionStatementRequest] = value;
  }
  if (input.client_code?.trim()) {
    if (input.client_code.trim().length > 20) throw new Error('Client code must be at most 20 characters');
    result.client_code = input.client_code.trim();
  }
  return result;
}
export function parseNSERedemptions(response: StatementReportResponse): NSERedemptionRow[] {
  if (response.response_status !== 'S') throw new Error(response.error_remark || 'Mutual funds redemption report failed');
  if (!Array.isArray(response.report_data)) throw new Error('Mutual funds returned an invalid redemption report');
  const seen = new Set<string>();
  return response.report_data.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Mutual funds returned an unreadable redemption record');
    const data = item as Record<string, unknown>;
    const text = (key: string) => data[key] == null ? '' : String(data[key]).trim();
    const number = (key: string) => { const value = text(key); const parsed = Number(value); return value && Number.isFinite(parsed) && parsed >= 0 ? parsed : null; };
    const orderId = text('orderno'), clientCode = text('clientcode'), schemeCode = text('schemecode');
    if (!/^\d+$/.test(orderId) || !clientCode || !schemeCode) throw new Error('Redemption record is missing its order, investor or scheme identifiers');
    const units = number('allottedqty'), nav = number('allottednav'), allottedAmount = number('allottedamt');
    const valid = text('validflag').toUpperCase() === 'Y';
    const key = JSON.stringify([clientCode, orderId, schemeCode, text('rtatransactionno'), text('reportdate'), text('foliono'), units, nav, allottedAmount, text('validflag')]);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ key, orderId, clientCode, schemeCode, schemeName: text('scheme_name') || schemeCode, orderDate: text('orderdate'), reportDate: text('reportdate'), folio: text('foliono'), units, nav, allottedAmount, orderAmount: number('amount'), valid, confirmed: valid && units != null && units > 0 && nav != null && nav > 0 && allottedAmount != null && allottedAmount > 0, clientName: text('clientname'), requestedUnits: number('qty'), load: number('load_amount'), tax: number('tax_amount'), stt: number('stt'), remark: text('remarks'), memberReference: text('member_unique_id') }];
  });
}
export async function getNSERedemptions(input: RedemptionStatementRequest) {
  return parseNSERedemptions(await nseApi.redemptions(buildNSERedemptionRequest(input)));
}
