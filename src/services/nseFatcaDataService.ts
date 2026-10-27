import { validateNSEMasterValues } from './nseDocumentMasters';
import { nseRequest } from './nseApi';
import { parseNSEDueDate } from './nseSipPauseService';
export const FATCA_INDIVIDUAL_FIELDS = [
  ['pan_rp', 'Investor / guardian PAN (or provide PEKRN)', 10], ['pekrn', 'PAN-exempt KYC reference number (PEKRN)', 10], ['inv_name', 'Investor / guardian name', 70], ['dob', 'Date of birth (optional)', 10],
  ['tax_status', 'Tax status code', 3], ['po_bir_inc', 'Place of birth', 60], ['co_bir_inc', 'Country of birth code', 50],
  ['tax_res1', 'Tax residence country code', 50], ['tpin1', 'Taxpayer identification number', 20], ['id1_type', 'Identification type code', 2],
  ['srce_wealt', 'Source of wealth code', 3], ['inc_slab', 'Income range code', 5], ['occ_code', 'Occupation code', 2], ['ubo_code', 'UBO master code', 3],
  ['log_name', 'Recorded log name (electronic source)', 30],
  ['fr_name', 'Father name (optional)', 70], ['sp_name', 'Spouse name (optional)', 70],
  ['new_change', 'Declaration action (optional)', 2],
] as const;
// Retail and HUF tax statuses from PDF pages 42-44. All remaining master entries are corporate.
export function fatcaInvestorCategory(taxStatus: string): 'individual' | 'huf' | 'entity' {
  if (['03', '27', '29'].includes(taxStatus)) return 'huf';
  return ['01', '02', '11', '21', '24', '26', '28', '41', '42', '61', '62', '70', '77', '78'].includes(taxStatus) ? 'individual' : 'entity';
}
export function validateFatcaOccupation(code: string, type: string) {
  const expected = ['01', '43'].includes(code) ? 'B' : ['02', '03', '04', '09', '41', '42', '44'].includes(code) ? 'S' : 'O';
  if (type !== expected) throw new Error('Occupation type must match the selected occupation code');
}
export function applyFatcaNpo(values: Record<string, string>, row: Record<string, string>) {
  if (!['Y', 'N'].includes(values.npo_form)) throw new Error('Select NPO form applicability');
  row.npo_form = values.npo_form;
  if (row.npo_form === 'Y') {
    if (!row.pan_rp) throw new Error('PAN is required to provide or update NPO details');
    if (!['Y', 'N'].includes(values.npo_dcl)) throw new Error('Select NPO declaration');
    row.npo_dcl = values.npo_dcl;
    if (row.npo_dcl === 'Y') {
      const registration = values.npo_rgno?.trim() || '';
      if (!registration || registration.length > 50 || registration.toLowerCase() === 'string') throw new Error('Enter NPO registration number within 50 characters');
      row.npo_rgno = registration;
    }
  }
}
export function buildNSEFatcaData(values: Record<string, string>, common = false): { reg_details: Record<string, string>[] } {
  validateNSEMasterValues('fatca', values);
  const row: Record<string, string> = {};
  for (const [key, title, length] of FATCA_INDIVIDUAL_FIELDS) {
    if (common && key === 'ubo_code') continue;
    const value = (values[key] || '').trim();
    if ((!value && !['pan_rp', 'pekrn', 'dob', 'log_name', 'fr_name', 'sp_name', 'new_change'].includes(key)) || value.length > length || value.toLowerCase() === 'string') throw new Error(`Enter ${title.toLowerCase()} within ${length} characters`);
    row[key] = value;
  }
  row.pan_rp = row.pan_rp.toUpperCase();
  if (row.pan_rp && !/^[A-Z]{5}\d{4}[A-Z]$/.test(row.pan_rp)) throw new Error('This form requires a valid eligible PAN');
  if (!row.pan_rp && !row.pekrn) throw new Error('Enter investor PAN or PAN-exempt KYC reference number (PEKRN)');
  const category = fatcaInvestorCategory(row.tax_status);
  if (!common && category !== 'individual') throw new Error('Use the entity / HUF form for this tax status');
  if (row.pan_rp && ((category === 'individual' && row.pan_rp[3] !== 'P') || (category === 'huf' && row.pan_rp[3] !== 'H') || (category === 'entity' && (row.pan_rp[3] === 'H' || (row.pan_rp[3] === 'P' && row.tax_status !== '13'))))) throw new Error('Tax status does not match the eligible PAN holder type');
  if (row.new_change && !['N', 'C'].includes(row.new_change)) throw new Error('Select New or Change for declaration action');
  const allowed: Record<string, string[]> = { data_src: ['E', 'P'], addr_type: ['1', '2', '3', '4', '5'], pep_flag: ['Y', 'N', 'R'], occ_type: ['S', 'B', 'O', 'X'] };
  for (const [key, options] of Object.entries(allowed)) { if (common && key === 'pep_flag' && category !== 'individual' && !values[key]) continue; if (!options.includes(values[key])) throw new Error(`Select ${key.replace(/_/g, ' ')}`); row[key] = values[key]; }
  validateFatcaOccupation(row.occ_code, row.occ_type);
  applyFatcaNpo(values, row);
  if (row.data_src === 'E' && !row.log_name) throw new Error('Electronic source requires the recorded log name');
  if (row.dob) { const iso = parseNSEDueDate(row.dob); if (iso > new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) throw new Error('Date of birth cannot be in the future'); row.dob = iso.split('-').reverse().join('/'); }
  for (let residence = 2; residence <= 4; residence++) {
    const keys = [`tax_res${residence}`, `tpin${residence}`, `id${residence}_type`];
    if (keys.some(key => values[key]?.trim())) for (const key of keys) {
      const max = key.startsWith('tax') ? 50 : key.startsWith('tpin') ? 20 : 2;
      if (!values[key]?.trim() || values[key].trim().length > max) throw new Error(`Tax residence ${residence} requires country, identification number and type`);
      row[key] = values[key].trim();
    }
  }
  return { reg_details: [{ ...row, exch_name: 'O', ubo_appl: 'N', ubo_df: 'N', ubo_count: '', filler1: '', filler2: '' }] };
}
export async function uploadNSEFatcaData(values: Record<string, string>) {
  const body = buildNSEFatcaData(values);
  const response = await nseRequest<{ reg_details?: Array<{ pan_rp?: string; pekrn?: string; reg_status?: string; reg_id?: string; reg_remark?: string }> }>('/fatca/upload', body);
  const rows = response?.reg_details;
  if (!Array.isArray(rows) || rows.length !== 1 || (body.reg_details[0].pan_rp ? rows[0]?.pan_rp?.trim().toUpperCase() !== body.reg_details[0].pan_rp : rows[0]?.pekrn?.trim().toUpperCase() !== body.reg_details[0].pekrn.toUpperCase())) throw new Error('Mutual funds returned no matching FATCA result. Check the report before retrying.');
  const row = rows[0], id = String(row.reg_id || '');
  if (row.reg_status !== 'REG_SUCCESS' || !/^\d+$/.test(id) || !/[1-9]/.test(id)) throw new Error(row.reg_remark?.trim() || 'Mutual funds did not confirm FATCA submission');
  return `${row.reg_remark?.trim() || 'Mutual funds confirmed FATCA submission'}. Registration ID: ${id}`;
}
