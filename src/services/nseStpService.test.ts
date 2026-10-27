import { afterEach, expect, it, vi } from 'vitest';
import { buildNSEStp as build, registerNSEStp, type NSEStpInput } from './nseStpService';
import { nseApi } from './nseApi';
const input: NSEStpInput = { investor: { clientCode: 'TEST001', name: 'Test investor', kycVerified: true, kycType: 'KRA', clientType: 'NON DEMAT', depository: 'PHYS', bank: { id: '1', label: 'Bank', active: true, status: 'ACTIVE', isDefault: true } }, from: 'SOURCE', to: 'TARGET', mode: 'P', folio: 'REALFOLIO', start: '2099-10-15', end: '', frequency: 'MONTHLY', transfers: '12', amount: '1000', units: '', firstToday: false, euinDeclaration: 'N', euin: '', mobile: '', email: 'test@example.com', remarks: '', reference: 'STPTEST001' };
afterEach(() => vi.restoreAllMocks());
it('uses documented C/N/P modes and sends only request fields', () => {
  expect(build(input).reg_data[0]).toMatchObject({ transaction_mode: 'P', buy_sell_type: 'ADDITIONAL', installment_amount: '1000', installment_units: '', start_date: '15/10/2099', no_of_transfers: '12', first_order_today: 'N' });
  expect(build(input).reg_data[0]).not.toHaveProperty('reg_status');
});
it('requires physical folio, contact and either amount or units', () => {
  for (const change of [{ folio: '' }, { email: '' }, { units: '10' }, { amount: '' }, { to: 'SOURCE' }, { amount: '1.001' }]) expect(() => build({ ...input, ...change })).toThrow();
});
it('requires demat units and prohibits demat for physical clients', () => {
  expect(() => build({ ...input, mode: 'C', units: '10', amount: '' })).toThrow('physical client');
  const demat = { ...input, investor: { ...input.investor, clientType: 'DEMAT', depository: 'CDSL' }, mode: 'C' as const, units: '10.123', amount: '' };
  expect(build(demat).reg_data[0]).toMatchObject({ transaction_mode: 'C', installment_units: '10.123', installment_amount: '' });
  expect(() => build({ ...demat, amount: '1000' })).toThrow('units');
});
it('supports fresh/additional purchases and distinguishes NSDL from CDSL', () => {
  expect(build({ ...input, buySellType: 'FRESH' }).reg_data[0]).toHaveProperty('buy_sell_type', 'FRESH');
  const nsdl = { ...input, investor: { ...input.investor, clientType: 'DEMAT', depository: 'NSDL' }, mode: 'N' as const, units: '10', amount: '' };
  expect(build(nsdl).reg_data[0]).toHaveProperty('transaction_mode', 'N');
  expect(() => build({ ...nsdl, mode: 'C' })).toThrow('must match Client Master');
  expect(() => build({ ...input, frequency: 'FORTNIGHTLY' })).toThrow('STP frequency');
  expect(build({ ...input, frequency: 'SEMI-ANNUALLY' }).reg_data[0]).toHaveProperty('frequency_type', 'SEMI-ANNUALLY');
});
it('handles daily end dates and response business failures', async () => {
  expect(build({ ...input, frequency: 'DAILY', end: '2099-12-15' }).reg_data[0]).toMatchObject({ no_of_transfers: '', to_date: '15/12/2099' });
  vi.spyOn(nseApi, 'registerStp').mockResolvedValue({ reg_data: [{ client_code: 'TEST001', from_scheme_code: 'SOURCE', to_scheme_code: 'TARGET', reg_status: 'REG_FAILED', reg_id: '0', reg_remark: 'CLIENT DOES NOT EXISTS.' }] });
  expect(await registerNSEStp(input)).toMatchObject({ status: 'rejected', registrationId: undefined });
});
