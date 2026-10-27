import { bsePost, bseGet } from './starmfApi';

export type TwoFaEvent =
  | 'ucc_nom'
  | 'ucc_elog'
  | 'ucc_auth'
  | 'verify_mandate_cancel'
  | 'verify_sxp_reg'
  | 'verify_sxp_topup'
  | 'verify_sxp_cancel'
  | 'verify_sxp_pause'
  | 'verify_sxp_resume'
  | 'verify_order_new'
  | 'verify_order_update'
  | 'verify_order_cancel';

export type TwoFaRequest =
  | { event: 'ucc_nom' | 'ucc_elog' | 'ucc_auth'; investor: { client_code: string; pan_holder?: string[]; holding_nature?: string }; parent_client_code?: string; member_code: string }
  | { event: 'verify_mandate_cancel'; mandate: string }
  | { event: 'verify_sxp_reg' | 'verify_sxp_topup' | 'verify_sxp_cancel' | 'verify_sxp_pause' | 'verify_sxp_resume'; sxp: string }
  | { event: 'verify_order_new' | 'verify_order_update' | 'verify_order_cancel'; order: string };

export interface TwoFaResponse {
  status: string;
  data?: { link?: string; [key: string]: any };
  messages?: string[] | null;
}

export async function get2faLink(requests: TwoFaRequest[]): Promise<TwoFaResponse> {
  const { data } = await bsePost('/v2/get_2fa_link', { data: requests });
  return data;
}
