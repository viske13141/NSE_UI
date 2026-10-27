import { NSEButton, NSEDialogTitle } from '@/components/nse/NSEPresentation';
import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { buildNSEEkyc, registerNSEEkyc } from '@/services/nseEkycService';
// NSE MF Invest API FAQ, 31 July 2025, section 1.18 (page 5).
const rtaAmcCodes = [
  ['B', 'Aditya Birla'], ['K', 'Kotak Mahindra'], ['H', 'HDFC Mutual Fund'],
  ['G', 'Bandhan Mutual Fund'], ['CR', 'Canara Robeco Mutual Fund'],
  ['O', 'HSBC Asset Management'], ['UK', 'Union Asset Management'],
] as const;
export default function NSEEkycRegistration({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState({ amcCode: '', panNo: '', mobileNo: '', invEmail: '' });
  const [review, setReview] = useState(false), [consent, setConsent] = useState(false), [attempted, setAttempted] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState<{ link: string; message: string } | null>(null);
  const lock = useRef(false);
  const submit = async () => {
    if (!review || !consent || attempted || lock.current) return;
    lock.current = true; setBusy(true); setAttempted(true); setError('');
    try { setResult(await registerNSEEkyc(input)); } catch (failure) { setError(failure instanceof Error ? failure.message : 'eKYC registration is unconfirmed'); } finally { lock.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}><DialogHeader><NSEDialogTitle>Request eKYC link</NSEDialogTitle><DialogDescription>Enter the investor details to request a verification link.</DialogDescription></DialogHeader>
    {!review && <div className="space-y-3 text-sm">{([['amcCode', 'RTA AMC code'], ['panNo', 'Investor PAN'], ['mobileNo', 'Investor mobile'], ['invEmail', 'Investor email']] as const).map(([key, label]) => <label key={key} className="block">{label}<input list={key === 'amcCode' ? 'ekyc-rta-amc-codes' : undefined} required aria-required="true" autoComplete="off" maxLength={key === 'panNo' || key === 'mobileNo' ? 10 : undefined} inputMode={key === 'mobileNo' ? 'numeric' : undefined} value={input[key]} type={key === 'invEmail' ? 'email' : 'text'} onChange={event => setInput({ ...input, [key]: event.target.value })} className="mt-1 w-full rounded border p-2" /></label>)}<datalist id="ekyc-rta-amc-codes">{rtaAmcCodes.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</datalist><div className="rounded border bg-gray-50 p-3"><p className="mb-2 text-xs font-semibold">RTA AMC codes for eKYC</p><table className="w-full text-left text-xs"><thead><tr><th scope="col" className="pb-1">Code</th><th scope="col" className="pb-1">AMC</th></tr></thead><tbody>{rtaAmcCodes.map(([code, name]) => <tr key={code}><td className="py-1 font-mono font-semibold">{code}</td><td>{name}</td></tr>)}</tbody></table><a className="mt-2 inline-block text-xs text-blue-700 underline" href="https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Mutual funds%20INVEST%20API%20FAQ_310725.pdf#page=5" target="_blank" rel="noopener noreferrer">Mutual funds API FAQ ? 31 July 2025 ? section 1.18</a></div><p className="text-xs text-gray-500">Select or enter the AMC code used by the registrar (RTA), not a scheme code.</p><NSEButton className="rounded bg-[#102B78] p-3 text-white" onClick={() => { try { setInput(buildNSEEkyc(input)); setReview(true); setError(''); } catch (failure) { setError((failure as Error).message); } }}>Review eKYC request</NSEButton></div>}
    {review && !attempted && <div className="space-y-3 text-sm"><p>RTA AMC: {input.amcCode}<br />PAN ending: {input.panNo.slice(-4)}<br />Mobile ending: {input.mobileNo.slice(-4)}<br />Email: {input.invEmail}</p><label className="flex gap-2"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I confirm these investor details and request eKYC registration.</label><NSEButton disabled={!consent} onClick={() => void submit()} className="rounded bg-[#102B78] p-3 text-white disabled:opacity-50">Confirm eKYC request</NSEButton><NSEButton onClick={() => { setReview(false); setConsent(false); }} className="ml-3 underline">Edit eKYC details</NSEButton></div>}
    {busy && <p role="status">Requesting eKYC link...</p>}{result && <div className="space-y-3 text-sm"><p role="status">{result.message}</p><a href={result.link} target="_blank" rel="noopener noreferrer" className="inline-block rounded bg-[#102B78] p-3 text-white">Continue investor eKYC</a><p>Link creation does not confirm KYC verification. Recheck Client KYC after completing the process.</p></div>}{error && <p role="alert" className="text-sm text-rose-700">{error}{attempted && ' Check registration status before retrying.'}</p>}
  </DialogContent></Dialog>;
}
