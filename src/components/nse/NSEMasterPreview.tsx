import { NSEButton, NSESummary, NSEHeading } from '@/components/nse/NSEPresentation';
import NSESwpFlow from './NSESwpFlow';
import NSEStpFlow from './NSEStpFlow';
import React, { useEffect, useMemo, useState } from 'react';
import { nseApi, NSE_MASTER_FILE_TYPES, type NSEMasterFileType } from '@/services/nseApi';
import { CalendarDays, FileText, TrendingUp } from 'lucide-react';
import NSEInvestmentFlow, { type NSEDemoOrder } from './NSEInvestmentFlow';
import { type NSEPlanScheme } from './NSEPlanFlow';

const PAGE_SIZE = 24;
const normalizeHeader = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const friendlyLabel = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()).replace(/\bSip\b/g, 'SIP').replace(/\bAmc\b/g, 'AMC');

export function parseNSEMasterTable(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  const split = (line: string) => line.split('|').map(value => value.trim());
  const headerIndex = lines.findIndex(line => line.includes('|') && split(line).some(value => /^(SCHEMECODE|SCHEMENAME|FUNDNAME|AMCCODE|AMCNAME|NAVCODE|SETTLEMENTDATE|CODE)$/.test(value.toUpperCase().replace(/[^A-Z0-9]/g, ''))));
  const firstIndex = headerIndex >= 0 ? headerIndex : lines.findIndex(line => line.includes('|'));
  if (firstIndex < 0) return null;
  const hasHeader = headerIndex >= 0;
  const rawRows = lines.slice(firstIndex + (hasHeader ? 1 : 0)).filter(line => line.includes('|')).map(split);
  const headers = hasHeader ? split(lines[firstIndex]) : [];
  // Ignore optional trailing separators, but preserve every nonempty returned value.
  while (headers.length && !headers[headers.length - 1]) headers.pop();
  for (const row of rawRows) while (row.length && !row[row.length - 1]) row.pop();
  const width = rawRows.reduce((width, row) => Math.max(width, row.length), headers.length);
  for (let index = 0; index < width; index++) if (!headers[index]) headers[index] = 'Field ' + (index + 1);
  const rows = rawRows.map(row => Array.from({ length: width }, (_, index) => row[index] || ''));
  return { headers, rows };
}

export default function NSEMasterPreview({ fileType, onRecord, onTrack }: { fileType: NSEMasterFileType; onRecord?: (order: NSEDemoOrder) => void; onTrack?: (type: 'SIP' | 'STP' | 'SWP') => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState('default');
  const [selected, setSelected] = useState<NSEPlanScheme | null>(null);
  useEffect(() => {
    let cancelled = false;
    setFilters({}); setSort('default'); setLoading(true); setError(''); setText(''); setPage(1); setSearch(''); setSelected(null);
    nseApi.downloadMaster({ file_type: fileType }).then(result => {
      if (!cancelled) {
        if (!result.trim()) setError('Mutual funds returned an empty file for this master.');
        else setText(result);
      }
    }).catch(failure => {
      if (!cancelled) setError(failure instanceof Error ? failure.message : 'Unable to fetch this Mutual funds master');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fileType, retry]);
  const table = useMemo(() => parseNSEMasterTable(text), [text]);
  const filterFields = useMemo(() => table ? table.headers.map((header, index) => ({ header, index, values: [...new Set(table.rows.map(row => row[index]).filter(Boolean))].sort() })).filter(item => /^(AMCNAME|AMCCODE|SCHEMETYPE|CATEGORY|PLANTYPE|PLAN|SIPFREQUENCY|STPFREQUENCY|SWPFREQUENCY|FREQUENCY|SIPTRANSACTIONMODE|STPTRANSACTIONMODE|SWPTRANSACTIONMODE|TRANSACTIONMODE|PURCHASEALLOWED|SIPALLOWED|STPALLOWED|SWPALLOWED|AMCACTIVEFLAG)$/.test(normalizeHeader(item.header)) && item.values.length > 0) : [], [table]);
  const amountIndex = useMemo(() => table?.headers.findIndex(header => /MINIMUM.*(AMOUNT|INSTALLMENT)|MINIMUMSIP|MINPURCHASE|^NAV$|NETASSETVALUE/.test(normalizeHeader(header))) ?? -1, [table]);
  const rows = useMemo(() => {
    const result = table?.rows.filter(row => row.join(' ').toLowerCase().includes(search.trim().toLowerCase()) && Object.entries(filters).every(([index, value]) => !value || row[Number(index)] === value)) || [];
    if (sort !== 'default' && amountIndex >= 0) {
      const amount = (row: string[]) => row[amountIndex]?.trim() ? Number(row[amountIndex].replace(/,/g, '')) : NaN;
      result.sort((a, b) => { const x = amount(a), y = amount(b); if (!Number.isFinite(x)) return Number.isFinite(y) ? 1 : 0; if (!Number.isFinite(y)) return -1; return sort === 'high-to-low' ? y - x : x - y; });
    }
    return result;
  }, [table, search, filters, sort, amountIndex]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const titleIndex = table ? ['SCHEME NAME', 'FUND NAME', 'SCHEME CODE', 'NAV CODE', 'SETTLEMENT DATE', 'DATE', 'CODE'].map(name => table.headers.findIndex(header => normalizeHeader(header) === normalizeHeader(name))).find(index => index >= 0) ?? 0 : 0;
  const Icon = fileType === 'NAV' ? TrendingUp : fileType === 'SET' ? CalendarDays : FileText;
  const field = (row: string[], ...names: string[]) => {
    const index = table?.headers.findIndex(header => names.includes(header.toUpperCase().replace(/[^A-Z0-9]/g, ''))) ?? -1;
    return index >= 0 ? row[index] : '';
  };
  const schemeFor = (row: string[]): NSEPlanScheme => ({
    code: field(row, 'SCHEMECODE', 'SCHCODE', 'FROMSCHEMECODE'),
    name: field(row, 'SCHEMENAME', 'FUNDNAME', 'FROMSCHEMENAME') || row[titleIndex],
    amc: field(row, 'AMCCODE', 'AMCNAME'), amcCode: field(row, 'AMCCODE'),
  });
  const planSchemes = Array.from(new Map((table?.rows || []).map(row => schemeFor(row)).filter(scheme => scheme.code).map(scheme => [scheme.code, scheme])).values());
  const track = (type: 'SIP' | 'STP' | 'SWP') => { setSelected(null); onTrack?.(type); };
  return <section aria-label={`${fileType} master data`} className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><NSEHeading as="h2" className="text-xl font-bold text-slate-900">{NSE_MASTER_FILE_TYPES[fileType]}</NSEHeading><p className="mt-1 text-sm text-gray-500">Browse Mutual funds records and compare plan options. Expand a card for the complete details.</p></div>
      <NSEButton disabled={loading} onClick={() => setRetry(value => value + 1)} className="rounded-lg border border-[#102B78] px-4 py-2 text-sm font-semibold text-[#102B78] disabled:opacity-50">Refresh {fileType}</NSEButton>
    </div>
    {loading && <p role="status" className="rounded-xl bg-white p-5 text-sm text-[#102B78]">Loading {fileType} master…</p>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>{error}</p><NSEButton className="mt-3 underline" onClick={() => setRetry(value => value + 1)}>Retry {fileType}</NSEButton></div>}
    {!loading && !error && table && <>
      <section aria-label={fileType + ' catalog filters'} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3"><NSEHeading as="h3" className="text-sm font-semibold text-slate-900">Filter this catalog</NSEHeading><NSEButton type="button" onClick={() => { setSearch(''); setFilters({}); setSort('default'); setPage(1); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#102B78] hover:bg-blue-50">Reset filters</NSEButton></div>
        <label className="block text-xs font-semibold text-slate-600">Search records<input aria-label={`Search ${fileType} master`} placeholder="Search schemes or values" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-normal" /></label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filterFields.map(item => <label key={item.index} className="text-xs font-semibold text-slate-600">{friendlyLabel(item.header)}<select aria-label={friendlyLabel(item.header)} value={filters[String(item.index)] || ''} onChange={event => { setFilters(previous => ({ ...previous, [item.index]: event.target.value })); setPage(1); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900"><option value="">All options</option>{item.values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
          {amountIndex >= 0 && <label className="text-xs font-semibold text-slate-600">Sort by {friendlyLabel(table.headers[amountIndex])}<select aria-label="Sort catalog amount" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900"><option value="default">Default order</option><option value="high-to-low">High to low</option><option value="low-to-high">Low to high</option></select></label>}
        </div>
      </section>
      <p aria-live="polite" className="text-sm text-gray-500">{rows.length.toLocaleString('en-IN')} records · Page {currentPage} of {pages}</p>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((row, rowIndex) => {
          const fields = table.headers.map((label, index) => ({ label: label || `Field ${index + 1}`, value: row[index] || '—', index })).filter(field => field.index !== titleIndex);
          const keyFields = fields.filter(item => /FREQUENCY|MINIMUM.*AMOUNT|MINIMUM.*INSTALLMENT|MINIMUMSIP|TRANSACTIONMODE/.test(normalizeHeader(item.label))).slice(0, 3);
          const renderFields = (items: typeof fields) => items.map(field => <div key={field.index} className="flex flex-col gap-1 border-b border-gray-100 py-2.5 last:border-b-0"><dt className="break-words text-[11px] font-medium text-gray-500">{friendlyLabel(field.label)}</dt><dd className="break-words text-sm font-semibold text-slate-900">{field.value}</dd></div>);
          return <article key={`${currentPage}-${rowIndex}`} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#102B78]"><Icon className="h-5 w-5" /></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#102B78]">{fileType}</span></div>
            <p className="mb-1 text-[11px] font-medium text-gray-500">{field(row, 'AMCNAME') || friendlyLabel(table.headers[titleIndex])}</p>
            <NSEHeading as="h3" className="break-words text-base font-bold leading-relaxed text-slate-900">{row[titleIndex] || `${fileType} record ${(currentPage - 1) * PAGE_SIZE + rowIndex + 1}`}</NSEHeading>
            <dl className="mt-3 rounded-xl bg-slate-50 px-3">{renderFields(keyFields)}</dl>
            {fields.length > 0 && <details className="mt-3 border-t border-gray-100 pt-3"><NSESummary className="cursor-pointer text-xs font-semibold text-[#102B78]">View all details</NSESummary><dl className="mt-2">{renderFields(fields)}</dl></details>}
            {(fileType === 'SIP' || fileType === 'STP' || fileType === 'SWP') && <div className="mt-4 border-t border-gray-100 pt-4">
              <NSEButton disabled={!schemeFor(row).code || [`${fileType}ALLOWED`, `${fileType}ENABLED`, 'AMCACTIVEFLAG'].some(name => /^(N|NO|INACTIVE)$/i.test(field(row, name)))} onClick={() => setSelected(schemeFor(row))} className="w-full rounded-lg bg-[#102B78] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1B3F96] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">{fileType === 'SIP' ? 'Start SIP' : fileType === 'STP' ? 'Start Transfer' : 'Start Withdrawal'}</NSEButton>
              <p className="mt-2 text-xs text-gray-400">{schemeFor(row).code ? fileType === 'SIP' ? 'Live Mutual funds SIP registration' : fileType === 'STP' ? 'Live Mutual funds STP registration' : 'Live Mutual funds SWP registration' : 'Scheme code required to start this plan'}</p>
            </div>}
            {(fileType === 'NAV' || fileType === 'SET') && <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">Reference data · Select SCH to buy a fund</p>}
          </article>;
        })}
      </div>
      {!rows.length && <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">No matching records.</p>}
      {pages > 1 && <nav aria-label={`${fileType} pagination`} className="flex items-center justify-between"><NSEButton disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-40">Previous records</NSEButton><NSEButton disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg bg-[#102B78] px-4 py-2 text-sm text-white disabled:opacity-40">Next records</NSEButton></nav>}
    </>}
    {!loading && !error && text && !table && <pre className="max-h-[60vh] overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-700">{text}</pre>}
    {selected && fileType === 'SIP' && <NSEInvestmentFlow fund={{ name: selected.name, schemeCode: selected.code, amc: selected.amc, amcCode: selected.amcCode, plan: /\bDIRECT\b/i.test(selected.name) ? 'Direct' : /\bREGULAR\b/i.test(selected.name) ? 'Regular' : 'See scheme master', purchaseAllowed: false, sipAllowed: true }} mode="sip" onClose={() => setSelected(null)} onRecord={order => onRecord?.(order)} onTrack={() => track('SIP')} />}
    {selected && fileType === 'STP' && <NSEStpFlow scheme={selected} targets={planSchemes.filter(scheme => !selected.amc || scheme.amc === selected.amc)} onClose={() => setSelected(null)} onRecord={order => onRecord?.(order)} onTrack={() => track('STP')} />}
    {selected && fileType === 'SWP' && <NSESwpFlow scheme={selected} onClose={() => setSelected(null)} onRecord={order => onRecord?.(order)} onTrack={() => track(fileType)} />}
  </section>;
}
