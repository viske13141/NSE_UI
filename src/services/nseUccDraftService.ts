import { getUccProfile, normalizeUccProfile, validateUccDate, validateUccProfileFields } from './nseUccProfileService';
import { validateUccNominees } from './nseUccNomineeService';
import { validateNSEMasterValues } from './nseDocumentMasters';
export function validateNSEUccDraft(values: Record<string, string>, step?: number) {
  values = normalizeUccProfile(values);
  const profile = getUccProfile(values);
  const text = (key: string) => (values[key] || '').trim();
  const required = (keys: string[]) => { for (const key of keys) if (!text(key) || text(key).toLowerCase() === 'string') throw new Error(`Enter ${key.replace(/_/g, ' ')}`); validateNSEMasterValues('client', values, keys); };
  if (step == null || step === 0) {
    required(['client_code', 'primary_holder_first_name', 'primary_holder_dob_incorporation', 'tax_status', 'occupation_code']);
    if (!['SI', 'JO', 'AS'].includes(text('holding_nature'))) throw new Error('Select holding nature');
    if (!['P', 'D'].includes(text('client_type'))) throw new Error('Select UCC account type');
    if (profile.individual) required(['gender']);
    if (text('primary_holder_pan_exempt') !== 'Y') {
      required(['primary_holder_pan']);
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(text('primary_holder_pan').toUpperCase())) throw new Error('Enter a valid PAN');
      if (profile.individual && text('primary_holder_pan').toUpperCase()[3] !== 'P') throw new Error('Enter an individual PAN with P as its fourth character');
    }
    validateUccDate(text('primary_holder_dob_incorporation'), profile.entity ? 'date of incorporation' : 'date of birth', profile.individual ? !profile.minor : undefined);
  }

  if (step == null || step === 2) {
    required(['email', 'address_1', 'address_2', 'address_3', 'city', 'pincode', 'communication_mode']);
    if (!profile.foreign) required(['indian_mobile_no', 'state', 'country']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text('email'))) throw new Error('Enter a valid email address');
    if (text('indian_mobile_no') && !/^[6-9]\d{9}$/.test(text('indian_mobile_no'))) throw new Error('Enter a valid 10-digit mobile number');
    if (!/^\d{6}$/.test(text('pincode'))) throw new Error('Enter a six-digit pincode');
    if (text('country') && text('country') !== '101') throw new Error('Use India for the Indian address; enter overseas details under Foreign address');
  }
  if (step == null || step === 1) {
    required(['account_no_1', 'confirm_account', 'account_type_1', 'ifsc_code_1', 'div_pay_mode']);
    if (!/^[A-Z0-9]{1,40}$/i.test(text('account_no_1'))) throw new Error('Bank account must contain up to 40 letters or digits');
    if (!profile.foreign && !['SB', 'CB'].includes(text('account_type_1'))) throw new Error('Select a savings or current bank account for a resident investor');
    if (text('account_no_1') !== text('confirm_account')) throw new Error('Bank account numbers do not match');
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(text('ifsc_code_1').toUpperCase())) throw new Error('Enter a valid IFSC');
    if (text('micr_no_1') && !/^\d{9}$/.test(text('micr_no_1'))) throw new Error('MICR must contain nine digits');
  }
  if (step == null || step === 3) {
    required(['primary_holder_kyc_type', 'paperless_flag', 'aadhaar_updated', 'mobile_declaration_flag', 'email_declaration_flag']);
    if (text('primary_holder_kyc_type') === 'C' && !/^\d{14}$/.test(text('primary_holder_ckyc_number'))) throw new Error('CKYC requires a 14-digit CKYC number');
  }
  validateUccProfileFields(values, step);
  if (step == null || step === 4) {
    if (!['Y', 'N'].includes(text('nomination_opt'))) throw new Error('Select a nomination choice');
    if (text('nomination_opt') === 'Y') {
      required(['nomination_authentication', 'nominee_soa']);
      validateUccNominees(values);
    } else {
      required(['nomination_authentication', 'nominee_opt_out_ref_no']);
      if (!['O', 'V'].includes(text('nomination_authentication'))) throw new Error('Choose OTP or video authentication for nomination opt out');
    }
  }
}
