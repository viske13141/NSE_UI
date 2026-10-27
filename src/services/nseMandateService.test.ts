import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNSEMandate, registerNSEMandate, type NSEMandateInput } from './nseMandateService';
import { nseApi } from './nseApi';
const input: NSEMandateInput = { investor: { name: 'Test Investor', clientCode: 'TEST001', kycType: 'Not reported', bank: { id: '1', label: 'Bank •••• 1234', status: 'ACTIVE', active: true, isDefault: true, accountNo: '000011112222', ifsc: 'TEST0001234', accountType: 'SB' } }, amount: 100000, type: 'E', accountType: 'SB', micr: '', startDate: '2099-10-15', endDate: '2100-10-15', processedByMember: false, registrationDate: '', reference: 'MANDATE001' };
afterEach(() => vi.restoreAllMocks());
describe('Mutual funds documented mandate registration', () => {
  it('uses single-character types and documented bank/date fields without response-only fields', () => {
    const row = buildNSEMandate(input).reg_data[0];
    expect(row).toMatchObject({ mandate_type: 'E', ac_type: 'SB', start_date: '15/10/2099', end_date: '15/10/2100', amount: '100000', member_mandate_no: 'MANDATE001', account_no: '000011112222', ifsc_code: 'TEST0001234', micr_no: '' });
    expect(row.registration_date).toBeUndefined(); expect(row.reg_id).toBeUndefined();
  });
  it('rejects past dates, future member registration dates and bad bank values', () => {
    expect(() => buildNSEMandate({ ...input, startDate: '2020-01-01' })).toThrow('past');
    expect(() => buildNSEMandate({ ...input, processedByMember: true, registrationDate: '2099-10-15' })).toThrow('future');
    expect(() => buildNSEMandate({ ...input, micr: '123' })).toThrow('nine digits');
    expect(() => buildNSEMandate({ ...input, accountType: 'CB' })).toThrow('Client Master');
    expect(() => buildNSEMandate({ ...input, reference: 'X'.repeat(21) })).toThrow('20 characters');
  });
  it('handles successful registration without assuming authorization or approval', async () => {
    vi.spyOn(nseApi, 'registerMandate').mockResolvedValue({ reg_data: [{ reg_id: '2026101510018', reg_status: 'REG_SUCCESS' }] });
    expect(await registerNSEMandate(input)).toMatchObject({ status: 'registered', registrationId: '2026101510018', remark: 'Mandate registered. Approval and bank authorization are not confirmed.' });
  });
  it('recognizes REG_FAILED and zero registration IDs', async () => {
    vi.spyOn(nseApi, 'registerMandate').mockResolvedValue({ reg_data: [{ reg_id: '0', reg_status: 'REG_FAILED', reg_remark: 'CLIENT CODE DOES NOT EXIST.' }] });
    expect(await registerNSEMandate(input)).toMatchObject({ status: 'rejected', registrationId: undefined, remark: 'CLIENT CODE DOES NOT EXIST.' });
  });
});
