import { nseApi } from './nseApi';
import { indiaReportDates } from './nseOrderReportService';
import type { NSEInvestorSelection } from './nseInvestorService';
import type { MandateRegistrationRequest } from '@/types/nse';
export const NSE_ACCOUNT_TYPES = ['SB', 'CB', 'NE', 'NO'] as const;
export interface NSEMandateInput { investor: NSEInvestorSelection; amount: number; type: 'X' | 'E'; accountType: string; micr: string; startDate: string; endDate: string; processedByMember: boolean; registrationDate: string; reference: string }
const date = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Select valid mandate dates');
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('Select valid mandate dates');
  return value.split('-').reverse().join('/');
};
export function buildNSEMandate(input: NSEMandateInput): MandateRegistrationRequest {
  if (!input.investor.clientCode || input.investor.clientCode.length > 10) throw new Error('A valid Mutual funds client code is required');
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 9999999999999.99 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.0001) throw new Error('Enter a maximum debit amount with at most two decimal places');
  if (!['X', 'E'].includes(input.type)) throw new Error('Mandate type must be X (Physical/Scan) or E (eNACH)');
  const bank = input.investor.bank;
  if (!bank.active || !/^\d{1,40}$/.test(bank.accountNo || '')) throw new Error('Select an active registered bank with an unmasked account number');
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc || '')) throw new Error('A valid registered bank IFSC is required');
  if (!(NSE_ACCOUNT_TYPES as readonly string[]).includes(input.accountType)) throw new Error('Select account type SB, CB, NE or NO');
  if (bank.accountType && input.accountType !== bank.accountType) throw new Error('Account type must match Client Master');
  if (input.micr.trim() && !/^\d{9}$/.test(input.micr.trim())) throw new Error('MICR must be nine digits when provided');
  const start = date(input.startDate), end = date(input.endDate);
  const today = indiaReportDates().to;
  if (input.startDate < today) throw new Error('Mandate start date cannot be in the past');
  if (input.endDate <= input.startDate) throw new Error('Mandate end date must be after the start date');
  let registrationDate: string | undefined;
  if (input.processedByMember) {
    registrationDate = date(input.registrationDate);
    if (input.registrationDate > today || input.registrationDate > input.startDate) throw new Error('Registration date cannot be in the future or after the start date');
  }
  if (!input.reference.trim() || input.reference.length > 20) throw new Error('A unique member mandate reference of at most 20 characters is required');
  return { reg_data: [{ client_code: input.investor.clientCode, amount: String(input.amount), mandate_type: input.type, account_no: bank.accountNo, ac_type: input.accountType, ifsc_code: bank.ifsc, micr_no: input.micr.trim(), start_date: start, end_date: end, ...(registrationDate ? { registration_date: registrationDate } : {}), member_mandate_no: input.reference }] };
}
export interface NSEMandateRecord { reference: string; clientCode: string; investor: string; bank: string; amount: number; type: 'X' | 'E'; startDate: string; endDate: string; registrationId?: string; status: 'registered' | 'rejected' | 'unknown'; rawStatus: string; remark: string }
export async function registerNSEMandate(input: NSEMandateInput): Promise<NSEMandateRecord> {
  const response = await nseApi.registerMandate(buildNSEMandate(input));
  if (!Array.isArray(response?.reg_data) || response.reg_data.length !== 1) throw new Error('Mandate response is unreadable. Check mandate status before retrying.');
  const row = response.reg_data[0], rawStatus = row.reg_status?.trim() || 'Confirmation unknown';
  const id = row.reg_id?.trim();
  const registrationId = id && /^\d+$/.test(id) && Number(id) > 0 ? id : undefined;
  const status = rawStatus === 'REG_FAILED' ? 'rejected' : rawStatus === 'REG_SUCCESS' && registrationId ? 'registered' : 'unknown';
  return { reference: input.reference, clientCode: input.investor.clientCode, investor: input.investor.name, bank: input.investor.bank.label, amount: input.amount, type: input.type, startDate: input.startDate, endDate: input.endDate, registrationId, status, rawStatus, remark: row.reg_remark?.trim() || (status === 'registered' ? 'Mandate registered. Approval and bank authorization are not confirmed.' : 'Mandate registration is not confirmed') };
}
