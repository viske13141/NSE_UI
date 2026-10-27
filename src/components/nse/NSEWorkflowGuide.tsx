import React, { useState } from 'react';
import { NSEButton } from './NSEPresentation';
type Step = { title: string; detail: string; action?: string; button?: string };
const guides: Record<string, { title: string; detail: string; steps: Step[] }> = {
 clients: { title: 'Start here: prepare an investor to transact', detail: 'Registration, tax declaration, consent and verification are separate checks. Follow the route that matches the investor and account type.', steps: [
  { title: '1. Find or register the investor', detail: 'UCC means Unique Client Code. Check an existing client first; register only when a client record does not exist.', action: 'profiles', button: 'Find an existing client' },
  { title: '2. Complete FATCA', detail: 'FATCA records tax residency. Choose the individual or entity/HUF declaration. Entities may also need signed UBO/NPO documents.', action: 'fatca', button: 'Open FATCA registration' },
  { title: '3. Complete client consent', detail: 'Individual non-demat investors use an OTP authorization link or signed AOF. Non-individual non-demat investors need signed AOF and supporting documents.', action: 'authorization', button: 'Check consent and documents' },
  { title: '4. Check verification', detail: 'Check KYC and an active registered bank. Demat transactions also need the applicable account checks. A recorded KYC type is not a live verification result.', action: 'kyc', button: 'Check KYC status' },
 ] },
 explore: { title: 'Choose a fund, then prepare the transaction', detail: 'Use the selected scheme and the actual investor account details. Scheme eligibility and minimum amounts can differ.', steps: [
  { title: '1. Check the investor', detail: 'Complete the applicable onboarding checks before starting a real transaction.', action: 'authorization', button: 'Open client checks' },
  { title: '2. Choose the transaction', detail: 'Buy adds an investment. SIP/XSIP invests on a schedule. STP transfers between funds; SWP withdraws on a schedule.' },
  { title: '3. Review and confirm', detail: 'Confirming submits a request. Investor authorization, payment and unit allotment can still be pending.', action: 'lifecycle', button: 'Track an existing request' },
 ] },
 sips: { title: 'Understand your systematic plan', detail: 'Use the registration report for existing plans. Installment and cancellation reports describe different events.', steps: [
  { title: 'SIP or XSIP?', detail: 'SIP schedules investments; XSIP collection uses a bank mandate. XSIP needs an approved mandate.', action: 'mandates', button: 'Check bank mandates' },
  { title: 'STP or SWP?', detail: 'STP transfers from one fund to another. SWP redeems investments on a schedule. Both depend on existing investments.' },
  { title: 'After registration', detail: 'Complete the investor authorization requested by Mutual funds, then refresh the relevant plan report. Registration alone does not confirm an installment was paid.' },
 ] },
 mandates: { title: 'A mandate authorizes bank debits', detail: 'A mandate is separate from a mutual fund order. Its debit limit is not a payment or an investment.', steps: [
  { title: '1. Look up before registering', detail: 'Search existing mandates by client code. Reuse an eligible approved mandate instead of registering a duplicate.' },
  { title: '2. Complete authorization', detail: 'For an e-mandate, use Get authorization link and complete the available bank/Aadhaar steps. A physical mandate needs a signed scan.' },
  { title: '3. Confirm approval', detail: 'Under processing means approval is pending. A UMRN or registration ID alone does not establish approval. Refresh the mandate report before using it for XSIP.' },
 ] },
 transactions: { title: 'Follow a request from submission to completion', detail: 'Choose the client and date filters to retrieve Mutual funds records. Different products have different processing stages.', steps: [
  { title: '1. Registration or order', detail: 'Check the reference, status and remarks. A received request may still require investor action.' },
  { title: '2. Authorization and payment', detail: 'Complete any requested investor authorization. For purchases, check payment separately from order acceptance.' },
  { title: '3. Final outcome', detail: 'Confirm purchased units in allotment statements, redemption money in payout reports, or mandate approval in mandate reports.', action: 'allotment', button: 'Check allotment statements' },
 ] },
 reports: { title: 'Choose a report for the question you need to answer', detail: 'Use client reports for onboarding, lifecycle for processing steps, and allotment or payout reports for final results.', steps: [
  { title: 'Investor readiness', detail: 'Client Authorization shows holder consent, document flags and bank checks. FATCA, AOF and eLOG reports show their separate processing results.', action: 'authorization', button: 'Open client checks' },
  { title: 'Where is the request?', detail: 'Order lifecycle shows the stages Mutual funds returned, including authorization, payment and mandate details when applicable.', action: 'lifecycle', button: 'Open lifecycle report' },
  { title: 'Were units allotted?', detail: 'Payment success does not establish unit allotment. Use allotment statements for the reported units and NAV.', action: 'allotment', button: 'Open allotment statements' },
 ] },
 orders: { title: 'Requests created during this visit', detail: 'Session entries are a convenient receipt. Fetch live reports to see the current Mutual funds status or requests from earlier visits.', steps: [
  { title: 'Check current processing', detail: 'A submitted order may be accepted, rejected or awaiting confirmation. Read Mutual funds remarks before trying again.', action: 'lifecycle', button: 'Check live lifecycle' },
  { title: 'Complete investor steps', detail: 'Use the authorization and payment links for the existing request when available. Avoid creating another order just because processing is pending.' },
  { title: 'Confirm final units', detail: 'A payment receipt is separate from allotment. Check the allotment statement for confirmed units.', action: 'allotment', button: 'Check allotments' },
 ] },
 investments: { title: 'Confirm what was allotted', detail: 'Allotment statements report units and transaction values. They are separate from a current market valuation.', steps: [
  { title: 'Find the transaction', detail: 'Search using the client and supported order/date filters.' },
  { title: 'Check units and NAV', detail: 'Read the units, NAV, folio and reported amount for the matching order.' },
  { title: 'If allotment is missing', detail: 'Inspect order acceptance, authorization and payment in the lifecycle report. Missing data alone does not establish rejection.', action: 'lifecycle', button: 'Check order processing' },
 ] },
 admin: { title: 'Manage access and account settings', detail: 'Use the available account tools for the connected Mutual funds member. Features marked unavailable cannot be used here.', steps: [
  { title: 'API credentials', detail: 'Use this only when an authorized member needs to manage the API secret.', action: 'secret', button: 'Open credential settings' },
  { title: 'Users and permissions', detail: 'User Master and Rights Management remain unavailable in this portal. Use the supported Mutual funds member facilities.' },
 ] },
};
const glossary = [
 ['UCC', 'Unique Client Code: the investor account identifier assigned by the member.'],
 ['KYC', 'Identity verification. The recorded method and the current verified status are different.'],
 ['FATCA', 'Tax-residency declaration; entity declarations can include beneficial-owner information.'],
 ['AOF', 'Account Opening Form signed by the investor, with applicable supporting documents.'],
 ['eLOG', 'Record of investor consent. Normal digital onboarding captures it after OTP authorization.'],
 ['UBO / SMO', 'Ultimate Beneficial Owner / Senior Managing Official: people owning or controlling an entity.'],
 ['NPO', 'Non-profit organisation; the applicable declaration can require DARPAN registration details.'],
 ['EUIN', 'AMFI identifier of the distributor salesperson or relationship manager; obtain it from the distributor.'],
 ['UMRN', 'Bank mandate reference. The mandate status must still confirm approval.'],
 ['Folio', 'The investor account number with the AMC/RTA. Use an actual existing folio when required.'],
 ['RTA / AMC', 'Registrar and Transfer Agent / Asset Management Company. Their scheme and AMC codes are different.'],
 ['Not reported', 'Mutual funds did not return a value. This does not by itself mean failed, incomplete or not applicable.'],
];
export default function NSEWorkflowGuide({ section, onAction }: { section: string; onAction: (action: string) => void }) {
 const guide = guides[section] || guides.clients;
 const [query, setQuery] = useState('');
 return <section aria-label="Page guidance" className="space-y-4 rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
  <div><h2 className="text-base font-bold text-[#102B78]">{guide.title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">{guide.detail}</p></div>
  <ol className={`grid gap-3 md:grid-cols-2 ${guide.steps.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>{guide.steps.map(step => <li key={step.title} className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold text-slate-900">{step.title}</h3><p className="mt-2 text-xs leading-relaxed text-slate-600">{step.detail}</p>{step.action && <NSEButton type="button" onClick={() => onAction(step.action!)} className="mt-3 text-xs font-semibold text-[#102B78] underline">{step.button}</NSEButton>}</li>)}</ol>
  <details className="border-t border-slate-100 pt-3"><summary className="cursor-pointer text-sm font-semibold text-[#102B78]">What do these terms mean?</summary><label className="mt-3 block text-xs text-slate-600">Find a term<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search KYC, EUIN, mandate..." className="mt-1 w-full rounded-lg border p-2 text-sm" /></label><dl className="mt-3 grid gap-3 sm:grid-cols-2">{glossary.filter(item => item.join(' ').toLowerCase().includes(query.toLowerCase())).map(([term, meaning]) => <div key={term}><dt className="text-xs font-semibold text-slate-900">{term}</dt><dd className="mt-1 text-xs leading-relaxed text-slate-600">{meaning}</dd></div>)}</dl>{!glossary.some(item => item.join(' ').toLowerCase().includes(query.toLowerCase())) && <p className="mt-3 text-xs text-slate-500">No matching term. Try a shorter search.</p>}</details>
 </section>;
}
