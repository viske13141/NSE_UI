import { nseApi } from './nseApi';
import type { OrderStatusRequest, OrderStatusResponse } from '@/types/nse';
export const NSE_ORDER_FILTERS = {
  trans_type: ['ALL', 'P', 'R'], order_type: ['ALL', 'NRM', 'SIP', 'XSP', 'STP'],
  sub_order_type: ['ALL', 'NRM', 'SPOR', 'SWH', 'STP'],
  order_status: ['', 'All', 'VALID', 'INVALID'], settlement_type: ['', 'ALL', 'L0', 'L1', 'OTHERS'],
} as const;
export interface NSEOrderReportRow {
  orderId: string; clientCode: string; schemeCode: string; schemeName: string;
  transaction: string; amount: string; quantity: string; status: string; remark: string;
  orderType?: string; subOrderType?: string; date: string; folio: string; memberReference: string;
}
export function indiaReportDates() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  const end = Date.UTC(part('year'), part('month') - 1, part('day'));
  return { from: new Date(end - 6 * 86400000).toISOString().slice(0, 10), to: new Date(end).toISOString().slice(0, 10) };
}
export function buildNSEOrderReport(body: OrderStatusRequest, provisional = false): OrderStatusRequest {
  const parseDate = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Report dates must use YYYY-MM-DD');
    const time = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date) throw new Error('Enter valid report dates');
    return time;
  };
  const start = parseDate(body.from_date), end = parseDate(body.to_date);
  if (end < start || end - start > 6 * 86400000) throw new Error('Choose a date range of at most seven calendar days');
  for (const [key, values] of Object.entries(NSE_ORDER_FILTERS)) {
    const value = body[key as keyof OrderStatusRequest] || '';
    if (!(values as readonly string[]).includes(value)) throw new Error(`Invalid ${key.replace(/_/g, ' ')} filter`);
  }
  if ((body.client_code?.trim().length || 0) > 20) throw new Error('Client code must be at most 20 characters');
  const result: OrderStatusRequest = { from_date: body.from_date, to_date: body.to_date, trans_type: body.trans_type, order_type: body.order_type, sub_order_type: body.sub_order_type };
  if (body.order_ids?.trim()) {
    const ids = body.order_ids.split(',').map(id => id.trim());
    if (ids.length > 50 || ids.some(id => !/^\d+$/.test(id))) throw new Error('Use at most 50 numeric order IDs');
    return { ...result, trans_type: 'ALL', order_type: 'ALL', sub_order_type: 'ALL', order_ids: ids.join(',') };
  }
  if (body.member_unique_ids?.trim()) {
    const ids = body.member_unique_ids.split(',').map(id => id.trim());
    if (ids.length > 50 || ids.some(id => !id || id.length > 25)) throw new Error('Use at most 50 member references of at most 25 characters each');
    return { ...result, trans_type: 'ALL', order_type: 'ALL', sub_order_type: 'ALL', member_unique_ids: ids.join(',') };
  }
  for (const key of ['client_code', 'order_status', 'settlement_type'] as const) if (body[key]?.trim()) result[key] = body[key].trim();
  if (provisional) {
    if (body.date_type && !['REQUEST DATE', 'ORDER DATE'].includes(body.date_type)) throw new Error('Invalid provisional report date type');
    result.date_type = body.date_type || 'REQUEST DATE';
    if (body.sip_reg_nos?.trim()) {
      if (!/^\d{1,15}$/.test(body.sip_reg_nos.trim())) throw new Error('SIP registration number must be numeric and at most 15 digits');
      result.sip_reg_nos = body.sip_reg_nos.trim();
    }
  }
  if (body.instalment_no) result.instalment_no = 'Y';
  return result;
}
export function parseNSEOrderReport(response: OrderStatusResponse): NSEOrderReportRow[] {
  if (response.response_status !== 'S') throw new Error(response.error_remark || 'Mutual funds order report failed');
  if (!Array.isArray(response.report_data)) throw new Error('Mutual funds returned an invalid order report');
  return response.report_data.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Mutual funds returned an unreadable order record');
    const row = item as Record<string, unknown>;
    const value = (key: string) => row[key] == null ? '' : String(row[key]).trim();
    if (!/^\d+$/.test(value('order_id')) || !value('client_code')) throw new Error('Mutual funds order record is missing its order ID or client code');
    return { orderType: value('order_type'), subOrderType: value('sub_order_type'), orderId: value('order_id'), clientCode: value('client_code'), schemeCode: value('scheme_code'), schemeName: value('scheme_name'), transaction: value('transaction_type'), amount: value('amount'), quantity: value('quantity'), status: value('order_status'), remark: value('order_remark'), date: value('order_date') || value('request_date'), folio: value('folio_no'), memberReference: value('member_unique_id') };
  });
}
export async function getNSEOrderReport(body: OrderStatusRequest, provisional = false) {
  const request = buildNSEOrderReport(body, provisional);
  return parseNSEOrderReport(await (provisional ? nseApi.provisionalOrders(request) : nseApi.orderStatus(request)));
}
