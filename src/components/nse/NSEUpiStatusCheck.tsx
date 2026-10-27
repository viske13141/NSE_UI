import { NSEButton, NSEHeading } from '@/components/nse/NSEPresentation';
﻿import React, { useId, useRef, useState } from 'react';
import { getNSEUpiStatus } from '@/services/nseUpiService';
import type { NSEDemoOrder } from './NSEInvestmentFlow';
export default function NSEUpiStatusCheck({ order, onUpdate }: { order: NSEDemoOrder; onUpdate: (order: NSEDemoOrder) => void }) {
  const helpId = useId();
  const [reference, setReference] = useState(order.nseUpiRef || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof getNSEUpiStatus>> | null>(null);
  const lock = useRef(false);
  const check = async () => {
    if (lock.current || !order.clientCode) return;
    lock.current = true; setBusy(true); setError(''); setResult(null);
    try {
      const response = await getNSEUpiStatus(order.clientCode, reference, order.amount);
      setResult(response);
      onUpdate({ ...order, paymentMode: 'upi', paymentState: response.state, paymentRemark: response.remark, nseUpiRef: response.reference, upiTransactionId: response.transactionId, upiCustomerReference: response.customerReference });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to check UPI status'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section aria-label="UPI payment status" className="space-y-3 rounded-xl border border-blue-200 bg-white p-4">
    <NSEHeading as="h3" className="text-sm font-bold text-slate-900">Check UPI status</NSEHeading>
    <p className="text-xs text-gray-500">Use the UPI payment reference for this order’s payment. This is not the order ID, basket ID or bank UTR.</p>
    <label className="block text-sm font-semibold">UPI payment reference<input inputMode="numeric" aria-describedby={helpId} value={reference} disabled={busy} onChange={event => { setReference(event.target.value); setResult(null); setError(''); }} placeholder="Enter up to 10 digits" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></label>
    <p id={helpId} className="text-xs leading-5 text-slate-500">Enter the numeric UPI payment reference (up to 10 digits). Do not paste the token from a payment or authorization URL. The purchase-payment response currently does not supply this reference to the app. If you do not have it, use Reports: Order lifecycle to inspect the payment status and reference, or obtain the UPI payment reference from your API provider. A general payment reference is not automatically an UPI payment reference.</p>
    <NSEButton type="button" onClick={check} disabled={busy || !order.clientCode || !reference.trim()} className="w-full rounded-lg bg-[#102B78] px-4 py-2.5 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500">{busy ? 'Checking UPI status…' : 'Check UPI status'}</NSEButton>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {result && <div role="status" className="space-y-2 rounded-lg bg-blue-50 p-3 text-sm text-[#102B78]"><p className="font-semibold">{result.label}</p><p>{result.remark}</p>{result.transactionId && <p className="break-all text-xs">UPI transaction ID: {result.transactionId}</p>}{result.customerReference && <p className="break-all text-xs">Bank reference (RRN): {result.customerReference}</p>}<p className="text-xs">{result.state === 'paid' ? 'Payment completed. Unit allotment is still awaiting confirmation.' : 'No payment completion or unit allotment is assumed.'}</p></div>}
  </section>;
}
