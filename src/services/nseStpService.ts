import { NSE_DOCUMENT_PLAN_FREQUENCIES } from './nseTransactionOptions';
import { nseApi } from './nseApi';
import { parseNSEDueDate } from './nseSipPauseService';
import type { NSEInvestorSelection } from './nseInvestorService';
export const STP_FREQUENCIES = NSE_DOCUMENT_PLAN_FREQUENCIES;
export interface NSEStpInput {
  investor: NSEInvestorSelection; from: string; to: string; mode: 'C' | 'N' | 'P'; buySellType?: 'FRESH' | 'ADDITIONAL'; folio: string;
  start: string; end: string; frequency: string; transfers: string; amount: string; units: string;
  firstToday: boolean; euinDeclaration: 'Y' | 'N'; euin: string; mobile: string; email: string; remarks: string; reference: string;
}
export function buildNSEStp(input: NSEStpInput) {
  const investor = input.investor;
  if (!investor?.kycVerified || !investor.bank.active || !investor.clientCode || investor.clientCode.length > 10) throw new Error('Select a verified Mutual funds investor with an active bank');
  if (!input.from.trim() || !input.to.trim() || input.from.length > 20 || input.to.length > 20 || input.from === input.to) throw new Error('Select different source and destination scheme codes');
  if (!['C', 'N', 'P'].includes(input.mode)) throw new Error('Select CDSL, NSDL or physical STP mode');
  if (input.buySellType && !['FRESH', 'ADDITIONAL'].includes(input.buySellType)) throw new Error('Select fresh or additional STP purchase');
  if (input.mode !== 'P' && (/NON\s*DEMAT|PHYSICAL/i.test(investor.clientType || '') || /^(PHYS|PHYSICAL|P)$/i.test(investor.depository || ''))) throw new Error('Demat is not allowed for this physical client');
  if (input.mode === 'C' && /^(NSDL|N)$/i.test(investor.depository || '') || input.mode === 'N' && /^(CDSL|C)$/i.test(investor.depository || '')) throw new Error('STP depository mode must match Client Master');
  if (input.folio.length > 15 || (input.mode === 'P' && !input.folio.trim())) throw new Error('Physical STP requires a folio of up to 15 characters');
  const start = parseNSEDueDate(input.start);
  if (start < new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) throw new Error('Start date cannot be in the past');
  if (!(STP_FREQUENCIES as readonly string[]).includes(input.frequency)) throw new Error('Select a valid STP frequency');
  let end = '', transfers = '';
  if (input.frequency === 'DAILY') { end = parseNSEDueDate(input.end); if (end <= start) throw new Error('Daily STP end date must be after start'); }
  else { if (!/^\d+$/.test(input.transfers) || Number(input.transfers) < 1) throw new Error('Enter a positive number of transfers'); transfers = input.transfers; }
  const decimal = (value: string, digits: number, places: number) => new RegExp(`^\\d{1,${digits}}(\\.\\d{1,${places}})?$`).test(value) && Number(value) > 0;
  if (input.mode !== 'P' && (input.amount && Number(input.amount) !== 0 || !decimal(input.units, 12, 3))) throw new Error('Demat STP requires units; the amount must be blank or zero');
  if (input.mode === 'P' && (!!input.amount === !!input.units)) throw new Error('Enter either an amount or units for physical STP');
  if (input.amount && Number(input.amount) !== 0 && !decimal(input.amount, 13, 2)) throw new Error('Amount must have at most 13 integer digits and two decimal places');
  if (input.units && !decimal(input.units, 12, 3)) throw new Error('Units must have at most 12 integer digits and three decimal places');
  if (input.mode === 'P' && input.amount && Number(input.amount) <= 0) throw new Error('Enter a positive amount');
  const mobile = input.mobile.trim(), email = input.email.trim();
  if (input.mode === 'P' && !mobile && !email) throw new Error('Physical STP requires a mobile number or email');
  if (mobile && !/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid mobile number');
  if (email && (email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Enter a valid email');
  if (!['Y', 'N'].includes(input.euinDeclaration) || input.euinDeclaration === 'Y' && !/^E\d{6}$/.test(input.euin.toUpperCase())) throw new Error('EUIN must be E followed by six digits when declaration is Y');
  if (input.remarks.length > 200 || !input.reference || input.reference.length > 25) throw new Error('Remarks or reference is too long');
  return { reg_data: [{ client_code: investor.clientCode, from_scheme_code: input.from, to_scheme_code: input.to, buy_sell_type: input.buySellType || 'ADDITIONAL', transaction_mode: input.mode, folio_no: input.folio.trim(), internal_ref_number: input.reference, member_unique_id: input.reference, start_date: start.split('-').reverse().join('/'), frequency_type: input.frequency, no_of_transfers: transfers, to_date: end ? end.split('-').reverse().join('/') : '', installment_amount: input.mode !== 'P' ? '' : input.amount, installment_units: input.units, first_order_today: input.firstToday ? 'Y' : 'N', euin_declaration: input.euinDeclaration, euin_number: input.euinDeclaration === 'Y' ? input.euin.toUpperCase() : '', mobile, email, remarks: input.remarks, sub_broker_code: '', sub_broker_arn_code: '' }] };
}
export async function registerNSEStp(input: NSEStpInput) {
  const response = await nseApi.registerStp(buildNSEStp(input));
  const rows = response?.reg_data;
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.client_code?.trim().toUpperCase() !== input.investor.clientCode.toUpperCase() || rows[0]?.from_scheme_code?.trim().toUpperCase() !== input.from.toUpperCase() || rows[0]?.to_scheme_code?.trim().toUpperCase() !== input.to.toUpperCase()) throw new Error('Mutual funds returned no matching STP result. Check registration status before retrying.');
  const row = rows[0], id = row.reg_id?.trim() || '';
  const status = row.reg_status === 'REG_FAILED' ? 'rejected' as const : row.reg_status === 'REG_SUCCESS' && /^\d{1,15}$/.test(id) && /[1-9]/.test(id) ? 'successful' as const : 'pending' as const;
  return { status, registrationId: status === 'successful' ? id : undefined, rawStatus: row.reg_status || 'Confirmation unknown', remark: row.reg_remark?.trim() || 'Registration does not confirm a transfer or unit allotment.' };
}
