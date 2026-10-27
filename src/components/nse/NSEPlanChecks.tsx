import React from 'react';
export default function NSEPlanChecks({ product, mandateId, reviewed = false }: { product: 'SIP' | 'XSIP'; mandateId: string; reviewed?: boolean }) {
  return <aside aria-label="Registration checks" className="space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-slate-700">
    <p className="font-semibold text-[#102B78]">{reviewed ? 'Form checks passed' : 'Checks before registration'}</p>
    <p>Investor KYC, active bank, depository mode, dates, amount format, installment count, folio length and EUIN fields are checked before review.</p>
    <p>{mandateId ? 'The mandate must belong to this investor, be approved and cover the installment amount. Its report is checked again before submission.' : product === 'SIP' ? 'Select an approved mandate for this client before reviewing the SIP. If no mandate exists, register one and complete investor authorization. Mandate mapping is required before relying on scheduled collections.' : 'Select an approved mandate with enough debit limit before reviewing XSIP.'}</p>
    <p>Mutual funds checks the scheme minimum notice period, permitted start days, frequency, amount limits, increments and installment limits. A future date alone does not guarantee acceptance; use the earliest date returned by Mutual funds if registration is rejected.</p>
    <p>Step-up is disabled in this form.{product === 'SIP' ? ' Goal-based SIP is not configured here.' : ''} First order today generates an order; it does not confirm payment.</p>
  </aside>;
}
