import { NSE_DOCUMENT_SWP_FREQUENCIES } from './nseTransactionOptions';
import { nseApi } from './nseApi';
import { parseNSEDueDate } from './nseSipPauseService';
import type { NSEInvestorSelection } from './nseInvestorService';
export const SWP_FREQUENCIES = NSE_DOCUMENT_SWP_FREQUENCIES;
export interface NSESwpInput {
  investor: NSEInvestorSelection; scheme: string; mode: 'P' | 'D'; folio: string;
  start: string; end: string; frequency: string; transfers: string; amount: string; units: string;
  firstToday: boolean; euinDeclaration: 'Y' | 'N'; euin: string; mobile: string; email: string; remarks: string; reference: string;
}
export function buildNSESwp(input: NSESwpInput) {
  const investor = input.investor;
  if (!investor?.kycVerified || !investor.bank.active || !investor.clientCode || investor.clientCode.length > 10) throw new Error('Select a verified Mutual funds investor with an active bank');
  if (!input.scheme.trim() || input.scheme.length > 20) throw new Error('Select a valid Mutual funds scheme code');
  if (!investor.bank.accountNo || !/^\d{1,50}$/.test(investor.bank.accountNo)) throw new Error('An unmasked registered payout bank account is required');
  if (!['P', 'D'].includes(input.mode)) throw new Error('Select physical or demat mode');
  if (input.mode === 'D' && (/NON\s*DEMAT|PHYSICAL/i.test(investor.clientType || '') || /^(PHYS|PHYSICAL|P)$/i.test(investor.depository || ''))) throw new Error('Demat is not allowed for this physical client');
  if (input.folio.length > 15 || (input.mode === 'P' && !input.folio.trim())) throw new Error('Physical SWP requires a folio of up to 15 characters');
  const start = parseNSEDueDate(input.start);
  if (start < new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) throw new Error('Start date cannot be in the past');
  if (!(SWP_FREQUENCIES as readonly string[]).includes(input.frequency)) throw new Error('Select a valid SWP frequency');
  let end = '', transfers = '';
  if (input.frequency === 'DAILY') { end = parseNSEDueDate(input.end); if (end <= start) throw new Error('Daily SWP end date must be after start'); }
  else { if (!/^\d+$/.test(input.transfers) || Number(input.transfers) < 1) throw new Error('Enter a positive number of transfers'); transfers = input.transfers; }
  const decimal = (value: string, digits: number, places: number) => new RegExp(`^\\d{1,${digits}}(\\.\\d{1,${places}})?$`).test(value) && Number(value) > 0;
  if (input.mode === 'D' && (input.amount && Number(input.amount) !== 0 || !decimal(input.units, 9, 3))) throw new Error('Demat SWP requires units; the amount must be blank or zero');
  if (input.mode === 'P' && (!!input.amount === !!input.units)) throw new Error('Enter either an amount or units for physical SWP');
  if (input.amount && Number(input.amount) !== 0 && !decimal(input.amount, 10, 2)) throw new Error('Amount must have at most 10 integer digits and two decimal places');
  if (input.units && !decimal(input.units, 9, 3)) throw new Error('Units must have at most 9 integer digits and three decimal places');
  if (input.mode === 'P' && input.amount && Number(input.amount) <= 0) throw new Error('Enter a positive amount');
  const mobile = input.mobile.trim(), email = input.email.trim();
  if (input.mode === 'P' && !mobile && !email) throw new Error('Physical SWP requires a mobile number or email');
  if (mobile && !/^[6-9]\d{9}$/.test(mobile)) throw new Error('Enter a valid mobile number');
  if (email && (email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Enter a valid email');
  if (!['Y', 'N'].includes(input.euinDeclaration) || input.euinDeclaration === 'Y' && !/^E\d{6}$/.test(input.euin.toUpperCase())) throw new Error('EUIN must be E followed by six digits when declaration is Y');
  if (input.remarks.length > 200 || !input.reference || input.reference.length > 25) throw new Error('Remarks or reference is too long');
  return { reg_data: [{ client_code: investor.clientCode, scheme_code: input.scheme, account_no: investor.bank.accountNo, trans_mode: input.mode, folio_no: input.folio.trim(), internal_ref_no: input.reference, member_unique_id: input.reference, start_date: start.split('-').reverse().join('/'), frequency_type: input.frequency, no_of_withdrawals: transfers, end_date: end ? end.split('-').reverse().join('/') : '', installment_amount: input.mode === 'D' ? '' : input.amount, installment_units: input.units, first_order_today: input.firstToday ? 'Y' : 'N', euin_declaration: input.euinDeclaration, euin_number: input.euinDeclaration === 'Y' ? input.euin.toUpperCase() : '', mobile, email, remarks: input.remarks, sub_broker_code: '', sub_broker_arn: '' }] };
}
export async function registerNSESwp(input: NSESwpInput) {
  const response = await nseApi.registerSwp(buildNSESwp(input));
  const rows = response?.reg_data;
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.client_code?.trim().toUpperCase() !== input.investor.clientCode.toUpperCase() || rows[0]?.scheme_code?.trim().toUpperCase() !== input.scheme.toUpperCase()) throw new Error('Mutual funds returned no matching SWP result. Check registration status before retrying.');
  const row = rows[0], id = row.reg_id?.trim() || '';
  const status = row.reg_status === 'REG_FAILED' ? 'rejected' as const : row.reg_status === 'REG_SUCCESS' && /^\d{1,15}$/.test(id) && /[1-9]/.test(id) ? 'successful' as const : 'pending' as const;
  return { status, registrationId: status === 'successful' ? id : undefined, rawStatus: row.reg_status || 'Confirmation unknown', remark: row.reg_remark?.trim() || 'Registration does not confirm a redemption or bank payout.' };
}
