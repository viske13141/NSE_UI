import document from '@/data/nseDocumentMasters.json';

export type NSECodeOption = readonly [string, string];
export type NSEFieldDomain = 'client' | 'fatca';
type Table = keyof typeof document.tables;
export function nseMasterOptions(table: Table): NSECodeOption[] {
  return document.tables[table].options.map(([code, label]) => [code, label]);
}
export const NSE_CLIENT_CODE_OPTIONS: Record<string, readonly NSECodeOption[]> = {
  occupation_code: nseMasterOptions('clientOccupations'),
  tax_status: nseMasterOptions('clientTaxStatuses'),
  state: nseMasterOptions('clientStates'),
  country: nseMasterOptions('clientCountries'),
  holding_nature: nseMasterOptions('holdingNatures'),
  guardian_relationship: nseMasterOptions('guardianRelationships'),
  account_type_1: nseMasterOptions('accountTypes'),
  mobile_declaration_flag: nseMasterOptions('contactDeclarations'),
  email_declaration_flag: nseMasterOptions('contactDeclarations'),
};
const yesNo: NSECodeOption[] = [['Y', 'Yes'], ['N', 'No']];
const addressTypes: NSECodeOption[] = [['1', 'Residential or business'], ['2', 'Residential'], ['3', 'Business'], ['4', 'Registered office'], ['5', 'Unspecified']];
const pep: NSECodeOption[] = [['Y', 'Politically exposed person'], ['N', 'Not politically exposed'], ['R', 'Relative of a politically exposed person']];
export const NSE_FATCA_CODE_OPTIONS: Record<string, readonly NSECodeOption[]> = {
  new_change: [['N', 'New declaration'], ['C', 'Change existing declaration']],
  ubo_gender: [['M', 'Male'], ['F', 'Female'], ['O', 'Other']],
  ubo_occ: nseMasterOptions('fatcaOccupations'),
  ubo_occ_ty: [['S', 'Service'], ['B', 'Business'], ['O', 'Others'], ['X', 'Not categorized']],
  tax_status: nseMasterOptions('fatcaTaxStatuses'),
  occ_code: nseMasterOptions('fatcaOccupations'),
  srce_wealt: nseMasterOptions('fatcaWealthSources'),
  inc_slab: nseMasterOptions('fatcaIncomeRanges'),
  ubo_code: nseMasterOptions('fatcaUboCodes'),
  co_bir_inc: nseMasterOptions('fatcaCountries'),
  ubo_nation: nseMasterOptions('fatcaCountries'),
  ubo_cntry: nseMasterOptions('fatcaCountries'),
  ubo_ctr: nseMasterOptions('fatcaCountries'),
  ubo_cob: nseMasterOptions('fatcaCountries'),
  ubo_state: nseMasterOptions('fatcaStates'),
  ubo_id_ty: nseMasterOptions('fatcaIdentityTypes'),
  exemp_code: nseMasterOptions('fatcaExemptions'),
  giin_exemc: nseMasterOptions('fatcaGiinExemptions'),
  act_nfe_sc: nseMasterOptions('fatcaActiveNfeSubcategories'),
  corp_servs: [['01', 'Foreign exchange / money changer services'], ['02', 'Gaming / gambling / lottery services'], ['03', 'Money laundering / pawning'], ['04', 'Not applicable']],
  ffi_drnfe: [['FFI', 'FFI'], ['DRNFE', 'DRNFE'], ['NA', 'Not applicable']],
  giin_na: [['AF', 'Applied for'], ['NR', 'Not required to apply'], ['NO', 'Not obtained - non-participating FI']],
  ubo_exch: [['B', 'BSE'], ['N', 'Mutual funds'], ['O', 'Others']],
  ubo_categ: [['UBO', 'Ultimate beneficial owner'], ['SMO', 'Senior managing official']],
  data_src: [['E', 'Electronic'], ['P', 'Physical']],
  addr_type: addressTypes, ubo_add_ty: addressTypes,
  occ_type: [['S', 'Service'], ['B', 'Business'], ['O', 'Others'], ['X', 'Not categorized']],
  pep_flag: pep, ubo_pep_fl: pep,
  ubo_appl: yesNo, ubo_df: yesNo, sdf_flag: yesNo, npo_form: yesNo, npo_dcl: yesNo,
};

export function getNSEFieldOptions(domain: NSEFieldDomain, key: string): readonly NSECodeOption[] | undefined {
  if (domain === 'client') {
    if (/^nominee_\d+_relationship$/.test(key)) return nseMasterOptions('nomineeRelationships');
    if (/^nominee_\d+_country$/.test(key)) return nseMasterOptions('clientCountries').map(([, name]) => [name, name]);
    if (/^account_type_\d$/.test(key)) return nseMasterOptions('accountTypes');
    if (/exempt_category$/.test(key)) return nseMasterOptions('panExemptCategories');
    return NSE_CLIENT_CODE_OPTIONS[key];
  }
  if (/^tax_res[1-4]$/.test(key)) return nseMasterOptions('fatcaCountries');
  if (/^id[1-4]_type$/.test(key)) return nseMasterOptions('fatcaIdentityTypes');
  return NSE_FATCA_CODE_OPTIONS[key];
}

export function validateNSEMasterValues(domain: NSEFieldDomain, values: Record<string, string>, keys = Object.keys(values)) {
  for (const key of keys) {
    const value = values[key]?.trim();
    const options = getNSEFieldOptions(domain, key);
    if (value && options && !options.some(([code]) => code === value)) throw new Error(`Select a documented ${key.replace(/_/g, ' ')} option`);
  }
}

export function nseFieldDisplayValue(domain: NSEFieldDomain, key: string, value: string) {
  const label = getNSEFieldOptions(domain, key)?.find(([code]) => code === value)?.[1];
  return label && label !== value ? `${label} (${value})` : value;
}
