import { nseApi } from './nseApi';
export type NSEUpiStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'EXPIRED' | 'REJECTED';
export const NSE_UPI_STATES = {
  SUCCESS: { state: 'paid', label: 'UPI payment completed' },
  FAILED: { state: 'failed', label: 'UPI payment failed' },
  PENDING: { state: 'pending', label: 'UPI payment pending' },
  EXPIRED: { state: 'expired', label: 'UPI payment expired' },
  REJECTED: { state: 'rejected', label: 'UPI payment rejected' },
} as const;
export async function getNSEUpiStatus(clientCode: string, reference: string, expectedAmount: number) {
  const ref = reference.trim();
  if (/^https?:\/\//i.test(ref) || /^[a-f0-9]{32}$/i.test(ref)) throw new Error('This is an authorization-link token, not an UPI payment reference. Enter the numeric UPI payment reference for the payment.');
  if (!/^\d{1,10}$/.test(ref)) throw new Error('Enter the numeric UPI payment reference, at most 10 digits');
  if (!clientCode || clientCode.length > 12) throw new Error('A valid Mutual funds client code is required');
  const response = await nseApi.upiStatus({ nse_upi_ref_no: ref, client_code: clientCode });
  const status = response?.status?.trim().toUpperCase();
  if (status === 'FAIL') throw new Error(`${response.remark?.trim() || 'Mutual funds could not look up this UPI reference.'} Payment status is unconfirmed; this lookup did not establish a failed payment.`);
  if (!status || !Object.prototype.hasOwnProperty.call(NSE_UPI_STATES, status)) throw new Error(response?.remark || 'Mutual funds returned an unrecognized UPI status');
  if (response.client_code?.trim() !== clientCode || response.nse_upi_ref_no?.trim() !== ref) throw new Error('UPI status does not match the investor and reference. Order status was not changed.');
  if (response.payment_mode?.trim().toUpperCase() !== 'UPI') throw new Error('Mutual funds returned a different payment method');
  const amount = typeof response.order_amount === 'number' || typeof response.order_amount === 'string' && response.order_amount.trim() ? Number(response.order_amount) : NaN;
  if (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.001) throw new Error('UPI payment amount does not match this order. Order status was not changed.');
  const mapped = NSE_UPI_STATES[status as NSEUpiStatus];
  return { ...mapped, rawStatus: status as NSEUpiStatus, remark: response.remark?.trim() || mapped.label, reference: ref, transactionId: response.upi_tran_ref_id?.trim(), customerReference: response.cust_ref_no?.trim() };
}
