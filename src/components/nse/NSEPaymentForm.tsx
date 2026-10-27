import { NSEButton, NSEHeading } from '@/components/nse/NSEPresentation';
import React, { useRef, useState } from 'react';
import { buildNSEPayment, initiateNSEPayment, NSE_PAYMENT_MODES, type NSEPaymentMode } from '@/services/nsePaymentService';
import type { NSEInvestorSelection } from '@/services/nseInvestorService';
import type { NSEDemoOrder } from './NSEInvestmentFlow';
import NSEUpiStatusCheck from './NSEUpiStatusCheck';
export default function NSEPaymentForm({ order, investor, onUpdate, onBusyChange }: { order: NSEDemoOrder; investor: NSEInvestorSelection; onUpdate: (order: NSEDemoOrder) => void; onBusyChange?: (busy: boolean) => void }) {
  const [mode, setMode] = useState<NSEPaymentMode>('netbanking');
  const [mandateId, setMandateId] = useState(''); const [vpa, setVpa] = useState('');
  const [chequeNo, setChequeNo] = useState(''); const [chequeDate, setChequeDate] = useState('');
  const [utr, setUtr] = useState(''); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState(''); const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState(''); const lock = useRef(false);
  const input = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal';
  const blocked = !order.live || !order.orderAccepted || order.status === 'rejected' || !order.exchangeOrderId || order.clientCode !== investor.clientCode;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (blocked || lock.current || attempted || !consent) return;
    const payload = { mode, clientCode: investor.clientCode, orderId: order.exchangeOrderId!, orderAccepted: order.orderAccepted!, accountNo: investor.bank.accountNo, ifsc: investor.bank.ifsc, mandateId, vpa, chequeNo, chequeDate, utr, callbackUrl: import.meta.env.VITE_NSE_PAYMENT_CALLBACK_URL || undefined };
    try { buildNSEPayment(payload); } catch (failure) { setError((failure as Error).message); return; }
    lock.current = true; setBusy(true); onBusyChange?.(true); setAttempted(true); setError('');
    try {
      const result = await initiateNSEPayment(payload);
      setUrl(result.paymentUrl); setMessage(result.message);
      onUpdate({ ...order, paymentMode: mode, paymentState: 'initiated', paymentRemark: result.message });
    } catch (failure) {
      const detail = failure instanceof Error ? failure.message : 'Payment confirmation unavailable';
      setError(detail); onUpdate({ ...order, paymentMode: mode, paymentState: 'unknown', paymentRemark: detail });
    } finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <section aria-label="Purchase payment" className="space-y-4 rounded-xl border border-blue-200 p-4">
    <NSEHeading as="h3" className="font-bold text-slate-900">Pay for accepted order</NSEHeading>
    <p className="text-xs text-gray-500">Mutual funds order {order.exchangeOrderId} · {investor.bank.label}. Payment initiation does not confirm payment capture or unit allotment.</p>
    {blocked ? <p role="alert" className="text-sm text-rose-700">Payment requires an accepted order belonging to this investor.</p> : <form className="space-y-4" onSubmit={submit}>
      <fieldset disabled={busy || attempted} className="space-y-4">
        <label className="block text-sm font-semibold">Payment method<select value={mode} onChange={event => { setMode(event.target.value as NSEPaymentMode); setConsent(false); setError(''); }} className={input}>{Object.entries(NSE_PAYMENT_MODES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        {mode === 'mandate' && <label className="block text-sm font-semibold">Active mandate ID<input required maxLength={13} value={mandateId} onChange={event => setMandateId(event.target.value)} className={input} /><span className="mt-1 block text-xs font-normal text-gray-500">Must belong to this investor and cover the order amount. Mutual funds validates the mandate.</span></label>}
        {mode === 'upi' && <label className="block text-sm font-semibold">UPI ID<input required maxLength={255} value={vpa} onChange={event => setVpa(event.target.value)} placeholder="name@bank" className={input} /></label>}
        {mode === 'cheque' && <><label className="block text-sm font-semibold">Cheque number<input required maxLength={7} value={chequeNo} onChange={event => setChequeNo(event.target.value)} className={input} /></label><label className="block text-sm font-semibold">Cheque date<input required type="date" value={chequeDate} onChange={event => setChequeDate(event.target.value)} className={input} /></label></>}
        {mode === 'neft' && <label className="block text-sm font-semibold">NEFT / RTGS UTR<input required maxLength={30} value={utr} onChange={event => setUtr(event.target.value)} className={input} /></label>}
        {['netbanking', 'upi', 'cheque'].includes(mode) && (!investor.bank.accountNo || !investor.bank.ifsc) && <p className="text-sm text-rose-700">This method needs the registered account number and IFSC from Client Master. They are missing or masked for this bank.</p>}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" /><span>I confirm payment initiation of {order.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} for this order using the selected method.</span></label>
      </fieldset>
      <NSEButton type="submit" disabled={busy || attempted || !consent} className="w-full rounded-lg bg-[#102B78] px-4 py-3 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500">{busy ? 'Starting payment…' : attempted ? 'Payment request submitted' : 'Start payment'}</NSEButton>
    </form>}
    {error && (!order.paymentState || ['initiated', 'unknown'].includes(order.paymentState)) && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><p>{error}</p>{attempted && <p className="mt-2">Payment is not confirmed. Check the order’s payment status before trying again.</p>}</div>}
    {message && (!order.paymentState || ['initiated', 'unknown'].includes(order.paymentState)) && <div role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-[#102B78]"><p>{message}</p><p className="mt-2">Payment pending confirmation. Holdings will update only after confirmed allotment.</p></div>}
    {url && !['paid', 'failed', 'expired', 'rejected'].includes(order.paymentState || '') && <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-[#102B78] px-4 py-3 text-center text-sm font-semibold text-white">Open secure payment page</a>}
    {message && !url && (!order.paymentState || ['initiated', 'unknown'].includes(order.paymentState)) && <p className="text-xs text-gray-500">Mutual funds returned no payment link. Check payment status before submitting another request.</p>}
    {mode === 'upi' && attempted && <NSEUpiStatusCheck order={order} onUpdate={onUpdate} />}
  </section>;
}
