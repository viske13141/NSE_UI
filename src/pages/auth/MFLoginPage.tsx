import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, Shield, BarChart2, TrendingUp, CheckCircle, ShoppingCart } from 'lucide-react';
import { fetchInvestwellToken, storeToken, storeAggregatorCredentials } from '@/services/investwellAuthService';
import { loginToBSE } from '@/services/bseAuth';

import { useToast } from '@/hooks/use-toast';

type Tab = 'signin' | 'bse' | 'register';

const STORAGE_KEY = 'mf_registered_users';

function getRegisteredUsers(): { username: string; password: string }[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveRegisteredUser(u: { username: string; password: string }) {
  const users = getRegisteredUsers();
  users.push(u);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

const MFLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('signin');

  // ── Investwell Sign In ────────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setSigningIn(true);
    try {
      const res = await fetchInvestwellToken({ authName: username, password });
      if (res.status === 0 && res.result?.token) {
        storeToken(res.result.token);
        storeAggregatorCredentials(username, password);
        navigate('/dashboard/mf/portfolio');
      } else {
        toast({ title: 'Login Failed', description: res.message || 'Invalid credentials.', variant: 'destructive' });
        setSignInError(res.message || 'Login Failed');
      }
    } catch {
      const msg = 'Unable to connect to Investwell Server.\nPlease try again.';
      toast({ title: 'Connection Error', description: msg, variant: 'destructive' });
      setSignInError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  // ── BSE StAR MF Login ─────────────────────────────────────────────────────
  const [bseUsername, setBseUsername] = useState('');
  const [bsePassword, setBsePassword] = useState('');
  const [showBsePassword, setShowBsePassword] = useState(false);
  const [bseConnected, setBseConnected] = useState(false);
  const [bseConnecting, setBseConnecting] = useState(false);
  const [bseError, setBseError] = useState('');

  const handleBseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBseError('');
    if (!bseUsername.trim()) { setBseError('Member username is required'); return; }
    if (!bsePassword.trim()) { setBseError('Password is required'); return; }
    setBseConnecting(true);
    try {
      await loginToBSE(bseUsername, bsePassword);
      setBseConnected(true);
      toast({ title: 'BSE StAR MF Connected', description: 'Successfully connected to BSE StAR MF.' });
      setTimeout(() => navigate('/bse-dashboard'), 800);
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'BSE connection failed';
      setBseError(msg);
      toast({ title: 'BSE Connection Failed', description: msg, variant: 'destructive' });
    } finally {
      setBseConnecting(false);
    }
  };

  // ── NSE Login ──────────────────────────────────────────────────────────────
  const [reg, setReg] = useState({
    fullName: '', email: '', mobile: '', pan: '', username: '',
    dob: '', address: '', city: '', state: '', pin: '',
    password: '', confirmPassword: '', agreed: false,
  });
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [registering, setRegistering] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateReg = () => {
    const e: Record<string, string> = {};
    if (!reg.fullName.trim()) e.fullName = 'Full Name is required';
    if (!reg.pan.trim()) e.pan = 'PAN is required';
    if (!reg.username.trim()) e.username = 'Username is required';
    if (!reg.password) e.password = 'Password is required';
    if (!reg.confirmPassword) e.confirmPassword = 'Please confirm your password';
    if (reg.password && reg.confirmPassword && reg.password !== reg.confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    if (!reg.agreed) e.agreed = 'You must agree to the Terms of Service';
    setRegErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReg()) return;
    setRegistering(true);
    setTimeout(() => {
      saveRegisteredUser({ username: reg.username, password: reg.password });
      setRegistering(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setTab('signin');
        setUsername(reg.username);
        setPassword('');
        setReg({ fullName: '', email: '', mobile: '', pan: '', username: '', dob: '', address: '', city: '', state: '', pin: '', password: '', confirmPassword: '', agreed: false });
      }, 2000);
    }, 4500);
  };

  const inputCls = (err?: string) =>
    `flex items-center border ${err ? 'border-red-400' : 'border-gray-300'} rounded-lg bg-white px-3 py-2.5 gap-2`;

  return (
    <div className="min-h-screen flex">
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full mx-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Account Created Successfully!</h3>
            <p className="text-sm text-gray-500 text-center">Redirecting you to Sign In...</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {registering && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1E3A6D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-700">Creating your account...</p>
          </div>
        </div>
      )}

      {/* Left Panel */}
      <div className="flex-1 flex flex-col justify-center px-10 py-8 bg-[#f4f6f9]">
        {/* <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-8 flex items-center gap-1">
          ← Back to Dashboard
        </Link>
         */}

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#1E3A6D] rounded-xl flex items-center justify-center">
            <BarChart2 className="w-7 h-7 text-white" />
          </div>
          <p className="font-bold text-lg text-gray-800">{tab === 'nse' ? 'NSE Mutual Fund Portal' : tab === 'bse' ? 'BSE Mutual Fund Portal' : 'Investment Portal'}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 mb-6 max-w-sm">
          <button onClick={() => setTab('signin')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'signin' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-400'}`}>
            Sign In
          </button>
          <button onClick={() => setTab('bse')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'bse' ? 'bg-emerald-50 shadow text-emerald-800 font-semibold' : 'text-gray-400'}`}>
            BSE StAR MF
          </button>
          <button onClick={() => navigate('/nse-login')} className="flex-1 rounded-md py-2 text-sm font-medium text-[#102B78] transition-all hover:bg-blue-50">
            Mutual funds
          </button>
          <button onClick={() => setTab('register')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'register' ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-400'}`}>
            Register
          </button>
        </div>

        {/* ── Investwell Sign In ── */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 max-w-sm">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Username</label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-white px-3 py-2.5 gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <input type="text" placeholder="demoapi" value={username} onChange={e => setUsername(e.target.value)} className="flex-1 outline-none text-sm bg-transparent" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
              <div className="flex items-center border border-gray-300 rounded-lg bg-white px-3 py-2.5 gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="flex-1 outline-none text-sm bg-transparent" required />
                <button type="button" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
            </div>
            {signInError && <p className="text-xs text-red-500">{signInError}</p>}
            <button type="submit" disabled={signingIn} className="w-full bg-[#1E3A6D] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#162d56] transition-colors disabled:opacity-70">
              {signingIn ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing In...</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* ── BSE StAR MF Login ── */}
        {tab === 'bse' && (
          <div className="max-w-sm">
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">BSE StAR MF</p>
              <h2 className="mt-1 text-lg font-bold text-emerald-950">Your mutual fund hub</h2>
              <p className="mt-1 text-sm text-emerald-800">Manage fund investments, SIPs and payment mandates.</p>
            </div>
            {bseConnected ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-green-500" />
                </div>
                <p className="text-base font-semibold text-gray-800">BSE StAR MF Connected</p>
                <p className="text-sm text-gray-500 text-center">Successfully authenticated with BSE StAR MF.</p>
                <button
                  onClick={() => navigate('/bse-dashboard')}
                  className="w-full bg-[#1E3A6D] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#162d56] transition-colors"
                >
                  Open BSE Dashboard <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setBseConnected(false); setBseError(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <form onSubmit={handleBseLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Member Username</label>
                  <div className="flex items-center border border-gray-300 rounded-lg bg-white px-3 py-2.5 gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="member/XXXXX/username"
                      value={bseUsername}
                      onChange={e => setBseUsername(e.target.value)}
                      className="flex-1 outline-none text-sm bg-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
                  <div className="flex items-center border border-gray-300 rounded-lg bg-white px-3 py-2.5 gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <input
                      type={showBsePassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={bsePassword}
                      onChange={e => setBsePassword(e.target.value)}
                      className="flex-1 outline-none text-sm bg-transparent"
                      required
                    />
                    <button type="button" onClick={() => setShowBsePassword(p => !p)}>
                      {showBsePassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                {bseError && <p className="text-xs text-red-500">{bseError}</p>}
                <button
                  type="submit"
                  disabled={bseConnecting}
                  className="w-full bg-[#1E3A6D] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#162d56] transition-colors disabled:opacity-70"
                >
                  {bseConnecting
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Connecting...</>
                    : <>Connect to BSE <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── NSE Login ── */}
        {/* ── Register ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3 max-w-sm overflow-y-auto max-h-[60vh] pr-1">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
              <div className={inputCls(regErrors.fullName)}>
                <User className="w-4 h-4 text-gray-400" />
                <input placeholder="Prashant Verma" value={reg.fullName} onChange={e => setReg({...reg, fullName: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
              </div>
              {regErrors.fullName && <p className="text-xs text-red-500 mt-0.5">{regErrors.fullName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <div className={inputCls()}>
                  <input type="email" placeholder="you@example.com" value={reg.email} onChange={e => setReg({...reg, email: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Mobile</label>
                <div className={inputCls()}>
                  <input placeholder="9876543210" value={reg.mobile} onChange={e => setReg({...reg, mobile: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">PAN <span className="text-red-500">*</span></label>
                <div className={inputCls(regErrors.pan)}>
                  <input placeholder="ABCDE1234F" value={reg.pan} onChange={e => setReg({...reg, pan: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
                </div>
                {regErrors.pan && <p className="text-xs text-red-500 mt-0.5">{regErrors.pan}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Username <span className="text-red-500">*</span></label>
                <div className={inputCls(regErrors.username)}>
                  <User className="w-4 h-4 text-gray-400" />
                  <input placeholder="imahi7" value={reg.username} onChange={e => setReg({...reg, username: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
                </div>
                {regErrors.username && <p className="text-xs text-red-500 mt-0.5">{regErrors.username}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date of Birth</label>
              <div className={inputCls()}>
                <input type="date" value={reg.dob} onChange={e => setReg({...reg, dob: e.target.value})} className="flex-1 outline-none text-sm bg-transparent text-gray-400" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Address</label>
              <div className={inputCls()}>
                <input placeholder="House / Street / Area" value={reg.address} onChange={e => setReg({...reg, address: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">City</label>
                <input placeholder="Mumbai" value={reg.city} onChange={e => setReg({...reg, city: e.target.value})} className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2.5 outline-none text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
                <input placeholder="Maharashtra" value={reg.state} onChange={e => setReg({...reg, state: e.target.value})} className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2.5 outline-none text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">PIN</label>
                <input placeholder="400001" value={reg.pin} onChange={e => setReg({...reg, pin: e.target.value})} className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2.5 outline-none text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Password <span className="text-red-500">*</span></label>
                <div className={inputCls(regErrors.password)}>
                  <Lock className="w-4 h-4 text-gray-400" />
                  <input type={showRegPwd ? 'text' : 'password'} placeholder="••••••••" value={reg.password} onChange={e => setReg({...reg, password: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
                  <button type="button" onClick={() => setShowRegPwd(p => !p)}><Eye className="w-4 h-4 text-gray-400" /></button>
                </div>
                {regErrors.password && <p className="text-xs text-red-500 mt-0.5">{regErrors.password}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Confirm Password <span className="text-red-500">*</span></label>
                <div className={inputCls(regErrors.confirmPassword)}>
                  <Lock className="w-4 h-4 text-gray-400" />
                  <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={reg.confirmPassword} onChange={e => setReg({...reg, confirmPassword: e.target.value})} className="flex-1 outline-none text-sm bg-transparent" />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}><Eye className="w-4 h-4 text-gray-400" /></button>
                </div>
                {regErrors.confirmPassword && <p className="text-xs text-red-500 mt-0.5">{regErrors.confirmPassword}</p>}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={reg.agreed} onChange={e => setReg({...reg, agreed: e.target.checked})} className="rounded" />
                I agree to the <span className="text-blue-600">Terms of Service</span> and <span className="text-blue-600">Privacy Policy</span>
              </label>
              {regErrors.agreed && <p className="text-xs text-red-500 mt-0.5">{regErrors.agreed}</p>}
            </div>
            <button type="submit" className="w-full bg-[#1E3A6D] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#162d56] transition-colors">
              Create Account <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Right Panel */}
      {tab === 'nse' ? (
        <div className="hidden lg:flex flex-1 bg-[#102B78] flex-col items-center justify-center p-12 text-white">
          <div className="w-20 h-20 bg-[#4C85CF] rounded-2xl flex items-center justify-center mb-8 shadow-lg">
            <BarChart2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-center">Mutual Funds on NSE</h2>
          <p className="text-slate-300 text-center text-sm mb-10 max-w-xs">
            A separate workspace for your NSE mutual fund investments, SIPs and mandates.
          </p>
          <div className="space-y-3 w-full max-w-xs">
            {[
              { icon: TrendingUp, text: 'Explore mutual fund categories' },
              { icon: ShoppingCart, text: 'Track purchase and redemption orders' },
              { icon: BarChart2, text: 'View investments and SIPs' },
              { icon: Shield, text: 'Manage bank mandates' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/5 border border-[#4C85CF]/20 rounded-xl px-4 py-3">
                <Icon className="w-5 h-5 text-blue-200 flex-shrink-0" />
                <span className="text-sm text-slate-200">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3 w-full max-w-xs">
            {[
              { v: 'Funds', l: 'Explore' },
              { v: 'SIPs', l: 'Track plans' },
              { v: 'Orders', l: 'View status' },
            ].map(s => (
              <div key={s.l} className="bg-white/5 border border-[#4C85CF]/20 rounded-xl px-3 py-3 text-center">
                <p className="text-base font-bold text-blue-200">{s.v}</p>
                <p className="text-[10px] text-slate-300">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'bse' ? (
        <div className="hidden lg:flex flex-1 bg-[#0d1f35] flex-col items-center justify-center p-12 text-white">
          <div className="w-20 h-20 bg-[#00b386] rounded-2xl flex items-center justify-center mb-8 shadow-lg">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-center">Invest via BSE StAR MF</h2>
          <p className="text-blue-200 text-center text-sm mb-10 max-w-xs">
            Direct mutual fund investments with zero commission via BSE StAR MF platform.
          </p>
          <div className="space-y-3 w-full max-w-xs">
            {[
              { icon: TrendingUp, text: '2,500+ Direct Mutual Funds' },
              { icon: Shield,     text: 'SIP from ₹500 · 0% Commission' },
              { icon: BarChart2,  text: 'Lumpsum, SIP, Switch & Redeem' },
              { icon: TrendingUp, text: 'NACH / UPI mandate auto-debit' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-[#00b386]/15 border border-[#00b386]/30 rounded-xl px-4 py-3">
                <Icon className="w-5 h-5 text-[#00b386] flex-shrink-0" />
                <span className="text-sm text-blue-100">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3 w-full max-w-xs">
            {[
              { v: '2,500+', l: 'Funds' },
              { v: '₹500',   l: 'Min SIP' },
              { v: '0%',     l: 'Commission' },
            ].map(s => (
              <div key={s.l} className="bg-[#00b386]/15 border border-[#00b386]/20 rounded-xl px-3 py-3 text-center">
                <p className="text-base font-bold text-[#00b386]">{s.v}</p>
                <p className="text-[10px] text-blue-300">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 bg-[#1a2f5a] flex-col items-center justify-center p-12 text-white">
          <div className="w-20 h-20 bg-[#1e3a6d] rounded-2xl flex items-center justify-center mb-8 shadow-lg">
            <TrendingUp className="w-10 h-10 text-[#4db8ff]" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-center">Your Wealth, Simplified</h2>
          <p className="text-blue-200 text-center text-sm mb-10 max-w-xs">
            Track capital gains, portfolio performance, asset allocation and more — all in one place.
          </p>
          <div className="space-y-3 w-full max-w-xs">
            {[
              { icon: Shield,     text: 'Bank-grade security & encryption' },
              { icon: BarChart2,  text: 'Real-time portfolio analytics' },
              { icon: TrendingUp, text: 'LTCG / STCG tax computation' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-[#1e3a6d]/60 border border-[#2d5a9e]/40 rounded-xl px-4 py-3">
                <Icon className="w-5 h-5 text-[#4db8ff] flex-shrink-0" />
                <span className="text-sm text-blue-100">{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MFLoginPage;
