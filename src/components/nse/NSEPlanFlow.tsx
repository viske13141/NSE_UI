import { NSEButton, NSEDialogTitle, NSEHeading } from '@/components/nse/NSEPresentation';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { NSEDemoOrder } from './NSEInvestmentFlow';
import NSEInvestorSelector from './NSEInvestorSelector';
import type { NSEInvestorSelection } from '@/services/nseInvestorService';
export interface NSEPlanScheme { name: string; code: string; amc: string; amcCode?: string }
const primary = 'w-full rounded-lg bg-[#102B78] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1B3F96] disabled:bg-gray-200 disabled:text-gray-500';
const input = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal';
export default function NSEPlanFlow({ type, scheme, targets, onClose, onRecord, onTrack }: {
  type: 'STP' | 'SWP'; scheme: NSEPlanScheme; targets: NSEPlanScheme[];
  onClose: () => void; onRecord: (order: NSEDemoOrder) => void; onTrack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<NSEInvestorSelection | null>(null);
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [count, setCount] = useState('12');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'pending' | 'successful' | 'rejected' | null>(null);
  const [id] = useState(() => `Mutual funds-DEMO-${crypto.randomUUID()}`);
  const isTransfer = type === 'STP';
  const targetScheme = targets.find(item => item.code === target);
  const eligible = !!selection?.clientCode && selection.bank.active && selection.kycVerified === true && Number(amount) > 0 && Number.isFinite(Number(amount)) && Number.isInteger(Number(count)) && Number(count) > 0 && Number(count) <= 360 && (!isTransfer || (!!targetScheme && target !== scheme.code));
  const money = Number(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const record = (outcome: 'pending' | 'successful' | 'rejected') => {
    if (!eligible || !consent) return;
    onRecord({ id, fund: scheme.name, mode: isTransfer ? 'stp' : 'swp', amount: Number(amount), day: Number(day), installments: Number(count), investor: selection!.name, clientCode: selection!.clientCode, bank: selection!.bank.label, status: outcome, targetScheme: targetScheme?.name });
    setStatus(outcome); setStep(2);
  };
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto">
    <DialogHeader><NSEDialogTitle>{step === 0 ? isTransfer ? 'Start systematic transfer' : 'Start systematic withdrawal' : step === 1 ? `Review ${type}` : `${type} demo status`}</NSEDialogTitle><DialogDescription>{scheme.name}</DialogDescription></DialogHeader>
    <p className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-[#102B78]">Demo only. Investor and bank details come from Mutual funds Client Master. The source folio is a sample. Real holdings, scheme eligibility and available balance are not verified. No transfer, redemption or registration is sent to Mutual funds.</p>
    {step === 0 ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (eligible) setStep(1); }}>
      <NSEInvestorSelector onChange={value => { setSelection(value); setConsent(false); }} />
      <div className="rounded-lg border border-gray-200 p-3 text-sm"><p className="font-semibold">Sample folio DEMO-001</p><p className="mt-1 text-xs text-gray-500">{isTransfer ? 'Source holding' : 'Withdrawal holding'}: {scheme.code}</p>{!isTransfer && <p className="mt-1 text-xs text-gray-500">Payout: {selection?.bank.label || 'Select a bank account'}</p>}</div>
      {isTransfer && <label className="block text-sm font-semibold">Destination scheme<select aria-label="Destination scheme" required className={input} value={target} onChange={event => setTarget(event.target.value)}><option value="">Select a different scheme</option>{targets.filter(item => item.code !== scheme.code).map(item => <option key={item.code} value={item.code}>{item.name} · {item.code}</option>)}</select><span className="mt-1 block text-xs font-normal text-gray-500">Final transfer eligibility requires live verification.</span></label>}
      <label className="block text-sm font-semibold">{isTransfer ? 'Transfer amount (₹)' : 'Withdrawal amount (₹)'}<input required type="number" min="0.01" step="0.01" className={input} value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Monthly day<select className={input} value={day} onChange={event => setDay(event.target.value)}>{Array.from({ length: 28 }, (_, index) => index + 1).map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-sm font-semibold">{isTransfer ? 'Transfers' : 'Withdrawals'}<input required type="number" min="1" max="360" step="1" className={input} value={count} onChange={event => setCount(event.target.value)} /></label></div>
      {isTransfer && !targets.some(item => item.code !== scheme.code) && <p role="alert" className="text-sm text-rose-700">No other destination scheme is available in this master.</p>}
      <NSEButton type="submit" disabled={!selection || isTransfer && !targets.some(item => item.code !== scheme.code)} className={primary}>Review {type}</NSEButton>
    </form> : step === 1 ? <div className="space-y-4">
      <dl className="space-y-3 text-sm">{[['Investor', selection?.name || ''], ['Source scheme', scheme.name], ...(isTransfer ? [['Destination scheme', targetScheme?.name || '']] : [['Payout bank', selection?.bank.label || '']]), ['Amount', money], ['Frequency', `Monthly · Day ${day}`], [isTransfer ? 'Transfers' : 'Withdrawals', count]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-gray-500">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}</dl>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" />I reviewed these details and want to simulate this {type}.</label>
      <NSEButton disabled={!consent} className={primary} onClick={() => record('successful')}>Simulate {type} registered</NSEButton>
      <div className="grid grid-cols-2 gap-3"><NSEButton disabled={!consent} className={primary} onClick={() => record('pending')}>Simulate pending</NSEButton><NSEButton disabled={!consent} className={primary} onClick={() => record('rejected')}>Simulate failure</NSEButton></div>
      <NSEButton className="w-full py-2 text-sm text-[#102B78]" onClick={() => { setConsent(false); setSelection(null); setStep(0); }}>Edit details</NSEButton>
    </div> : <div className="space-y-4"><div role="status" className="rounded-xl border border-gray-200 p-5 text-center"><NSEHeading as="h3" className="font-bold">Demo {type} {status === 'successful' ? 'registered' : status === 'pending' ? 'pending' : 'failed'}</NSEHeading><p className="mt-2 text-sm text-gray-500">No real plan has been registered and no holdings have changed.</p><p className="mt-3 break-all text-xs text-gray-400">{id}</p></div>{status !== 'successful' && <NSEButton className={primary} onClick={() => setStep(1)}>Review demo outcome</NSEButton>}<NSEButton className={primary} onClick={onTrack}>View orders</NSEButton><NSEButton className="w-full py-2 text-sm text-[#102B78]" onClick={onClose}>Back to master</NSEButton></div>}
  </DialogContent></Dialog>;
}
