import NSEFlowSteps from './NSEFlowSteps';
import { NSEButton, NSEDialogTitle, NSEHeading } from '@/components/nse/NSEPresentation';
import { NSE_DOCUMENT_ORDER_MODES, NSE_DOCUMENT_PURCHASE_TYPES } from '@/services/nseTransactionOptions';
import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import NSEInvestorSelector from './NSEInvestorSelector';
import NSEPaymentForm from './NSEPaymentForm';
import type { NSEInvestorSelection } from '@/services/nseInvestorService';
import { buildNSEPurchase, submitNSEPurchase, type NSETransactionMode, type NSEPurchaseType } from '@/services/nseOrderService';
import type { NSEFund, NSEDemoOrder } from './NSEInvestmentFlow';
const primary = 'w-full rounded-lg bg-[#102B78] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500';
const input = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-normal';
export default function NSEBuyFlow({ fund, onClose, onRecord, onTrack }: { fund: NSEFund; onClose: () => void; onRecord: (order: NSEDemoOrder) => void; onTrack: () => void }) {
  const [step, setStep] = useState(0); const [amount, setAmount] = useState('');
  const [selection, setSelection] = useState<NSEInvestorSelection | null>(null);
  const [euin, setEuin] = useState(''); const [bankReference, setBankReference] = useState('');
  const [consent, setConsent] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(''); const [result, setResult] = useState<NSEDemoOrder | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [reference] = useState(() => `N${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`);
  const [transactionMode, setTransactionMode] = useState<NSETransactionMode | ''>('');
  const [purchaseType, setPurchaseType] = useState<NSEPurchaseType>('FRESH');
  const [folio, setFolio] = useState('');
  const [euinDeclaration, setEuinDeclaration] = useState<'Y' | 'N'>('Y');
  const lock = useRef(false);
  const minimum = Math.max((purchaseType === 'ADDITIONAL' ? fund.minAdditionalPurchase : fund.minPurchase) || 0, 0.01);
  const maximum = purchaseType === 'ADDITIONAL' && fund.maxAdditionalPurchase ? fund.maxAdditionalPurchase : 99999999999.99;
  const increment = fund.purchaseMultiplier || 0.01;
  const ready = !!selection?.kycVerified && selection.bank.active;
  const modeLabel = { C: 'CDSL demat (C)', N: 'NSDL demat (N)', P: 'Physical (P)' };
  const orderInput = () => ({ schemeCode: fund.schemeCode || '', amount: Number(amount), investor: selection!, euin, bankReference, transactionMode: transactionMode as NSETransactionMode, purchaseType, folio, euinDeclaration, memberUniqueId: reference, minAmount: minimum, maxAmount: maximum, amountMultiple: increment });
  const submit = async () => {
    if (lock.current || attempted || !consent || !ready || !selection) return;
    const data = orderInput();
    try { buildNSEPurchase(data); } catch (failure) { setError((failure as Error).message); return; }
    lock.current = true; setSubmitting(true); setAttempted(true); setError('');
    try {
      const response = await submitNSEPurchase(data);
      const record: NSEDemoOrder = { id: reference, fund: fund.name, mode: 'buy', amount: Number(amount), day: 0, installments: 1, investor: selection.name, clientCode: selection.clientCode, bank: selection.bank.label, status: response.status, live: true, exchangeOrderId: response.exchangeOrderId || undefined, rawStatus: response.rawStatus, remark: response.remark, orderAccepted: response.orderAccepted };
      setResult(record); onRecord(record); setStep(3);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Order confirmation unavailable';
      const record: NSEDemoOrder = { id: reference, fund: fund.name, mode: 'buy', amount: Number(amount), day: 0, installments: 1, investor: selection.name, clientCode: selection.clientCode, bank: selection.bank.label, status: 'pending', live: true, rawStatus: 'Confirmation unknown', remark: message };
      setResult(record); onRecord(record); setStep(3);
    } finally { lock.current = false; setSubmitting(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !submitting) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto" onEscapeKeyDown={event => { if (submitting) event.preventDefault(); }} onPointerDownOutside={event => { if (submitting) event.preventDefault(); }}>
    <DialogHeader><NSEDialogTitle>{['Buy mutual fund', 'Investor and order details', 'Review buy order', 'Order status'][step]}</NSEDialogTitle><DialogDescription>{fund.name}</DialogDescription></DialogHeader>
    <NSEFlowSteps steps={['Choose amount', 'Investor details', 'Review and confirm', 'Order and payment']} current={step} />
    <p className="rounded-xl bg-blue-50 p-3 text-xs text-[#102B78]">Live Mutual funds order entry · A confirmed submission creates a purchase order. Payment and allotment are separate steps.</p>
    {step === 0 && <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (Number.isFinite(Number(amount)) && Number(amount) >= minimum) setStep(1); }}>
      <label className="block text-sm font-semibold">Purchase type<select className={input} value={purchaseType} onChange={event => setPurchaseType(event.target.value as NSEPurchaseType)}>{NSE_DOCUMENT_PURCHASE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block text-sm font-semibold">Investment amount (₹)<input autoFocus required type="number" min={minimum} max={maximum} step={increment} value={amount} onChange={event => setAmount(event.target.value)} className={input} /></label>
      <p className="text-xs text-gray-500">Minimum: ₹{minimum.toLocaleString('en-IN')} · Increment: ₹{increment.toLocaleString('en-IN')}</p>
      <NSEButton type="submit" className={primary}>Continue to investor</NSEButton>
    </form>}
    {step === 1 && <div className="space-y-4">
      <NSEInvestorSelector onChange={value => { setSelection(value); setConsent(false); }} />
      <label className="block text-sm font-semibold">Transaction mode<select value={transactionMode} onChange={event => setTransactionMode(event.target.value as NSETransactionMode)} className={input}><option value="">Select transaction mode</option>{NSE_DOCUMENT_ORDER_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block text-sm font-semibold">{transactionMode === 'P' || purchaseType === 'ADDITIONAL' ? 'Folio number (required)' : 'Folio number (optional)'}<input value={folio} maxLength={15} onChange={event => setFolio(event.target.value)} className={input} /></label>
      <p className="text-xs leading-relaxed text-slate-500">Use the folio from an AMC/RTA statement when required. Choose demat only for the investor's matching depository account; Physical means non-demat.</p>
      {transactionMode === 'P' && purchaseType === 'FRESH' && !folio.trim() && <p role="status" className="text-sm text-amber-700">New investor without a folio? This physical order route currently requires one under the Mutual funds API specification. Ask your distributor or Mutual funds support for the supported first-purchase route. Do not enter a dummy folio or select demat unless the investor has the matching registered depository account.</p>}
      <label className="block text-sm font-semibold">EUIN declaration<select value={euinDeclaration} onChange={event => setEuinDeclaration(event.target.value as 'Y' | 'N')} className={input}><option value="Y">Y — EUIN supplied</option><option value="N">N — EUIN not supplied</option></select></label>
      <p className="text-xs leading-relaxed text-slate-500">EUIN is supplied by the distributor or relationship manager, not the investor. If no EUIN holder was involved, confirm the applicable investor declaration before choosing EUIN not supplied.</p>
      {euinDeclaration === 'Y' && <label className="block text-sm font-semibold">EUIN<input required maxLength={7} value={euin} onChange={event => setEuin(event.target.value.toUpperCase())} placeholder="Enter your EUIN" className={input} /></label>}
      <label className="block text-sm font-semibold">Bank reference (optional)<input value={bankReference} maxLength={25} onChange={event => setBankReference(event.target.value)} className={input} /></label>
      {transactionMode === 'P' && <p className="text-xs text-gray-500">Physical transactions require applicable client consent/document and FATCA checks. In Client Management, use Client Authorization to inspect the returned flags; use FATCA, AOF and eLOG reports for processing details.</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <NSEButton disabled={!ready} className={primary} onClick={() => {
        if (!selection) return;
        try { buildNSEPurchase(orderInput()); setError(''); setStep(2); } catch (failure) { setError((failure as Error).message); }
      }}>Review buy order</NSEButton>
      <NSEButton className="w-full py-2 text-sm text-[#102B78]" onClick={() => { setSelection(null); setStep(0); }}>Back to amount</NSEButton>
    </div>}
    {step === 2 && <div className="space-y-4">
      <dl className="space-y-3 text-sm">{[['Scheme code', fund.schemeCode || ''], ['Investor', selection?.name || ''], ['Client code', selection?.clientCode || ''], ['Bank', selection?.bank.label || ''], ['Amount', Number(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })], ['Purchase type', purchaseType], ['Transaction mode', transactionMode ? modeLabel[transactionMode] : ''], ['Folio', folio || 'Not supplied'], ['EUIN declaration', euinDeclaration], ['EUIN', euinDeclaration === 'Y' ? euin : 'Not supplied'], ['Member reference', reference], ['Bank reference', bankReference || 'Not supplied']].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-gray-500">{label}</dt><dd className="break-all text-right font-semibold">{value}</dd></div>)}</dl>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={consent} disabled={submitting} onChange={event => setConsent(event.target.checked)} /><span>I confirm these details, the EUIN declaration and submission of this live purchase order.</span></label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <NSEButton disabled={!consent || !ready || submitting || attempted} className={primary} onClick={submit}>{submitting ? 'Submitting order…' : 'Place buy order'}</NSEButton>
      <NSEButton disabled={submitting || attempted} className="w-full py-2 text-sm text-[#102B78]" onClick={() => { setConsent(false); setSelection(null); setStep(1); }}>Edit order</NSEButton>
    </div>}
    {step === 3 && result && <div className="space-y-4">
      <div role="status" className={`rounded-xl border p-4 ${result.status === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-blue-200 bg-blue-50 text-[#102B78]'}`}><NSEHeading as="h3" className="font-bold">{result.status === 'rejected' ? 'Order rejected' : result.paymentState === 'paid' ? 'Payment completed — allotment pending' : result.orderAccepted ? 'Order accepted — payment pending' : result.exchangeOrderId ? 'Order received — awaiting confirmation' : 'Order confirmation unknown'}</NSEHeading><p className="mt-2 text-sm">{result.rawStatus}</p><p className="mt-2 text-sm">{result.remark}</p><p className="mt-3 text-xs">{result.exchangeOrderId ? `Mutual funds order ID: ${result.exchangeOrderId}` : 'No valid Mutual funds order ID returned.'}</p></div>
      <p className="text-sm text-gray-500">{result.status === 'rejected' ? 'Payment is blocked for this rejected order. Check scheme availability and details before creating another order.' : 'Order entry does not confirm payment or unit allotment. Continue only after Mutual funds accepts this order.'}</p>
      {!showPayment && <NSEButton disabled={!result.orderAccepted || !result.exchangeOrderId || !selection} className={primary} onClick={() => setShowPayment(true)}>Continue to payment</NSEButton>}
      {showPayment && selection && <NSEPaymentForm order={result} investor={selection} onBusyChange={setSubmitting} onUpdate={updated => { setResult(updated); onRecord(updated); }} />}
      <NSEButton disabled={submitting} className={primary} onClick={onTrack}>View orders</NSEButton>
      <NSEButton disabled={submitting} className="w-full py-2 text-sm text-[#102B78]" onClick={onClose}>Back to funds</NSEButton>
    </div>}
  </DialogContent></Dialog>;
}
