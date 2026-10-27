import NSESearchFields from './NSESearchFields';
import { NSEButton, NSEHeading } from '@/components/nse/NSEPresentation';
﻿import React, { useRef, useState } from 'react';
import { getNSERedemptions, NSE_REDEMPTION_FILTERS, type NSERedemptionRow } from '@/services/nseRedemptionService';
import { indiaReportDates } from '@/services/nseOrderReportService';
import type { RedemptionStatementRequest } from '@/types/nse';
const apiDate = (value: string) => value.split('-').reverse().join('-');
const money = (value: number | null) => value == null ? 'Not reported' : value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
export default function NSERedemptionStatements() {
  const [today] = useState(() => indiaReportDates().to);
  const [from, setFrom] = useState(() => new Date(Date.parse(`${today}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [filters, setFilters] = useState<RedemptionStatementRequest>({ from_date: '', to_date: '', order_type: 'ALL', sub_order_type: 'ALL', transaction_type: '', order_status: '', settlement_type: '', client_code: '', order_ids: '', member_unique_ids: '' });
  const [rows, setRows] = useState<NSERedemptionRow[]>([]); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const [searched, setSearched] = useState(false); const [page, setPage] = useState(1);
  const lock = useRef(false);
  const reset = () => { setRows([]); setSearched(false); setError(''); setPage(1); };
  const change = (key: keyof RedemptionStatementRequest, value: string) => { setFilters(previous => ({ ...previous, [key]: value })); reset(); };
  const load = async (event: React.FormEvent) => {
    event.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); reset();
    try { const result = await getNSERedemptions({ ...filters, from_date: apiDate(from), to_date: apiDate(to) }); setRows(result); setSearched(true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to fetch Mutual funds redemptions'); }
    finally { lock.current = false; setBusy(false); }
  };
  const confirmed = rows.filter(row => row.confirmed);
  const pages = Math.max(1, Math.ceil(rows.length / 24));
  const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal';
  return <section aria-label="Mutual funds redemption statements" className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
    <div><NSEHeading as="h2" className="text-xl font-bold text-slate-900">Investments · Redemption statement</NSEHeading><p className="mt-1 text-sm text-gray-500">View units, NAV, redemption amounts and charges reported by Mutual funds. Statement validity does not confirm bank payout.</p></div>
    <form onSubmit={load} className="space-y-3"><NSESearchFields disabled={busy}>
      <label className="text-sm font-semibold">From date<input required type="date" value={from} onChange={event => { setFrom(event.target.value); reset(); }} className={input} /></label>
      <label className="text-sm font-semibold">To date<input required type="date" value={to} onChange={event => { setTo(event.target.value); reset(); }} className={input} /></label>
      {Object.entries(NSE_REDEMPTION_FILTERS).map(([key, options]) => <label key={key} className="text-sm font-semibold">{{ order_type: 'Order type', sub_order_type: 'Sub order type', transaction_type: 'Transaction type', order_status: 'Order validity', settlement_type: 'Settlement filter', date_type: 'Date basis' }[key]}<select value={filters[key as keyof RedemptionStatementRequest] || ''} onChange={event => change(key as keyof RedemptionStatementRequest, event.target.value)} className={input}>{options.map(value => <option key={value} value={value}>{value === 'ORD_DATE' ? 'Order date' : value === 'ALT_DATE' ? 'Redemption date' : value || 'All'}</option>)}</select></label>)}
      <label className="text-sm font-semibold">Client code (optional)<input maxLength={20} value={filters.client_code || ''} onChange={event => change('client_code', event.target.value)} className={input} /></label>
      <label className="text-sm font-semibold">Order IDs (optional)<input value={filters.order_ids || ''} onChange={event => change('order_ids', event.target.value)} placeholder="Up to 50 numeric IDs, comma-separated" className={input} /></label>
      <label className="text-sm font-semibold">Member references (optional)<input value={filters.member_unique_ids || ''} onChange={event => change('member_unique_ids', event.target.value)} className={input} /></label>
    </NSESearchFields><p className="text-xs text-gray-500">Maximum date gap: 30 days. Order IDs take priority; member references take priority when order IDs are blank.</p><NSEButton disabled={busy} type="submit" className="rounded-lg bg-[#102B78] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Loading redemptions…' : 'Refresh redemptions'}</NSEButton></form>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {!searched && !busy && !error && <div className="rounded-xl bg-gray-50 p-6 text-center"><NSEHeading as="h3" className="text-sm font-semibold text-slate-900">No redemption statement loaded</NSEHeading><p className="mt-2 text-sm text-gray-500">Load a redemption statement to view the exchange’s confirmed units.</p></div>}
    {searched && <>
      <div role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-[#102B78]"><strong>{confirmed.length} valid, complete statement records</strong><p className="mt-1">Reported redemption amount: {money(confirmed.reduce((total, row) => total + (row.allottedAmount || 0), 0))}</p><p className="mt-1 text-xs">Selected statement only. Invalid or incomplete rows are excluded from this total.</p></div>
      {!rows.length && <p className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">No redemptions found for these filters.</p>}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.slice((page - 1) * 24, page * 24).map(row => <article key={row.key} className="rounded-xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><NSEHeading as="h3" className="text-sm font-bold leading-relaxed text-slate-900">{row.schemeName}</NSEHeading><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${row.confirmed ? 'bg-blue-50 text-[#102B78]' : 'bg-gray-100 text-gray-600'}`}>{row.confirmed ? 'Valid statement' : row.valid ? 'Incomplete' : 'Not valid'}</span></div><dl className="mt-4 space-y-3 text-xs">{[['Mutual funds order ID', row.orderId], ['Investor', row.clientName ? `${row.clientName} / ${row.clientCode}` : row.clientCode], ['Scheme code', row.schemeCode], ['Folio', row.folio || 'Not reported'], ['Reported redemption units', row.units == null ? 'Not reported' : row.units.toLocaleString('en-IN', { maximumFractionDigits: 6 })], ['Reported NAV', money(row.nav)], ['Reported redemption amount', money(row.allottedAmount)], ['Original order amount', money(row.orderAmount)], ['Requested units', row.requestedUnits == null ? 'Not reported' : String(row.requestedUnits)], ['Load amount', money(row.load)], ['Tax amount', money(row.tax)], ['STT', money(row.stt)], ['Order date', row.orderDate || 'Not reported'], ['Statement date', row.reportDate || 'Not reported']].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-gray-500">{label}</dt><dd className="break-all text-right font-semibold text-slate-900">{value}</dd></div>)}</dl>{row.remark && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{row.remark}</p>}</article>)}</div>
      {pages > 1 && <nav aria-label="Redemption pages" className="flex justify-between"><NSEButton disabled={page === 1} onClick={() => setPage(page - 1)} className="text-sm text-[#102B78] disabled:opacity-40">Previous redemptions</NSEButton><span className="text-sm text-gray-500">{page} / {pages}</span><NSEButton disabled={page === pages} onClick={() => setPage(page + 1)} className="text-sm text-[#102B78] disabled:opacity-40">Next redemptions</NSEButton></nav>}
    </>}
  </section>;
}
