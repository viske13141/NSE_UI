import { NSEButton, NSEDialogTitle, NSEHeading } from '@/components/nse/NSEPresentation';
﻿import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import NSEInvestorSelector from './NSEInvestorSelector';
import NSEPlanChecks from './NSEPlanChecks';
import { buildNSEXsip, registerNSEXsip, NSE_XSIP_FREQUENCIES, type NSEXsipInput, type XSIPApprovedMandate } from '@/services/nseXsipService';
import NSEXsipMandateSelector from './NSEXsipMandateSelector';
import type { NSEInvestorSelection } from '@/services/nseInvestorService';
import type { NSEFund, NSEDemoOrder } from './NSEInvestmentFlow';
const primary = 'w-full rounded-lg bg-[#102B78] px-4 py-3 text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500';
const inputClass = 'mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal';
export default function NSEXsipFlow({ fund, onClose, onRecord, onTrack }: { fund: NSEFund; onClose: () => void; onRecord: (order: NSEDemoOrder) => void; onTrack: () => void }) {
  const [step, setStep] = useState(0); const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY'); const [installments, setInstallments] = useState('12');
  const [selection, setSelection] = useState<NSEInvestorSelection | null>(null);
  const [memberCode, setMemberCode] = useState(''); const [amcCode, setAmcCode] = useState(fund.amcCode || '');
  const [dpMode, setDpMode] = useState<NSEXsipInput['dpMode']>(''); const [folio, setFolio] = useState(''); const [mandateId, setMandateId] = useState('');
  const [euinDeclaration, setEuinDeclaration] = useState<'Y' | 'N'>('Y'); const [euin, setEuin] = useState('');
  const [firstToday, setFirstToday] = useState(false); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [attempted, setAttempted] = useState(false); const [error, setError] = useState('');
  const [result, setResult] = useState<NSEDemoOrder | null>(null); const [reference] = useState(() => `X${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`); const lock = useRef(false);
  const [approvedMandate, setApprovedMandate] = useState<XSIPApprovedMandate | null>(null);
  const ready = !!selection?.kycVerified && selection.bank.active;
  const physicalClient = /NON\s*DEMAT|PHYSICAL/i.test(selection?.clientType || '') || /^(PHYS|PHYSICAL|P)$/i.test(selection?.depository || '');
  const payload = (): NSEXsipInput => ({ amcCode, schemeCode: fund.schemeCode || '', investor: selection!, memberCode, amount: Number(amount), startDate, endDate, frequency, installments, dpMode, folio, mandateId, euinDeclaration, euin, firstOrderToday: firstToday, reference, approvedMandate });
  const submit = async () => {
    if (lock.current || attempted || !consent || !ready) return;
    try { buildNSEXsip(payload()); } catch (failure) { setError((failure as Error).message); return; }
    lock.current = true; setBusy(true); setAttempted(true); setError('');
    const base: NSEDemoOrder = { id: reference, fund: fund.name, mode: 'sip', registrationProduct: 'XSIP', amount: Number(amount), day: Number(startDate.slice(-2)), installments: frequency === 'DAILY' ? 0 : Number(installments), investor: selection!.name, clientCode: selection!.clientCode, bank: approvedMandate!.bank, live: true, frequency, startDate, endDate: frequency === 'DAILY' ? endDate : undefined, status: 'pending' };
    try { const response = await registerNSEXsip(payload()); const record = { ...base, status: response.status, sipRegistrationId: response.registrationId, rawStatus: response.rawStatus, remark: response.remark }; setResult(record); onRecord(record); setStep(3); }
    catch (failure) { const record = { ...base, rawStatus: 'Confirmation unknown', remark: failure instanceof Error ? failure.message : 'Check registration status before retrying' }; setResult(record); onRecord(record); setStep(3); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
    <DialogHeader><NSEDialogTitle>{['XSIP details', 'XSIP investor and mandate', 'Review XSIP registration', 'XSIP registration status'][step]}</NSEDialogTitle><DialogDescription>{fund.name}</DialogDescription></DialogHeader>
    <p className="rounded-xl bg-blue-50 p-3 text-xs text-[#102B78]">Live Mutual funds XSIP registration. Scheme-specific dates, frequencies, minimums, increments and installment limits are validated by Mutual funds. Registration does not confirm mandate approval or payment.</p>
    {step === 0 && <form className="space-y-4" onSubmit={event => { event.preventDefault(); setStep(1); }}>
      {!fund.amcCode && <label className="block text-sm font-semibold">Mutual funds AMC code<input required maxLength={50} className={inputClass} value={amcCode} onChange={event => setAmcCode(event.target.value)} /></label>}
      <label className="block text-sm font-semibold">Installment amount (₹)<input required type="number" min="0.01" max="9999999999.99" step="0.01" className={inputClass} value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label className="block text-sm font-semibold">XSIP frequency<select className={inputClass} value={frequency} onChange={event => setFrequency(event.target.value)}>{NSE_XSIP_FREQUENCIES.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-sm font-semibold">Start date<input required type="date" className={inputClass} value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
      {frequency === 'DAILY' ? <label className="block text-sm font-semibold">End date<input required type="date" className={inputClass} value={endDate} onChange={event => setEndDate(event.target.value)} /></label> : <label className="block text-sm font-semibold">Installments<input required type="number" min="1" step="1" className={inputClass} value={installments} onChange={event => setInstallments(event.target.value)} /></label>}
      <NSEButton type="submit" className={primary}>Continue to investor</NSEButton>
    </form>}
    {step === 1 && <div className="space-y-4">
      <NSEInvestorSelector onChange={value => { setSelection(value); setApprovedMandate(null); setMandateId(''); setConsent(false); setMemberCode(value?.memberCode || ''); setDpMode(/NON\s*DEMAT|PHYSICAL/i.test(value?.clientType || '') || /^(PHYS|PHYSICAL|P)$/i.test(value?.depository || '') ? 'P' : ''); }} />
      <label className="block text-sm font-semibold">Mutual funds member code<input className={inputClass} maxLength={20} value={memberCode} readOnly={!!selection?.memberCode} onChange={event => setMemberCode(event.target.value)} /></label>
      <label className="block text-sm font-semibold">XSIP depository mode<select className={inputClass} value={dpMode} onChange={event => setDpMode(event.target.value as NSEXsipInput['dpMode'])}><option value="">Select mode</option><option value="P">Physical (P)</option><option value="C" disabled={physicalClient}>CDSL demat (D / C)</option><option value="N" disabled={physicalClient}>NSDL demat (D / N)</option></select></label>
      <label className="block text-sm font-semibold">Existing folio (optional)<input className={inputClass} maxLength={15} value={folio} onChange={event => setFolio(event.target.value)} /></label>
      {selection && <NSEXsipMandateSelector key={selection.clientCode} clientCode={selection.clientCode} onChange={value => { setApprovedMandate(value); setMandateId(value?.id || ''); setConsent(false); }} />}
      <p className="text-xs text-gray-500">An approved mandate is required for XSIP. Convenience fee is zero. Step-up is disabled in this form.</p>
      <label className="block text-sm font-semibold">EUIN declaration<select className={inputClass} value={euinDeclaration} onChange={event => setEuinDeclaration(event.target.value as 'Y' | 'N')}><option value="Y">Y — EUIN supplied</option><option value="N">N — EUIN not supplied</option></select></label>
      {euinDeclaration === 'Y' && <label className="block text-sm font-semibold">EUIN<input className={inputClass} maxLength={7} value={euin} onChange={event => setEuin(event.target.value.toUpperCase())} /></label>}
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={firstToday} onChange={event => setFirstToday(event.target.checked)} />Generate the first order today</label>
      <NSEPlanChecks product="XSIP" mandateId={mandateId} />
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <NSEButton disabled={!ready} className={primary} onClick={() => { try { buildNSEXsip(payload()); setError(''); setStep(2); } catch (failure) { setError((failure as Error).message); } }}>Review XSIP</NSEButton>
      <NSEButton className="w-full py-2 text-sm text-[#102B78]" onClick={() => { setSelection(null); setStep(0); }}>Back to XSIP details</NSEButton>
    </div>}
    {step === 2 && <div className="space-y-4"><NSEPlanChecks product="XSIP" mandateId={mandateId} reviewed /><dl className="space-y-3 text-sm">{[['AMC / scheme', `${amcCode} / ${fund.schemeCode}`], ['Investor', `${selection?.name} · ${selection?.clientCode}`], ['Member code', memberCode], ['Amount', Number(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })], ['Frequency', frequency], ['Start date', startDate], [frequency === 'DAILY' ? 'End date' : 'Installments', frequency === 'DAILY' ? endDate : installments], ['Transaction mode', dpMode === 'P' ? 'Physical (P / P)' : `Demat (D / ${dpMode})`], ['Mandate', `${mandateId} ? ${approvedMandate?.bank} ? Limit ?${approvedMandate?.amount}`], ['Convenience fee', '?0'], ['Step-up', 'Disabled'], ['EUIN declaration', euinDeclaration], ['First order today', firstToday ? 'Yes — creates an order today' : 'No'], ['Reference', reference]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-gray-500">{label}</dt><dd className="break-all text-right font-semibold">{value}</dd></div>)}</dl>
      <label className="flex gap-3 text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />I confirm the schedule, EUIN declaration and live XSIP registration{firstToday ? ', including generation of the first order today' : ''}.</label>
      <NSEButton disabled={!consent || busy || attempted} className={primary} onClick={submit}>{busy ? 'Registering XSIP…' : 'Register XSIP'}</NSEButton><NSEButton disabled={busy || attempted} className="w-full py-2 text-sm text-[#102B78]" onClick={() => { setConsent(false); setSelection(null); setStep(1); }}>Edit XSIP</NSEButton>
    </div>}
    {step === 3 && result && <div className="space-y-4"><div role="status" className="rounded-xl border border-gray-200 p-4"><NSEHeading as="h3" className="font-bold">{result.status === 'successful' ? 'XSIP registered' : result.status === 'rejected' ? 'XSIP registration rejected' : 'XSIP confirmation unknown'}</NSEHeading><p className="mt-2 text-sm">{result.remark}</p><p className="mt-2 text-xs">{result.sipRegistrationId ? `Mutual funds registration ID: ${result.sipRegistrationId}` : 'No valid Mutual funds registration ID returned.'}</p></div><p className="text-xs text-gray-500">Mandate approval, installment payments and unit allotment are tracked separately. Check registration status before retrying an unconfirmed request.</p><NSEButton className={primary} onClick={onTrack}>View SIPs</NSEButton><NSEButton className="w-full py-2 text-sm text-[#102B78]" onClick={onClose}>Back to funds</NSEButton></div>}
  </DialogContent></Dialog>;
}
