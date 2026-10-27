import { expect, it } from 'vitest';
import { buildNSEXsip, parseXSIPRegistration as parse, type NSEXsipInput } from './nseXsipService';
const submitted = { client_code: 'TEST001', sch_code: 'TEST-GR' };
it('preserves the PDF frequency in XSIP requests and rejects undocumented aliases', () => {
  const input: NSEXsipInput = {
    amcCode: 'TEST_MF', schemeCode: 'TEST-GR', memberCode: '123', amount: 1000, startDate: '2099-10-15', endDate: '', frequency: 'SEMI-ANNUAL', installments: '12',
    investor: { clientCode: 'TEST001', name: 'Test', kycType: 'KRA', kycVerified: true, clientType: 'NON DEMAT', depository: 'PHYS', bank: { id: '1', label: 'Bank', active: true, status: 'ACTIVE', isDefault: true } },
    dpMode: 'P', folio: '', mandateId: '456', approvedMandate: { id: '456', bank: 'Bank', amount: 5000 }, euinDeclaration: 'N', euin: '', firstOrderToday: false, reference: 'TESTREF',
  };
  expect(buildNSEXsip(input).reg_data[0]).toMatchObject({ frequency_type: 'SEMI-ANNUAL', xsip_mandate_id: '456' });
  expect(buildNSEXsip({ ...input, frequency: 'ANNUAL' }).reg_data[0]).toHaveProperty('frequency_type', 'ANNUAL');
  expect(buildNSEXsip({ ...input, frequency: 'FORTNIGHTLY' }).reg_data[0]).toHaveProperty('frequency_type', 'FORTNIGHTLY');
  expect(() => buildNSEXsip({ ...input, frequency: 'SEMI-ANNUALLY' })).toThrow('XSIP frequency');
});
it('treats REG_FAILED and zero ID as rejection, even with an HTTP-success envelope', () => {
  expect(parse({ reg_data: [{ ...submitted, reg_id: '0', reg_status: 'REG_FAILED', reg_remark: 'CLIENT DOES NOT EXISTS' }] }, submitted)).toEqual({ state: 'rejected', registrationId: '', remark: 'CLIENT DOES NOT EXISTS' });
});
it('requires matching client and scheme and a real registration ID for success', () => {
  expect(parse({ reg_data: [{ ...submitted, reg_id: '123', reg_status: 'REG_SUCCESS' }] }, submitted).state).toBe('registered');
  expect(parse({ reg_data: [{ ...submitted, reg_id: '0', reg_status: 'REG_SUCCESS' }] }, submitted).state).toBe('unknown');
  expect(() => parse({ reg_data: [{ ...submitted, client_code: 'OTHER', reg_id: '123', reg_status: 'REG_SUCCESS' }] }, submitted)).toThrow('different XSIP');
  expect(() => parse({ reg_data: [] }, submitted)).toThrow('unreadable');
});
