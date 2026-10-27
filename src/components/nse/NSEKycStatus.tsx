import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { NSEButton, NSEDialogTitle } from './NSEPresentation';
import { checkNSEClientKyc, type NSEKycResult } from '@/services/nseKycService';
export default function NSEKycStatus({ onClose }: { onClose: () => void }) {
 const [code, setCode] = useState(''), [pan, setPan] = useState('');
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState<NSEKycResult | null>(null);
 const lock = useRef(false);
 const load = async (event: React.FormEvent) => {
  event.preventDefault(); if (lock.current) return;
  setError(''); setResult(null);
  if (!code.trim() || code.trim().length > 10) { setError('Enter the registered client code, up to 10 characters'); return; }
  if (pan.trim() && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan.trim().toUpperCase())) { setError('Enter a valid PAN'); return; }
  lock.current = true; setBusy(true);
  try { setResult(await checkNSEClientKyc(code.trim(), pan.trim().toUpperCase())); }
  catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to check KYC'); }
  finally { lock.current = false; setBusy(false); }
 };
 return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent><DialogHeader><NSEDialogTitle>Check investor KYC</NSEDialogTitle><DialogDescription>Fetch the current Mutual funds KYC report for an existing client. This check does not register KYC, submit an order or make a payment.</DialogDescription></DialogHeader>
  <form onSubmit={event => void load(event)} className="space-y-4"><fieldset disabled={busy} className="space-y-3"><label className="block text-sm">Client code<input required maxLength={10} value={code} onChange={event => { setCode(event.target.value); setResult(null); setError(''); }} className="mt-1 w-full rounded border p-2" /></label><label className="block text-sm">PAN (optional)<input maxLength={10} value={pan} onChange={event => { setPan(event.target.value.toUpperCase()); setResult(null); setError(''); }} className="mt-1 w-full rounded border p-2" /></label></fieldset><NSEButton type="submit" disabled={busy} className="rounded-lg bg-[#102B78] px-4 py-2 text-sm text-white">{busy ? 'Checking KYC...' : 'Check KYC status'}</NSEButton></form>
  {result && <p role="status" className="rounded-lg border bg-slate-50 p-3 text-sm leading-relaxed">{result.message}</p>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
  <p className="text-xs leading-relaxed text-slate-500">A KYC method such as Aadhaar e-KYC is not the current verification result. If KYC is missing, use Client Management, then eKYC registration. Client consent, FATCA and bank verification are separate checks.</p>
 </DialogContent></Dialog>;
}
