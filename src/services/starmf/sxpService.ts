import { bsePost, bseGet } from './starmfApi';
import type { SxpRegister, SxpListFilter } from '@/types/starmf/sxp.types';

export async function registerSxp(payload: SxpRegister) {
  try {
    const requestBody = {
      sxp_type: payload.sxp_type,
      mem_sxp_ref_id: payload.mem_sxp_ref_id,
      investor: payload.investor,
      member: payload.member,
      src_scheme: payload.src_scheme,
      kyc_passed: payload.kyc_passed,
      dest_scheme: payload.dest_scheme || '',
      amc_code: payload.amc_code || '',
      exch_mandate_id: payload.exch_mandate_id ?? 0,
      amount: payload.amount,
      cur: payload.cur || 'INR',
      is_fresh: payload.is_fresh !== undefined ? payload.is_fresh : true,
      src_folio: payload.src_folio || '',
      phys_or_demat: payload.phys_or_demat,
      isunits: payload.isunits || false,
      min_redeem_flag: payload.min_redeem_flag || false,
      dpc: payload.dpc || false,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      freq: payload.freq,
      txn_date: payload.txn_date,
      holder: payload.holder,
      email: payload.email || '',
      mobnum: payload.mobnum || '',
      ...(payload.depository_acct ? { depository_acct: payload.depository_acct } : {}),
      first_order_today: payload.first_order_today !== undefined ? payload.first_order_today : false,
      brokerage: payload.brokerage || 2.5,
      ninstallments: payload.ninstallments || 0,
      special_product: payload.special_product || {
        special_prod_type: '',
        special_prod_name: '',
        target_scheme: '',
        target_amt: 0,
        goal_type: '',
        goal_amt: 0,
        sip_tenure: 0,
      },
    };

    const { data } = await bsePost('/sxp_register', { data: requestBody });

    return data;
  } catch (error: any) {
    const status = error?.response?.status;
    const errorData = error?.response?.data;
    const messages = errorData?.messages || [];

    if (messages && Array.isArray(messages)) {
      messages.forEach((_msg: any, _idx: number) => {});
    }

    if (status === 400) {
      const apiErrorMsg = messages.length > 0
        ? messages.map((m: any) => `${m.field}: ${m.errcode} (${m.vals?.join(', ')})`).join(' | ')
        : 'Invalid request parameters';
      throw new Error(`SIP registration failed: ${apiErrorMsg}`);
    }
    throw error;
  }
}

export async function cancelSxp(
  reg_no: string,
  reason_cd: number = 6,
  reason_cd_msg: string = 'Do not want to continue',
  sxp_type: string = 'SIP'
) {
  const { data } = await bsePost('/sxp_cancel', { data: { reg_no, reason_cd, reason_cd_msg, sxp_type } });
  return data;
}

export async function pauseSxp(reg_no: string, ninstallments: number = 1, paused_from: string) {
  const { data } = await bsePost('/sxp_set_pause', { data: { reg_no, ninstallments, paused_from } });
  return data;
}

export async function resumeSxp(reg_no: string, resume_reason: string = 'Ready to continue') {
  const { data } = await bsePost('/sxp_resume', { data: { reg_no, resume_reason } });
  return data;
}

export async function getSxp(reg_no: string, sxp_type: string = 'SIP') {
  const { data } = await bsePost('/sxp_get', { data: { reg_no, sxp_type } });
  return data;
}

export async function topupSxp(
  reg_num: string,
  mem_sxp_ref_id: string,
  amount: number,
  start_date: string,
  end_date: string,
  freq: string = 'y',
  txn_date: number = 1,
  email: string,
  mobnum: string,
  first_order_today: boolean = true,
  remark: string = ''
) {
  const { data } = await bsePost('/sxp_topup', {
    data: { reg_num, mem_sxp_ref_id, amount, cur: 'INR', start_date, end_date, freq, txn_date, payment_ref_id: '', remark, first_order_today, email, mobnum },
  });
  return data;
}

export async function getSxpHistory(
  reg_no: string,
  no_of_txn: number = 10,
  from_date: string = '',
  to_date: string = ''
) {
  const { data } = await bsePost('/sxp_get_history', {
    data: {
      reg_no,
      fields: ['mem_ord_ref_id', 'src_scheme', 'amount', 'cur', 'is_units', 'all_units', 'folio', 'phys_or_demat', 'ALL'],
      filter_param: { no_of_txn, from_date, to_date },
    },
  });
  return data;
}

export async function listSxp(filter: SxpListFilter = {}, start = 0, length = 50) {
  const { data } = await bsePost('/sxp_list', {
    data: {
      fields: ['ALL'],
      count_only: false,
      start,
      length,
      filter_param: {
        sxp_type: filter.type ?? ['SIP'],
        status: filter.status ?? ['active'],
        ...(filter.ucc && { ucc: filter.ucc }),
        ...(filter.start_date_after && { start_date_after: filter.start_date_after }),
        ...(filter.start_date_before && { start_date_before: filter.start_date_before }),
      },
    },
  });
  return data;
}
