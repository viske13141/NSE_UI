import { nseApi } from './nseApi';
import { getNSEFatcaReport } from './nseFatcaReportService';
import { FATCA_INDIVIDUAL_FIELDS, fatcaInvestorCategory } from './nseFatcaDataService';
import { FATCA_ENTITY_FIELDS, FATCA_UBO_FIELDS } from './nseFatcaCommonService';
import { getNSEFieldOptions } from './nseDocumentMasters';
import { parseNSEDueDate } from './nseSipPauseService';

export type FatcaValues = Record<string, string>;
export interface FatcaHolder { id: string; role: string; name: string; pan: string; pekrn: string; values: FatcaValues; }
export interface FatcaClient { code: string; name: string; holders: FatcaHolder[]; }
export interface FatcaPrefill { values: FatcaValues; ubos: FatcaValues[]; warnings: string[]; }
const text = (row: Record<string, unknown>, key: string) => typeof row[key] === 'string' ? (row[key] as string).trim() : '';
function normalize(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]));
}
function date(value: string) {
  if (!value) return '';
  try { return parseNSEDueDate(value.split(/[ T]/)[0]); } catch { return ''; }
}
function clientTaxStatus(value: string) {
  // Client and FATCA masters differ for these entries. Do not infer ambiguous classifications.
  if (value === '76') return '75'; // Artificial juridical person.
  if (['12', '26', '75', '79'].includes(value)) return '';
  return getNSEFieldOptions('fatca', 'tax_status')?.some(([code]) => code === value) ? value : '';
}
export function fatcaClientFromRow(raw: Record<string, unknown>): FatcaClient | null {
  const row = normalize(raw), code = text(row, 'client_code');
  if (!code) return null;
  const holders = [['primary_holder', 'Primary holder'], ['second_holder', 'Second holder'], ['third_holder', 'Third holder'], ['guardian', 'Guardian']].flatMap(([prefix, role]) => {
    const name = ['first', 'middle', 'last'].map(part => text(row, `${prefix}_${part}_name`)).filter(Boolean).join(' ') || text(row, `${prefix}_name`);
    const pan = text(row, `${prefix}_pan`).toUpperCase();
    const pekrn = text(row, prefix === 'guardian' ? 'guardian_exempt_ref_no' : `${prefix}_kra_exempt_ref_no`).toUpperCase();
    if (!name && !pan && !pekrn) return [];
    const values: FatcaValues = { pan_rp: pan, pekrn, inv_name: name, dob: date(text(row, prefix === 'primary_holder' ? 'primary_holder_dob_incorporation' : `${prefix}_dob`)) };
    if (prefix === 'primary_holder') {
      values.tax_status = clientTaxStatus(text(row, 'tax_status'));
      const occupation = text(row, 'occupation_code');
      if (getNSEFieldOptions('fatca', 'occ_code')?.some(([code]) => code === occupation)) {
        values.occ_code = occupation;
        values.occ_type = occupation === '01' ? 'B' : ['02', '03', '04'].includes(occupation) ? 'S' : 'O';
      }
    }
    return [{ id: prefix, role, name: name || role, pan, pekrn, values }];
  });
  return { code, name: holders.find(holder => holder.id === 'primary_holder')?.name || code, holders };
}
export async function searchFatcaClients(query: string, mode: 'code' | 'name'): Promise<FatcaClient[]> {
  const term = query.trim();
  if (!term || term.toLowerCase() === 'string') throw new Error('Enter a client code or name');
  if (mode === 'name' && term.length < 3) throw new Error('Enter at least three characters of the client name');
  const response = await nseApi.clientMaster(mode === 'code' ? { client_code: term } : {});
  if (response.response_status !== 'S') throw new Error(response.error_remark || 'Unable to load Client Master');
  if (response.report_data == null) return [];
  if (!Array.isArray(response.report_data)) throw new Error('Mutual funds returned an unreadable Client Master report');
  return response.report_data.flatMap(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const client = fatcaClientFromRow(raw as Record<string, unknown>);
    if (!client || (mode === 'code' ? client.code.toLowerCase() !== term.toLowerCase() : !client.name.toLowerCase().includes(term.toLowerCase()))) return [];
    return [client];
  });
}
export async function getHolderFatcaRecords(holder: FatcaHolder) {
  const identifier = holder.pan || holder.pekrn;
  if (!identifier) throw new Error('This holder has no PAN or PEKRN in Client Master. Enter the missing details manually.');
  const rows = await getNSEFatcaReport({ pan_pkern_no: identifier, from_date: '', to_date: '' });
  const matching = rows.map(normalize).filter(row => holder.pan ? text(row, 'pan_rp').toUpperCase() === holder.pan : text(row, 'pekrn').toUpperCase() === holder.pekrn);
  if (rows.length && !matching.length) throw new Error('Mutual funds returned FATCA records that do not match the selected holder');
  return matching;
}
function copyFields(raw: Record<string, unknown>, fields: readonly string[], warnings: string[]): FatcaValues {
  const row = normalize(raw), values: FatcaValues = {};
  for (const key of fields) {
    let value = text(row, key);
    if (!value || value.toLowerCase() === 'string') continue;
    const options = getNSEFieldOptions('fatca', key);
    if (options) {
      value = value.toUpperCase();
      if (!options.some(([code]) => code === value)) { warnings.push(`The saved ${key.replace(/_/g, ' ')} needs a new selection.`); continue; }
    }
    if (['dob', 'nw_date', 'ubo_dob'].includes(key)) {
      value = date(value);
      if (!value) { warnings.push(`The saved ${key.replace(/_/g, ' ')} needs a valid date.`); continue; }
    }
    values[key] = value;
  }
  return values;
}
export function buildFatcaPrefill(holder: FatcaHolder, record?: Record<string, unknown>): FatcaPrefill {
  const warnings: string[] = [];
  if (!record) return { values: { ...holder.values }, ubos: [], warnings };
  const row = normalize(record);
  if (holder.pan ? text(row, 'pan_rp').toUpperCase() !== holder.pan : !holder.pekrn || text(row, 'pekrn').toUpperCase() !== holder.pekrn) throw new Error('The saved FATCA declaration does not match the selected holder');
  const keys = [...FATCA_INDIVIDUAL_FIELDS.map(([key]) => key), ...FATCA_ENTITY_FIELDS.map(([key]) => key), 'data_src', 'addr_type', 'pep_flag', 'occ_type', 'ubo_appl', 'ubo_df', 'sdf_flag', 'npo_form', 'npo_dcl'];
  const values: FatcaValues = { ...holder.values, ...copyFields(row, keys, warnings), pan_rp: holder.pan, pekrn: holder.pekrn || text(row, 'pekrn').toUpperCase(), new_change: '' };
  if (holder.name && holder.values.inv_name) values.inv_name = holder.values.inv_name;
  let ubos: FatcaValues[] = [];
  if (values.ubo_appl === 'Y') {
    if (Array.isArray(row.ubo_details)) ubos = row.ubo_details.filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => copyFields(item as Record<string, unknown>, FATCA_UBO_FIELDS.map(([key]) => key), warnings));
    if (!ubos.length) warnings.push('The report did not provide grouped beneficial owner details. Enter and verify each beneficial owner before submitting.');
  }
  return { values, ubos, warnings };
}
export function missingFatcaFields(values: FatcaValues, common: boolean): string[] {
  const missing = new Set<string>();
  const require = (...keys: string[]) => keys.forEach(key => { if (!values[key]?.trim()) missing.add(key); });
  if (!values.pan_rp && !values.pekrn) require('pan_rp');
  require('inv_name', 'tax_status', 'po_bir_inc', 'co_bir_inc', 'tax_res1', 'tpin1', 'id1_type', 'srce_wealt', 'inc_slab', 'occ_code', 'data_src', 'addr_type', 'occ_type', 'npo_form');
  const category = values.tax_status ? fatcaInvestorCategory(values.tax_status) : '';
  if (!common || category === 'individual') require('pep_flag');
  if (!common) require('ubo_code');
  if (values.data_src === 'E') require('log_name');
  if (values.npo_form === 'Y') { require('pan_rp', 'npo_dcl'); if (values.npo_dcl === 'Y') require('npo_rgno'); }
  if (common) {
    require('ubo_appl', 'ubo_df');
    if (category === 'entity') require('corp_servs', 'net_worth', 'nw_date', 'exemp_code', 'ffi_drnfe', 'giin_no');
    if (category === 'entity' || category === 'huf') require('nffe_catg', 'sdf_flag');
    if (values.nffe_catg === 'A') require('act_nfe_sc');
    if (['L', 'RL', 'A', 'P'].includes(values.nffe_catg)) require('nature_bus');
    if (values.ubo_appl === 'N' && values.ubo_df === 'Y') require('ubo_exch', 'ubo_isin', 'ubo_rel_li');
  }
  for (let i = 2; i <= 4; i++) if ([`tax_res${i}`, `tpin${i}`, `id${i}_type`].some(key => values[key])) require(`tax_res${i}`, `tpin${i}`, `id${i}_type`);
  return [...missing];
}
