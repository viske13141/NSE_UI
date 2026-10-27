import { bsePost, bseGet } from './starmfApi';

const PAYMENT_INFO_API = '/send_payment_info';

export type PaymentMode = 'upi' | 'netbanking' | 'mandate';

export interface BankAccount {
  vpa?: string; // For UPI
  bank_id?: string;
  account_number?: string;
  ifsc: string;
  is_retail?: boolean;
  is_corporate?: boolean;
}

export interface PaymentDetails {
  bank_account: BankAccount;
  exch_mandate_id?: number;
}

export interface SendPaymentInfoRequest {
  data: {
    payment_mode: PaymentMode;
    order_ids: number[];
    ucc: string;
    member: string;
    amount: number;
    currency: string;
    redirection_url: string;
    payment_details: PaymentDetails;
  };
}

export interface SendPaymentInfoResponse {
  status: string;
  message?: string;
  payment_id?: string;
  transaction_id?: string;
  [key: string]: any;
}

/**
 * Send payment information to BSE for processing
 * Used after user completes payment on gateway
 */
export async function sendPaymentInfo(
  paymentMode: PaymentMode,
  orderIds: number[],
  ucc: string,
  member: string,
  amount: number,
  currency: string = 'INR',
  redirectionUrl: string,
  paymentDetails: PaymentDetails
): Promise<SendPaymentInfoResponse> {
  try {
    const payload: SendPaymentInfoRequest = {
      data: {
        payment_mode: paymentMode,
        order_ids: orderIds,
        ucc,
        member,
        amount,
        currency,
        redirection_url: redirectionUrl,
        payment_details: paymentDetails,
      },
    };

    const response = await bsePost<SendPaymentInfoResponse>(
      PAYMENT_INFO_API,
      payload
    );

    return response.data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send payment info';
    throw new Error(errorMessage);
  }
}

/**
 * Send UPI payment information
 */
export async function sendUPIPaymentInfo(
  orderIds: number[],
  ucc: string,
  member: string,
  amount: number,
  vpa: string,
  ifsc: string,
  redirectionUrl: string,
  bankId?: string,
  accountNumber?: string
): Promise<SendPaymentInfoResponse> {
  return sendPaymentInfo(
    'upi',
    orderIds,
    ucc,
    member,
    amount,
    'INR',
    redirectionUrl,
    {
      bank_account: {
        vpa,
        bank_id: bankId,
        account_number: accountNumber,
        ifsc,
        is_retail: true,
        is_corporate: false,
      },
    }
  );
}

/**
 * Send Net Banking payment information
 */
export async function sendNetBankingPaymentInfo(
  orderIds: number[],
  ucc: string,
  member: string,
  amount: number,
  accountNumber: string,
  ifsc: string,
  redirectionUrl: string,
  bankId?: string
): Promise<SendPaymentInfoResponse> {
  return sendPaymentInfo(
    'netbanking',
    orderIds,
    ucc,
    member,
    amount,
    'INR',
    redirectionUrl,
    {
      bank_account: {
        bank_id: bankId,
        account_number: accountNumber,
        ifsc,
        is_retail: true,
        is_corporate: false,
      },
    }
  );
}

/**
 * Send Mandate payment information
 */
export async function sendMandatePaymentInfo(
  orderIds: number[],
  ucc: string,
  member: string,
  amount: number,
  mandateId: number,
  ifsc: string,
  redirectionUrl: string,
  accountNumber?: string,
  bankId?: string
): Promise<SendPaymentInfoResponse> {
  return sendPaymentInfo(
    'mandate',
    orderIds,
    ucc,
    member,
    amount,
    'INR',
    redirectionUrl,
    {
      bank_account: {
        bank_id: bankId,
        account_number: accountNumber,
        ifsc,
        is_retail: true,
        is_corporate: false,
      },
      exch_mandate_id: mandateId,
    }
  );
}
