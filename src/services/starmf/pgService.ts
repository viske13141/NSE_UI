import { bsePost, bseGet } from './starmfApi';

export type PgRequestedMethod = 'exch_pg_page' | 'payment_info_data';
export type PgPaymentMode = 'upi' | 'netbanking' | 'mandate';

export async function getExchPgService(options: {
  ucc: string;
  orderIds: number[];
  requestedMethod?: PgRequestedMethod;
  paymentModes?: PgPaymentMode[];
  redirectionUrl: string;
  memDetails?: { euin?: string; euinFlag?: boolean; subBrCode?: string; subBrArn?: string; partnerId?: string };
}) {
  const { data } = await bsePost('/get_exchpg_service', {
    data: {
      mem_details: {
        euin:         options.memDetails?.euin        ?? '',
        euin_flag:    options.memDetails?.euinFlag     ?? false,
        sub_br_code:  options.memDetails?.subBrCode    ?? '',
        sub_br_arn:   options.memDetails?.subBrArn     ?? '',
        partner_id:   options.memDetails?.partnerId    ?? '',
      },
      investor:         { ucc: options.ucc },
      order_ids:        options.orderIds,
      requested_method: options.requestedMethod ?? 'exch_pg_page',
      payment_mode:     options.paymentModes    ?? ['upi', 'netbanking', 'mandate'],
      redirection_url:  options.redirectionUrl,
    },
  });
  return data;
}

export async function sendPaymentInfo(options: {
  ucc: string;
  member: string;
  orderIds: number[];
  amount: number;
  paymentMode: PgPaymentMode;
  redirectionUrl: string;
  bankAccount?: { vpa?: string; bankId?: string; accountNumber?: string; ifsc?: string; isRetail?: boolean; isCorporate?: boolean };
  exchMandateId?: number;
}) {
  const { data } = await bsePost('/send_payment_info', {
    data: {
      payment_mode:    options.paymentMode,
      order_ids:       options.orderIds,
      ucc:             options.ucc,
      member:          options.member,
      amount:          options.amount,
      currency:        'INR',
      redirection_url: options.redirectionUrl,
      payment_details: {
        ...(options.bankAccount ? {
          bank_account: {
            vpa:            options.bankAccount.vpa            ?? '',
            bank_id:        options.bankAccount.bankId         ?? '',
            account_number: options.bankAccount.accountNumber  ?? '',
            ifsc:           options.bankAccount.ifsc           ?? '',
            is_retail:      options.bankAccount.isRetail       ?? true,
            is_corporate:   options.bankAccount.isCorporate    ?? false,
          },
        } : {}),
        ...(options.exchMandateId ? { exch_mandate_id: options.exchMandateId } : {}),
      },
    },
  });
  return data;
}

export async function getBsePgPaymentStatus(options: {
  paymentRefId?: string;
  orderId?: number;
  includeAudit?: boolean;
}) {
  const { data } = await bsePost('/get_bse_pg_payment_status', {
    data: {
      ...(options.paymentRefId ? { payment_ref_id: options.paymentRefId } : {}),
      ...(options.orderId      ? { order_id:       options.orderId       } : {}),
      include_audit: options.includeAudit ?? true,
    },
  });
  return data;
}
