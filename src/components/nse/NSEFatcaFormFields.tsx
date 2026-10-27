import React, { useState } from 'react';
import NSEDocumentInput from './NSEDocumentInput';
import { NSEButton } from './NSEPresentation';
import { FATCA_INDIVIDUAL_FIELDS } from '@/services/nseFatcaDataService';

const labels: Record<string, string> = {
  tax_status: 'Tax status', co_bir_inc: 'Country of birth', tax_res1: 'Tax residence country',
  id1_type: 'Identification document type', srce_wealt: 'Source of wealth', inc_slab: 'Annual income range',
  occ_code: 'Occupation', ubo_code: 'Beneficial owner classification (UBO code)',
  data_src: 'Declaration received through', addr_type: 'Address type', pep_flag: 'Politically exposed person (PEP)',
  occ_type: 'Occupation type', npo_form: 'NPO form applicable', npo_dcl: 'NPO declaration', npo_rgno: 'NPO registration number',
  exch_name: 'Exchange', ubo_appl: 'Beneficial owners applicable', ubo_df: 'UBO declaration flag',
  ubo_count: 'Number of beneficial owners', sdf_flag: 'Self declaration flag',
};
export function fatcaFieldLabel(key: string): string {
  if (labels[key]) return labels[key];
  const field = FATCA_INDIVIDUAL_FIELDS.find(([name]) => name === key);
  if (field) return field[1];
  const residence = /^(tax_res|tpin|id)([1-4])(?:_type)?$/.exec(key);
  if (residence) return `${residence[1] === 'tax_res' ? 'Tax residence country' : residence[1] === 'tpin' ? 'Taxpayer identification number' : 'Identification document type'} ${residence[2]}`;
  return key.replace(/_/g, ' ');
}
export function FatcaSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <fieldset className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <legend className="px-2 text-sm font-bold text-[#102B78]">{title}</legend>
    <p className="mb-4 text-xs leading-relaxed text-slate-500">{description}</p>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </fieldset>;
}
const business = ['01', '43'];
const service = ['02', '03', '04', '09', '41', '42', '44'];
export default function NSEFatcaFormFields({ values, onChange, common = false, missing = [] }: {
  values: Record<string, string>; onChange: (key: string, value: string) => void; common?: boolean; missing?: string[];
}) {
  const [residences, setResidences] = useState(() => Math.max(1, ...[2, 3, 4].filter(number => [values[`tax_res${number}`], values[`tpin${number}`], values[`id${number}_type`]].some(value => value?.trim()))));
  const field = (key: string, title = fatcaFieldLabel(key), max?: number) => {
    const definition = FATCA_INDIVIDUAL_FIELDS.find(([name]) => name === key);
    return <label key={key} className="block text-sm font-medium text-slate-700">{title}<NSEDocumentInput domain="fatca" field={key}
      className={`mt-1 w-full rounded border p-2 ${missing.includes(key) ? 'border-amber-500 bg-amber-50' : ''}`} type={key === 'dob' ? 'date' : 'text'} maxLength={max || definition?.[2]} value={values[key] || ''}
      onChange={value => { onChange(key, value); if (key === 'occ_code' && value) onChange('occ_type', business.includes(value) ? 'B' : service.includes(value) ? 'S' : 'O'); }} /></label>;
  };
  return <div className="space-y-5">
    <FatcaSection title="Investor details" description="Enter the investor or guardian details recorded against the investment. Provide PAN, or PEKRN for a PAN-exempt investor.">
      {field('pan_rp')}{field('pekrn')}{field('inv_name')}{field('tax_status')}
      {field('dob', common ? 'Date of birth / incorporation (optional)' : undefined)}
      {field('fr_name')}{field('sp_name')}
    </FatcaSection>
    <FatcaSection title="Birth and declaration details" description="Use the investor's declared birth details. Choose whether the declaration was received on paper or electronically.">
      {field('po_bir_inc', common ? 'Place of birth / incorporation' : 'Place of birth')}{field('co_bir_inc')}
      {field('addr_type')}{field('data_src')}{values.data_src === 'E' && field('log_name')}
    </FatcaSection>
    <FatcaSection title="Tax residence and identification" description="The first tax residence is required. Add another only if the investor has additional tax residences. Each residence needs a country, tax identifier and document type.">
      <div className="grid gap-4 rounded-lg bg-slate-50 p-3 sm:col-span-2 sm:grid-cols-3">
        {field('tax_res1')}{field('tpin1')}{field('id1_type')}
      </div>
      {Array.from({ length: residences - 1 }, (_, index) => index + 2).map(number => <fieldset key={number} className="grid gap-4 rounded-lg border p-3 sm:col-span-2 sm:grid-cols-3">
        <legend className="px-1 text-xs font-semibold">Tax residence {number} (optional)</legend>
        {field(`tax_res${number}`, 'Tax residence country', 50)}{field(`tpin${number}`, 'Taxpayer identification number', 20)}{field(`id${number}_type`, 'Identification document type', 2)}
        <NSEButton type="button" className="text-left text-xs text-rose-700" onClick={() => { for (let current = number; current < residences; current++) { onChange(`tax_res${current}`, values[`tax_res${current + 1}`] || ''); onChange(`tpin${current}`, values[`tpin${current + 1}`] || ''); onChange(`id${current}_type`, values[`id${current + 1}_type`] || ''); } onChange(`tax_res${residences}`, ''); onChange(`tpin${residences}`, ''); onChange(`id${residences}_type`, ''); setResidences(residences - 1); }}>Remove tax residence {number}</NSEButton>
      </fieldset>)}
      {residences < 4 && <NSEButton type="button" onClick={() => setResidences(residences + 1)} className="justify-self-start rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-[#102B78]">Add another tax residence</NSEButton>}
    </FatcaSection>
    <FatcaSection title="Income and occupation" description="Choose the investor's declared income and occupation. Occupation type is filled from the selected occupation; for example, Government Service uses Service.">
      {field('srce_wealt')}{field('inc_slab')}{field('occ_code')}{field('occ_type')}{field('pep_flag')}
      {!common && field('ubo_code')}
    </FatcaSection>
    <FatcaSection title="Declaration and NPO details" description="NPO means non-profit organisation. Confirm whether the NPO form applies. PAN is required when providing NPO details. For changes, enter the complete current declaration.">
      {field('new_change')}{field('npo_form')}{values.npo_form === 'Y' && <>{field('npo_dcl')}{values.npo_dcl === 'Y' && field('npo_rgno', undefined, 50)}</>}
    </FatcaSection>
  </div>;
}
