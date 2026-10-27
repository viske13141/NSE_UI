import { bsePost, bseGet } from './starmfApi';
import type { SchemeListRequest } from '@/types/starmf/scheme.types';

export async function getMasterSchemeList(params: Partial<SchemeListRequest> = {}) {
  const payload: SchemeListRequest = {
    fields: ['ALL'],
    count_only: false,
    start: params.start ?? 0,
    length: params.length ?? 100,
    filter_param: params.filter_param ?? {
      scheme_amc_name: '', scheme_category: '', scheme_sub_category: '',
      investment_mode: '', scheme_option: '', scheme_plan: '',
      scheme_isin: '', settlement_days: '', transaction_allowed: 'Y',
    },
    search: params.search ?? { value: '' },
  };
  
  try {
    const { data } = await bsePost('/master_scheme_list', { data: payload });
    return data;
  } catch (error) {
    throw error;
  }
}

export async function getNavMasterList(params: {
  start?: number;
  length?: number;
  navDate?: string;       // e.g. '23-Oct-2025'
  bseSchemeCode?: string; // scope to one scheme
} = {}) {
  const { data } = await bsePost('/nav_master_list', {
    data: {
      fields: ['ALL'],
      count_only: false,
      start: params.start ?? 0,
      length: params.length ?? 100,
      filter_param: {
        ...(params.navDate       ? { nav_date:        params.navDate       } : {}),
        ...(params.bseSchemeCode ? { bse_scheme_code: params.bseSchemeCode } : {}),
      },
    },
  });
  return data;
}
