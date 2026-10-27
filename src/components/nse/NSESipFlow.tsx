import NSEFlowSteps from './NSEFlowSteps';
import { NSEButton, NSEDialogTitle, NSESummary, NSEHeading } from '@/components/nse/NSEPresentation';
﻿import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import NSEInvestorSelector from './NSEInvestorSelector';
import NSEPlanChecks from './NSEPlanChecks';
import NSESipMandateSelector from './NSESipMandateSelector';
import { buildNSESip, checkNSESipMandate, registerNSESip, NSE_SIP_FREQUENCIES, nseSipInvestorMode, type NSESipInput } from '@/services/nseSipService';
import type { NSEInvestorSelection } from '@/services/nseInvestorService';
import type { NSEFund, NSEDemoOrder } from './NSEInvestmentFlow';
const primary = 'w-full rounded-lg bg-[#102B78] px-4 py-3 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500';
const inputClass = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal';
export default function NSESipFlow({ fund, onClose, onRecord, onTrack }: { fund: NSEFund; onClose: () => void; onRecord: (order: NSEDemoOrder) => void; onTrack: () => void }) {
  const [step, setStep] = useState(0); const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY'); const [installments, setInstallments] = useState('12');
  const [selection, setSelection] = useState<NSEInvestorSelection | null>(null);
  const [internalReference] = useState(() => Array.from(crypto.getRandomValues(new Uint8Array(10)), value => (value % 36).toString(36)).join('').toUpperCase());
  const [memberCode, setMemberCode] = useState(''); const [amcCode, setAmcCode] = useState(fund.amcCode || '');
  const [dpMode, setDpMode] = useState<NSESipInput['dpMode']>(''); const [folio, setFolio] = useState(''); const [mandateId, setMandateId] = useState('');
  const [euinDeclaration, setEuinDeclaration] = useState<'Y' | 'N'>('Y'); const [euin, setEuin] = useState('');
  const [mobile, setMobile] = useState(''), [email, setEmail] = useState(''), [remarks, setRemarks] = useState('');
  const [subBrokerCode, setSubBrokerCode] = useState(''), [subBrokerArn, setSubBrokerArn] = useState('');
  const [firstToday, setFirstToday] = useState(false); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [attempted, setAttempted] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<NSEDemoOrder | null>(null); const [reference] = useState(() => `S${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`); const lock = useRef(false);
  const investorReady = !!selection?.kycVerified && !!selection?.bank.active;
  const ready = investorReady && !!mandateId;
  const investorMode = nseSipInvestorMode(selection);
  const physicalClient = investorMode === 'P';
  const payload = (): NSESipInput => ({ amcCode, schemeCode: fund.schemeCode || '', investor: selection!, memberCode, amount: Number(amount), startDate, endDate, frequency, installments, dpMode, folio, mandateId, euinDeclaration, euin, firstOrderToday: firstToday, reference, internalReference, mobile, email, remarks, subBrokerCode, subBrokerArn });
  const submit = async () => {
    if (lock.current || attempted || !consent || !ready) return;
    try { buildNSESip(payload()); } catch (failure) { setError((failure as Error).message); return; }
    lock.current = true; setBusy(true); setAttempted(true); setError('');
    const base: NSEDemoOrder = { id: reference, fund: fund.name, mode: 'sip', amount: Number(amount), day: Number(startDate.slice(-2)), installments: frequency === 'DAILY' ? 0 : Number(installments), investor: selection!.name, clientCode: selection!.clientCode, bank: selection!.bank.label, live: true, frequency, startDate, endDate: frequency === 'DAILY' ? endDate : undefined, status: 'pending' };
    try { const response = await registerNSESip(payload()); const record = { ...base, status: response.status, sipRegistrationId: response.registrationId, rawStatus: response.rawStatus, remark: response.remark }; setResult(record); onRecord(record); setStep(3); }
    catch (failure) { const record = { ...base, rawStatus: 'Confirmation unknown', remark: failure instanceof Error ? failure.message : 'Check registration status before retrying' }; setResult(record); onRecord(record); setStep(3); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
    <DialogHeader><NSEDialogTitle>{['SIP details', 'SIP investor and mandate', 'Review SIP registration', 'SIP registration status'][step]}</NSEDialogTitle><DialogDescription>{fund.name}</DialogDescription></DialogHeader>
    <NSEFlowSteps steps={['Set your schedule', 'Investor and auto-debit', 'Review and confirm', 'Registration result']} current={step} />
    <p className="rounded-xl bg-blue-50 p-3 text-xs text-[#102B78]">Live Mutual funds SIP registration. Scheme-specific dates, frequencies, minimums, increments and installment limits are validated by Mutual funds. Registration does not confirm mandate approval or payment.</p>
    {step === 0 && <form className="space-y-4" onSubmit={event => { event.preventDefault(); setStep(1); }}>
      {!fund.amcCode && <label className="block text-sm font-semibold">Mutual funds AMC code<input required maxLength={50} className={inputClass} value={amcCode} onChange={event => setAmcCode(event.target.value)} /></label>}
      <label className="block text-sm font-semibold">Installment amount (₹)<input required type="number" min="0.01" max="9999999999.99" step="0.01" className={inputClass} value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label className="block text-sm font-semibold">SIP frequency<select className={inputClass} value={frequency} onChange={event => setFrequency(event.target.value)}>{NSE_SIP_FREQUENCIES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-sm font-semibold">Start date<input required type="date" className={inputClass} value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
      {frequency === 'DAILY' ? <label className="block text-sm font-semibold">End date<input required type="date" className={inputClass} value={endDate} onChange={event => setEndDate(event.target.value)} /></label> : <label className="block text-sm font-semibold">Installments<input required type="number" min="1" step="1" className={inputClass} value={installments} onChange={event => setInstallments(event.target.value)} /></label>}
      <NSEButton type="submit" className={primary}>Continue to investor</NSEButton>
    </form>}
    {step === 1 && <fieldset disabled={busy} className="space-y-4">
      <NSEInvestorSelector onChange={value => { setSelection(value); setConsent(false); setMemberCode(value?.memberCode || ''); setDpMode(nseSipInvestorMode(value)); setMandateId(''); setMobile(value?.mobile || ''); setEmail(value?.email || ''); setError(''); }} />
      <label className="block text-sm font-semibold">Mutual funds member code<input aria-required="true" inputMode="numeric" className={inputClass} maxLength={20} value={memberCode} readOnly={!!selection?.memberCode} onChange={event => setMemberCode(event.target.value)} /></label>
      <label className="block text-sm font-semibold">SIP depository mode<select aria-required="true" className={inputClass} value={dpMode} onChange={event => setDpMode(event.target.value as NSESipInput['dpMode'])}><option value="">Select mode</option><option value="P">Physical (P)</option><option value="C" disabled={physicalClient || investorMode === 'N'}>CDSL demat (D / C)</option><option value="N" disabled={physicalClient || investorMode === 'C'}>NSDL demat (D / N)</option></select></label>
      <label className="block text-sm font-semibold">Existing folio (optional)<input className={inputClass} maxLength={15} value={folio} onChange={event => setFolio(event.target.value)} /></label>
      {selection && <NSESipMandateSelector key={`${selection.clientCode}-${selection.bank.id}`} investor={selection} amount={Number(amount)} onChange={setMandateId} />}
      <label className="block text-sm font-semibold">EUIN declaration<select className={inputClass} value={euinDeclaration} onChange={event => setEuinDeclaration(event.target.value as 'Y' | 'N')}><option value="Y">Y — EUIN supplied</option><option value="N">N — EUIN not supplied</option></select></label>
      {euinDeclaration === 'Y' && <label className="block text-sm font-semibold">EUIN<input className={inputClass} maxLength={7} value={euin} onChange={event => setEuin(event.target.value.toUpperCase())} /></label>}
      <details className="rounded-lg border border-gray-200 p-3"><NSESummary className="cursor-pointer text-sm font-semibold text-[#102B78]">Contact and distributor details (optional)</NSESummary><div className="mt-3 grid gap-3 sm:grid-cols-2">
        {([['Primary holder mobile (optional)', mobile, setMobile, 10, 'tel'], ['Primary holder email (optional)', email, setEmail, 50, 'email'], ['SIP remarks (optional)', remarks, setRemarks, 100, 'text'], ['Sub-broker code (optional)', subBrokerCode, setSubBrokerCode, 15, 'text'], ['Sub-broker ARN (optional)', subBrokerArn, setSubBrokerArn, 20, 'text']] as const).map(([label, value, update, maxLength, type]) => <label key={label} className="block text-sm font-semibold">{label}<input className={inputClass} type={type} value={value} maxLength={maxLength} onChange={event => update(event.target.value)} /></label>)}
      </div></details>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={firstToday} onChange={event => setFirstToday(event.target.checked)} />Generate the first order today</label>
      <NSEPlanChecks product="SIP" mandateId={mandateId} />
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!investorReady && <p id="sip-review-blocker" role="status" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><strong>Find and verify the investor to review this SIP.</strong><br />Select an active bank and obtain a verified Mutual funds KYC result above. If Mutual funds reports no KYC record, the investor’s KYC must be resolved before continuing. Then use Recheck KYC.</p>}
      {investorReady && !mandateId && <p id="sip-review-blocker" role="status" className="text-sm text-slate-600">Select an approved mandate for this client before reviewing the SIP. If none exists, register a mandate above and complete its authorization.</p>}
      <NSEButton disabled={!ready || busy} aria-describedby={!ready ? 'sip-review-blocker' : undefined} className={primary} onClick={async () => { if (lock.current) return; try { buildNSESip(payload()); lock.current = true; setBusy(true); if (mandateId.trim()) await checkNSESipMandate(payload()); setError(''); setStep(2); } catch (failure) { setError((failure as Error).message); } finally { lock.current = false; setBusy(false); } }}>Review SIP</NSEButton>
      <NSEButton className="w-full py-2 text-sm text-[#102B78]" onClick={() => { setSelection(null); setStep(0); }}>Back to SIP details</NSEButton>
    </fieldset>}
    {step === 2 && <div className="space-y-4"><NSEPlanChecks product="SIP" mandateId={mandateId} reviewed /><dl className="space-y-3 text-sm">{[['AMC / scheme', `${amcCode} / ${fund.schemeCode}`], ['Investor', `${selection?.name} · ${selection?.clientCode}`], ['Member code', memberCode], ['Amount', Number(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })], ['Frequency', frequency], ['Start date', startDate], [frequency === 'DAILY' ? 'End date' : 'Installments', frequency === 'DAILY' ? endDate : installments], ['Transaction mode', dpMode === 'P' ? 'Physical (P / P)' : `Demat (D / ${dpMode})`], ['Mandate', mandateId || 'Not supplied'], ['EUIN declaration', euinDeclaration], ['EUIN', euinDeclaration === 'Y' ? euin : 'Not supplied'], ['Primary holder mobile', mobile || 'Not supplied'], ['Primary holder email', email || 'Not supplied'], ['SIP remarks', remarks || 'None'], ['Sub-broker code', subBrokerCode || 'Not supplied'], ['Sub-broker ARN', subBrokerArn || 'Not supplied'], ['First order today', firstToday ? 'Yes — creates an order today' : 'No'], ['SIP internal reference', internalReference], ['Member reference', reference]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-gray-500">{label}</dt><dd className="break-all text-right font-semibold">{value}</dd></div>)}</dl>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />I confirm the schedule, EUIN declaration and live SIP registration{firstToday ? ', including generation of the first order today' : ''}.</label>
      <NSEButton disabled={!consent || busy || attempted} className={primary} onClick={submit}>{busy ? 'Registering SIP…' : 'Register SIP'}</NSEButton><NSEButton disabled={busy || attempted} className="w-full py-2 text-sm text-[#102B78]" onClick={() => { setConsent(false); setSelection(null); setStep(1); }}>Edit SIP</NSEButton>
    </div>}
    {step === 3 && result && <div className="space-y-4"><div role="status" className="rounded-xl border border-gray-200 p-4"><NSEHeading as="h3" className="font-bold">{result.status === 'successful' ? 'SIP registered' : result.status === 'rejected' ? 'SIP registration rejected' : 'SIP confirmation unknown'}</NSEHeading><p className="mt-2 text-sm">{result.remark}</p><p className="mt-2 text-xs">{result.sipRegistrationId ? `Mutual funds registration ID: ${result.sipRegistrationId}` : 'No valid Mutual funds registration ID returned.'}</p></div><p className="text-xs text-gray-500">Mandate approval, installment payments and unit allotment are tracked separately. Check registration status before retrying an unconfirmed request.</p><NSEButton className={primary} onClick={onTrack}>View SIPs</NSEButton><NSEButton className="w-full py-2 text-sm text-[#102B78]" onClick={onClose}>Back to funds</NSEButton></div>}
  </DialogContent></Dialog>;
}
