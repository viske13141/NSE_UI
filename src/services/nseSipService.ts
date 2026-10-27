import { NSE_DOCUMENT_PLAN_FREQUENCIES } from './nseTransactionOptions';
﻿import { nseApi } from './nseApi';
import { indiaReportDates } from './nseOrderReportService';
import type { NSEInvestorSelection } from './nseInvestorService';
import type { SIPRegistrationRequest } from '@/types/nse';
export const NSE_SIP_FREQUENCIES = NSE_DOCUMENT_PLAN_FREQUENCIES;
export interface NSESipInput {
  amcCode: string; schemeCode: string; investor: NSEInvestorSelection; memberCode: string;
  amount: number; startDate: string; frequency: string; installments: string; endDate: string;
  dpMode: 'C' | 'N' | 'P' | ''; folio: string; mandateId: string;
  euinDeclaration: 'Y' | 'N'; euin: string; firstOrderToday: boolean; reference: string;
  mobile?: string; email?: string; remarks?: string; subBrokerCode?: string; subBrokerArn?: string; internalReference?: string;
}
export function nseSipInvestorMode(investor: NSEInvestorSelection | null | undefined): NSESipInput['dpMode'] {
  if (/^(P|PHYS|PHYSICAL|NON\s*DEMAT)$/i.test(investor?.clientType || '') || /^(PHYS|PHYSICAL|P)$/i.test(investor?.depository || '')) return 'P';
  if (/^(CDSL|C)$/i.test(investor?.depository || '')) return 'C';
  if (/^(NSDL|N)$/i.test(investor?.depository || '')) return 'N';
  return '';
}
const date = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Select a valid SIP date');
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('Select a valid SIP date');
  return value.split('-').reverse().join('/');
};
export function buildNSESip(input: NSESipInput): SIPRegistrationRequest {
  return buildNSEPlan(input, NSE_SIP_FREQUENCIES);
}
// SIP and XSIP share field validation but have distinct documented frequency codes.
export function buildNSEPlan(input: NSESipInput, allowedFrequencies: readonly string[]): SIPRegistrationRequest {
  if (!input.investor?.kycVerified || !input.investor.bank.active || !input.investor.clientCode || input.investor.clientCode.length > 10) throw new Error('A KYC-verified Mutual funds investor and active bank are required');
  if (!input.amcCode.trim() || input.amcCode.length > 50 || !input.schemeCode.trim() || input.schemeCode.length > 20) throw new Error('Valid Mutual funds AMC and scheme codes are required');
  if (!/^\d{1,20}$/.test(input.memberCode.trim())) throw new Error('An Mutual funds member code of up to 20 digits is required');
  if (input.investor.memberCode && input.memberCode.trim() !== input.investor.memberCode) throw new Error('Member code must match Client Master');
  if (!['C', 'N', 'P'].includes(input.dpMode)) throw new Error('Select a SIP depository mode');
  const physicalClient = nseSipInvestorMode(input.investor) === 'P';
  if (physicalClient && input.dpMode !== 'P') throw new Error('Demat SIP is not allowed for this non-demat client. Select physical mode.');
  if (input.dpMode === 'C' && /^(NSDL|N)$/i.test(input.investor.depository || '') || input.dpMode === 'N' && /^(CDSL|C)$/i.test(input.investor.depository || '')) throw new Error('SIP depository mode must match Client Master');
  const start = date(input.startDate);
  if (input.startDate < indiaReportDates().to) throw new Error('SIP start date cannot be in the past');
  if (!allowedFrequencies.includes(input.frequency)) throw new Error('Select a valid SIP frequency');
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 9999999999.99 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.0001) throw new Error('Enter a SIP amount with at most two decimal places');
  let end = '', installments = '';
  if (input.frequency === 'DAILY') {
    end = date(input.endDate);
    if (input.endDate <= input.startDate) throw new Error('Daily SIP end date must be after the start date');
  } else {
    if (!/^\d+$/.test(input.installments) || Number(input.installments) < 1) throw new Error('Enter a positive installment count');
    installments = input.installments;
  }
  if (input.folio.trim().length > 15) throw new Error('Folio must be at most 15 characters');
  if (input.mandateId.trim() && (!/^\d{1,13}$/.test(input.mandateId.trim()) || !/[1-9]/.test(input.mandateId))) throw new Error('Mandate ID must contain up to 13 digits and be greater than zero');
  if (!['Y', 'N'].includes(input.euinDeclaration) || input.euinDeclaration === 'Y' && !/^E\d{6}$/.test(input.euin.trim().toUpperCase())) throw new Error('EUIN is required when declaration is Y and must be E followed by six digits');
  if (!input.reference || input.reference.length > 25) throw new Error('A unique SIP reference of at most 25 characters is required');
  const internalReference = input.internalReference || input.reference.slice(-10);
  if (internalReference.length > 10 || /[|\r\n]/.test(internalReference)) throw new Error('SIP internal reference must contain up to 10 characters');
  const mobile = input.mobile?.trim() || '', email = input.email?.trim() || '', remarks = input.remarks?.trim() || '';
  const subBrokerCode = input.subBrokerCode?.trim() || '', subBrokerArn = input.subBrokerArn?.trim() || '';
  if (mobile && !/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid 10-digit primary holder mobile');
  if (email && (email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Enter a valid primary holder email within 50 characters');
  if (remarks.length > 100) throw new Error('SIP remarks must be at most 100 characters');
  if (subBrokerCode.length > 15) throw new Error('Sub-broker code must be at most 15 characters');
  if (subBrokerArn && (subBrokerArn.length > 20 || !/^ARN/i.test(subBrokerArn))) throw new Error('Sub-broker ARN must start with ARN and contain up to 20 characters');
  return { reg_data: [{
    amc_code: input.amcCode.trim(), sch_code: input.schemeCode.trim(), client_code: input.investor.clientCode,
    internal_ref_no: internalReference, trans_mode: input.dpMode === 'P' ? 'P' : 'D', dp_txn_mode: input.dpMode,
    start_date: start, frequency_type: input.frequency, frequency_allowed: '1', installment_amount: String(input.amount), status: '1',
    member_code: input.memberCode.trim(), folio_no: input.folio.trim(), sip_remarks: remarks, installment_no: installments,
    sip_mandate_id: input.mandateId.trim(), sub_broker_code: subBrokerCode, euin_number: input.euinDeclaration === 'Y' ? input.euin.trim().toUpperCase() : '', euin_declaration: input.euinDeclaration,
    dpc_flag: 'Y', first_order_today: input.firstOrderToday ? 'Y' : 'N', sub_broker_arn: subBrokerArn, end_date: end,
    primary_holder_mobile: mobile, primary_holder_email: email, step_up_required: 'N', step_up_start_date: '', step_up_end_date: '', step_up_frequency: '', step_up_amount: '',
    filler_1: '', filler_2: '', filler_3: '', filler_4: '', filler_5: '', member_unique_id: input.reference,
  }] };
}
export async function checkNSESipMandate(input: NSESipInput): Promise<void> {
  if (!input.mandateId.trim()) return;
  const response = await nseApi.mandateStatus({ mandate_id: input.mandateId.trim() });
  if (response.response_status !== 'S' || !Array.isArray(response.report_data)) throw new Error('Unable to verify the SIP mandate. Refresh its status before continuing.');
  const matching = response.report_data.filter(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const row = value as Record<string, unknown>;
    return String(row.mandateId ?? row.mandate_id ?? '').trim() === input.mandateId.trim() &&
      String(row.clientCode ?? row.client_code ?? '').trim() === input.investor.clientCode;
  }) as Record<string, unknown>[];
  if (!matching.length || matching.some(row => String(row.status ?? row.mandate_status ?? '').trim().toUpperCase() !== 'APPROVED')) throw new Error('The SIP mandate must belong to this investor and be APPROVED. A processing mandate cannot be used yet.');
  if (matching.some(row => !Number.isFinite(Number(row.amount ?? row.mandate_amount)) || Number(row.amount ?? row.mandate_amount) < input.amount)) throw new Error('The SIP mandate has no sufficient reported debit limit for this installment.');
}
export async function registerNSESip(input: NSESipInput) {
  const body = buildNSESip(input);
  await checkNSESipMandate(input);
  const response = await nseApi.registerSip(body);
  if (!Array.isArray(response.reg_data) || response.reg_data.length !== 1) throw new Error('SIP confirmation is unreadable. Check registration status before retrying.');
  const row = response.reg_data[0]; const rawStatus = row.reg_status?.trim() || 'Confirmation unknown';
  const id = row.reg_id?.trim(); const registrationId = id && /^\d{1,15}$/.test(id) && Number(id) > 0 ? id : undefined;
  const status = rawStatus === 'REG_FAILED' ? 'rejected' as const : rawStatus === 'REG_SUCCESS' && registrationId ? 'successful' as const : 'pending' as const;
  return { status, registrationId, rawStatus, remark: row.reg_remark?.trim() || (status === 'successful' ? 'SIP registered. Payment and mandate approval are separate.' : 'SIP registration is not confirmed') };
}
