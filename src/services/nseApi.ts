import { buildSwpCancellationReportRequest } from './nseSwpCancellationReportService';
import { buildNSEKycRequest } from './nseKycRequest';
import { buildSwpDueRequest } from './nseSwpDueService';
import { buildSwpReportRequest } from './nseSwpReportService';
import { buildStpCancellationReportRequest } from './nseStpCancellationReportService';
import { buildStpDueRequest } from './nseStpDueService';
import { buildXsipTopupReportRequest } from './nseXsipTopupReportService';
import { buildStpReportRequest } from './nseStpReportService';
import { buildMandateReportRequest } from './nseMandateReportService';
import { buildSipReportRequest } from './nseSipReportService';
import { buildSipDueRequest } from './nseSipDueService';
import { buildSipCancellationReportRequest } from './nseSipCancellationReportService';
import { buildXsipReportRequest } from './nseXsipReportService';
import { buildXsipDueRequest } from './nseXsipDueService';
import { buildXsipCancellationReportRequest } from './nseXsipCancellationReportService';
import { buildSipTopupReportRequest } from './nseSipTopupReportService';
﻿import type * as NSE from '@/types/nse';

export const NSE_TOKEN_KEY = 'nse_access_token';
const API_PREFIX = (import.meta.env.VITE_NSE_API_BASE_URL as string) || '/nse-api';
export const NSE_MASTER_FILE_TYPES = {
  SCH: 'Consolidated scheme master',
  SIP: 'SIP scheme master',
  STP: 'STP scheme master',
  SWP: 'SWP scheme master',
  NAV: 'NAV download',
  SET: 'Settlement calendar',
} as const;
export type NSEMasterFileType = keyof typeof NSE_MASTER_FILE_TYPES;

export class NSEApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'NSEApiError'; }
}
function unwrapError(value: any): any {
  for (let depth = 0; depth < 3; depth++) {
    const candidate = typeof value === 'string' ? value : value?.detail;
    if (typeof candidate !== 'string' || !candidate.trim().startsWith('{')) break;
    try { value = JSON.parse(candidate); } catch { break; }
  }
  return value;
}
function errorMessage(data: any, fallback: string): string {
  data = unwrapError(data);
  if (Array.isArray(data?.detail)) return data.detail.map((item: any) => `${(item.loc || []).filter((part: string) => part !== 'body').join('.')}: ${item.msg || 'Invalid value'}`).join('; ');
  const message = data?.error_remark || data?.message || data?.remark || data?.detail || data?.error;
  return typeof message === 'string' ? message : fallback;
}

export async function nseRequest<T>(path: string, body: unknown, authenticate = true, format: 'json' | 'text' = 'json', allowReportRemark = false, preserveStatus = false): Promise<T> {
  const token = sessionStorage.getItem(NSE_TOKEN_KEY);
  if (authenticate && (!token || token.startsWith('nse_mock_token_'))) throw new Error('Please log in to Mutual funds again. Demo tokens cannot access live services.');
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      method: 'POST',
      headers: { Accept: format === 'text' ? 'text/plain, application/json' : 'application/json', 'Content-Type': 'application/json', ...(authenticate ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Unable to reach Mutual funds. Check transaction status before retrying.');
  }
  if (response.status === 401 && authenticate) sessionStorage.removeItem(NSE_TOKEN_KEY);
  const text = (await response.text()).replace(/^\uFEFF/, '').trim();
  if (format === 'text' && response.ok) {
    // Keep JSON error envelopes visible even on endpoints that usually return files.
    if (!/^[\s]*[\{"\[]/.test(text)) return text as T;
  }
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
    if (format === 'json' && !text) throw new Error('Empty response');
  } catch {
    const context = path.startsWith('/fatca/') ? 'FATCA submission is not confirmed. Check the FATCA report before retrying.' : 'Check transaction status before retrying.';
    const kind = !text ? 'an empty response' : /^\s*</.test(text) ? 'HTML instead of JSON' : 'invalid JSON';
    const reason = response.status === 401 ? 'Mutual funds authentication expired. Please log in again.'
      : response.status === 403 ? 'Mutual funds access was denied. Check account access and API configuration.'
      : response.status === 404 ? 'The Mutual funds API route was not found. Check the API proxy configuration.'
      : response.status === 502 || response.status === 503 || response.status === 504 ? 'The Mutual funds service or gateway is unavailable.'
      : 'The API response could not be read.';
    throw new NSEApiError(`${reason} Received ${kind} (HTTP ${response.status}) from ${path}. ${context}`, response.status);
  }
  if (path === '/ucc/register' && response.status >= 500 && /DB save failed|traceback|sql/i.test(String(data?.detail || ''))) throw new Error('Mutual funds could not confirm the client registration response. Check the Client Registration Report before submitting again.');
  if (path === '/swp-modification/modify' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) throw new Error('Mutual funds SWP modification service could not save its response. The change is not confirmed. Check the SWP report before retrying.');
  if (path === '/stp-modification/modify' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) throw new Error('Mutual funds STP modification service could not save its response. The change is not confirmed. Check the STP report before retrying.');
  if (path === '/swp/register' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) throw new Error('Mutual funds SWP service could not save its response. Check registration status before retrying; registration is not confirmed.');
  if (path === '/switch/entry' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) throw new Error('Mutual funds switch service could not save its response. The switch is not confirmed. Check order status before retrying.');
  if (path === '/elog/upload' && response.status >= 500) throw new Error('Mutual funds eLOG service returned a server error. Upload is not confirmed. Check the eLOG report before retrying.');
  if (path === '/fatca/common-upload' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) throw new Error('Mutual funds common FATCA service could not save its response. Submission is not confirmed. Check the FATCA report before retrying.');
  if (path === '/client-bank-detail/update' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) throw new Error('Mutual funds bank service could not save its response. The bank update is not confirmed. Check Investor profiles before retrying.');
  if (path === '/utr/update' && response.status >= 500) throw new Error('Mutual funds UTR service returned a server error. The update is not confirmed. Check order lifecycle before retrying.');
  if (path === '/stp/register' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) throw new Error('Mutual funds STP service could not save its response. Check registration status before retrying; registration is not confirmed.');
  if (path === '/mandate/register' && response.status >= 500 && typeof data?.detail === 'string' && data.detail.startsWith('DB save failed:')) {
    throw new Error('Mutual funds mandate service could not save its response. Check mandate status before retrying; registration is not confirmed.');
  }
  if (!response.ok) throw new NSEApiError(errorMessage(data, `Mutual funds request failed (${response.status})`), response.status);
  const applicationStatus = Number(unwrapError(data)?.status);
  if (Number.isInteger(applicationStatus) && applicationStatus >= 400 && applicationStatus <= 599) {
    if (applicationStatus === 401 && authenticate) sessionStorage.removeItem(NSE_TOKEN_KEY);
    throw new NSEApiError(errorMessage(data, 'Mutual funds rejected the request'), applicationStatus);
  }
  if ((data?.error_remark && !(allowReportRemark && data.response_status === 'S')) || (!preserveStatus && /^(error|fail|failed|failure|rejected)$/i.test(String(data?.status || '')))) throw new Error(errorMessage(data, 'Mutual funds rejected the request'));
  if (format === 'text' && typeof data !== 'string') throw new Error(errorMessage(data, 'Mutual funds did not return a scheme master file'));
  return data as T;
}

export const nseApi = {
  login: (body: NSE.LoginRequest) => nseRequest<NSE.LoginResponse>('/auth/login', body, false),
  registerInvestor: (body: NSE.UCCRegistrationRequest) => nseRequest<NSE.UCCRegistrationResponse>('/ucc/register', body),
  downloadMaster: (body: { file_type: NSEMasterFileType }) => {
    if (!Object.prototype.hasOwnProperty.call(NSE_MASTER_FILE_TYPES, body.file_type)) throw new Error('Unsupported Mutual funds master file type');
    return nseRequest<string>('/reports/master-download', body, true, 'text');
  },
  clientMaster: (body: NSE.ClientMasterReportRequest) => nseRequest<NSE.ClientMasterReportResponse>('/reports/client-master', body),
  clientKyc: (body: NSE.ClientKYCReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/client-kyc', buildNSEKycRequest(body), true, 'json', true),
  placeOrder: (body: NSE.OrderEntryRequest) => nseRequest<NSE.OrderEntryResponse>('/order/entry', body),
  registerSip: (body: NSE.SIPRegistrationRequest) => nseRequest<NSE.SIPRegistrationResponse>('/sip/register', body),
  registerStp: (body: NSE.STPRegistrationRequest) => nseRequest<NSE.STPRegistrationResponse>('/stp/register', body),
  stpInstallmentsDue: (body: NSE.STPInstDueReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/stp-installment-due', buildStpDueRequest(body), true, 'json', true),
  stpCancellations: (body: NSE.STPCanReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/stp-cancellation', buildStpCancellationReportRequest(body), true, 'json', true),
  stpReport: (body: NSE.STPRegReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/stp-registration', buildStpReportRequest(body), true, 'json', true),
  swpInstallmentsDue: (body: NSE.SWPInstDueReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/swp-installment-due', buildSwpDueRequest(body), true, 'json', true),
  swpCancellations: (body: NSE.SWPCanReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/swp-cancellation', buildSwpCancellationReportRequest(body), true, 'json', true),
  swpReport: (body: NSE.SWPRegReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/swp-registration', buildSwpReportRequest(body), true, 'json', true),
  registerSwp: (body: NSE.SWPRegistrationRequest) => nseRequest<NSE.SWPRegistrationResponse>('/swp/register', body),
  registerMandate: async (body: NSE.MandateRegistrationRequest) => {
    if (!Array.isArray(body.reg_data) || !body.reg_data.length || body.reg_data.length > 50) throw new Error('Provide between 1 and 50 mandate registrations');
    for (const row of body.reg_data) {
      if (!row || typeof row !== 'object' || Object.values(row).some(value => typeof value === 'string' && value.trim().toLowerCase() === 'string')) throw new Error('Replace Swagger placeholders with actual investor, bank and documented mandate values');
      if (row.reg_id?.trim() || row.reg_status?.trim() || row.reg_remark?.trim()) throw new Error('Mandate registration ID, status and remark are response fields and must be blank in the request');
    }
    return nseRequest<NSE.MandateRegistrationResponse>('/mandate/register', body);
  },
  mandateStatus: (body: NSE.MandateStatusReportRequest) => nseRequest<NSE.MandateStatusReportResponse>('/reports/mandate-status', buildMandateReportRequest(body), true, 'json', true),
  purchasePayment: (body: NSE.PurchasePaymentRequest) => nseRequest<NSE.PurchasePaymentResponse>('/payments/purchase', body),
  upiStatus: (body: NSE.UPIStatusCheckRequest) => nseRequest<NSE.UPIStatusCheckResponse>('/payments/upi-status', body, true, 'json', false, true),
  provisionalOrders: (body: NSE.OrderStatusRequest) => nseRequest<NSE.OrderStatusResponse>('/reports/provisional-orders', body, true, 'json', true),
  orderStatus: async (body: NSE.OrderStatusRequest) => {
    if (body.order_ids?.trim()) {
      const ids = body.order_ids.split(',').map(value => value.trim());
      if (ids.length > 50 || ids.some(value => !/^\d+$/.test(value))) throw new Error('Order IDs must contain at most 50 comma-separated numeric values');
    }
    if ([body.from_date, body.to_date, body.trans_type, body.order_type, body.sub_order_type].some(value => typeof value !== 'string' || value.trim().toLowerCase() === 'string')) throw new Error('Use documented date and filter values instead of Swagger placeholders');
    const response = await nseRequest<NSE.OrderStatusResponse>('/reports/order-status', body, true, 'json', true);
    if (response?.response_status !== 'S') throw new Error(response?.error_remark || 'Mutual funds order status report failed');
    if (!Array.isArray(response.report_data)) throw new Error('Mutual funds returned an invalid order status report');
    return response;
  },
  communicationLink: (body: NSE.GetLinkRequest) => nseRequest<NSE.GetLinkResponse>('/communication/get-link', body),
  sipReport: (body: NSE.SIPRegReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/sip-registration', buildSipReportRequest(body), true, 'json', true),
  sipInstallmentsDue: (body: NSE.SIPInstDueReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/sip-installment-due', buildSipDueRequest(body), true, 'json', true),
  sipCancellations: (body: NSE.SIPCanReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/sip-cancellation', buildSipCancellationReportRequest(body), true, 'json', true),
  mapSipMandate: (body: NSE.SIPUMRNMappingRequest) => nseRequest<NSE.SIPUMRNMappingResponse>('/sip/umrn-mapping', body),
  registerXsip: (body: NSE.XSIPRegistrationRequest) => nseRequest<NSE.XSIPRegistrationResponse>('/xsip/register', body),
  xsipReport: (body: NSE.XSIPRegReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/xsip-registration', buildXsipReportRequest(body), true, 'json', true),
  xsipInstallmentsDue: (body: NSE.XSIPInstDueReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/xsip-installment-due', buildXsipDueRequest(body), true, 'json', true),
  xsipCancellations: (body: NSE.XSIPCanReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/xsip-cancellation', buildXsipCancellationReportRequest(body), true, 'json', true),
  xsipTopups: (body: NSE.XSIPTopupReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/xsip-topup', buildXsipTopupReportRequest(body), true, 'json', true),
  sipTopups: (body: NSE.SIPTopupReportRequest) => nseRequest<NSE.GenericReportResponse>('/reports/sip-topup', buildSipTopupReportRequest(body), true, 'json', true),
  redemptions: (body: NSE.RedemptionStatementRequest) => nseRequest<NSE.StatementReportResponse>('/reports/redemption-statement', body, true, 'json', true),
  allotments: (body: NSE.AllotmentStatementRequest) => nseRequest<NSE.StatementReportResponse>('/reports/allotment-statement', body, true, 'json', true),
};
