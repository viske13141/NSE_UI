import { NSEButton, NSEHeading, NSESummary } from '@/components/nse/NSEPresentation';
import React, { useEffect, useRef, useState } from 'react';
import { uploadNSEFatcaImage, validateNSEFatcaImage } from '@/services/nseFatcaUploadService';
export default function NSEFatcaUpload({ embedded = false, onBusyChange, initialPan = '', onSelectIndividual }: { embedded?: boolean; onBusyChange?: (busy: boolean) => void; initialPan?: string; onSelectIndividual?: () => void } = {}) {
  const Container = embedded ? 'section' : 'details';
  const Heading = embedded ? NSEHeading : NSESummary;
  const [client, setClient] = useState(initialPan), [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [attempted, setAttempted] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  const submit = async () => {
    if (lock.current || attempted || !consent || !file) return;
    try { validateNSEFatcaImage(client, file); } catch (failure) { setError((failure as Error).message); return; }
    lock.current = true; setBusy(true); setError('');
    try { setMessage(await uploadNSEFatcaImage(client, file, () => setAttempted(true))); setFile(null); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'FATCA upload was not confirmed'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Container className="rounded-xl border border-blue-200 p-4"><Heading className="cursor-pointer text-sm font-bold text-[#102B78]">Upload FATCA image</Heading><div className="mt-3 space-y-3 text-sm"><p className="text-xs text-gray-500">For entities and HUFs. Individual investors should use Individual declaration. Upload a signed JPG, JPEG, TIF, TIFF or PDF, up to 3 MB. Filename: maximum 40 characters.</p><fieldset disabled={busy || attempted} className="grid gap-3 sm:grid-cols-2"><label>Non-individual / HUF PAN<input maxLength={10} value={client} onChange={event => { setClient(event.target.value); setConsent(false); }} className="mt-1 w-full rounded border p-2" /></label><label className="sm:col-span-2">Signed FATCA image<input type="file" accept=".jpg,.jpeg,.tif,.tiff,.pdf,image/jpeg,image/tiff,application/pdf" onChange={event => { setFile(event.target.files?.[0] || null); setConsent(false); }} className="mt-2 block w-full text-xs" /></label></fieldset>
    {file && <div className="rounded-lg bg-blue-50 p-3 text-xs text-[#102B78]">Review upload: PAN {client ? `\u2022\u2022\u2022\u2022 ${client.slice(-4)}` : 'not entered'}<br />File: {file.name} ({(file.size / 1024).toFixed(1)} KB)</div>}
    {!attempted && <>
    {onSelectIndividual && /^[A-Z]{3}P[A-Z]\d{4}[A-Z]$/.test(client.trim().toUpperCase()) && <NSEButton type="button" disabled={busy} onClick={onSelectIndividual} className="rounded-lg border border-blue-200 p-3 text-sm text-[#102B78]">Use Individual declaration for this PAN</NSEButton>}<label className="flex items-start gap-2 text-xs"><input type="checkbox" disabled={busy} checked={consent} onChange={event => setConsent(event.target.checked)} />I confirm this signed FATCA belongs to the specified non-individual or HUF PAN and want to upload it to Mutual funds.</label><NSEButton disabled={!client.trim() || !file || !consent || busy} onClick={() => void submit()} className="rounded-lg bg-[#102B78] px-4 py-2 font-semibold text-white disabled:opacity-50">Upload FATCA to Mutual funds</NSEButton></>}
    {busy && <p role="status">Uploading FATCA...</p>}{message && <p role="status" className="text-xs text-[#102B78]">{message} Upload does not confirm CAMS/KFin acceptance. Reload the report below to check processing.</p>}{error && <p role="alert" className="text-xs text-rose-700">{error}{attempted && !/check .*report .*retrying/i.test(error) && ' Check the FATCA report before uploading again.'}</p>}
  </div></Container>;
}
