import { afterEach, expect, it, vi } from 'vitest';
import { buildNSEFatcaData as build, uploadNSEFatcaData } from './nseFatcaDataService';
import { NSE_TOKEN_KEY } from './nseApi';
const values = { pan_rp: 'ABCPD1234F', inv_name: 'Test investor', dob: '1990-01-01', tax_status: '01', po_bir_inc: 'Test city', co_bir_inc: 'IN', tax_res1: 'IN', tpin1: 'ABCPD1234F', id1_type: 'C', srce_wealt: '01', inc_slab: '31', occ_code: '01', ubo_code: 'C01', data_src: 'P', addr_type: '2', pep_flag: 'N', occ_type: 'B', npo_form: 'N' };
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
it('builds individual FATCA fields and conditional electronic-source and tax-residence rules', () => {
  expect(build(values).reg_details[0]).toMatchObject({ pan_rp: 'ABCPD1234F', dob: '01/01/1990', ubo_appl: 'N', ubo_df: 'N', exch_name: 'O' });
  expect(() => build({ ...values, data_src: 'E' })).toThrow('log name');
  expect(() => build({ ...values, tax_res2: 'US' })).toThrow('Tax residence 2');
  expect(() => build({ ...values, pan_rp: 'ABCHD1234F' })).toThrow('eligible PAN');
});
it('requires matching REG_SUCCESS and surfaces rejection remarks', async () => {
  sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ reg_details: [{ pan_rp: 'ABCPD1234F', reg_status: 'REG_FAILED', reg_remark: 'Invalid tax status' }] }) }); vi.stubGlobal('fetch', fetcher);
  await expect(uploadNSEFatcaData(values)).rejects.toThrow('Invalid tax status');
  fetcher.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ reg_details: [{ pan_rp: 'ABCPD1234F', reg_status: 'REG_SUCCESS', reg_id: '123' }] }) });
  await expect(uploadNSEFatcaData(values)).resolves.toContain('Registration ID: 123');
});

it('requires NPO applicability and conditionally requires PAN, declaration and registration', () => {
  expect(() => build({ ...values, npo_form: '' })).toThrow('NPO form');
  expect(() => build({ ...values, npo_form: 'Y' })).toThrow('NPO declaration');
  expect(() => build({ ...values, npo_form: 'Y', npo_dcl: 'Y' })).toThrow('NPO registration');
  expect(build({ ...values, npo_form: 'Y', npo_dcl: 'Y', npo_rgno: 'REG123' }).reg_details[0]).toMatchObject({ npo_form: 'Y', npo_dcl: 'Y', npo_rgno: 'REG123' });
  const row = build({ ...values, npo_dcl: 'Y', npo_rgno: 'OLD' }).reg_details[0];
  expect(row).not.toHaveProperty('npo_dcl');
  expect(row).not.toHaveProperty('npo_rgno');
});
it('accepts PEKRN in place of PAN and validates declaration and occupation consistency', () => {
  expect(build({ ...values, pan_rp: '', pekrn: 'REF123', new_change: 'C' }).reg_details[0]).toMatchObject({ pekrn: 'REF123', new_change: 'C' });
  expect(() => build({ ...values, pan_rp: '', pekrn: '' })).toThrow('PAN or');
  expect(() => build({ ...values, pan_rp: '', pekrn: 'REF123', npo_form: 'Y' })).toThrow('PAN is required');
  expect(() => build({ ...values, tax_status: '04' })).toThrow('entity / HUF');
  expect(() => build({ ...values, occ_type: 'S' })).toThrow('Occupation type');
  expect(() => build({ ...values, new_change: 'INVALID' })).toThrow();
});
it('matches a PEKRN-only response and rejects unrelated investor receipts', async () => {
  sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ reg_details: [{ pekrn: 'REF123', reg_status: 'REG_SUCCESS', reg_id: '456' }] }) });
  vi.stubGlobal('fetch', fetcher);
  await expect(uploadNSEFatcaData({ ...values, pan_rp: '', pekrn: 'REF123' })).resolves.toContain('456');
  await expect(uploadNSEFatcaData({ ...values, pan_rp: '', pekrn: 'OTHER' })).rejects.toThrow('no matching');
});
