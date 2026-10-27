import { NSEButton, NSEDialogTitle } from '@/components/nse/NSEPresentation';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import NSEFatcaDataUpload from './NSEFatcaDataUpload';
import NSEFatcaCommonUpload from './NSEFatcaCommonUpload';
import NSEFatcaUpload from './NSEFatcaUpload';
import NSEFatcaClientLookup from './NSEFatcaClientLookup';
import NSEFatcaReport from './NSEFatcaReport';
import { fatcaInvestorCategory } from '@/services/nseFatcaDataService';
import type { FatcaPrefill, FatcaHolder } from '@/services/nseFatcaPrefillService';

const choices = [
  ['individual', 'Individual declaration', 'For an individual investor or guardian.'],
  ['common', 'Entity / HUF / UBO declaration', 'For a company, HUF or declaration with beneficial owners.'],
  ['image', 'Signed image', 'Upload an existing signed declaration for an entity or HUF.'],
] as const;

export default function NSEFatcaRegistration({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string>('individual');
  const [busy, setBusy] = useState(false);
  const [visited, setVisited] = useState(['individual']);
  const [lookupBusy, setLookupBusy] = useState(false), [reportOpen, setReportOpen] = useState(false);
  const [seed, setSeed] = useState<FatcaPrefill | null>(null), [holder, setHolder] = useState<FatcaHolder | null>(null), [revision, setRevision] = useState(0);
  const applyPrefill = (prefill: FatcaPrefill, selectedHolder: FatcaHolder) => {
    setSeed(prefill); setHolder(selectedHolder); setRevision(value => value + 1);
    const nextForm = prefill.values.tax_status ? (fatcaInvestorCategory(prefill.values.tax_status) === 'individual' ? 'individual' : 'common') : selectedHolder.pan && selectedHolder.pan[3] !== 'P' ? 'common' : 'individual';
    setSelected(nextForm); setVisited([nextForm]);
  };
  const clearPrefill = () => { if (seed || holder) { setSeed(null); setHolder(null); setRevision(value => value + 1); setVisited([selected]); } };
  const blocked = busy || lookupBusy;
  return <><Dialog open onOpenChange={open => { if (!open && !blocked) onClose(); }}>
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"
      onEscapeKeyDown={event => { if (blocked) event.preventDefault(); }}
      onPointerDownOutside={event => { if (blocked) event.preventDefault(); }}>
      <DialogHeader>
        <NSEDialogTitle>FATCA registration</NSEDialogTitle>
        <DialogDescription>Provide the investor's tax residency declaration. Choose a form, enter the details, then review and confirm.</DialogDescription>
      </DialogHeader>
      <p className="text-xs text-slate-500">1. Find investor &nbsp; / &nbsp; 2. Complete declaration &nbsp; / &nbsp; 3. Review and confirm</p>
      <NSEFatcaClientLookup disabled={busy || reportOpen} onLoading={setLookupBusy} onPrefill={applyPrefill} onClear={clearPrefill} />
      {seed && <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><p>Selected holder: <strong>{holder?.role} - {holder?.name}</strong>. Saved details are editable. Confirm that they are current before submitting.</p>{seed.warnings.map((warning, index) => <p key={index} className="text-amber-800">{warning}</p>)}<NSEButton type="button" disabled={blocked} onClick={() => setReportOpen(true)} className="text-[#102B78] underline">Check FATCA processing report</NSEButton></div>}
      <nav aria-label="FATCA forms" className="grid gap-3 sm:grid-cols-3">
        {choices.map(([id, label, description]) => <NSEButton key={id} type="button" aria-label={label} disabled={blocked}
          aria-pressed={selected === id} onClick={() => { setSelected(id); setVisited(previous => previous.includes(id) ? previous : [...previous, id]); }}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold disabled:opacity-50 ${selected === id ? 'bg-[#102B78] text-white' : 'bg-gray-100 text-[#102B78]'}`}><span><span className="block">{label}</span><span className="mt-1 block text-xs font-normal leading-relaxed opacity-80">{description}</span></span></NSEButton>)}
      </nav>
      <fieldset disabled={lookupBusy}>
      <div hidden={selected !== 'individual'}>{visited.includes('individual') && <NSEFatcaDataUpload key={`individual-${revision}`} embedded initialValues={seed?.values} prefilled={!!seed} onBusyChange={setBusy} />}</div>
      <div hidden={selected !== 'common'}>{visited.includes('common') && <NSEFatcaCommonUpload key={`common-${revision}`} embedded initialValues={seed?.values} initialUbos={seed?.ubos} prefilled={!!seed} onBusyChange={setBusy} />}</div>
      <div hidden={selected !== 'image'}>{visited.includes('image') && <NSEFatcaUpload key={`image-${revision}`} embedded initialPan={holder?.pan} onSelectIndividual={() => { setSelected('individual'); setVisited(previous => previous.includes('individual') ? previous : [...previous, 'individual']); }} onBusyChange={setBusy} />}</div>
      </fieldset>
    </DialogContent>
  </Dialog>{reportOpen && <NSEFatcaReport initialIdentifier={holder?.pan || holder?.pekrn} onClose={() => setReportOpen(false)} />}</>;
}
