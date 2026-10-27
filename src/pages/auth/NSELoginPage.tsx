import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Landmark, LockKeyhole, Loader2, UserRound } from 'lucide-react';
import { loginToNSE } from '@/services/nseAuth';
import { NSEButton } from '@/components/nse/NSEPresentation';

export default function NSELoginPage({ showOtherOptions = true }: { showOtherOptions?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      await loginToNSE(username, password);
      setPassword('');
      navigate('/nse-dashboard', { replace: true });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to sign in. Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const field = 'mt-2 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50';
  return <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
    <section className="relative overflow-hidden bg-[#102B78] px-6 py-8 text-white sm:px-12 lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-[400px] w-[400px] rounded-full border border-white/10" />
      <div className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-2"><img src="/logo.png" alt="Lendrix" className="h-full w-full object-contain" /></span><span className="text-lg font-semibold tracking-tight">Lendrix <span className="font-normal text-blue-200">/ Mutual funds</span></span></div>
      <div className="relative mt-10 max-w-lg lg:my-20"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Mutual funds</p><h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">Your mutual funds.<br />One clear workspace.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-blue-100">Explore funds, manage regular investments, and follow your orders from submission to allotment.</p><div className="mt-8 hidden items-center gap-3 text-sm text-blue-100 lg:flex"><Landmark aria-hidden="true" className="h-5 w-5" />Dedicated access to your Mutual funds dashboard</div></div>
      <p className="relative hidden text-xs text-blue-200 lg:block">Lendrix mutual fund platform</p>
    </section>
    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-sm"><div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-white text-[#102B78] shadow-sm"><LockKeyhole aria-hidden="true" className="h-5 w-5" /></div><h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in to Mutual funds</h2><p className="mt-2 text-sm leading-6 text-slate-500">Use your Mutual funds platform username and password.</p>
        <form onSubmit={submit} aria-busy={busy} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-slate-700" htmlFor="nse-login-username">Username<span className={field}><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /><input id="nse-login-username" name="username" autoComplete="username" required disabled={busy} value={username} onChange={event => { setUsername(event.target.value); setError(''); }} placeholder="Enter your username" className="min-w-0 flex-1 bg-transparent text-sm font-normal outline-none" /></span></label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="nse-login-password">Password</label><div className={field}><LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" /><input id="nse-login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required disabled={busy} value={password} onChange={event => { setPassword(event.target.value); setError(''); }} placeholder="Enter your password" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><button type="button" disabled={busy} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="rounded p-1 text-slate-400 hover:text-[#102B78] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">{visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}</button></div>
          {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-700">{error}</p>}
          <button type="submit" disabled={busy || !username.trim() || !password} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#102B78] px-4 text-sm font-semibold text-white transition hover:bg-[#1B3F96] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50">{busy ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Signing in...</> : <>Sign in to Mutual funds<ArrowRight aria-hidden="true" className="h-4 w-4" /></>}</button>
        </form>
        <p className="mt-8 text-center text-xs leading-6 text-slate-500">Need access? Contact your platform administrator.</p>
        <NSEButton type="button" onClick={() => navigate('/investor-registration')} className="mt-3 flex h-12 w-full justify-center rounded-xl border border-[#102B78] bg-white px-4 text-sm font-semibold text-[#102B78] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Register</NSEButton>
      </div>
    </section>
  </main>;
}
