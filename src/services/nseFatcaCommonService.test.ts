import { afterEach, expect, it, vi } from 'vitest';
import { buildNSEFatcaCommon as build, uploadNSEFatcaCommon } from './nseFatcaCommonService';
import { NSE_TOKEN_KEY } from './nseApi';
const values = { pan_rp: 'ABCPD1234F', inv_name: 'Test investor', tax_status: '01', po_bir_inc: 'City', co_bir_inc: 'IN', tax_res1: 'IN', tpin1: 'ABCPD1234F', id1_type: 'C', srce_wealt: '01', inc_slab: '31', occ_code: '01', data_src: 'P', addr_type: '2', pep_flag: 'N', occ_type: 'B', ubo_appl: 'N', ubo_df: 'N', npo_form: 'N', sdf_flag: 'N' };
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
it('supports individual common declarations and conditional HUF/NPO rules', () => {
  expect(build(values, []).reg_details[0]).toMatchObject({ ubo_details: [], npo_form: 'N', ubo_appl: 'N' });
  expect(() => build({ ...values, pan_rp: 'ABCHD1234F', tax_status: '03' }, [])).toThrow('nffe catg');
  expect(() => build({ ...values, npo_form: 'Y' }, [])).toThrow('NPO declaration');
  expect(() => build({ ...values, pan_rp: 'ABCHD1234F', tax_status: '03', nffe_catg: 'A' }, [])).toThrow('act nfe sc');
});
it('enforces max four UBOs, required details and listed-company rules', () => {
  const entity = { ...values, pan_rp: 'ABCHD1234F', tax_status: '03', nffe_catg: 'P', nature_bus: 'Business', ubo_appl: 'Y', ubo_df: 'Y' };
  expect(() => build(entity, Array(5).fill({}))).toThrow('four UBOs');
  expect(() => build(entity, [{}])).toThrow('ubo name');
  expect(() => build({ ...entity, ubo_appl: 'N' }, [])).toThrow('ubo exch');
});
it('requires confirmed registration and sanitizes server database errors', async () => {
  sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ reg_details: [{ pan_rp: values.pan_rp, reg_status: 'REG_SUCCESS', reg_id: '123' }] }) }); vi.stubGlobal('fetch', fetcher);
  await expect(uploadNSEFatcaCommon(values, [])).resolves.toContain('Registration ID: 123');
  fetcher.mockResolvedValue({ ok: false, status: 500, text: async () => JSON.stringify({ detail: 'DB save failed: internal parameters' }) });
  await expect(uploadNSEFatcaCommon(values, [])).rejects.toThrow('Submission is not confirmed');
});

it('requires corporate services for corporate tax status including sole proprietorship', () => {
  const corporate = { ...values, pan_rp: 'ABCCD1234F', tax_status: '04', net_worth: '100', nw_date: '2026-01-01', exemp_code: 'N', ffi_drnfe: 'NA', giin_no: 'NA', nffe_catg: 'P', nature_bus: 'Business' };
  expect(() => build(corporate, [])).toThrow('corp servs');
  expect(build({ ...corporate, corp_servs: '04' }, []).reg_details[0]).toMatchObject({ corp_servs: '04', nw_date: '01/01/2026' });
  expect(() => build({ ...values, tax_status: '13' }, [])).toThrow('corp servs');
  expect(() => build({ ...values, tax_status: '03' }, [])).toThrow('eligible PAN');
});
it('serializes optional UBO details with dates and rejects mismatched occupation types', () => {
  const entity = { ...values, pan_rp: 'ABCHD1234F', tax_status: '03', nffe_catg: 'P', nature_bus: 'Business', ubo_appl: 'Y', ubo_df: 'Y' };
  const ubo = { ubo_name: 'Owner', ubo_pan: 'abcpd1234f', ubo_nation: 'IN', ubo_add1: 'Line1', ubo_add2: 'Line2', ubo_add3: 'Line3', ubo_city: 'City', ubo_pin: '123456', ubo_state: 'BR', ubo_cntry: 'IN', ubo_add_ty: '2', ubo_ctr: 'IN', ubo_id_ty: 'C', ubo_cob: 'IN', ubo_code: 'C01', ubo_categ: 'UBO', ubo_pep_fl: 'N', ubo_dob: '1990-01-01', ubo_gender: 'F', ubo_fr_nam: 'Parent', ubo_occ: '09', ubo_occ_ty: 'S', ubo_tel: '12345678', ubo_mobile: '9000000000' };
  expect(build(entity, [ubo]).reg_details[0].ubo_details[0]).toMatchObject({ ...ubo, ubo_pan: 'ABCPD1234F', ubo_dob: '01/01/1990' });
  expect(() => build(entity, [{ ...ubo, ubo_occ_ty: 'B' }])).toThrow('Occupation type');
  expect(() => build(entity, [{ ...ubo, ubo_dob: '2999-01-01' }])).toThrow('future');
});
