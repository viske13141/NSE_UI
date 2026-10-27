import { nseApi } from './nseApi';
import type { PurchasePaymentRequest } from '@/types/nse';
export const NSE_PAYMENT_MODES = { netbanking: 'Netbanking', upi: 'UPI', mandate: 'Bank mandate', cheque: 'Cheque', neft: 'NEFT / RTGS' } as const;
export type NSEPaymentMode = keyof typeof NSE_PAYMENT_MODES;
export const NSE_PAYMENT_API_CODES: Record<NSEPaymentMode, string> = { netbanking: 'NETBANKING', upi: 'UPI', mandate: 'MANDATE', cheque: 'CHEQUE', neft: 'RTGS/NEFT' };
export interface NSEPaymentInput {
  mode: NSEPaymentMode; clientCode: string; orderId: string; orderAccepted: boolean;
  accountNo?: string; ifsc?: string; mandateId?: string; chequeNo?: string; chequeDate?: string;
  vpa?: string; utr?: string; callbackUrl?: string;
}
export function buildNSEPayment(input: NSEPaymentInput): PurchasePaymentRequest {
  if (!input.orderAccepted || !/^\d{1,12}$/.test(input.orderId) || Number(input.orderId) <= 0) throw new Error('An accepted Mutual funds order is required for payment');
  if (!input.clientCode || input.clientCode.length > 12) throw new Error('A valid Mutual funds client code is required');
  if (!Object.prototype.hasOwnProperty.call(NSE_PAYMENT_MODES, input.mode)) throw new Error('Select a valid payment mode');
  const body: PurchasePaymentRequest = { payment_mode: NSE_PAYMENT_API_CODES[input.mode], client_code: input.clientCode, order_ids: input.orderId };
  if (['netbanking', 'upi', 'cheque'].includes(input.mode)) {
    if (!/^\d{1,50}$/.test(input.accountNo || '')) throw new Error('The registered unmasked bank account number is required for this payment method');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(input.ifsc || '')) throw new Error('A valid registered bank IFSC is required');
    body.bank_account_no = input.accountNo; body.ifsc = input.ifsc;
  }
  if (input.mode === 'mandate') {
    if (!/^\d{1,13}$/.test(input.mandateId || '')) throw new Error('Enter a valid active mandate ID belonging to this investor');
    body.mandate_id = input.mandateId;
  }
  if (input.mode === 'upi') {
    if (!/^[^\s@]+@[^\s@]+$/.test(input.vpa?.trim() || '') || input.vpa!.trim().length > 255) throw new Error('Enter a valid UPI ID');
    body.vpa = input.vpa!.trim();
  }
  if (input.mode === 'cheque') {
    if (!/^\d{1,7}$/.test(input.chequeNo || '')) throw new Error('Enter a cheque number of at most seven digits');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.chequeDate || '')) throw new Error('Select a valid cheque date');
    const [year, month, day] = input.chequeDate!.split('-').map(Number);
    const date = Date.UTC(year, month - 1, day);
    if (new Date(date).toISOString().slice(0, 10) !== input.chequeDate) throw new Error('Select a valid cheque date');
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
    const today = Date.UTC(part('year'), part('month') - 1, part('day'));
    if (date < today - 90 * 86400000 || date > today + 3 * 86400000) throw new Error('Cheque date must be within 90 days before to 3 days after today');
    body.cheque_no = input.chequeNo; body.cheque_date = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  if (input.mode === 'neft') {
    if (!input.utr?.trim() || input.utr.trim().length > 30) throw new Error('Enter the NEFT / RTGS UTR, at most 30 characters');
    body.neft_rtgs_utr_no = input.utr.trim();
  }
  if (input.callbackUrl?.trim() && ['netbanking', 'upi'].includes(input.mode)) {
    let url: URL;
    try { url = new URL(input.callbackUrl.trim()); } catch { throw new Error('Enter a valid callback URL'); }
    if (url.protocol !== 'https:' || url.username || url.password || input.callbackUrl.trim().length > 255) throw new Error('Callback URL must be HTTPS and at most 255 characters');
    body.callback_url = input.callbackUrl.trim();
  }
  return body;
}
export async function initiateNSEPayment(input: NSEPaymentInput) {
  const response = await nseApi.purchasePayment(buildNSEPayment(input));
  if (response?.status?.trim().toLowerCase() !== 'success') throw new Error(response?.remark || 'Mutual funds did not confirm payment initiation. Check status before retrying.');
  if (response.client_code?.trim() && response.client_code.trim() !== input.clientCode) throw new Error('Payment response does not match the selected investor. Check status before retrying.');
  if (response.order_ids?.trim() && response.order_ids.trim() !== input.orderId) throw new Error('Payment response does not match the selected order. Check status before retrying.');
  let paymentUrl: string | null = null;
  if (response.short_url?.trim()) {
    let url: URL;
    try { url = new URL(response.short_url.trim()); } catch { throw new Error('Mutual funds returned an invalid payment link. Check status before retrying.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Mutual funds returned an unsafe payment link. Check status before retrying.');
    paymentUrl = url.href;
  }
  return { paymentUrl, basketId: response.basket_id?.trim() || null, message: response.remark?.trim() || 'Payment request initiated' };
}
