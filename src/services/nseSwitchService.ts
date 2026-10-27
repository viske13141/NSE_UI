import { nseRequest } from './nseApi';
import type { NSEInvestorSelection } from './nseInvestorService';
export interface NSESwitchInput { investor: NSEInvestorSelection; from: string; to: string; mode: 'P' | 'C' | 'N'; folio: string; amount: string; units: string; allUnits: boolean; euinDeclaration: 'Y' | 'N'; euin: string; mobile: string; email: string; remarks: string; reference: string; subBrokerCode?: string; subBrokerArn?: string; }
export function nseSwitchInvestorMode(investor: NSEInvestorSelection | null): NSESwitchInput['mode'] | '' {
  if (/^(P|PHYS|PHYSICAL|NON\s*DEMAT)$/i.test(investor?.clientType || '') || /^(PHYS|PHYSICAL|P)$/i.test(investor?.depository || '')) return 'P';
  if (/^(C|CDSL)$/i.test(investor?.depository || '')) return 'C';
  if (/^(N|NSDL)$/i.test(investor?.depository || '')) return 'N';
  return '';
}
export function buildNSESwitch(input: NSESwitchInput) {
  const investor = input.investor;
  if (!investor?.kycVerified || !investor.bank.active || !investor.clientCode || investor.clientCode.length > 10) throw new Error('Select a verified Mutual funds investor with an active bank');
  if (!input.from.trim() || !input.to.trim() || input.from.length > 20 || input.to.length > 20 || input.from === input.to) throw new Error('Select different source and destination schemes');
  if (!['P', 'C', 'N'].includes(input.mode)) throw new Error('Select physical, CDSL or NSDL mode');
  const physical = nseSwitchInvestorMode(investor) === 'P';
  if (physical && input.mode !== 'P') throw new Error('Demat is not allowed for this physical client');
  if (input.mode === 'C' && /^(NSDL|N)$/i.test(investor.depository || '') || input.mode === 'N' && /^(CDSL|C)$/i.test(investor.depository || '')) throw new Error('Depository mode must match Client Master');
  if (input.folio.length > 15 || input.mode === 'P' && !input.folio.trim()) throw new Error('Physical switches require a source folio of up to 15 characters');
  const decimal = (value: string, digits: number, places: number) => new RegExp(`^\\d{1,${digits}}(\\.\\d{1,${places}})?$`).test(value) && Number(value) > 0;
  if (input.allUnits && (input.mode !== 'P' || input.amount || input.units)) throw new Error('All units is physical-only and requires blank amount and units');
  if (!input.allUnits) {
    if (!!input.amount === !!input.units) throw new Error('Enter either amount or units');
    if (input.mode !== 'P' && (input.amount || !input.units)) throw new Error('Demat switches require units and a blank amount');
    if (input.amount && !decimal(input.amount, 13, 2)) throw new Error('Amount allows 13 integer digits and two decimal places');
    if (input.units && !decimal(input.units, 12, 3)) throw new Error('Units allow 12 integer digits and three decimal places');
  }
  if (!['Y', 'N'].includes(input.euinDeclaration) || input.euinDeclaration === 'Y' && !/^E\d{6}$/.test(input.euin.toUpperCase())) throw new Error('Supply a valid EUIN when declaration is Y');
  if (input.mobile && !/^[6-9]\d{9}$/.test(input.mobile)) throw new Error('Enter a valid mobile');
  if (input.email && (input.email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))) throw new Error('Enter a valid email');
  if (input.remarks.length > 200 || !input.reference || input.reference.length > 25) throw new Error('Remarks or reference is too long');
  const subBrokerCode = input.subBrokerCode?.trim().replace(/^arn/i, 'ARN') || '', subBrokerArn = input.subBrokerArn?.trim().replace(/^arn/i, 'ARN') || '';
  if (subBrokerCode && (subBrokerCode.length > 15 || !/^ARN/i.test(subBrokerCode))) throw new Error('Sub-broker code must start with ARN and contain up to 15 characters');
  if (subBrokerArn && (subBrokerArn.length > 20 || !/^ARN/i.test(subBrokerArn))) throw new Error('Sub-broker ARN must start with ARN and contain up to 20 characters');
  return { transaction_details: [{ order_ref_number: '', from_scheme_code: input.from, to_scheme_code: input.to, buy_sell_type: '', client_code: investor.clientCode, demat_physical: input.mode, amount: input.amount, units: input.units, all_units: input.allUnits ? 'Y' : 'N', folio_no: input.folio.trim(), remarks: input.remarks, kyc_flag: 'Y', euin_number: input.euinDeclaration === 'Y' ? input.euin.toUpperCase() : '', euin_declaration: input.euinDeclaration, sub_broker_code: subBrokerCode, sub_broker_arn: subBrokerArn, mobile_no: input.mobile, email: input.email, filler1: '', filler2: '', filler3: '', member_unique_id: input.reference }] };
}
export async function submitNSESwitch(input: NSESwitchInput) {
  const response = await nseRequest<{ transaction_details?: Array<{ client_code?: string; from_scheme_code?: string; to_scheme_code?: string; trxn_status?: string; trxn_remark?: string; trxn_so_order_id?: string; trxn_si_order_id?: string }> }>('/switch/entry', buildNSESwitch(input));
  const rows = response?.transaction_details;
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.client_code?.trim().toUpperCase() !== input.investor.clientCode.toUpperCase() || rows[0]?.from_scheme_code?.trim().toUpperCase() !== input.from.toUpperCase() || rows[0]?.to_scheme_code?.trim().toUpperCase() !== input.to.toUpperCase()) throw new Error('Mutual funds returned no matching switch result. Check status before retrying.');
  const row = rows[0];
  const valid = (id?: string) => /^\d{1,12}$/.test(id || '') && /[1-9]/.test(id || '');
  const accepted = row.trxn_status === 'TRXN SUCCESS' && valid(row.trxn_so_order_id) && valid(row.trxn_si_order_id);
  return { status: row.trxn_status === 'TRXN FAILED' ? 'rejected' as const : 'pending' as const, accepted, outId: accepted ? row.trxn_so_order_id : undefined, inId: accepted ? row.trxn_si_order_id : undefined, rawStatus: row.trxn_status || 'Confirmation unknown', remark: row.trxn_remark?.trim() || (accepted ? 'Switch accepted. Execution and unit allotment are separate.' : 'Check Mutual funds status before retrying.') };
}
