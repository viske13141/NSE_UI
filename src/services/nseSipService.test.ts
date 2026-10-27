import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNSESip, registerNSESip, checkNSESipMandate, nseSipInvestorMode, type NSESipInput } from './nseSipService';
import { nseApi } from './nseApi';
const investor = { clientCode: 'TEST001', memberCode: '1003338', clientType: 'NON DEMAT', depository: 'PHYS', name: 'Test Investor', kycType: 'KRA COMPLIANT', kycVerified: true, bank: { id: '1', label: 'Bank •••• 1234', status: 'ACTIVE', active: true, isDefault: true } };
const input: NSESipInput = { amcCode: 'TEST_MF', schemeCode: 'TEST-GR', investor, memberCode: '1003338', amount: 3000, startDate: '2099-10-15', frequency: 'MONTHLY', installments: '12', endDate: '', dpMode: 'P', folio: '', mandateId: '', euinDeclaration: 'N', euin: '', firstOrderToday: false, reference: 'SIPREF001' };
afterEach(() => vi.restoreAllMocks());
describe('Mutual funds live SIP registration', () => {
  it('recognizes stored client/depository codes and prevents incompatible demat modes', () => {
    expect(nseSipInvestorMode({ ...investor, clientType: 'P', depository: '' })).toBe('P');
    expect(nseSipInvestorMode({ ...investor, clientType: 'D', depository: 'CDSL' })).toBe('C');
    expect(nseSipInvestorMode({ ...investor, clientType: 'D', depository: 'NSDL' })).toBe('N');
    expect(() => buildNSESip({ ...input, investor: { ...investor, clientType: 'P', depository: '' }, dpMode: 'C' })).toThrow('non-demat client');
    const demat = { ...input, investor: { ...investor, clientType: 'D', depository: 'NSDL' }, dpMode: 'N' as const };
    expect(buildNSESip(demat).reg_data[0]).toMatchObject({ trans_mode: 'D', dp_txn_mode: 'N', dpc_flag: 'Y' });
    expect(() => buildNSESip({ ...demat, dpMode: 'C' })).toThrow('must match Client Master');
  });
  it('supports 15-character folios and sends the optional document fields with physical DPC Y', () => {
    expect(buildNSESip({ ...input, folio: '123456789012345', mobile: '9000000000', email: 'test@example.com', remarks: 'Test remarks', subBrokerCode: 'TESTBROKER', subBrokerArn: 'ARN-1234' }).reg_data[0]).toMatchObject({ folio_no: '123456789012345', primary_holder_mobile: '9000000000', primary_holder_email: 'test@example.com', sip_remarks: 'Test remarks', sub_broker_code: 'TESTBROKER', sub_broker_arn: 'ARN-1234', dpc_flag: 'Y' });
    for (const change of [{ folio: '1'.repeat(16) }, { mandateId: '1'.repeat(14) }, { mobile: '123' }, { email: 'invalid' }, { remarks: 'x'.repeat(101) }, { subBrokerArn: '1234' }, { subBrokerCode: 'x'.repeat(16) }, { memberCode: 'ABC123' }]) expect(() => buildNSESip({ ...input, ...change })).toThrow();
  });
  it('keeps the 10-character internal reference separate from the longer member reference', () => {
    const row = buildNSESip({ ...input, reference: 'S1234567890123451234', internalReference: 'SIPREF0001' }).reg_data[0];
    expect(row).toMatchObject({ internal_ref_no: 'SIPREF0001', member_unique_id: 'S1234567890123451234' });
    expect(() => buildNSESip({ ...input, internalReference: 'X'.repeat(11) })).toThrow('10 characters');
    expect(() => buildNSESip({ ...input, mandateId: '0' })).toThrow('greater than zero');
  });
  it('uses physical mode for a non-demat client and documented field names', () => {
    const row = buildNSESip(input).reg_data[0];
    expect(row).toMatchObject({ trans_mode: 'P', dp_txn_mode: 'P', start_date: '15/10/2099', frequency_allowed: '1', status: '1', installment_no: '12', end_date: '', member_code: '1003338', first_order_today: 'N', member_unique_id: 'SIPREF001', step_up_required: 'N', step_up_amount: '' });
    expect(row.reg_id).toBeUndefined();
  });
  it('prevents the demat-for-non-demat failure shown in the example', () => {
    expect(() => buildNSESip({ ...input, dpMode: 'C' })).toThrow('non-demat client');
  });
  it('sets daily end date and clears installment count', () => {
    expect(buildNSESip({ ...input, frequency: 'DAILY', endDate: '2099-12-15' }).reg_data[0]).toMatchObject({ installment_no: '', end_date: '15/12/2099' });
    expect(() => buildNSESip({ ...input, frequency: 'DAILY' })).toThrow('valid SIP date');
  });
  it('blocks past dates, missing member code and malformed EUIN', () => {
    expect(() => buildNSESip({ ...input, startDate: '2020-01-01' })).toThrow('past');
    expect(() => buildNSESip({ ...input, memberCode: '' })).toThrow('member code');
    expect(() => buildNSESip({ ...input, euinDeclaration: 'Y', euin: 'INVALID' })).toThrow('EUIN');
  });
  it('surfaces REG_FAILED despite HTTP 200 and does not accept zero registration IDs', async () => {
    vi.spyOn(nseApi, 'registerSip').mockResolvedValue({ reg_data: [{ reg_id: '0', reg_status: 'REG_FAILED', reg_remark: 'TRANS MODE DEMAT NOT ALLOWED FOR NON DEMAT CLIENT' }] });
    expect(await registerNSESip(input)).toMatchObject({ status: 'rejected', registrationId: undefined, rawStatus: 'REG_FAILED' });
  });
  it('recognizes REG_SUCCESS without claiming mandate approval or payment', async () => {
    vi.spyOn(nseApi, 'registerSip').mockResolvedValue({ reg_data: [{ reg_id: '202610150000001', reg_status: 'REG_SUCCESS' }] });
    expect(await registerNSESip(input)).toMatchObject({ status: 'successful', registrationId: '202610150000001', remark: 'SIP registered. Payment and mandate approval are separate.' });
  });
});

describe('SIP mandate checks', () => {
  it('rejects pending, foreign and insufficient mandates before registration', async () => {
    const register = vi.spyOn(nseApi, 'registerSip');
    const api = vi.spyOn(nseApi, 'mandateStatus');
    for (const row of [
      { clientCode: 'TEST001', mandateId: '456', status: 'UNDER PROCESSING', amount: '10000' },
      { clientCode: 'OTHER', mandateId: '456', status: 'APPROVED', amount: '10000' },
      { clientCode: 'TEST001', mandateId: '456', status: 'APPROVED', amount: '100' },
    ]) {
      api.mockResolvedValue({ response_status: 'S', report_data: [row] });
      await expect(registerNSESip({ ...input, mandateId: '456' })).rejects.toThrow();
    }
    expect(register).not.toHaveBeenCalled();
  });
  it('accepts an owned approved mandate and skips lookup when none is supplied', async () => {
    const api = vi.spyOn(nseApi, 'mandateStatus').mockResolvedValue({ response_status: 'S', report_data: [{ clientCode: 'TEST001', mandateId: '456', status: 'APPROVED', amount: '10000' }] });
    await checkNSESipMandate({ ...input, mandateId: '456' });
    expect(api).toHaveBeenCalledWith({ mandate_id: '456' });
    await checkNSESipMandate(input);
    expect(api).toHaveBeenCalledTimes(1);
  });
});
