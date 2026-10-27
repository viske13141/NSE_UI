import React, { useRef, useState } from 'react';
import { NSEButton } from './NSEPresentation';
import { searchFatcaClients, getHolderFatcaRecords, buildFatcaPrefill, type FatcaClient, type FatcaHolder, type FatcaPrefill } from '@/services/nseFatcaPrefillService';

export default function NSEFatcaClientLookup({ disabled, onLoading, onPrefill, onClear }: {
  disabled: boolean; onLoading: (loading: boolean) => void;
  onPrefill: (prefill: FatcaPrefill, holder: FatcaHolder) => void; onClear: () => void;
}) {
  const [mode, setMode] = useState<'code' | 'name'>('code'), [query, setQuery] = useState('');
  const [clients, setClients] = useState<FatcaClient[]>([]), [clientIndex, setClientIndex] = useState(''), [holderId, setHolderId] = useState('');
  const [records, setRecords] = useState<Record<string, unknown>[]>([]), [recordIndex, setRecordIndex] = useState('');
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false);
  const client = clientIndex === '' ? undefined : clients[Number(clientIndex)];
  const holder = client?.holders.find(item => item.id === holderId);
  const setBusy = (value: boolean) => { lock.current = value; setLoading(value); onLoading(value); };
  const reset = () => { setClients([]); setClientIndex(''); setHolderId(''); setRecords([]); setRecordIndex(''); setNotice(''); setError(''); onClear(); };
  const search = async (event: React.FormEvent) => {
    event.preventDefault(); if (disabled || lock.current) return;
    reset(); setBusy(true);
    try { const result = await searchFatcaClients(query, mode); setClients(result); setNotice(result.length ? `${result.length} matching client${result.length === 1 ? '' : 's'}. Select a client and holder below.` : 'No matching clients were returned. Try the exact client code or enter the declaration manually.'); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to search clients'); }
    finally { setBusy(false); }
  };
  const selectHolder = async (id: string) => {
    if (lock.current || disabled) return;
    setHolderId(id); setRecords([]); setRecordIndex(''); setNotice(''); setError('');
    const selected = client?.holders.find(item => item.id === id);
    if (!selected) { onClear(); return; }
    onPrefill(buildFatcaPrefill(selected), selected); setBusy(true);
    try {
      const rows = await getHolderFatcaRecords(selected); setRecords(rows);
      if (rows.length === 1) { setRecordIndex('0'); onPrefill(buildFatcaPrefill(selected, rows[0]), selected); setNotice('Client Master and the existing FATCA declaration have been loaded. Review every declaration before submitting.'); }
      else setNotice(rows.length ? 'More than one FATCA record was returned. Choose the declaration to use; no record has been selected automatically.' : 'No FATCA record was returned for this holder. Client Master details are filled; complete the missing declaration fields.');
    } catch (failure) { setError(`Client Master details are available, but existing FATCA could not be loaded. ${failure instanceof Error ? failure.message : 'Try the FATCA report.'}`); }
    finally { setBusy(false); }
  };
  return <section aria-label="Find investor" className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
    <div><h3 className="text-sm font-bold text-[#102B78]">Find investor and fill saved details</h3><p className="mt-1 text-xs leading-relaxed text-slate-600">Search by client code or name, then choose the holder. Selecting another client, holder or saved record replaces the current draft. You can also enter details manually below.</p></div>
    <form onSubmit={event => void search(event)}><fieldset disabled={disabled || loading} className="grid items-end gap-3 sm:grid-cols-[140px_1fr_auto]">
      <label className="text-sm">Search by<select value={mode} onChange={event => { setMode(event.target.value as 'code' | 'name'); reset(); }} className="mt-1 w-full rounded border bg-white p-2"><option value="code">Client code</option><option value="name">Client name</option></select></label>
      <label className="text-sm">Client code / name<input value={query} onChange={event => { setQuery(event.target.value); reset(); }} minLength={mode === 'name' ? 3 : 1} required autoComplete="off" className="mt-1 w-full rounded border p-2" /></label>
      <NSEButton type="submit" className="rounded-lg bg-[#102B78] px-4 py-2 text-sm text-white">Search clients</NSEButton>
    </fieldset></form>
    {mode === 'name' && <p className="text-xs text-slate-500">Name search filters the Client Master records returned by Mutual funds. If a client is missing, search by exact client code.</p>}
    {clients.length > 0 && <fieldset disabled={disabled || loading} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Client<select value={clientIndex} onChange={event => { setClientIndex(event.target.value); setHolderId(''); setRecords([]); setRecordIndex(''); setNotice(''); setError(''); onClear(); }} className="mt-1 w-full rounded border bg-white p-2"><option value="">Select client</option>{clients.map((item, index) => <option key={`${item.code}-${index}`} value={index}>{item.code} - {item.name}</option>)}</select></label>
      <label className="text-sm">Holder / PAN<select value={holderId} disabled={!client || disabled || loading} onChange={event => void selectHolder(event.target.value)} className="mt-1 w-full rounded border bg-white p-2"><option value="">Select holder / PAN</option>{client?.holders.map(item => <option key={item.id} value={item.id}>{item.role} - {item.name} - {item.pan || item.pekrn ? `ending ${(item.pan || item.pekrn).slice(-4)}` : 'identifier missing'}</option>)}</select></label>
    </fieldset>}
    {records.length > 0 && holder && <label className="block text-sm">Saved FATCA declaration<select disabled={disabled || loading} value={recordIndex} onChange={event => { const index = event.target.value; setRecordIndex(index); onPrefill(buildFatcaPrefill(holder, index === '' ? undefined : records[Number(index)]), holder); }} className="mt-1 w-full rounded border bg-white p-2"><option value="">Use Client Master only</option>{records.map((record, index) => <option key={index} value={index}>Record {index + 1}{record.createddatetime ? ` - ${String(record.createddatetime)}` : ''}{record.reg_status ? ` - ${String(record.reg_status)}` : ''}</option>)}</select></label>}
    {loading && <p role="status" className="text-sm text-[#102B78]">Loading investor details...</p>}
    {notice && <p role="status" className="text-xs leading-relaxed text-slate-600">{notice}</p>}
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
  </section>;
}
