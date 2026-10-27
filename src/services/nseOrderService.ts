import { nseSipInvestorMode } from './nseSipService';
import { nseApi } from './nseApi';
import type { NSEInvestorSelection } from './nseInvestorService';
import type { OrderDetail } from '@/types/nse';
export type NSETransactionMode = 'C' | 'N' | 'P';
export type NSEPurchaseType = 'FRESH' | 'ADDITIONAL';
export interface NSEPurchaseInput {
  schemeCode: string; amount: number; investor: NSEInvestorSelection; euin: string;
  transactionMode: NSETransactionMode; purchaseType?: NSEPurchaseType; folio?: string;
  euinDeclaration?: 'Y' | 'N'; memberUniqueId: string; bankReference?: string;
  minAmount?: number | null; maxAmount?: number | null; amountMultiple?: number | null;
}
export function buildNSEPurchase(input: NSEPurchaseInput): { transaction_details: OrderDetail[] } {
  const schemeCode = input.schemeCode.trim(); const folio = input.folio?.trim() || '';
  const purchaseType = input.purchaseType || 'FRESH'; const declaration = input.euinDeclaration || 'Y';
  if (!schemeCode || schemeCode.length > 20) throw new Error('An Mutual funds scheme code of at most 20 characters is required');
  if (!input.investor.clientCode || input.investor.clientCode.length > 10 || !input.investor.kycVerified) throw new Error('Verified Mutual funds KYC and a valid client code are required');
  if (!input.investor.bank.active) throw new Error('An active registered bank is required');
  if (!['C', 'N', 'P'].includes(input.transactionMode)) throw new Error('Select CDSL, NSDL or physical transaction mode');
  const registeredMode = nseSipInvestorMode(input.investor);
  if (input.transactionMode !== 'P' && registeredMode && input.transactionMode !== registeredMode) throw new Error('Demat mode must match the investor depository in Client Master');
  if (!['FRESH', 'ADDITIONAL'].includes(purchaseType)) throw new Error('Select fresh or additional purchase');
  if ((input.transactionMode === 'P' || purchaseType === 'ADDITIONAL') && !folio) throw new Error('Folio is required for physical or additional purchases');
  if (folio.length > 15) throw new Error('Folio must be at most 15 characters');
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 99999999999.99 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.0001) throw new Error('Enter a valid purchase amount with at most two decimal places');
  if (input.minAmount != null && input.amount < input.minAmount) throw new Error('Amount is below the scheme minimum');
  if (input.maxAmount && input.amount > input.maxAmount) throw new Error('Amount exceeds the scheme maximum');
  if (input.amountMultiple && Math.abs(input.amount / input.amountMultiple - Math.round(input.amount / input.amountMultiple)) > 0.000001) throw new Error('Amount must follow the scheme purchase increment');
  if (!['Y', 'N'].includes(declaration)) throw new Error('Select an EUIN declaration');
  if (declaration === 'Y' && !/^E\d{6}$/.test(input.euin.trim().toUpperCase())) throw new Error('Enter a valid EUIN, such as E followed by six digits');
  if ((input.bankReference?.trim().length || 0) > 25) throw new Error('Bank reference must be at most 25 characters');
  if (!input.memberUniqueId.trim() || input.memberUniqueId.length > 25) throw new Error('A unique member reference of at most 25 characters is required');
  // Account number is conditional for demat redemption, not mandatory for purchase.
  const account = input.investor.bank.accountNo || '';
  if (account && (!/^\d+$/.test(account) || account.length > 20)) throw new Error('Invalid bank account number');
  return { transaction_details: [{
    order_ref_number: '', scheme_code: schemeCode, trxn_type: 'P', buy_sell_type: purchaseType,
    client_code: input.investor.clientCode, demat_physical: input.transactionMode, order_amount: String(input.amount),
    folio_no: folio, remarks: 'Add through API', kyc_flag: 'Y', sub_broker_code: '',
    euin_number: declaration === 'Y' ? input.euin.trim().toUpperCase() : '', euin_declaration: declaration, min_redemption_flag: 'N',
    dpc_flag: 'Y', all_units: 'N', redemption_units: '', sub_broker_arn: '',
    bank_ref_no: input.bankReference?.trim() || '', account_no: account,
    mobile_no: '', email: '', mandate_id: '', filler1: '', member_unique_id: input.memberUniqueId,
  }] };
}
export async function submitNSEPurchase(input: NSEPurchaseInput) {
  const response = await nseApi.placeOrder(buildNSEPurchase(input));
  if (!Array.isArray(response?.transaction_details) || response.transaction_details.length !== 1) throw new Error('Order confirmation is unreadable. Check order status before retrying.');
  const detail = response.transaction_details[0];
  const rawStatus = detail.trxn_status?.trim() || 'Confirmation pending';
  const rawId = detail.trxn_order_id?.trim();
  const exchangeOrderId = rawId && /^\d{1,12}$/.test(rawId) && Number(rawId) > 0 ? rawId : null;
  const rejected = /FAIL|REJECT|ERROR/i.test(rawStatus);
  const orderAccepted = !rejected && rawStatus.toUpperCase() === 'TRXN SUCCESS' && !!exchangeOrderId;
  // Acceptance is distinct from payment and unit allotment; holdings remain unchanged.
  return { status: rejected ? 'rejected' as const : 'pending' as const, orderAccepted, exchangeOrderId, rawStatus, remark: detail.trxn_remark?.trim() || (rejected ? 'Mutual funds rejected the order' : orderAccepted ? 'Order accepted. Payment is pending.' : 'Awaiting exchange confirmation and payment') };
}
