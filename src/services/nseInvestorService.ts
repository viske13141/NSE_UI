import { nseApi } from './nseApi';
export interface NSEInvestorSelection {
  clientCode: string; name: string; kycType: string;
  pan?: string;
  mobile?: string; email?: string;
  kycVerified?: boolean;
  memberCode?: string;
  clientType?: string;
  depository?: string;
  bank: { id: string; label: string; status: string; active: boolean; isDefault: boolean; accountNo?: string; ifsc?: string; accountType?: string; micr?: string };
}
export interface NSEInvestor {
  clientCode: string; name: string; kycType: string;
  pan: string;
  mobile?: string; email?: string;
  memberCode: string;
  clientType: string;
  depository: string;
  banks: NSEInvestorSelection['bank'][];
}
export async function getNSEInvestors(filter: { client_code?: string; pan?: string }): Promise<NSEInvestor[]> {
  const response = await nseApi.clientMaster(filter);
  if (response.response_status !== 'S') throw new Error(response.error_remark || 'Mutual funds client master request failed');
  if (response.report_data != null && !Array.isArray(response.report_data)) throw new Error('Mutual funds returned an invalid investor list');
  return (response.report_data || []).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const value = (key: string) => typeof row[key] === 'string' ? row[key].trim() : '';
    const clientCode = value('client_code');
    if (!clientCode) return [];
    const name = ['first', 'middle', 'last'].map(part => value(`primary_holder_${part}_name`)).filter(Boolean).join(' ') || clientCode;
    const banks: NSEInvestor['banks'] = [];
    for (let i = 1; i <= 5; i++) {
      const account = value(`account_no_${i}`);
      if (!account) continue;
      const status = value(`bank_${i}_status`).toUpperCase() || 'UNKNOWN';
      banks.push({ id: `${clientCode}-${i}`, label: `${value(`bank_name_${i}`) || 'Bank'} •••• ${account.slice(-4)}`, status, active: status === 'ACTIVE', isDefault: /^(Y|YES)$/.test(value(`default_bank_flag_${i}`).toUpperCase()), accountNo: /^\d+$/.test(account) ? account : undefined, ifsc: value(`ifsc_code_${i}`), accountType: value(`account_type_${i}`), micr: value(`micr_no_${i}`) });
    }
    banks.sort((a, b) => Number(b.active) - Number(a.active) || Number(b.isDefault) - Number(a.isDefault));
    return [{ clientCode, name, pan: value('primary_holder_pan'), mobile: value('indian_mobile_no'), email: value('email'), memberCode: value('member_code'), clientType: value('client_type'), depository: value('default_dp'), kycType: value('primary_holder_kyc_type') || 'Not reported', banks }];
  });
}
