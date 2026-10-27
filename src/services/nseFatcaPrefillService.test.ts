import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('./nseApi', () => ({ nseApi: { clientMaster: vi.fn() }, nseRequest: vi.fn() }));
vi.mock('./nseFatcaReportService', () => ({ getNSEFatcaReport: vi.fn() }));
import { nseApi } from './nseApi';
import { getNSEFatcaReport } from './nseFatcaReportService';
import { fatcaClientFromRow, searchFatcaClients, getHolderFatcaRecords, buildFatcaPrefill, missingFatcaFields } from './nseFatcaPrefillService';
const row = { client_code: 'TEST01', primary_holder_first_name: 'First', primary_holder_last_name: 'Investor', primary_holder_pan: 'ABCPD1234F', primary_holder_dob_incorporation: '15/06/1990', tax_status: '01', occupation_code: '02', second_holder_first_name: 'Joint', second_holder_pan: 'ABCPD2345F', guardian_first_name: 'Guardian', guardian_pan: 'ABCPD3456F' };
const primary = () => fatcaClientFromRow(row)!.holders[0];
beforeEach(() => vi.clearAllMocks());
it('extracts holders independently and maps birth date, occupation and tax status', () => {
  const client = fatcaClientFromRow(row)!;
  expect(client.holders).toHaveLength(3);
  expect(client.holders[0].values).toMatchObject({ inv_name: 'First Investor', pan_rp: 'ABCPD1234F', dob: '1990-06-15', tax_status: '01', occ_code: '02', occ_type: 'S' });
  expect(client.holders[1].values).not.toHaveProperty('tax_status');
  expect(client.holders[2].values).not.toHaveProperty('occ_code');
  expect(fatcaClientFromRow({ ...row, tax_status: '75' })!.holders[0].values.tax_status).toBe('');
  expect(fatcaClientFromRow({ ...row, tax_status: '76' })!.holders[0].values.tax_status).toBe('75');
});
it('searches by exact code or filters names from returned Client Master records', async () => {
  vi.mocked(nseApi.clientMaster).mockResolvedValue({ response_status: 'S', report_data_total: '2', report_data: [row, { ...row, client_code: 'OTHER', primary_holder_first_name: 'Someone' }] });
  expect(await searchFatcaClients('TEST01', 'code')).toHaveLength(1);
  expect(nseApi.clientMaster).toHaveBeenLastCalledWith({ client_code: 'TEST01' });
  expect(await searchFatcaClients('first', 'name')).toHaveLength(1);
  expect(nseApi.clientMaster).toHaveBeenLastCalledWith({});
  await expect(searchFatcaClients('ab', 'name')).rejects.toThrow('three');
});
it('loads FATCA only for the selected identity and rejects unrelated records', async () => {
  vi.mocked(getNSEFatcaReport).mockResolvedValue([{ pan_rp: 'WRONG' }]);
  await expect(getHolderFatcaRecords(primary())).rejects.toThrow('do not match');
  expect(getNSEFatcaReport).toHaveBeenCalledWith({ pan_pkern_no: 'ABCPD1234F', from_date: '', to_date: '' });
  const holder = { ...primary(), pan: '', pekrn: 'REF123' };
  vi.mocked(getNSEFatcaReport).mockResolvedValue([{ PEKRN: 'ref123' }]);
  expect(await getHolderFatcaRecords(holder)).toHaveLength(1);
});
it('imports declared fields only, normalizes dates/codes and preserves selected holder identity', () => {
  const result = buildFatcaPrefill(primary(), { PAN_RP: 'ABCPD1234F', inv_name: 'Old Name', tax_res1: 'in', dob: '01/01/1990', reg_status: 'REG_SUCCESS', reg_id: '123', new_change: 'N', log_name: 'Recorded name' });
  expect(result.values).toMatchObject({ pan_rp: 'ABCPD1234F', inv_name: 'First Investor', tax_res1: 'IN', dob: '1990-01-01', new_change: '' });
  expect(result.values).not.toHaveProperty('reg_status');
  expect(result.values).not.toHaveProperty('reg_id');
  expect(() => buildFatcaPrefill(primary(), { pan_rp: 'WRONG' })).toThrow('does not match');
  expect(buildFatcaPrefill(primary(), { pan_rp: 'ABCPD1234F', tax_res1: 'BAD' }).warnings).toHaveLength(1);
});
it('imports nested UBOs and warns when the report has only flat UBO fields', () => {
  const nested = buildFatcaPrefill(primary(), { pan_rp: 'ABCPD1234F', ubo_appl: 'Y', ubo_details: [{ ubo_name: 'Owner', ubo_dob: '15-06-1960 00:00:00', ubo_cntry: 'in' }] });
  expect(nested.ubos[0]).toMatchObject({ ubo_name: 'Owner', ubo_dob: '1960-06-15', ubo_cntry: 'IN' });
  const flat = buildFatcaPrefill(primary(), { pan_rp: 'ABCPD1234F', ubo_appl: 'Y', ubo_name: 'Owner' });
  expect(flat.ubos).toEqual([]);
  expect(flat.warnings[0]).toContain('beneficial owner');
});
it('highlights category-specific missing fields without guessing declaration answers', () => {
  expect(missingFatcaFields(primary().values, false)).toContain('npo_form');
  expect(missingFatcaFields({ tax_status: '04', ubo_appl: 'N', ubo_df: 'Y' }, true)).toEqual(expect.arrayContaining(['corp_servs', 'nffe_catg', 'ubo_exch']));
  expect(missingFatcaFields({ pekrn: 'REF123', tax_status: '01' }, false)).not.toContain('pan_rp');
});
