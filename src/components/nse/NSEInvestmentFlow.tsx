import { NSEButton, NSEDialogTitle, NSEHeading } from '@/components/nse/NSEPresentation';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import NSEInvestorSelector from './NSEInvestorSelector';
import type { NSEInvestorSelection } from '@/services/nseInvestorService';
import NSEBuyFlow from './NSEBuyFlow';
import NSESipFlow from './NSESipFlow';

export interface NSEFund { name: string; amc: string; amcCode?: string; plan: string; schemeCode?: string; minPurchase?: number | null; minAdditionalPurchase?: number | null; maxAdditionalPurchase?: number | null; purchaseMultiplier?: number | null; purchaseAllowed?: boolean; sipAllowed?: boolean }
export type DemoStatus = 'pending' | 'successful' | 'rejected';
export interface NSEDemoOrder {
  id: string;
  fund: string;
  mode: 'buy' | 'sip' | 'stp' | 'swp' | 'switch';
  amount: number;
  day: number;
  installments: number;
  investor: string;
  bank: string;
  status: DemoStatus;
  targetScheme?: string;
  clientCode?: string;
  live?: boolean;
  exchangeOrderId?: string;
  switchInOrderId?: string;
  rawStatus?: string;
  remark?: string;
  orderAccepted?: boolean;
  paymentState?: 'initiated' | 'unknown' | 'paid' | 'pending' | 'failed' | 'expired' | 'rejected';
  paymentRemark?: string;
  paymentMode?: string;
  nseUpiRef?: string;
  upiTransactionId?: string;
  upiCustomerReference?: string;
  allotmentConfirmed?: boolean;
  sipRegistrationId?: string;
  planRegistrationId?: string;
  transferUnits?: string;
  allUnits?: boolean;
  registrationProduct?: 'SIP' | 'XSIP';
  frequency?: string;
  startDate?: string;
  endDate?: string;
}
const primary = 'w-full rounded-lg bg-[#102B78] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1B3F96] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500';
const secondary = 'w-full rounded-lg border border-[#102B78] px-4 py-2.5 text-sm font-semibold text-[#102B78] hover:bg-blue-50';
const input = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal';
const money = (amount: number) => amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function NSEInvestmentFlow({ fund, mode, onClose, onRecord, onTrack }: {
  fund: NSEFund;
  mode: 'buy' | 'sip';
  onClose: () => void;
  onRecord: (order: NSEDemoOrder) => void;
  onTrack: (mode: 'buy' | 'sip') => void;
}) {
  const [step, setStep] = useState(0);
  const [investmentMode, setInvestmentMode] = useState(mode);
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [installments, setInstallments] = useState('12');
  const [selection, setSelection] = useState<NSEInvestorSelection | null>(null);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<NSEDemoOrder | null>(null);
  const [orderId] = useState(() => `Mutual funds-DEMO-${crypto.randomUUID()}`);
  const investor = { name: selection?.name || '', bank: selection?.bank.label || '' };
  const ready = !!selection?.clientCode && selection.bank.active && selection.kycVerified === true;
  const isSip = investmentMode === 'sip';
  const minimum = !isSip && fund.minPurchase != null && fund.minPurchase > 0 ? fund.minPurchase : 0.01;
  const amountStep = !isSip && fund.purchaseMultiplier ? fund.purchaseMultiplier : 0.01;
  const steps = ['Details', 'Investor & bank', 'Review', isSip ? 'Mandate' : 'Payment', 'Status'];
  const simulate = (status: DemoStatus) => {
    if (!ready || !consent) return;
    const order: NSEDemoOrder = { id: orderId, fund: fund.name, mode: investmentMode, amount: Number(amount), day: Number(day), installments: Number(installments), investor: investor.name, clientCode: selection?.clientCode, bank: investor.bank, status };
    setResult(order); onRecord(order); setStep(4);
  };
  const summary = <dl className="space-y-3 text-sm">
    {[
      ['Investment', isSip ? 'Monthly SIP' : 'One-time purchase'],
      ['Amount', money(Number(amount))],
      ['Investor', investor.name],
      ['Bank account', investor.bank],
      ['Plan', fund.plan],
      ...(fund.schemeCode ? [['Mutual funds scheme code', fund.schemeCode]] : []),
      ...(isSip ? [['Schedule', `Day ${day} every month · ${installments} installments`], ['Mandate limit', `${money(Number(amount))} per installment`]] : []),
    ].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-gray-500">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}
  </dl>;

  if (mode === 'sip' && fund.schemeCode) return <NSESipFlow fund={fund} onClose={onClose} onRecord={onRecord} onTrack={() => onTrack('sip')} />;
  if (mode === 'buy' && fund.schemeCode) return <NSEBuyFlow fund={fund} onClose={onClose} onRecord={onRecord} onTrack={() => onTrack('buy')} />;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <NSEDialogTitle>{['Investment details', 'Select investor and bank', 'Review investment', isSip ? 'Authorize bank mandate' : 'Complete payment', 'Investment status'][step]}</NSEDialogTitle>
        <DialogDescription>{fund.name}</DialogDescription>
      </DialogHeader>
      <ol aria-label="Investment progress" className="grid grid-cols-5 gap-1 text-center text-[10px] sm:text-xs">
        {steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={`border-t-2 pt-2 ${index <= step ? 'border-[#102B78] font-semibold text-[#102B78]' : 'border-gray-200 text-gray-400'}`}>{index + 1}. {label}</li>)}
      </ol>
      <p className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-[#102B78]">Demo transaction flow · Investor and bank details come from Mutual funds Client Master; payment and mandate outcomes are simulated. No money is collected or live Mutual funds order submitted. Records remain only while this dashboard is open.</p>
      {step === 0 && <form className="space-y-4" onSubmit={event => {
        event.preventDefault();
        if (Number.isFinite(Number(amount)) && Number(amount) >= minimum && (!isSip || (Number(installments) >= 1 && Number(installments) <= 360)))  { setSelection(null); setStep(1); }
      }}>
        <label className="block text-sm font-semibold">Investment type<select className={input} value={investmentMode} onChange={event => { setInvestmentMode(event.target.value as 'buy' | 'sip'); setConsent(false); }}><option value="buy" disabled={fund.purchaseAllowed === false}>One-time purchase</option><option value="sip" disabled={fund.sipAllowed === false}>Monthly SIP</option></select></label>
        <label className="block text-sm font-semibold">{isSip ? 'Monthly amount (₹)' : 'Investment amount (₹)'}<input autoFocus required type="number" min={minimum} step={amountStep} className={input} placeholder="Enter amount" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        {isSip && <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">Installment day<select className={input} value={day} onChange={event => setDay(event.target.value)}>{Array.from({ length: 28 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-semibold">Installments<input required type="number" min="1" max="360" step="1" className={input} value={installments} onChange={event => setInstallments(event.target.value)} /></label>
        </div>}
        <p className="text-xs text-gray-500">{isSip ? 'SIP minimum and schedule eligibility require the SIP service.' : fund.minPurchase != null ? `Mutual funds minimum purchase: ${money(fund.minPurchase)}. Amount increment: ${money(amountStep)}.` : 'Scheme minimums and eligibility require live verification.'}</p>
        <NSEButton className={primary} type="submit">Continue to investor</NSEButton>
      </form>}
      {step === 1 && <div className="space-y-4">
        <NSEInvestorSelector onChange={value => { setSelection(value); setConsent(false); }} />
        {!ready && <p className="text-xs text-gray-500">An Mutual funds investor, active bank account and verified KYC are required to continue.</p>}
        <NSEButton className={primary} disabled={!ready} onClick={() => setStep(2)}>Review investment</NSEButton>
        <NSEButton className={secondary} onClick={() => setStep(0)}>Back to details</NSEButton>
      </div>}
      {step === 2 && <div className="space-y-4">
        {summary}
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I have reviewed the investment details and want to continue this demo {isSip ? 'SIP and mandate' : 'purchase'}.</span></label>
        <NSEButton className={primary} disabled={!consent || !ready} onClick={() => setStep(3)}>{isSip ? 'Continue to mandate authorization' : 'Continue to payment'}</NSEButton>
        <NSEButton className={secondary} onClick={() => { setConsent(false); setStep(0); }}>Edit investment</NSEButton>
      </div>}
      {step === 3 && <div className="space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-[#102B78]">
          <NSEHeading as="h3" className="font-semibold">{isSip ? 'Demo bank mandate' : 'Demo payment'}</NSEHeading>
          <p className="mt-2">{isSip ? `Authorize ${money(Number(amount))} per month from ${investor.bank}.` : `Pay ${money(Number(amount))} using ${investor.bank}.`}</p>
          <p className="mt-2 text-xs">Choose an outcome to preview how your investment is tracked. No payment gateway or registration endpoint is contacted.</p>
        </div>
        <NSEButton className={primary} onClick={() => simulate('successful')}>{isSip ? 'Simulate mandate authorized' : 'Simulate successful payment'}</NSEButton>
        <div className="grid grid-cols-2 gap-3"><NSEButton className={secondary} onClick={() => simulate('pending')}>Simulate pending</NSEButton><NSEButton className={secondary} onClick={() => simulate('rejected')}>Simulate failure</NSEButton></div>
        <NSEButton className={secondary} onClick={() => setStep(2)}>Back to review</NSEButton>
      </div>}
      {step === 4 && result && <div className="space-y-4">
        <div role="status" className="rounded-xl border border-gray-200 p-5 text-center">
          {result.status === 'successful' ? <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-[#102B78]" /> : result.status === 'pending' ? <Clock className="mx-auto mb-3 h-9 w-9 text-[#102B78]" /> : <XCircle className="mx-auto mb-3 h-9 w-9 text-rose-600" />}
          <NSEHeading as="h3" className="font-bold">{result.status === 'successful' ? isSip ? 'Demo SIP registered' : 'Demo payment successful' : result.status === 'pending' ? 'Demo authorization pending' : 'Demo authorization failed'}</NSEHeading>
          <p className="mt-2 text-sm text-gray-500">{result.status === 'successful' ? isSip ? 'The demo mandate is authorized. No real SIP has been registered or installment collected.' : 'The demo order is awaiting unit allotment. No real units have been purchased.' : result.status === 'pending' ? 'Confirmation has not arrived in this demo scenario. No success or unit allotment is assumed.' : 'No investment was completed. You can retry this demo authorization.'}</p>
          <p className="mt-3 break-all text-xs text-gray-400">Reference: {result.id}</p>
        </div>
        {summary}
        {result.status === 'rejected' && <NSEButton className={primary} onClick={() => setStep(3)}>Retry demo authorization</NSEButton>}
        {result.status === 'pending' && <NSEButton className={secondary} onClick={() => setStep(3)}>Choose demo status update</NSEButton>}
        <NSEButton className={primary} onClick={() => onTrack(investmentMode)}>View {isSip ? 'SIPs' : 'orders'}</NSEButton>
        <NSEButton className={secondary} onClick={onClose}>Back to funds</NSEButton>
      </div>}
    </DialogContent>
  </Dialog>;
}
