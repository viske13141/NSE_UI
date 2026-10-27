import { bsePost, bseGet } from './starmfApi';
import type { NewOrder, OrderListFilter } from '@/types/starmf/order.types';
import { parseBSEValidationErrors, type ParsedBSEError } from '@/utils/bseValidation';

export interface BSEOrderResponse {
  success: boolean;
  data?: any;
  validationErrors?: ParsedBSEError[];
  errorMessage?: string;
}

export async function placeOrder(orders: NewOrder[]): Promise<BSEOrderResponse> {
  try {
    const { data } = await bsePost('/order_new', { data: { orders } });
    // BSE returns status:'error' even on 2xx in some cases
    if (data?.status === 'error') {
      return {
        success: false,
        validationErrors: parseBSEValidationErrors(data),
        errorMessage: data?.messages?.[0]?.errcode ?? 'Order rejected by BSE.',
      };
    }
    // Confirm at least one order record came back
    const orders_out = data?.data?.orders ?? data?.data?.lists ?? [];
    if (orders_out.length === 0 && data?.status !== 'success') {
      return { success: false, errorMessage: `Unexpected BSE response: ${JSON.stringify(data)}` };
    }
    return { success: true, data };
  } catch (error: any) {
    const errorData = error?.response?.data;
    if (errorData?.status === 'error' && errorData?.messages) {
      return {
        success: false,
        validationErrors: parseBSEValidationErrors(errorData),
        errorMessage: 'Order validation failed. Please provide the required information.',
      };
    }
    return {
      success: false,
      errorMessage: errorData?.message || errorData?.error || JSON.stringify(errorData) || 'Failed to place order. Please try again.',
    };
  }
}

export async function updateOrder(order: NewOrder & { id: number }) {
  const { data } = await bsePost('/order_update', { data: order });
  return data;
}

export async function listOrders(filter: OrderListFilter = {}, start = 0, length = 50) {
  const { data } = await bsePost('/order_list', {
    data: {
      fields: ['ALL'],
      start: Number(start),
      length: Number(length),
      filter_param: {
        open_close: 'o',   // BSE requires at least this field
        ...filter,
      },
    },
  });
  return data;
}

export async function getOrder(id: number) {
  const { data } = await bsePost('/order_get', { data: { id, filter_param: {} } });
  return data;
}

export async function cancelOrder(id: number, ucc: string, remark: string) {
  const { data } = await bsePost('/order_cancel', {
    data: { id, investor: { ucc }, remark },
  });
  return data;
}

export async function getPaymentDetail(orderId: string, paymentRefId?: string, bankTxnRef?: string | null) {
  try {
    const { data } = await bsePost('/get_payment_detail', {
      data: { order_id: orderId, bank_txn_ref: bankTxnRef ?? null, payment_ref_id: paymentRefId ?? '' },
    });
    return data;
  } catch (error: any) {
    const status = error?.response?.status;
    throw error;
  }
}

export async function listPaymentDetails(options: {
  bankTxnRefs?: string[];
  paymentRefIds?: string[];
  countOnly?: boolean;
  amountMin?: number;
  amountMax?: number;
  placedAtAfter?: string;
  placedAtBefore?: string;
  start?: number;
  length?: number;
} = {}) {
  const { data } = await bsePost('/list_payment_detail', {
    data: {
      bank_txn_ref: options.bankTxnRefs ?? [''],
      ...(options.paymentRefIds ? { payment_ref_id: options.paymentRefIds } : {}),
      count_only: options.countOnly ?? false,
      fields: ['ALL'],
      ...(options.amountMin      != null ? { order_filter_param: {
        amount_min:        options.amountMin,
        amount_max:        options.amountMax,
        placed_at_after:   options.placedAtAfter  ?? '',
        placed_at_before:  options.placedAtBefore ?? '',
        start:             options.start  ?? 0,
        length:            options.length ?? 50,
      }} : {}),
    },
  });
  return data;
}
