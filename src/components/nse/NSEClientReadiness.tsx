import React, { useRef, useState } from 'react';
import { NSEButton } from './NSEPresentation';
import NSEResendCommunication from './NSEResendCommunication';
import { getNSEHolderLinks } from '@/services/nseCommunicationService';
const value = (row: Record<string, unknown>, key: string) => typeof row[key] === 'string' ? (row[key] as string).trim() : '';
function reported(text: string) { return /^Y$/i.test(text) ? 'Yes' : /^N$/i.test(text) ? 'No' : text || 'Not reported'; }
export default function NSEClientReadiness({ row }: { row: Record<string, unknown> }) {
 const client = value(row, 'client_code'), pan = value(row, 'primary_holder_pan');
 const taxStatus = value(row, 'tax_status');
 const individual = pan[3]?.toUpperCase() === 'P' && taxStatus !== '13' && !/sole|non.?individual|huf|company|trust|society/i.test(taxStatus);
 const [links, setLinks] = useState<Awaited<ReturnType<typeof getNSEHolderLinks>>>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
 const lock = useRef(false);
 const load = async () => {
  if (lock.current || !client) return; lock.current = true; setBusy(true); setError(''); setLinks([]);
  try { setLinks(await getNSEHolderLinks('CL_ACT', client)); }
  catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to get holder authorization links'); }
  finally { lock.current = false; setBusy(false); }
 };
 const holders = [['first', 'primary', 'First holder'], ['second', 'second', 'Second holder'], ['third', 'third', 'Third holder']];
 return <div className="min-w-0 space-y-5 break-words text-sm leading-relaxed">
  <div className="rounded-xl border border-slate-200 p-4"><h4 className="text-sm font-semibold leading-relaxed text-[#102B78]">Client checks reported by Mutual funds</h4><p className="mt-3 text-sm leading-6 text-slate-500">Document exists means a record is present. Check the document report for processing; presence alone is not approval or transaction eligibility.</p>
   <dl className="mt-4 grid gap-4 rounded-lg bg-blue-50/60 p-4"><div><dt className="text-xs text-slate-500">Primary holder KYC</dt><dd className="text-sm font-semibold leading-relaxed">{reported(value(row, 'primary_holder_kyc_status'))}</dd></div><div><dt className="text-xs text-slate-500">Demat account</dt><dd className="text-sm font-semibold leading-relaxed">{reported(value(row, 'demat_status'))}</dd></div></dl>
   {value(row, 'primary_holder_kyc_status_remarks') && <p className="mt-2 text-xs text-slate-600">KYC remarks: {value(row, 'primary_holder_kyc_status_remarks')}</p>}
   <div className="mt-4 grid gap-4">{holders.filter(([prefix, key]) => prefix === 'first' || value(row, `${key}_holder_pan`) || value(row, `${key}_holder_name`) || ['fatca', 'aof', 'elog'].some(doc => value(row, `${prefix}_holder_${doc}_exists`))).map(([prefix, , title]) => <div key={prefix} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold">{title}</p><dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4 text-sm">{[['Consent status', `${prefix}_holder_auth_status`], ['FATCA exists', `${prefix}_holder_fatca_exists`], ['AOF exists', `${prefix}_holder_aof_exists`], ['eLOG exists', `${prefix}_holder_elog_exists`]].map(([label, key]) => <div key={key} className="min-w-0 space-y-1"><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold"><span className={/^(SUCCESS|Y)$/i.test(value(row, key)) ? "text-emerald-700" : "text-slate-700"}>{reported(value(row, key))}</span></dd></div>)}</dl></div>)}</div>
  </div>
  <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-xs font-semibold text-[#102B78]">How to complete client consent</summary><p className="mt-4 text-sm leading-6 text-slate-600">Individual non-demat investors can authenticate the UCC using the Mutual funds OTP link after FATCA submission, or use a signed AOF. All applicable holders must authenticate. Non-individual non-demat clients require signed AOF and supporting documents instead of a UCC OTP link. Check the report again after completion.</p>
   {individual && client ? <div className="mt-5 flex min-w-0 flex-col items-start gap-4"><NSEButton type="button" disabled={busy} onClick={() => void load()} className="max-w-full whitespace-normal rounded-lg bg-[#102B78] px-4 py-3 text-left text-sm leading-5 text-white">{busy ? 'Getting consent links...' : 'Get client consent links'}</NSEButton>{links.map(link => <a key={link.holder} href={link.url} target="_blank" rel="noopener noreferrer" className="block max-w-full break-words text-sm font-semibold text-[#102B78] underline">{link.holder}: open client authorization</a>)}<NSEResendCommunication key={client} productType="CL_ACT" productRefId={client} />{error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}<p className="text-xs text-slate-500">Getting or resending a link does not complete consent. The investor must authorize on Mutual funds's page.</p></div> : <p className="mt-2 text-xs text-slate-500">An individual digital-consent route could not be established from this record. Check the investor type and onboarding mode; use AOF upload where applicable.</p>}
  </details>
 </div>;
}
