import { nseApi } from './nseApi';
export interface NSEKycResult {
  status: 'not-found' | 'unmapped' | 'verified';
  verified: boolean;
  message: string;
}
export async function checkNSEClientKyc(clientCode: string, pan?: string): Promise<NSEKycResult> {
  const response = await nseApi.clientKyc(pan?.trim() ? { pan_no: pan.trim().toUpperCase() } : { client_code: clientCode });
  if (response.response_status !== 'S') throw new Error(response.error_remark || 'Mutual funds KYC lookup failed');
  if (!Array.isArray(response.report_data)) throw new Error('Mutual funds returned an invalid KYC report');
  if (!response.report_data.length) return { status: 'not-found', verified: false, message: `Mutual funds returned no KYC record for client ${clientCode}. Review is unavailable until a verified record is returned. Resolve the investor’s KYC with Mutual funds, then select Recheck KYC.` };
  const matching = response.report_data.filter(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const row = value as Record<string, unknown>;
    if (String(row.client_code || '').trim().toUpperCase() !== clientCode.trim().toUpperCase()) return false;
    return !pan?.trim() || String(row.client_pan || '').trim().toUpperCase() === pan.trim().toUpperCase();
  }) as Record<string, unknown>[];
  if (!matching.length) return { status: 'not-found', verified: false, message: 'Mutual funds returned no matching KYC record for the selected client and holder. Check the investor identifiers and recheck KYC.' };
  const statuses = [...new Set(matching.map(row => String(row.kyc_status || '').trim()).filter(Boolean))];
  const remarks = [...new Set(matching.map(row => String(row.status_remark || '').trim()).filter(Boolean))];
  // Require the validated remark as well as success: success alone can include
  // UNDER_PROCESS. Never approve a report envelope or a conflicting holder row.
  const validated = matching.every(row =>
    ['SUCCESS', 'S'].includes(String(row.kyc_status || '').trim().toUpperCase()) &&
    /^(?:07\s*[-:]?\s*)?KYC\s+VALIDATED$/i.test(String(row.status_remark || '').trim())
  );
  if (validated) return { status: 'verified', verified: true, message: `Mutual funds KYC: ${remarks.join('; ')}. KYC verification passed for the selected investor. Bank, order and applicable document checks still apply.` };
  return { status: 'unmapped', verified: false, message: `Mutual funds KYC status: ${statuses.join(', ') || 'Not reported'}.${remarks.length ? ` ${remarks.join('; ')}` : ''} This portal cannot yet confirm transaction eligibility from this KYC result. Investment review remains unavailable; contact support to resolve the status interpretation. This message alone does not mean you must repeat eKYC.` };
}
