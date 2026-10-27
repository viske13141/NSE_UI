import { NSEButton } from '@/components/nse/NSEPresentation';
﻿import React, { useEffect, useRef, useState } from 'react';
import { getNSEInvestors, type NSEInvestor, type NSEInvestorSelection } from '@/services/nseInvestorService';
import { checkNSEClientKyc, type NSEKycResult } from '@/services/nseKycService';
export default function NSEInvestorSelector({ onChange, requireKyc = true }: { onChange: (selection: NSEInvestorSelection | null) => void; requireKyc?: boolean }) {
  const [code, setCode] = useState(''); const [pan, setPan] = useState('');
  const [clients, setClients] = useState<NSEInvestor[]>([]); const [clientCode, setClientCode] = useState('');
  const [bankId, setBankId] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [kyc, setKyc] = useState<{ clientCode: string; result: NSEKycResult } | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState('');
  const [kycVersion, setKycVersion] = useState(0);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  const load = async () => {
    if (loading) return;
    onChange(null); setClients([]); setClientCode(''); setBankId(''); setError(''); setSearched(false);
    if (!code.trim() && !pan.trim()) { setError('Enter an Mutual funds client code or PAN to find investors.'); return; }
    if (pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase())) { setError('Enter a valid PAN.'); return; }
    const current = ++request.current; setLoading(true);
    try {
      const data = await getNSEInvestors({ ...(code.trim() ? { client_code: code.trim() } : {}), ...(pan.trim() ? { pan: pan.trim().toUpperCase() } : {}) });
      if (current !== request.current) return;
      setClients(data); setSearched(true);
      const client = data[0]; const bank = client?.banks.find(item => item.active);
      setClientCode(client?.clientCode || ''); setBankId(bank?.id || '');
    } catch (failure) { if (current === request.current) setError(failure instanceof Error ? failure.message : 'Unable to load Mutual funds investors'); }
    finally { if (current === request.current) setLoading(false); }
  };
  const client = clients.find(item => item.clientCode === clientCode);
  useEffect(() => {
    let cancelled = false;
    changeRef.current(null); setKyc(null); setKycError(''); setKycLoading(!!client && requireKyc);
    if (client && requireKyc) checkNSEClientKyc(client.clientCode, client.pan).then(result => {
      if (!cancelled) setKyc({ clientCode: client.clientCode, result });
    }).catch(failure => {
      if (!cancelled) setKycError(failure instanceof Error ? failure.message : 'Unable to verify Mutual funds KYC');
    }).finally(() => { if (!cancelled) setKycLoading(false); });
    return () => { cancelled = true; };
  }, [client, kycVersion, requireKyc]);
  useEffect(() => {
    const bank = client?.banks.find(item => item.id === bankId);
    const verified = !!client && kyc?.clientCode === client.clientCode && kyc.result.verified;
    changeRef.current(client && bank?.active && (verified || !requireKyc) ? { clientCode: client.clientCode, name: client.name, pan: client.pan, mobile: client.mobile, email: client.email, memberCode: client.memberCode, clientType: client.clientType, depository: client.depository, kycType: client.kycType, kycVerified: !!verified, bank } : null);
  }, [client, bankId, kyc, requireKyc]);
  const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-normal';
  return <div className="space-y-3 rounded-xl border border-gray-200 p-4">
    <p className="text-sm font-semibold text-slate-900">Mutual funds investor and bank</p>{requireKyc && <p className="text-xs text-gray-500">Enter your client code or PAN, then find your investor record. Choose an active bank account.</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Client code<input className={input} value={code} disabled={loading} onChange={event => { setCode(event.target.value); onChange(null); setClients([]); setSearched(false); }} placeholder="Enter client code" /></label><label className="text-sm font-medium">PAN (optional)<input className={input} value={pan} disabled={loading} maxLength={10} onChange={event => { setPan(event.target.value.toUpperCase()); onChange(null); setClients([]); setSearched(false); }} placeholder="Enter PAN" /></label></div>
    <NSEButton type="button" disabled={loading} onClick={load} className="w-full rounded-lg bg-[#102B78] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Loading investors…' : 'Find Mutual funds investors'}</NSEButton>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {searched && !clients.length && <p role="status" className="text-sm text-gray-500">No Mutual funds investors match this search.</p>}
    {!!clients.length && <>
      <label className="block text-sm font-medium">Investor<select className={input} value={clientCode} onChange={event => { onChange(null); const next = clients.find(item => item.clientCode === event.target.value); const bank = next?.banks.find(item => item.active); setClientCode(event.target.value); setBankId(bank?.id || ''); }}>{clients.map(item => <option key={item.clientCode} value={item.clientCode}>{item.name} · {item.clientCode}</option>)}</select></label>
      <label className="block text-sm font-medium">Bank account<select className={input} value={bankId} onChange={event => { onChange(null); setBankId(event.target.value); }}><option value="">Select an active bank</option>{client?.banks.map(bank => <option key={bank.id} value={bank.id} disabled={!bank.active}>{bank.label} · {bank.status}{bank.isDefault ? ' · Default' : ''}</option>)}</select></label>
      <p className="text-xs text-gray-500">KYC reported by Client Master: <strong>{client?.kycType}</strong>. {requireKyc ? 'This is the recorded KYC method, not the current verified status. Read the live result below.' : 'This step selects the investor and active bank; investment eligibility is checked separately.'}</p>
      {requireKyc && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-[#102B78]">
        {kycLoading && <p role="status">Checking Mutual funds KYC…</p>}
        {kycError && <p role="alert">{kycError}</p>}
        {!kycLoading && kyc?.clientCode === clientCode && <p role="status">{kyc.result.message}</p>}
        <NSEButton type="button" disabled={kycLoading} onClick={() => { onChange(null); setKyc(null); setKycVersion(value => value + 1); }} className="mt-2 text-xs font-semibold underline disabled:opacity-50">Recheck KYC</NSEButton>
      </div>}
      {!client?.banks.some(bank => bank.active) && <p role="alert" className="text-sm text-rose-700">No active bank account is available for this investor.</p>}
    </>}
  </div>;
}
