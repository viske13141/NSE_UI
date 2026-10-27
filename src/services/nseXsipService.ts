import type { XSIPDetail, XSIPRegistrationResponse, XSIPRegistrationRequest } from '@/types/nse';
import { nseApi } from './nseApi';
import { buildNSEPlan, type NSESipInput } from './nseSipService';

export const NSE_XSIP_FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'FORTNIGHTLY', 'SEMI-ANNUAL', 'ANNUAL', 'DAILY'] as const;
export interface XSIPApprovedMandate { id: string; bank: string; amount: number; }
export async function loadXSIPMandates(clientCode: string): Promise<XSIPApprovedMandate[]> {
  const response = await nseApi.mandateStatus({ client_code: clientCode });
  if (response.response_status !== 'S' || !Array.isArray(response.report_data)) throw new Error(response.error_remark || 'Unable to load approved XSIP mandates');
  return response.report_data.flatMap(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const id = String(row.mandateId ?? '').trim(), amount = Number(row.amount);
    if (String(row.clientCode ?? '').trim() !== clientCode || String(row.status).trim().toUpperCase() !== 'APPROVED' || !/^\d+$/.test(id) || !/[1-9]/.test(id) || !Number.isFinite(amount) || amount <= 0) return [];
    return [{ id, bank: String(row.bankName || 'Registered bank'), amount }];
  });
}
export interface NSEXsipInput extends NSESipInput { approvedMandate: XSIPApprovedMandate | null; }
export function buildNSEXsip(input: NSEXsipInput): XSIPRegistrationRequest {
  if (!(NSE_XSIP_FREQUENCIES as readonly string[]).includes(input.frequency)) throw new Error('Select a valid XSIP frequency');
  if (!input.approvedMandate || input.approvedMandate.id !== input.mandateId || !/^\d+$/.test(input.mandateId)) throw new Error('Select an approved mandate for this investor');
  if (input.amount > input.approvedMandate.amount) throw new Error('XSIP installment amount exceeds the mandate debit limit');
  // Reuse shared investor, date, amount and depository rules, then apply XSIP wire names.
  const { internal_ref_no, sip_mandate_id, ...detail } = buildNSEPlan(input, NSE_XSIP_FREQUENCIES).reg_data[0];
  return { reg_data: [{ ...detail, frequency_type: input.frequency, bank_ref_no: '', xsip_mandate_id: input.mandateId, convenience_fee: '0', isip_mandate: '' }] };
}
export async function registerNSEXsip(input: NSEXsipInput) {
  const body = buildNSEXsip(input);
  const mandates = await loadXSIPMandates(input.investor.clientCode);
  const approved = mandates.find(item => item.id === input.mandateId);
  if (!approved || approved.amount < input.amount) throw new Error('Mandate approval or debit limit changed. Refresh the mandate report before retrying.');
  const result = parseXSIPRegistration(await nseApi.registerXsip(body), body.reg_data[0]);
  return { status: result.state === 'registered' ? 'successful' as const : result.state === 'rejected' ? 'rejected' as const : 'pending' as const, registrationId: result.registrationId || undefined, rawStatus: result.state === 'registered' ? 'REG_SUCCESS' : result.state === 'rejected' ? 'REG_FAILED' : 'Confirmation unknown', remark: result.remark || 'XSIP registered. Authorization, installment payment and allotment are separate.' };
}

// Response parsing is independent of the registration form: XSIP request rules
// must be confirmed from the field documentation before enabling submission.
export function parseXSIPRegistration(response: XSIPRegistrationResponse, submitted: Pick<XSIPDetail, 'client_code' | 'sch_code'>) {
  if (!Array.isArray(response?.reg_data) || response.reg_data.length !== 1) throw new Error('Mutual funds returned an unreadable XSIP registration result');
  const row = response.reg_data[0];
  if (!row || row.client_code?.trim().toUpperCase() !== submitted.client_code?.trim().toUpperCase() || row.sch_code?.trim().toUpperCase() !== submitted.sch_code?.trim().toUpperCase()) throw new Error('Mutual funds returned a different XSIP client or scheme; registration is not confirmed');
  const status = row.reg_status?.trim();
  const remark = row.reg_remark?.trim() || '';
  if (status === 'REG_FAILED') return { state: 'rejected' as const, registrationId: '', remark: remark || 'Mutual funds rejected the XSIP registration' };
  const id = row.reg_id?.trim() || '';
  if (status === 'REG_SUCCESS' && /^\d{1,15}$/.test(id) && /[1-9]/.test(id)) return { state: 'registered' as const, registrationId: id, remark };
  return { state: 'unknown' as const, registrationId: '', remark: remark || 'XSIP registration is not confirmed. Check Mutual funds before retrying.' };
}
