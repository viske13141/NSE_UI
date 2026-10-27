import { validateNSEMasterValues } from './nseDocumentMasters';
import { buildNSEFatcaData, fatcaInvestorCategory, validateFatcaOccupation } from './nseFatcaDataService';
import { parseNSEDueDate } from './nseSipPauseService';
import { nseRequest } from './nseApi';
export const FATCA_ENTITY_FIELDS = [['corp_servs', 2], ['net_worth', 20], ['nw_date', 10], ['exemp_code', 2], ['ffi_drnfe', 20], ['giin_no', 19], ['nffe_catg', 3], ['act_nfe_sc', 3], ['nature_bus', 30], ['spr_entity', 60], ['giin_na', 3], ['giin_exemc', 2], ['rel_listed', 70], ['ubo_exch', 2], ['ubo_isin', 30], ['ubo_rel_li', 70], ['npo_rgno', 50]] as const;
export const FATCA_UBO_FIELDS = [['ubo_name', 70], ['ubo_pan', 10], ['ubo_nation', 3], ['ubo_add1', 50], ['ubo_add2', 50], ['ubo_add3', 50], ['ubo_city', 50], ['ubo_pin', 6], ['ubo_state', 3], ['ubo_cntry', 4], ['ubo_add_ty', 2], ['ubo_ctr', 4], ['ubo_tin', 20], ['ubo_id_ty', 2], ['ubo_cob', 30], ['ubo_code', 3], ['ubo_categ', 30], ['ubo_pep_fl', 2], ['ubo_smo_de', 30], ['ubo_hol_pc', 3], ['ubo_email', 30], ['ubo_dob', 10], ['ubo_gender', 1], ['ubo_fr_nam', 50], ['ubo_occ', 2], ['ubo_occ_ty', 2], ['ubo_tel', 12], ['ubo_mobile', 12]] as const;
export function buildNSEFatcaCommon(values: Record<string, string>, ubos: Record<string, string>[]) {
  const row = buildNSEFatcaData(values, true).reg_details[0];
  const category = fatcaInvestorCategory(row.tax_status);
  const entity = category !== 'individual', huf = category === 'huf';
  const required = (data: Record<string, string>, fields: string[]) => { for (const key of fields) if (!data[key]?.trim()) throw new Error(`Enter ${key.replace(/_/g, ' ')}`); };
  for (const [key, max] of FATCA_ENTITY_FIELDS) { if (key === 'npo_rgno') continue; const value = values[key]?.trim() || ''; if (value.length > max || value.toLowerCase() === 'string') throw new Error(`Invalid ${key}`); if (value) row[key] = value; }
  for (const key of ['ubo_appl', 'ubo_df']) { if (!['Y', 'N'].includes(values[key])) throw new Error(`Select ${key.replace(/_/g, ' ')}`); row[key] = values[key]; }
  if (values.sdf_flag) { if (!['Y', 'N'].includes(values.sdf_flag)) throw new Error('Select self declaration flag'); row.sdf_flag = values.sdf_flag; }
  else if (entity) throw new Error('Select self declaration flag');
  if (!entity && (row.ubo_appl !== 'N' || row.ubo_df !== 'N')) throw new Error('Individual UBO applicable and declaration flags must be N');
  if (entity && !huf) {
    required(row, ['corp_servs', 'net_worth', 'nw_date', 'exemp_code', 'ffi_drnfe', 'giin_no']);
    if (!/^\d{1,17}(\.\d{1,2})?$/.test(row.net_worth)) throw new Error('Net worth allows 17 integer digits and two decimals');
    row.nw_date = parseNSEDueDate(row.nw_date).split('-').reverse().join('/');
    if (!['FFI', 'DRNFE', 'NA'].includes(row.ffi_drnfe)) throw new Error('FFI classification must be FFI, DRNFE or NA');
    if (row.corp_servs && !['01', '02', '03', '04'].includes(row.corp_servs)) throw new Error('Select a documented corporate services code');
  }
  if (entity) required(row, ['nffe_catg']);
  if (row.nffe_catg === 'A') required(row, ['act_nfe_sc']);
  if (['L', 'RL', 'A', 'P'].includes(row.nffe_catg)) required(row, ['nature_bus']);
  if (row.ubo_appl === 'N' && row.ubo_df === 'Y') { required(row, ['ubo_exch', 'ubo_isin', 'ubo_rel_li']); if (!['B', 'N', 'O'].includes(row.ubo_exch)) throw new Error('Listed company exchange must be B, N or O'); }
  if (row.ubo_appl === 'Y') {
    if (ubos.length < 1 || ubos.length > 4) throw new Error('Provide one to four UBOs');
    row.ubo_count = String(ubos.length);
  } else if (ubos.length) throw new Error('Remove UBO records when UBO applicable is N');
  const details = ubos.map(ubo => {
    const result: Record<string, string> = {};
    for (const [key, max] of FATCA_UBO_FIELDS) { const value = ubo[key]?.trim() || ''; if (value.length > max || value.toLowerCase() === 'string') throw new Error(`Invalid ${key}`); if (value) result[key] = value; }
    required(result, ['ubo_name', 'ubo_nation', 'ubo_add1', 'ubo_add2', 'ubo_add3', 'ubo_city', 'ubo_pin', 'ubo_state', 'ubo_cntry', 'ubo_add_ty', 'ubo_ctr', 'ubo_id_ty', 'ubo_cob', 'ubo_code', 'ubo_categ', 'ubo_pep_fl']);
    validateNSEMasterValues('fatca', result);
    if (!result.ubo_pan && !result.ubo_tin) throw new Error('UBO PAN or tax identifier is required');
    if (result.ubo_pan) result.ubo_pan = result.ubo_pan.toUpperCase();
    if (result.ubo_dob) { const iso = parseNSEDueDate(result.ubo_dob); if (iso > new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) throw new Error('UBO date of birth cannot be in the future'); result.ubo_dob = iso.split('-').reverse().join('/'); }
    if (result.ubo_gender && !['M', 'F', 'O'].includes(result.ubo_gender)) throw new Error('Select UBO gender');
    if (result.ubo_occ_ty && !['S', 'B', 'O', 'X'].includes(result.ubo_occ_ty)) throw new Error('Select UBO occupation type');
    if (result.ubo_occ && result.ubo_occ_ty) validateFatcaOccupation(result.ubo_occ, result.ubo_occ_ty);
    if (result.ubo_pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(result.ubo_pan.toUpperCase())) throw new Error('Enter a valid UBO PAN');
    if (!['UBO', 'SMO'].includes(result.ubo_categ) || !['Y', 'N', 'R'].includes(result.ubo_pep_fl) || !['1', '2', '3', '4', '5'].includes(result.ubo_add_ty)) throw new Error('Invalid UBO category, PEP or address type');
    if (result.ubo_categ === 'SMO') required(result, ['ubo_smo_de']);
    if (result.ubo_hol_pc && (!/^\d{1,3}$/.test(result.ubo_hol_pc) || Number(result.ubo_hol_pc) > 100)) throw new Error('UBO holding percentage must be from 0 to 100');
    if (result.ubo_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.ubo_email)) throw new Error('Enter a valid UBO email');
    return result;
  });
  return { reg_details: [{ ...row, pan_rp: row.pan_rp, pekrn: row.pekrn, ubo_details: details }] };
}
export async function uploadNSEFatcaCommon(values: Record<string, string>, ubos: Record<string, string>[]) {
  const body = buildNSEFatcaCommon(values, ubos);
  const response = await nseRequest<{ reg_details?: Record<string, unknown>[] }>('/fatca/common-upload', body);
  const rows = response?.reg_details;
  if (!Array.isArray(rows) || rows.length !== 1 || (body.reg_details[0].pan_rp ? String(rows[0]?.pan_rp).trim().toUpperCase() !== body.reg_details[0].pan_rp : String(rows[0]?.pekrn).trim().toUpperCase() !== body.reg_details[0].pekrn.toUpperCase())) throw new Error('Mutual funds returned no matching common FATCA result');
  if (rows[0].reg_status !== 'REG_SUCCESS' || !/^\d+$/.test(String(rows[0].reg_id)) || !/[1-9]/.test(String(rows[0].reg_id))) throw new Error(String(rows[0].reg_remark || 'Common FATCA submission is not confirmed'));
  return `Mutual funds confirmed common FATCA submission. Registration ID: ${rows[0].reg_id}`;
}
