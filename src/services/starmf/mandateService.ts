import { bsePost, bseGet } from './starmfApi';

export interface MandateBankDetails {
  ifsc: string;
  no: string;
  type: 'SB' | 'CB';
  name: string;
  branch?: string;
  vpa?: string[];
}

export type MandateType = 'U' | 'N' | 'X';
export type MandateMode = 'DD' | 'ACH';
export type MandateRequestType = 'REGISTRATION' | 'ENTRY';

export interface MemMandateInfo {
  member_mandate_id: string;
  mandate_status_date: string;
  umrn_number: string;
  utility_code: string;
  sponsor_code: string;
}

export interface MandateIdentifier {
  identifier_type: string;
  file_name: string;
  file_blob: string;
  file_size: number;
  issue_date?: string;
}

export interface RegisterMandateOptions {
  ucc: string;
  member: string;
  bankDetails: MandateBankDetails;
  amount: number;
  startDate: string;
  validTill: string;
  regDate: string;
  type: MandateType;
  mode: MandateMode;
  requestType?: MandateRequestType;
  redirectUrl?: string;
  subBrArn?: string;
  euin?: string;
  memMandateInfo?: MemMandateInfo;   // ENACH ENTRY only
  identifier?: MandateIdentifier;    // NACH physical / ENACH ENTRY
}

export async function registerMandate(options: RegisterMandateOptions) {
  const { ifsc, no, type: accType, name, branch, vpa } = options.bankDetails;
  const payload: Record<string, any> = {
    member: options.member,
    investor: { ucc: options.ucc },
    mem_details: { euin: options.euin ?? '', sub_br_arn: options.subBrArn ?? '', sub_br_code: '' },
    investor_bank_details: {
      ifsc,
      no,
      type: accType,
      name,
      branch: branch ?? '',
      vpa: options.type === 'U' ? (vpa ?? null) : null,
    },
    amount: options.amount,
    start_date: options.startDate,
    valid_till: options.validTill,
    reg_date: options.regDate,
    type: options.type,
    redirect_url: options.redirectUrl ?? '',
    mode: options.mode,
    frequency: 'AS AND WHEN PRESENTED',
    request_type: options.requestType ?? 'REGISTRATION',
  };
  if (options.memMandateInfo) payload.mem_mandate_info = options.memMandateInfo;
  if (options.identifier)     payload.identifier       = options.identifier;
  const { data } = await bsePost('/mandate_register', { data: payload });
  return data;
}

export async function getMandate(exch_mandate_id: number) {
  const { data } = await bsePost('/mandate_get', { data: { exch_mandate_id } });
  return data;
}

export async function listMandates(
  ucc: string = '',
  is_active: boolean = true,
  is_verified: boolean = false,
  start = 0,
  length = 50
) {
  const { data } = await bsePost('/mandate_list', {
    data: {
      start,
      length,
      fields: ['ALL'],
      count_only: false,
      search: { value: '' },
      filter_param: { is_active, is_verified, type: null, member_code: '', status: null, ucc, created_at_after: '', created_at_before: '' },
    },
  });
  return data;
}

export async function cancelMandate(ids: number[], ucc: string) {
  const { data } = await bsePost('/mandate_cancel', { data: { ids, investor: { ucc } } });
  return data;
}

export async function updateMandate(
  exch_mandate_id: number,
  ucc: string,
  member: string,
  fileName: string,
  fileBlob: string // base64
) {
  const { data } = await bsePost('/mandate_update', {
    data: {
      investor: { ucc },
      exch_mandate_id,
      member,
      identifier: { identifier_type: 'nach_scan_img', file_name: fileName, file_blob: fileBlob },
    },
  });
  return data;
}

export async function linkMandate(reg_no: string, exch_mandate_id: number) {
  const { data } = await bsePost('/link_mandate', { data: { reg_no, exch_mandate_id } });
  return data;
}

export async function delinkMandate(reg_nos: string[]) {
  const { data } = await bsePost('/mandate_delink', { data: { reg_nos } });
  return data;
}
