import { NSEButton, NSEDialogTitle, NSEHeading } from '@/components/nse/NSEPresentation';
import { getUccProfile, getUccProfileFields, normalizeUccProfile } from '@/services/nseUccProfileService';
import { UCC_NOMINEE_FIELDS, getUccNomineeCount, getUccNomineeShare } from '@/services/nseUccNomineeService';
import { buildNSEUccRegistration, registerNSEUcc, type NSEUccRegistrationResult } from '@/services/nseUccRegistrationService';
import { getNSEFieldOptions, type NSECodeOption } from '@/services/nseDocumentMasters';
import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { validateNSEUccDraft } from '@/services/nseUccDraftService';
import { ArrowLeft } from 'lucide-react';

const groups = [
  { title: 'Holder details', fields: [['client_code', 'Client code', 10], ['primary_holder_first_name', 'First name', 70], ['primary_holder_middle_name', 'Middle name (optional)', 70], ['primary_holder_last_name', 'Last name (optional)', 70], ['gender', 'Gender', 1], ['primary_holder_dob_incorporation', 'Date of birth', 10], ['occupation_code', 'Occupation', 5], ['primary_holder_pan', 'PAN', 10]] },
  { title: 'Bank details', fields: [['account_type_1', 'Account type', 2], ['account_no_1', 'Bank account number', 40], ['confirm_account', 'Confirm bank account number', 40], ['micr_no_1', 'MICR (optional)', 9], ['ifsc_code_1', 'IFSC', 11], ['div_pay_mode', 'Receive dividends by', 2]] },
  { title: 'Contact and address', fields: [['address_1', 'Address line 1', 40], ['address_2', 'Address line 2', 40], ['address_3', 'Address line 3', 40], ['city', 'City', 35], ['state', 'State', 5], ['pincode', 'Pincode', 6], ['country', 'Country', 35], ['email', 'Email', 50], ['communication_mode', 'Communication preference', 1], ['indian_mobile_no', 'Mobile number', 10]] },
  { title: 'KYC and declarations', fields: [['primary_holder_kyc_type', 'KYC type', 1], ['primary_holder_ckyc_number', 'CKYC number', 14], ['aadhaar_updated', 'Aadhaar updated', 1], ['paperless_flag', 'Registration method', 1], ['mobile_declaration_flag', 'Mobile number belongs to', 2], ['email_declaration_flag', 'Email address belongs to', 2]] },
  { title: 'Nomination', fields: [['nomination_opt', 'Nomination choice', 1], ['nomination_authentication', 'Confirm nomination using', 1], ['nominee_soa', 'Show nominee name on statements', 1], ['nominee_opt_out_ref_no', 'Nominee opt-out reference number', 20]] },
] as const;
const optionalFields = new Set(['primary_holder_middle_name', 'primary_holder_last_name', 'micr_no_1', 'nominee_1_address2', 'nominee_1_address3']);
const selectOptions: Record<string, Array<[string, string]>> = {
  aadhaar_updated: [['Y', 'Yes'], ['N', 'No']],
  gender: [['M', 'Male'], ['F', 'Female'], ['O', 'Other'], ['T', 'Transgender']],
  account_type_1: [['SB', 'Savings'], ['CB', 'Current'], ['NE', 'NRE account'], ['NO', 'NRO account']],
  div_pay_mode: [['01', 'Cheque'], ['02', 'Direct credit'], ['03', 'ECS'], ['04', 'NEFT'], ['05', 'RTGS']],
  communication_mode: [['P', 'Physical'], ['E', 'Email'], ['M', 'Mobile']],
  primary_holder_kyc_type: [['K', 'KRA compliant'], ['C', 'CKYC compliant'], ['B', 'Biometric KYC'], ['E', 'Aadhaar eKYC PAN']],
  paperless_flag: [['P', 'Paper'], ['Z', 'Paperless']],
  nomination_opt: [['Y', 'Add nominee'], ['N', 'Opt out of nomination']],
  nomination_authentication: [['W', 'Wet signature'], ['E', 'eSign'], ['O', 'OTP']],
  nominee_1_identity_type: [['1', 'PAN'], ['2', 'Aadhaar (last 4 digits)'], ['3', 'Driving licence'], ['4', 'OCI / Passport']],
  nominee_soa: [['Y', 'Yes'], ['N', 'Registration status only']],
};
const fieldLabels: Record<string, string> = {
  tax_status: 'Investor type', holding_nature: 'Holding nature', client_type: 'UCC account type',
  primary_holder_ckyc_number: 'CKYC number',
};
const fieldLabel = (key: string) => {
  const nominee = /^nominee_(\d+)_(.+)$/.exec(key);
  if (nominee) return `Nominee ${nominee[1]}: ${UCC_NOMINEE_FIELDS.find(field => field.suffix === nominee[2])?.label || nominee[2].replace(/_/g, ' ')}`;
  return fieldLabels[key] || groups.flatMap(group => [...group.fields]).find(([field]) => field === key)?.[1] || key.replace(/_/g, ' ');
};
const displayValue = (key: string, value: string) => {
  const options = key === 'client_type' ? [['P', 'Physical / non-demat'], ['D', 'Demat']] : getNSEFieldOptions('client', key) || selectOptions[key.replace(/^nominee_[123]_/, 'nominee_1_')];
  return options?.find(([code]) => code === value)?.[1] || (key === 'nomination_authentication' && value === 'V' ? 'Video recording' : value);
};
export default function NSEUccRegistration({ onClose, onViewReport, presentation = 'dialog' }: {
  onClose: () => void;
  onViewReport?: () => void;
  presentation?: 'dialog' | 'page';
}) {
  const [step, setStep] = useState(0), [review, setReview] = useState(false), [error, setError] = useState('');
  const [values, setValues] = useState<Record<string, string>>({ primary_holder_pan_exempt: 'N', nominee_count: '1', holding_nature: 'SI', client_type: 'P', gender: '', account_type_1: '', primary_holder_kyc_type: '', nomination_opt: '', nomination_authentication: '', nominee_soa: '', communication_mode: '', div_pay_mode: '', paperless_flag: '' });
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [attempted, setAttempted] = useState(false);
  const [result, setResult] = useState<NSEUccRegistrationResult | null>(null);
  const lock = useRef(false);
  const nomineeCount = getUccNomineeCount(values);
  const reviewValues = { ...values };
  if (values.nomination_opt === 'Y') for (let index = 1; index <= nomineeCount; index++) reviewValues[`nominee_${index}_applicable`] = getUccNomineeShare(values, index);
  const profile = getUccProfile(values);
  const profileFields = getUccProfileFields(values);
  const profileSections = [...new Set(profileFields.filter(field => field.step === step).map(field => field.key.startsWith('second_holder_') ? 'Second holder' : field.key.startsWith('third_holder_') ? 'Third holder' : field.key.startsWith('guardian_') ? 'Guardian' : field.key.startsWith('foreign_address_') ? 'Foreign address' : field.key.startsWith('lei_') ? 'Legal entity details' : field.step === 1 ? 'Demat account' : 'Investor declarations'))];
  const sectionFor = (key: string, fieldStep: number) => key.startsWith('second_holder_') ? 'Second holder' : key.startsWith('third_holder_') ? 'Third holder' : key.startsWith('guardian_') ? 'Guardian' : key.startsWith('foreign_address_') ? 'Foreign address' : key.startsWith('lei_') ? 'Legal entity details' : fieldStep === 1 ? 'Demat account' : 'Investor declarations';
  const update = (key: string, value: string) => {
    setError(''); setConsent(false);
    setValues(previous => {
      const next = { ...previous, [key]: value };
      if (key === 'nomination_opt' && value === 'N') {
        for (const field of Object.keys(next)) if (/^nominee_\d+_/.test(field)) delete next[field];
        next.nominee_soa = '';
      }
      if (key === 'nomination_opt') { if (value === 'N') next.nominee_count = '1'; next.nomination_authentication = ''; if (value === 'Y') next.nominee_opt_out_ref_no = ''; }
      if (/^nominee_\d+_identity_type$/.test(key)) next[key.replace(/identity_type$/, 'identity_no')] = '';
      if (key === 'primary_holder_kyc_type' && value !== 'C') next.primary_holder_ckyc_number = '';
      return normalizeUccProfile(next);
    });
  };
  const select = (key: string, label: string, options: readonly NSECodeOption[], maxLength?: number, required = true) => <label key={key} className="block text-sm font-semibold">{label}<span aria-hidden="true">{required ? ' *' : ''}</span><select aria-label={label} aria-required={required} value={values[key] || ''} onChange={event => update(key, event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5"><option value="">Select</option>{options.map(([value, title]) => <option key={value} value={value} disabled={(!!maxLength && value.length > maxLength) || (key === 'country' && value !== '101') || (key === 'account_type_1' && !profile.foreign && !['SB', 'CB'].includes(value))}>{title === title.toUpperCase() ? title.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) : title}</option>)}</select></label>;
  const renderField = (key: string, label: string, max: number) => {
      const conditional = profileFields.find(field => field.key === key);
      const required = conditional ? conditional.required : !(optionalFields.has(key) || /^nominee_\d+_address[23]$/.test(key) || (profile.foreign && ['state', 'country', 'indian_mobile_no'].includes(key)));
      if (profile.entity && key === 'primary_holder_first_name') label = 'Entity name';
      if (profile.entity && key === 'primary_holder_dob_incorporation') label = 'Date of incorporation';
      const options = key === 'nomination_authentication' && values.nomination_opt === 'N' ? [['O', 'OTP with declaration'], ['V', 'Video recording']] as Array<[string, string]> : conditional?.options || getNSEFieldOptions('client', key) || selectOptions[key.replace(/^nominee_[123]_/, 'nominee_1_')];
      return options ? select(key, label, options, max, required) : <label key={key} className="block text-sm font-semibold">{label}<span aria-hidden="true">{required ? ' *' : ''}</span><input aria-label={label} aria-required={required} autoComplete="off" maxLength={max} min={key.endsWith('_applicable') ? '0.01' : undefined} max={key.endsWith('_applicable') ? '100' : undefined} step={key.endsWith('_applicable') ? '0.01' : undefined} type={key.endsWith('_applicable') ? 'number' : key.includes('dob') || key === 'lei_validity' ? 'date' : key.includes('email') && !key.includes('flag') ? 'email' : key.includes('account') ? 'password' : 'text'} value={key.endsWith('_applicable') ? getUccNomineeShare(values, Number(key.split('_')[1])) : values[key] || ''} onChange={event => update(key, event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5" /></label>;
  };
  const addNominee = () => {
    if (nomineeCount >= 3) return;
    setError(''); setConsent(false);
    setValues(previous => ({ ...previous, nominee_count: String(nomineeCount + 1), nominee_1_applicable: getUccNomineeShare(previous, 1), [`nominee_${nomineeCount + 1}_country`]: 'INDIA' }));
  };
  const removeNominee = (index: number) => {
    if (nomineeCount <= 1) return;
    setError(''); setConsent(false);
    setValues(previous => {
      const next: Record<string, string> = { ...previous, nominee_count: String(nomineeCount - 1) };
      for (const key of Object.keys(next)) if (/^nominee_\d+_/.test(key)) delete next[key];
      for (let target = 1; target < nomineeCount; target++) {
        const source = target < index ? target : target + 1;
        for (const field of UCC_NOMINEE_FIELDS) next[`nominee_${target}_${field.suffix}`] = previous[`nominee_${source}_${field.suffix}`] || '';
      }
      if (nomineeCount === 2) next.nominee_1_applicable = '100';
      return next;
    });
  };
  const next = () => {
    setError('');
    try { if (step === 4) buildNSEUccRegistration(values); else validateNSEUccDraft(values, step); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Check investor details'); return; }
    if (step === 4) setReview(true); else setStep(step + 1);
  };
  const submit = async () => {
    if (!review || !consent || attempted || lock.current) return;
    try { buildNSEUccRegistration(values); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check registration details'); return; }
    lock.current = true; setBusy(true); setAttempted(true); setError('');
    try { setResult(await registerNSEUcc({ ...values })); }
    catch { setResult({ state: 'unknown', clientCode: values.client_code, remark: 'Registration confirmation is unavailable. Check the Client Registration Report before submitting again.' }); }
    finally { lock.current = false; setBusy(false); }
  };
  const formContent = <>{presentation === 'dialog' && <DialogHeader><NSEDialogTitle>Register Mutual funds investor</NSEDialogTitle><DialogDescription>Enter the investor details. Fields marked * are required.</DialogDescription></DialogHeader>}
    <section aria-label="UCC account profile" className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
      <NSEHeading as="h3" className="text-sm font-semibold text-[#102B78]">Account type</NSEHeading>
      <fieldset disabled={review || busy || attempted || !!result} className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        {select('tax_status', 'Investor type', getNSEFieldOptions('client', 'tax_status') || [])}
        {select('holding_nature', 'Holding nature', getNSEFieldOptions('client', 'holding_nature') || [])}
        {select('client_type', 'UCC account type', [['P', 'Physical / non-demat'], ['D', 'Demat']])}
      </fieldset>
    </section>
    {result ? <section aria-label="Registration result" className="space-y-4">
      <div role={result.state === 'rejected' ? 'alert' : 'status'} className={`rounded-xl border p-4 ${result.state === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-blue-200 bg-blue-50 text-[#102B78]'}`}>
        <NSEHeading as="h3" className="font-bold">{result.state === 'registered' ? 'Mutual funds investor registered' : result.state === 'rejected' ? 'Mutual funds registration rejected' : 'Registration confirmation unknown'}</NSEHeading>
        <p className="mt-2 text-sm">{result.remark}</p><p className="mt-3 text-sm">Client code: {result.clientCode}</p>
        {result.registrationId && <p className="mt-1 text-sm">Registration ID: {result.registrationId}</p>}
      </div>
      <p className="text-sm text-gray-600">{result.state === 'registered' ? 'Check the Client Registration Report for the latest status. KYC verification, FATCA and bank approval are separate.' : result.state === 'unknown' ? 'Check the Client Registration Report before submitting again. This request will not be retried automatically.' : 'Review the Mutual funds rejection reason and correct the investor details before submitting again.'}</p>
      {onViewReport && <NSEButton onClick={onViewReport} className="w-full rounded-lg bg-[#102B78] p-3 text-sm font-semibold text-white">View Client Registration Report</NSEButton>}
      {result.state === 'rejected' && <NSEButton onClick={() => { setResult(null); setReview(false); setConsent(false); setAttempted(false); }} className="text-sm font-semibold text-[#102B78]">Correct registration details</NSEButton>}
      <NSEButton onClick={onClose} className="text-sm text-[#102B78]">Close registration</NSEButton>
    </section> : !review ? <><nav aria-label="Investor registration steps" className="grid grid-cols-2 gap-2 sm:grid-cols-5">{groups.map((group, index) => <NSEButton key={group.title} aria-current={step === index ? 'step' : undefined} onClick={() => { setStep(index); setError(''); }} className={`rounded-lg p-2 text-left text-xs font-semibold ${step === index ? 'bg-[#102B78] text-white' : 'bg-gray-100 text-gray-600'}`}>{index + 1}. {group.title}</NSEButton>)}</nav><NSEHeading as="h3" className="font-semibold text-[#102B78]">{groups[step].title}</NSEHeading><p className="text-xs text-gray-500">Step {step + 1} of {groups.length}</p><div className="grid gap-3 sm:grid-cols-2">{groups[step].fields.filter(([key]) => {
      if (key === 'gender' && !profile.individual) return false;
      if (profile.entity && ['primary_holder_middle_name', 'primary_holder_last_name'].includes(key)) return false;
      if (key === 'primary_holder_pan' && values.primary_holder_pan_exempt === 'Y') return false;
      if (key === 'primary_holder_ckyc_number') return values.primary_holder_kyc_type === 'C';
      if (step !== 4 || key === 'nomination_opt') return true;
      if (!values.nomination_opt) return false;
      if (key === 'nomination_authentication') return true;
      return key === 'nominee_opt_out_ref_no' ? values.nomination_opt === 'N' : values.nomination_opt === 'Y';
    }).map(([key, label, max]) => {
      return renderField(key, label, max);
    })}
    {profileSections.map(section => <fieldset key={section} className="space-y-3 rounded-xl border border-gray-200 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-[#102B78]">{section}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{profileFields.filter(field => field.step === step && sectionFor(field.key, field.step) === section).map(field => renderField(field.key, field.label, field.max))}</div>
    </fieldset>)}
    {step === 0 && profile.joint && <NSEButton type="button" onClick={() => update('third_holder_enabled', profile.third ? 'N' : 'Y')} className="justify-self-start rounded-lg border border-[#102B78] px-4 py-2 text-sm font-semibold text-[#102B78]">{profile.third ? 'Remove third holder' : '+ Add third holder'}</NSEButton>}
    {step === 4 && values.nomination_opt === 'Y' && <section aria-label="Nominees" className="space-y-4 sm:col-span-2">
      <p className="text-sm text-gray-600">Add up to 3 adult nominees. Their shares must total 100%.</p>
      {Array.from({ length: nomineeCount }, (_, offset) => offset + 1).map(index => <fieldset key={index} className="rounded-xl border border-gray-200 p-4">
        <legend className="px-1 text-sm font-semibold text-[#102B78]">Nominee {index}</legend>
        {nomineeCount > 1 && <div className="mb-3 flex justify-end"><NSEButton type="button" onClick={() => removeNominee(index)} aria-label={`Remove nominee ${index}`} className="text-sm font-semibold text-rose-700">Remove</NSEButton></div>}
        <div className="grid gap-3 sm:grid-cols-2">{UCC_NOMINEE_FIELDS.map(field => renderField(`nominee_${index}_${field.suffix}`, index === 1 ? field.label : `Nominee ${index}: ${field.label}`, index === 2 && field.suffix === 'name' ? 10 : field.max))}</div>
      </fieldset>)}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#102B78]">Total share: {Math.round(Array.from({ length: nomineeCount }, (_, offset) => Number(getUccNomineeShare(values, offset + 1)) || 0).reduce((total, share) => total + share, 0) * 100) / 100}% / 100%</p>
        {nomineeCount < 3 ? <NSEButton type="button" onClick={addNominee} className="rounded-lg border border-[#102B78] px-4 py-2 text-sm font-semibold text-[#102B78]">+ Add another nominee</NSEButton> : <p className="text-xs text-gray-500">Maximum 3 nominees added</p>}
      </div>
    </section>}
    </div>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<div className="flex justify-between"><NSEButton disabled={step === 0} onClick={() => setStep(step - 1)} className="px-3 py-2 text-sm text-[#102B78] disabled:opacity-40">Back</NSEButton><NSEButton onClick={next} className="rounded-lg bg-[#102B78] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{step === 4 ? 'Review registration' : 'Continue'}</NSEButton></div></> : <><NSEHeading as="h3" className="font-semibold text-[#102B78]">Review investor registration</NSEHeading><p className="text-xs text-gray-500">Check your details before submitting to Mutual funds.</p><dl className="grid gap-3 sm:grid-cols-2">{Object.entries(reviewValues).filter(([key, value]) => value && !['confirm_account', 'nominee_count', 'tax_status', 'holding_nature', 'client_type', 'third_holder_enabled'].includes(key)).map(([key, value]) => <div key={key} className="text-sm"><dt className="text-xs capitalize text-gray-500">{profileFields.find(field => field.key === key)?.label || (profile.entity && key === 'primary_holder_first_name' ? 'Entity name' : profile.entity && key === 'primary_holder_dob_incorporation' ? 'Date of incorporation' : fieldLabel(key))}</dt><dd className="mt-1 break-words font-semibold">{key.includes('account_no') || key.endsWith('_pan') || key.includes('identity_no') ? `\u2022\u2022\u2022\u2022 ${value.slice(-4)}` : profileFields.find(field => field.key === key)?.options?.find(([code]) => code === value)?.[1] || displayValue(key, value)}</dd></div>)}</dl><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} disabled={busy || attempted} onChange={event => setConsent(event.target.checked)} /><span>I confirm these investor details and nomination choices for submission to Mutual funds.</span></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <NSEButton disabled={!consent || busy || attempted} onClick={() => void submit()} className="w-full rounded-lg bg-[#102B78] p-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">{busy ? 'Submitting to Mutual funds...' : 'Submit to Mutual funds'}</NSEButton>
      <NSEButton disabled={busy || attempted} onClick={() => { setReview(false); setConsent(false); }} className="text-sm text-[#102B78]">Edit registration</NSEButton></>}
  </>;
  if (presentation === 'page') return <main className="min-h-screen bg-[#f4f7fc] px-4 py-6 sm:px-6 sm:py-10">
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <NSEButton disabled={busy} onClick={onClose} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#102B78] disabled:opacity-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to dashboard</NSEButton>
        <div>
          <NSEHeading as="h1" className="text-2xl font-bold text-slate-900 sm:text-3xl">Register Mutual funds investor</NSEHeading>
          <p className="text-sm text-slate-600">Enter the investor details. Fields marked * are required.</p>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">{formContent}</section>
    </div>
  </main>;
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>{formContent}</DialogContent></Dialog>;
}
