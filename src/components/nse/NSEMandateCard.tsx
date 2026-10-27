import { NSEHeading, NSESummary } from '@/components/nse/NSEPresentation';
﻿import React from 'react';
import { Landmark } from 'lucide-react';
import NSEMandateAuthorization from './NSEMandateAuthorization';
import NSEMandateImageUpload from './NSEMandateImageUpload';
const normalize = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
export default function NSEMandateCard({ row }: { row: Record<string, unknown> }) {
  const used = new Set<string>();
  const pick = (...names: string[]) => {
    const entry = Object.entries(row).find(([key, value]) => names.includes(normalize(key)) && value != null && String(value).trim() !== '');
    if (!entry) return '';
    used.add(entry[0]);
    return String(entry[1]).trim();
  };
  const id = pick('mandateid', 'regid', 'registrationid');
  const approval = pick('mandatestatus', 'approvalstatus', 'umrnstatus', 'status');
  const registration = pick('regstatus', 'registrationstatus');
  const status = approval || 'Approval not confirmed';
  const awaitingApproval = /^(UNDER[ _]PROCESSING|PENDING|PROCESSING|REGISTERED)$/i.test(approval);
  const statusLabel = ({ PENDING: 'Pending', APPROVED: 'Approved', ACTIVE: 'Active', FAILED: 'Failed', REJECTED: 'Rejected', CANCELLED: 'Cancelled', CANCELED: 'Cancelled', EXPIRED: 'Expired', INVALID: 'Invalid' } as Record<string, string>)[status.toUpperCase()] || status.replace(/_/g, ' ');
  const bank = pick('bankname', 'bank');
  const account = pick('accountno', 'bankaccountno', 'accountnumber', 'bankaccno', 'bankaccountnumber');
  const client = pick('clientcode');
  const name = pick('clientname', 'investorname', 'firstapplicantname');
  const start = pick('startdate'), end = pick('enddate');
  const umrn = pick('umrnno', 'umrn');
  const approvedDate = pick('approveddate');
  const ifsc = pick('ifsccode', 'ifsc');
  const collection = pick('mandatecollectiontype');
  const type = pick('mandatetype');
  const amount = pick('amount', 'mandateamount', 'maximumdebitamount', 'maxdebitamount');
  const remark = pick('regremark', 'remark', 'remarks', 'mandateremark');
  const numericAmount = amount ? Number(amount) : NaN;
  const formattedAmount = Number.isFinite(numericAmount) ? numericAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : 'Not reported';
  const failed = /^(FAILED|REJECTED|CANCELLED|CANCELED|INVALID|EXPIRED)$/i.test(approval);
  const mask = (key: string, value: unknown) => {
    const text = value == null || String(value).trim() === '' ? 'Not reported' : String(value).trim();
    return text !== 'Not reported' && /account(no|number)|bankacc(no|number)|^acno$|pan$/.test(normalize(key)) ? `•••• ${text.slice(-4)}` : text;
  };
  const details = [
    ['Investor', name], ['Client code', client], ['Valid from', start], ['Valid until', end],
    ['Bank mandate reference (UMRN)', umrn], ['Approval date', approvedDate], ['IFSC', ifsc],
    ['Collection method', collection], ['Mandate type', type], ['Mutual funds status', approval], ['Registration status', registration],
  ].filter(([, value]) => value);
  const extra = Object.entries(row).filter(([key, value]) => !used.has(key) && value != null && ['string', 'number', 'boolean'].includes(typeof value) && String(value).trim());
  return <article className="w-full min-w-0 max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-start gap-3 p-4 pb-3"><div className="rounded-lg bg-blue-50 p-2 text-[#102B78]"><Landmark aria-hidden="true" className="h-4 w-4" /></div><div className="min-w-0 flex-1"><NSEHeading as="h4" className="break-words text-sm font-semibold text-[#102B78]">{id ? 'Mandate ' + id : 'Bank mandate'}</NSEHeading></div></div>
    <div className="space-y-3 px-4 pb-4">
      <span className={'inline-block rounded-full px-2.5 py-1 text-xs font-semibold ' + (failed ? 'bg-rose-50 text-rose-700' : awaitingApproval ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-[#102B78]')}>{awaitingApproval ? 'Waiting for bank approval' : statusLabel}</span>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="text-xs text-slate-500">Automatic-payment limit</span><strong className="text-base text-[#102B78]">{formattedAmount}</strong></div>
      <div className="space-y-1 text-xs leading-5"><p className="break-words text-slate-600">{bank || 'Bank name not reported'}</p>{account && <p className="text-slate-500">{mask('account_no', account)}</p>}</div>
      {remark && <p className="rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-600">{remark}</p>}
      {type === 'X' && client && /^[0-9]{1,15}$/.test(id) && /[1-9]/.test(id) && registration !== 'REG_FAILED' && !failed && !/^(APPROVED|ACTIVE)$/i.test(approval) && <NSEMandateImageUpload key={`${client}-${id}`} clientCode={client} mandateId={id} />}
      {/^[0-9]{1,15}$/.test(id) && /[1-9]/.test(id) && registration !== 'REG_FAILED' && !failed && !/^(APPROVED|ACTIVE)$/i.test(approval) && <NSEMandateAuthorization mandateId={id} />}


      {(details.length > 0 || extra.length > 0) && <details className="border-t border-slate-100 pt-3">
        <NSESummary className="cursor-pointer text-xs font-semibold text-[#102B78]">More details</NSESummary>
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">{details.map(([title, value]) => <div key={title} className="min-w-0"><dt className="text-slate-500">{title}</dt><dd className="mt-1 break-words font-medium text-slate-800">{value}</dd></div>)}</dl>
        {extra.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><p className="mb-3 text-xs font-semibold text-slate-600">Additional information</p><dl className="grid gap-3 text-xs sm:grid-cols-2">{extra.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-slate-500">{key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')}</dt><dd className="mt-1 break-words font-medium text-slate-800">{mask(key, value)}</dd></div>)}</dl></div>}
      </details>}
    </div>
  </article>;
}
