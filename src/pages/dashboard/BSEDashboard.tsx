import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isBSEConnected, clearBSEToken } from '@/services/bseAuth';
import { getUCCList } from '@/services/starmf/uccService';
import { listMandates, registerMandate, cancelMandate, getMandate, linkMandate, delinkMandate } from '@/services/starmf/mandateService';
import { listSxp, cancelSxp, pauseSxp, resumeSxp, topupSxp } from '@/services/starmf/sxpService';
import { listOrders, placeOrder, cancelOrder, getPaymentDetail } from '@/services/starmf/orderService';
import { registerSxp } from '@/services/starmf/sxpService';
import { getMasterSchemeList, getNavMasterList } from '@/services/starmf/schemeService';
import { getExchPgService } from '@/services/starmf/pgService';
import { getBsePgPaymentStatus } from '@/services/starmf/pgService';
import { get2faLink } from '@/services/starmf/twoFaService';
import { nftBankAccountChange, nftNomineeChange, nftContactChange } from '@/services/starmf/nftService';
import { resolveBSEOrderCode } from '@/utils/schemeCodeResolver';
import {
  User, CreditCard, TrendingUp, ShoppingCart, ArrowLeftRight, Wallet,
  LogOut, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Search, Bell, LayoutDashboard, Filter, UserPlus, Menu, X, AlertTriangle, Ban,
  PauseCircle, PlayCircle, PlusCircle, MinusCircle, ArrowRightLeft, Receipt,
  BookOpen, Landmark, Zap, FileText, Link, Unlink,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UCCRecord {
  ucc: string;
  name: string;
  pan: string;
  email: string;
  mobile: string;
  status: string;
  bank: string;
  bankIfsc: string;
}

interface MandateRecord {
  id: number | string;
  ucc: string;
  bank: string;
  amount: number;
  status: string;
  startDate: string;
  validTill: string;
}

interface SIPRecord {
  id: number | string;
  ucc: string;
  scheme: string;
  amount: number;
  freq: string;
  startDate: string;
  status: string;
  installments: number;
}

interface OrderRecord {
  id: number | string;
  ucc: string;
  scheme: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  folio: string;
}

interface ModuleData {
  loaded: boolean;
  error: string;
  data: unknown[];
}

// ─── Section Card ─────────────────────────────────────────────────────────────
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count: number;
  loaded: boolean;
  error: string;
  color: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, count, loaded, error, color, children }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!loaded ? (
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          ) : error ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1">
              <XCircle className="w-3.5 h-3.5" /> Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {count} record{count !== 1 ? 's' : ''}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-4">
          {!loaded && (
            <div className="flex items-center gap-3 py-6 justify-center text-sm text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading from BSE...
            </div>
          )}
          {loaded && error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
          )}
          {loaded && !error && count === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No records found.</p>
          )}
          {loaded && !error && count > 0 && children}
        </div>
      )}
    </div>
  );
};

// ─── Field pill ───────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
    <p className={`text-sm font-semibold text-gray-800 mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
  </div>
);

// ─── Scheme (real API) ───────────────────────────────────────────────────────
interface Scheme {
  parent_scheme_code: string;
  parent_scheme_name: string;
  scheme_code?: string;
  scheme_bse_code?: string;    // BSE order/SIP registration code e.g. "IIITRG-GR"
  scheme_id?: string | number;
  name: string;
  scheme_plan: string;
  scheme_option: string;
  scheme_isin: string;
  scheme_amc_code: string;
  scheme_amc_name: string;
  scheme_category: string;
  scheme_sub_category: string;
  is_active: boolean;
  transaction_allowed?: string; // 'Y' = orderable
  sip_allowed?: string;         // 'Y' = SIP eligible
  purchase_allowed?: string;    // 'Y' = lumpsum eligible
  min_sip_amount?: number;
  min_purchase_amount?: number;
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────
const SchemeCard: React.FC<{ scheme: Scheme; onInvest: (s: Scheme, mode: 'lumpsum' | 'sip') => void }> = ({ scheme, onInvest }) => {
  const sipOk     = !scheme.sip_allowed      || scheme.sip_allowed      === 'Y';
  const lumpsumOk = !scheme.purchase_allowed || scheme.purchase_allowed === 'Y';
  return (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-[#1E3A6D]/20 transition-all flex flex-col gap-3 group">

    {/* Header */}
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#1E3A6D]/8 border border-[#1E3A6D]/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[#1E3A6D]">
          {(scheme.scheme_amc_code || scheme.scheme_amc_name || 'MF').slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#1E3A6D] transition-colors">{scheme.name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{scheme.scheme_amc_name || scheme.scheme_amc_code}</p>
      </div>
    </div>

    {/* Badges */}
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-semibold bg-[#1E3A6D]/8 text-[#1E3A6D] rounded-full px-2.5 py-1">
        {scheme.scheme_sub_category || scheme.scheme_category}
      </span>
      <span className="text-[10px] font-semibold bg-[#00b386]/10 text-[#00b386] rounded-full px-2.5 py-1">
        {scheme.scheme_option}
      </span>
      <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 rounded-full px-2.5 py-1 ml-auto">
        {scheme.scheme_plan}
      </span>
    </div>

    {/* ISIN */}
    <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">ISIN</p>
      <p className="text-xs font-mono font-semibold text-gray-700">{scheme.scheme_isin || '—'}</p>
    </div>

    {/* Min amounts */}
    <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5">
      <span>SIP from <span className="font-semibold text-gray-600">₹{(scheme.min_sip_amount ?? 500).toLocaleString('en-IN')}</span></span>
      <span>Lumpsum from <span className="font-semibold text-gray-600">₹{(scheme.min_purchase_amount ?? 1000).toLocaleString('en-IN')}</span></span>
    </div>

    {/* Actions */}
    <div className="flex gap-2 mt-auto pt-1">
      {lumpsumOk && (
        <button
          onClick={() => onInvest(scheme, 'lumpsum')}
          className="flex-1 bg-[#1E3A6D] hover:bg-[#162d57] text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
        >
          Invest Now
        </button>
      )}
      {sipOk && (
        <button
          onClick={() => onInvest(scheme, 'sip')}
          className="flex-1 border-2 border-[#00b386] text-[#00b386] hover:bg-[#00b386] hover:text-white text-xs font-bold py-2.5 rounded-xl transition-all"
        >
          Start SIP
        </button>
      )}
      {!lumpsumOk && !sipOk && (
        <span className="flex-1 text-center text-[10px] text-gray-400 py-2.5">Not available for orders</span>
      )}
    </div>
  </div>
  );
};

// ─── Invest Modal ────────────────────────────────────────────────────────────────
const SIP_DATES = [1, 5, 10, 15, 20, 25];
const SIP_FREQS = [
  { label: 'Monthly',   value: 'm' },
  { label: 'Quarterly', value: 'q' },
];

type OrderStatus = 'idle' | 'loading' | 'success' | 'error' | 'redirecting';

const InvestModal: React.FC<{
  scheme: Scheme;
  initialMode: 'lumpsum' | 'sip';
  clientCode: string;
  memberId: string;
  email: string;
  mobnum: string;
  isDemat: boolean;
  depository?: { depository_code: string; dp_id: string; client_id: string };
  onClose: () => void;
  onViewSIPs?: () => void;
}> = ({ scheme, initialMode, clientCode, memberId, email, mobnum, isDemat, depository, onClose, onViewSIPs }) => {
  const [mode, setMode]       = useState<'lumpsum' | 'sip'>(initialMode);
  const [amount, setAmount]   = useState('');
  const [sipDate, setSipDate] = useState(1);
  const [sipFreq, setSipFreq] = useState<'m' | 'q'>('m');
  const [installments, setInstallments] = useState('12');
  const [status, setStatus]   = useState<OrderStatus>('idle');
  const [errMsg, setErrMsg]   = useState('');
  const [payUrl, setPayUrl]   = useState<string | null>(null);
  const [step, setStep]       = useState<1 | 2>(1);
  const [sipRegNo, setSipRegNo] = useState('');

  // SIP-specific state
  const [mandates, setMandates]       = useState<any[]>([]);
  const [mandatesLoaded, setMandatesLoaded] = useState(false);
  const [selectedMandateId, setSelectedMandateId] = useState<number | null>(null);

  // Load mandates when SIP mode is selected
  useEffect(() => {
    if (mode !== 'sip' || mandatesLoaded) return;
    listMandates(clientCode, true, true, 0, 20)
      .then(res => {
        const list: any[] = res?.data?.lists ?? [];
        setMandates(list);
        if (list.length > 0) setSelectedMandateId(list[0].exch_mandate_id ?? list[0].id ?? null);
      })
      .catch(() => {})
      .finally(() => setMandatesLoaded(true));
  }, [mode, clientCode, mandatesLoaded]);

  const hasMandate = mandates.length > 0;
  const minAmt = mode === 'sip' ? (scheme.min_sip_amount ?? 500) : (scheme.min_purchase_amount ?? 1000);
  const amtNum = Number(amount);
  const amtValid = amtNum >= minAmt;

  // BSE order_new requires scheme_bse_code format (e.g. '007-DP').
  // ISIN and parent_scheme_code are rejected. Fail fast if missing.
  const schemeCode = resolveBSEOrderCode(scheme);
  // Derive phys_or_demat from scheme's allowed transaction modes
  const allowedModes: string[] = (scheme as any).scheme_transaction_mode_allowed
    ?.map((m: any) => (m.scheme_transaction_mode_demat_physical_allowed ?? '').toLowerCase()) ?? [];
  const schemeDematOnly    = allowedModes.length > 0 && allowedModes.every(m => m === 'demat');
  const schemePhysicalOnly = allowedModes.length > 0 && allowedModes.every(m => m === 'physical');
  const physOrDemat: 'p' | 'd' = schemeDematOnly ? 'd' : schemePhysicalOnly ? 'p' : (isDemat ? 'd' : 'p');
  const needsDemat = physOrDemat === 'd';
  const depositoryAcct = needsDemat && depository ? {
    depository: /^\d{8}$/.test(depository.dp_id) ? 'C' as const : 'N' as const,
    dp_id:      depository.dp_id,
    client_id:  depository.client_id,
  } : undefined;
  const canSubmit = amtValid && !!schemeCode && !!memberId && !!mobnum && (!needsDemat || !!depositoryAcct);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('loading');
    setErrMsg('');
    try {
      if (mode === 'sip') {
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        // Start date = next occurrence of sipDate
        let startDate = new Date(today.getFullYear(), today.getMonth(), sipDate);
        if (startDate <= today) startDate = new Date(today.getFullYear(), today.getMonth() + 1, sipDate);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + Number(installments) - 1);
        const res = await registerSxp({
          sxp_type: 'sip',
          mem_sxp_ref_id: `SIP-${Date.now()}`,
          investor: { ucc: clientCode },
          member: memberId,
          src_scheme: schemeCode,
          kyc_passed: true,
          dest_scheme: '',
          exch_mandate_id: selectedMandateId ?? 0,
          amount: amtNum,
          cur: 'INR',
          is_fresh: true,
          src_folio: '',
          phys_or_demat: physOrDemat,
          isunits: false,
          min_redeem_flag: false,
          dpc: false,
          start_date: fmt(startDate),
          end_date: fmt(endDate),
          freq: sipFreq,
          txn_date: sipDate,
          ninstallments: Number(installments),
          first_order_today: false,
          brokerage: 2.5,
          holder: [{ holder_rank: '1', email, mobnum: mobnum.startsWith('+') ? mobnum : `+91${mobnum}` }],
          email,
          mobnum: mobnum.startsWith('+') ? mobnum : `+91${mobnum}`,
          special_product: {
            special_prod_type: '', special_prod_name: '',
            target_scheme: '', target_amt: 0,
            goal_type: '', goal_amt: 0, sip_tenure: 0,
          },
          ...(depositoryAcct ? { depository_acct: depositoryAcct } : {}),
        });
        console.log('[SIP Register] Response:', JSON.stringify(res, null, 2));
        const rn = res?.data?.lists?.[0]?.reg_no ?? res?.data?.reg_no ?? res?.reg_no ?? '';
        setSipRegNo(rn);
        setStatus('success');
      } else {
        const res = await placeOrder([{
          type: 'p',
          mem_ord_ref_id: `ORD-${Date.now()}`,
          investor: { ucc: clientCode },
          member: memberId,
          scheme: schemeCode,
          amount: amtNum,
          cur: 'INR',
          is_units: false,
          all_units: false,
          min_redeem_flag: false,
          folio: '',
          is_fresh: true,
          phys_or_demat: physOrDemat,
          holder: [{ holder_rank: '1', email, mobnum: mobnum.startsWith('+') ? mobnum : `+91${mobnum}` }],
          email,
          mobnum: mobnum.startsWith('+') ? mobnum : `+91${mobnum}`,
          kyc_passed: true,
          dpc: true,
          payment_ref_id: '',
          is_nomination_opted: false,
          ...(depositoryAcct ? { depository_acct: depositoryAcct } : {}),
        }]);
        if (!res.success) throw new Error(res.errorMessage ?? 'Order failed');
        console.log('[Order Debug] Full success response:', JSON.stringify(res.data, null, 2));
        const orderId: number = res.data?.data?.items?.[0]?.id
          ?? res.data?.data?.orders?.[0]?.id
          ?? res.data?.data?.lists?.[0]?.id
          ?? res.data?.items?.[0]?.id;
        if (!orderId) throw new Error('Order created but no order_id returned — cannot initiate payment.');
        const pgRes = await getExchPgService({
          ucc: clientCode,
          orderIds: [orderId],
          redirectionUrl: `${window.location.origin}/payment-callback`,
          paymentModes: ['upi', 'netbanking', 'mandate'],
        });
        const url = pgRes?.data?.exch_pg_page_link ?? pgRes?.data?.payment_url ?? pgRes?.exch_pg_page_link ?? pgRes?.payment_url;
        if (!url) throw new Error('Payment URL not returned by BSE. Order ID: ' + orderId);
        setPayUrl(url);
        setStatus('redirecting');
      }
    } catch (e: any) {
      setStatus('error');
      setErrMsg(e?.message ?? 'Something went wrong');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1E3A6D] to-[#162d57] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 shadow">
                <img src="/logo.png" alt="Lendrix" className="w-6 h-6 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-snug line-clamp-2">{scheme.name}</p>
                <p className="text-xs text-white/60 mt-0.5">{scheme.scheme_amc_name || scheme.scheme_amc_code}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          {/* Scheme meta pills */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span className="text-[10px] font-semibold bg-white/15 rounded-full px-2.5 py-1">{scheme.scheme_sub_category || scheme.scheme_category}</span>
            <span className="text-[10px] font-semibold bg-[#00b386]/30 text-[#00b386] rounded-full px-2.5 py-1">{scheme.scheme_plan}</span>
            <span className="text-[10px] font-semibold bg-white/15 rounded-full px-2.5 py-1">{scheme.scheme_option}</span>
            <span className="text-[10px] font-mono font-semibold bg-white/10 rounded-full px-2.5 py-1 ml-auto">{scheme.scheme_isin || '—'}</span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          {status === 'success' ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#00b386]/10 border-2 border-[#00b386]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-[#00b386]" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-base">
                  {mode === 'sip' ? 'SIP Registered!' : 'Order Confirmed!'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {mode === 'sip'
                    ? <>Your SIP of <span className="font-semibold text-gray-800">₹{Number(amount).toLocaleString('en-IN')}</span> has been submitted to BSE StAR MF.</>
                    : <>Your order has been placed successfully on BSE StAR MF.</>
                  }
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-left space-y-2.5">
                {(mode === 'sip' ? [
                  ['Fund',         scheme.name],
                  ['Amount',       `₹${Number(amount).toLocaleString('en-IN')} / ${sipFreq === 'm' ? 'month' : 'quarter'}`],
                  ['SIP Date',     `${sipDate}${sipDate === 1 ? 'st' : 'th'} of every month`],
                  ['Installments', `${installments} (est. ₹${(Number(amount) * Number(installments)).toLocaleString('en-IN')})`],
                  ['Platform',     'BSE StAR MF'],
                  ...(sipRegNo ? [['Reg. No.', sipRegNo]] : []),
                ] : [
                  ['Fund',     scheme.name],
                  ['Amount',   `₹${Number(amount).toLocaleString('en-IN')}`],
                  ['Type',     'Lumpsum'],
                  ['Platform', 'BSE StAR MF'],
                ]).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-500">{k}</span>
                    <span className={`font-semibold text-right max-w-[55%] truncate ${
                      k === 'Platform' ? 'text-[#00b386]'
                      : k === 'Reg. No.' ? 'font-mono text-blue-700'
                      : 'text-gray-800'
                    }`}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Done
                </button>
                {mode === 'sip' && (
                  <button
                    onClick={() => { onClose(); onViewSIPs?.(); }}
                    className="flex-1 bg-[#1E3A6D] hover:bg-[#162d57] text-white text-sm font-bold py-3 rounded-xl transition-colors"
                  >
                    View My SIPs
                  </button>
                )}
              </div>
            </div>
          ) : status === 'redirecting' ? (
            <div className="py-2 space-y-5">
              {/* Success tick */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="w-16 h-16 rounded-full bg-[#00b386]/10 border-2 border-[#00b386]/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#00b386]" />
                </div>
                <p className="text-base font-bold text-gray-900">Order Placed Successfully!</p>
                <p className="text-xs text-gray-500 text-center max-w-[260px]">
                  Your order has been created on BSE StAR MF. Complete payment to confirm your investment.
                </p>
              </div>

              {/* Order summary strip */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Fund</span>
                  <span className="text-xs font-semibold text-gray-800 text-right max-w-[55%] truncate">{scheme.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Amount</span>
                  <span className="text-sm font-bold text-gray-900">₹{amtNum.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Platform</span>
                  <span className="text-xs font-semibold text-[#00b386]">BSE StAR MF</span>
                </div>
              </div>

              {/* Pay button */}
              <a
                href={payUrl!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#00b386] hover:bg-[#009e78] active:bg-[#007a5e] text-white text-sm font-bold py-4 rounded-2xl transition-colors shadow-sm shadow-[#00b386]/30"
              >
                <CreditCard className="w-4 h-4" />
                Proceed to Payment
              </a>

              <button
                onClick={onClose}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                I'll pay later — Close
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['lumpsum', 'sip'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setAmount(''); setStatus('idle'); }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                      mode === m
                        ? 'bg-[#1E3A6D] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m === 'lumpsum' ? '💰 One-time (Lumpsum)' : '🔄 SIP (Auto-debit)'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {mode === 'sip' ? 'SIP Amount' : 'Investment Amount'}
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    min={minAmt}
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setStatus('idle'); }}
                    placeholder={`Min ₹${minAmt.toLocaleString('en-IN')}`}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] transition-all"
                  />
                </div>
                {amount && !amtValid && (
                  <p className="text-xs text-rose-500 mt-1">Minimum amount is ₹{minAmt.toLocaleString('en-IN')}</p>
                )}
                {/* Quick amount chips */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {(mode === 'sip'
                    ? [500, 1000, 2000, 5000]
                    : [5000, 10000, 25000, 50000]
                  ).map(v => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="text-xs font-semibold border border-gray-200 rounded-full px-3 py-1 hover:border-[#00b386] hover:text-[#00b386] transition-colors"
                    >
                      ₹{v.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* SIP-only fields */}
              {mode === 'sip' && (
                <>
                  {/* Mandate status banner */}
                  {mandatesLoaded && (
                    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs border ${
                      hasMandate
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {hasMandate ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span><strong>Mandate active</strong> — auto-debit is set up. You can register the SIP directly.</span></>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><strong>No mandate found.</strong> A mandate (NACH/UPI auto-debit) is required before registering a SIP.</span>
                          </div>
                          <div className="pl-5 space-y-1 text-amber-600">
                            <p>To set up a mandate:</p>
                            <p>1. Go to <strong>My Investments</strong> tab</p>
                            <p>2. Click <strong>Register Mandate</strong> with your bank details</p>
                            <p>3. Approve it in your bank (instant for UPI, 1-3 days for NACH)</p>
                            <p>4. Come back here to register the SIP</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {!mandatesLoaded && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Checking mandate status...
                    </div>
                  )}

                  {/* Mandate selector if multiple */}
                  {hasMandate && mandates.length > 1 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Mandate</label>
                      <select
                        value={selectedMandateId ?? ''}
                        onChange={e => setSelectedMandateId(Number(e.target.value))}
                        className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] bg-white"
                      >
                        {mandates.map((m, i) => (
                          <option key={i} value={m.exch_mandate_id ?? m.id}>
                            {m.bank_name ?? 'Bank'} — ₹{Number(m.amount ?? 0).toLocaleString('en-IN')} (ID: {m.exch_mandate_id ?? m.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SIP Date</label>
                      <select
                        value={sipDate}
                        onChange={e => setSipDate(Number(e.target.value))}
                        className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] bg-white"
                      >
                        {SIP_DATES.map(d => (
                          <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequency</label>
                      <select
                        value={sipFreq}
                        onChange={e => setSipFreq(e.target.value as 'm' | 'q')}
                        className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] bg-white"
                      >
                        {SIP_FREQS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">No. of Installments</label>
                      <input
                        type="number"
                        min={1}
                        value={installments}
                        onChange={e => setInstallments(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Summary box */}
              {amtValid && (
                <div className="bg-[#00b386]/5 border border-[#00b386]/20 rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-xs font-bold text-[#00b386] uppercase tracking-wide">Order Summary</p>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Fund</span>
                    <span className="font-semibold text-gray-800 text-right max-w-[60%] truncate">{scheme.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Type</span>
                    <span className="font-semibold text-gray-800">{mode === 'sip' ? `SIP · ${SIP_FREQS.find(f => f.value === sipFreq)?.label}` : 'Lumpsum'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Amount</span>
                    <span className="font-bold text-gray-900">₹{amtNum.toLocaleString('en-IN')}</span>
                  </div>
                  {mode === 'sip' && (
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Total (est.)</span>
                      <span className="font-semibold text-gray-800">₹{(amtNum * Number(installments)).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Platform</span>
                    <span className="font-semibold text-emerald-700">BSE StAR MF</span>
                  </div>
                </div>
              )}

              {/* Error — always visible */}
              {status === 'error' && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 font-medium">
                  ❌ {errMsg}
                </div>
              )}

              {/* Blocking warnings */}
              {(!schemeCode || !memberId || !mobnum || (needsDemat && !depositoryAcct)) && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                  {!schemeCode          ? 'Scheme code unavailable — cannot place order for this fund.' :
                   !memberId            ? 'Member ID missing — please re-login to BSE.' :
                   !mobnum              ? 'Investor mobile number missing — update UCC contact details.' :
                                         'This scheme requires Demat mode but no DP account is registered for this investor.'}
                </p>
              )}

              {/* Mandate pending screen - removed, handled via My Investments tab */}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || status === 'loading'}
                className="w-full bg-[#1E3A6D] hover:bg-[#162d57] disabled:opacity-50 text-white text-sm font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#1E3A6D]/20"
              >
                {status === 'loading' ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                ) : mode === 'sip' ? (
                  'Register SIP via BSE'
                ) : (
                  'Place Order & Pay via BSE'
                )}
              </button>

              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 bg-white rounded flex items-center justify-center shadow-sm border border-gray-100">
                  <img src="/logo.png" alt="Lendrix" className="w-4 h-4 object-contain" />
                </div>
                <p className="text-[10px] text-gray-400">Lendrix · BSE StAR MF · Direct Plan · 0% Commission</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Shared helpers ───────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  rejected:  'bg-rose-50 text-rose-700 border-rose-200',
  failed:    'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};
const statusColor = (s: string) =>
  STATUS_COLOR[s?.toLowerCase()] ?? 'bg-gray-100 text-gray-600 border-gray-200';

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">{icon}</div>
    <p className="font-semibold text-gray-700">{title}</p>
    <p className="text-sm text-gray-400 max-w-xs">{sub}</p>
  </div>
);

const TabLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20 gap-3 text-gray-400 text-sm">
    <RefreshCw className="w-4 h-4 animate-spin" /> Loading from BSE StAR MF…
  </div>
);

// ─── Investments Tab ──────────────────────────────────────────────────────────
const InvestmentsTab: React.FC<{ ucc: ModuleData; mandate: ModuleData }> = ({ ucc, mandate }) => (
  <div className="space-y-6">

    {/* ─ UCC / Investor Profiles ─ */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-blue-500" />
        <p className="font-bold text-gray-900">Registered Investors (UCC)</p>
        <span className="ml-auto text-xs text-gray-400">{ucc.data.length} records</span>
      </div>

      {!ucc.loaded && <TabLoader />}
      {ucc.loaded && ucc.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{ucc.error}</div>
      )}
      {ucc.loaded && !ucc.error && ucc.data.length === 0 && (
        <EmptyState icon={<User className="w-6 h-6" />} title="No investors registered" sub="Register a UCC via BSE StAR MF to get started." />
      )}
      {ucc.loaded && !ucc.error && ucc.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(ucc.data as UCCRecord[]).map((u, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
              {/* Top */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-600">{u.name?.[0] ?? '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{u.ucc}</p>
                </div>
                <span className={`text-[10px] font-bold border rounded-full px-2.5 py-1 ${statusColor(u.status)}`}>
                  {u.status}
                </span>
              </div>
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <Field label="PAN" value={u.pan} mono />
                <Field label="Mobile" value={u.mobile} />
                <Field label="Email" value={u.email} />
                <Field label="Bank A/C" value={u.bank} mono />
                <Field label="IFSC" value={u.bankIfsc} mono />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* ─ Mandates ─ */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-4 h-4 text-purple-500" />
        <p className="font-bold text-gray-900">Mandates (NACH / UPI)</p>
        <span className="ml-auto text-xs text-gray-400">{mandate.data.length} records</span>
      </div>

      {!mandate.loaded && <TabLoader />}
      {mandate.loaded && mandate.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{mandate.error}</div>
      )}
      {mandate.loaded && !mandate.error && mandate.data.length === 0 && (
        <EmptyState icon={<CreditCard className="w-6 h-6" />} title="No mandates registered" sub="Register a NACH or UPI mandate to enable auto-debit for SIPs." />
      )}
      {mandate.loaded && !mandate.error && mandate.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(mandate.data as MandateRecord[]).map((m, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                </div>
                <span className={`text-[10px] font-bold border rounded-full px-2.5 py-1 ${statusColor(m.status)}`}>
                  {m.status}
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900">₹{Number(m.amount).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400 mt-0.5">Mandate limit</p>
              <div className="mt-3 space-y-1.5">
                <Field label="Mandate ID" value={String(m.id)} mono />
                <Field label="UCC" value={m.ucc} mono />
                <Field label="Bank A/C" value={m.bank} mono />
                <Field label="Valid Till" value={m.validTill} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── Payment Detail Modal ─────────────────────────────────────────────────────
const PaymentDetailModal: React.FC<{
  orderId: string;
  onClose: () => void;
}> = ({ orderId, onClose }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    getPaymentDetail(orderId)
      .then(res => {
        const d = res?.data?.lists?.[0] ?? res?.data ?? res;
        setDetail(d);
        setStatus('success');
      })
      .catch(e => {
        setErrMsg(e?.response?.data?.messages?.[0]?.errcode ?? e?.message ?? 'Failed to fetch payment detail');
        setStatus('error');
      });
  }, [orderId]);

  const rows: [string, string][] = detail ? [
    ['Order ID',       String(detail.order_id       ?? detail.id          ?? '—')],
    ['Payment Ref',    String(detail.payment_ref_id  ?? '—')],
    ['Bank Txn Ref',   String(detail.bank_txn_ref    ?? '—')],
    ['Amount',         detail.amount != null ? `₹${Number(detail.amount).toLocaleString('en-IN')}` : '—'],
    ['Status',         String(detail.payment_status  ?? detail.status ?? '—')],
    ['Mode',           String(detail.payment_mode    ?? '—')],
    ['Bank',           String(detail.bank_name       ?? detail.bank ?? '—')],
    ['Txn Date',       String(detail.txn_date        ?? detail.created_at?.split('T')[0] ?? '—')],
    ['Remarks',        String(detail.remarks         ?? detail.remark ?? '—')],
  ] : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1E3A6D] to-[#162d57] px-6 py-4 text-white flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Payment Detail</p>
            <p className="text-[11px] text-white/60">Order ID: {orderId}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {status === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-8 text-gray-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Fetching from BSE…
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">❌ {errMsg}</div>
          )}
          {status === 'success' && (
            <>
              {rows.filter(([, v]) => v !== '—').length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No payment record found for this order.</p>
              ) : (
                <div className="space-y-2">
                  {rows.map(([label, value]) => value !== '—' && (
                    <div key={label} className="flex justify-between items-start gap-3 text-xs">
                      <span className="text-gray-400 shrink-0">{label}</span>
                      <span className="font-semibold text-gray-800 text-right break-all">{value}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full mt-5 border border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Switch Order Modal ───────────────────────────────────────────────────────
const SwitchModal: React.FC<{
  uccs: { code: string; name: string; memberId: string; email: string; mobnum: string }[];
  onClose: () => void;
  onDone: () => void;
}> = ({ uccs, onClose, onDone }) => {
  const [selectedUcc, setSelectedUcc] = useState(uccs[0]?.code ?? '');
  const [srcScheme, setSrcScheme]     = useState('');
  const [destScheme, setDestScheme]   = useState('');
  const [folio, setFolio]             = useState('');
  const [switchMode, setSwitchMode]   = useState<'amount' | 'units' | 'all'>('amount');
  const [amount, setAmount]           = useState('');
  const [status, setStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg]           = useState('');

  const ucc = uccs.find(u => u.code === selectedUcc);
  const canSubmit = !!srcScheme.trim() && !!destScheme.trim() && !!folio.trim() && !!ucc &&
    srcScheme.trim().toUpperCase() !== destScheme.trim().toUpperCase() &&
    (switchMode === 'all' || Number(amount) > 0);

  const handleSubmit = async () => {
    if (!canSubmit || !ucc) return;
    setStatus('loading'); setErrMsg('');
    try {
      const res = await placeOrder([{
        type: 's',
        mem_ord_ref_id: `SWT-${Date.now()}`,
        investor: { ucc: ucc.code },
        member: ucc.memberId,
        scheme: srcScheme.trim().toUpperCase(),
        dest_scheme: destScheme.trim().toUpperCase(),
        amount: switchMode === 'all' ? 0 : Number(amount),
        cur: 'INR',
        is_units: switchMode === 'units',
        all_units: switchMode === 'all',
        min_redeem_flag: false,
        folio: folio.trim(),
        is_fresh: false,
        phys_or_demat: 'p',
        holder: [{ holder_rank: '1', email: ucc.email, mobnum: ucc.mobnum.startsWith('+') ? ucc.mobnum : `+91${ucc.mobnum}` }],
        email: ucc.email,
        mobnum: ucc.mobnum.startsWith('+') ? ucc.mobnum : `+91${ucc.mobnum}`,
        kyc_passed: true,
        dpc: false,
        payment_ref_id: '',
        is_nomination_opted: false,
      }]);
      if (!res.success) throw new Error(res.errorMessage ?? 'Switch failed');
      setStatus('success');
      setTimeout(() => { onDone(); onClose(); }, 1400);
    } catch (e: any) {
      setStatus('error');
      setErrMsg(e?.message ?? 'Something went wrong');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 px-6 py-4 text-white flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Switch Fund</p>
            <p className="text-[11px] text-white/60">BSE StAR MF · order_new (type: s)</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {status === 'success' ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-bold text-gray-900">Switch Placed!</p>
              <p className="text-xs text-gray-500">Your switch order has been submitted to BSE StAR MF.</p>
            </div>
          ) : (
            <>
              {/* Investor */}
              {uccs.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Investor (UCC)</label>
                  <select value={selectedUcc} onChange={e => setSelectedUcc(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white">
                    {uccs.map(u => <option key={u.code} value={u.code}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              )}

              {/* Source scheme */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From Scheme (BSE Code)</label>
                <input value={srcScheme} onChange={e => { setSrcScheme(e.target.value); setStatus('idle'); }}
                  placeholder="e.g. IDFCNF-GR"
                  className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-300 uppercase" />
              </div>

              {/* Arrow divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Destination scheme */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To Scheme (BSE Code)</label>
                <input value={destScheme} onChange={e => { setDestScheme(e.target.value); setStatus('idle'); }}
                  placeholder="e.g. HDFCEF-GR"
                  className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-300 uppercase" />
                {srcScheme && destScheme && srcScheme.trim().toUpperCase() === destScheme.trim().toUpperCase() && (
                  <p className="text-xs text-rose-500 mt-1">Source and destination schemes must be different.</p>
                )}
              </div>

              {/* Folio */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Folio Number</label>
                <input value={folio} onChange={e => { setFolio(e.target.value); setStatus('idle'); }}
                  placeholder="e.g. 1234567890"
                  className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>

              {/* Switch mode */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Switch Type</label>
                <div className="flex gap-2 mt-1.5">
                  {(['amount', 'units', 'all'] as const).map(m => (
                    <button key={m} onClick={() => { setSwitchMode(m); setAmount(''); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                        switchMode === m ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-300'
                      }`}>
                      {m === 'amount' ? '₹ Amount' : m === 'units' ? '# Units' : 'Full'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount / units */}
              {switchMode !== 'all' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {switchMode === 'amount' ? 'Amount (₹)' : 'Number of Units'}
                  </label>
                  <input type="number" min={1} value={amount} onChange={e => { setAmount(e.target.value); setStatus('idle'); }}
                    placeholder={switchMode === 'amount' ? 'e.g. 5000' : 'e.g. 100.5'}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                </div>
              )}
              {switchMode === 'all' && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-2.5 text-xs text-cyan-700 font-semibold">
                  ℹ️ All units in the folio will be switched to the destination scheme.
                </div>
              )}

              {status === 'error' && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">❌ {errMsg}</p>
              )}

              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={!canSubmit || status === 'loading'}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {status === 'loading' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Placing…</> : 'Place Switch'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Redeem Order Modal ───────────────────────────────────────────────────────
const RedeemModal: React.FC<{
  uccs: { code: string; name: string; memberId: string; email: string; mobnum: string; isDemat?: boolean; depository?: { depository_code: string; dp_id: string; client_id: string }; ifsc?: string; accNo?: string; accType?: string; bankName?: string }[];
  onClose: () => void;
  onDone: () => void;
}> = ({ uccs, onClose, onDone }) => {
  const [selectedUcc, setSelectedUcc] = useState(uccs[0]?.code ?? '');
  const [scheme, setScheme]           = useState('');
  const [folio, setFolio]             = useState('');
  const [redeemMode, setRedeemMode]   = useState<'amount' | 'units' | 'all'>('amount');
  const [amount, setAmount]           = useState('');
  const [status, setStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg]           = useState('');

  const ucc = uccs.find(u => u.code === selectedUcc);
  const isDemat = ucc?.isDemat ?? false;
  const physOrDemat: 'p' | 'd' = isDemat ? 'd' : 'p';

  const canSubmit = !!scheme.trim() && !!ucc &&
    (!isDemat || !!folio.trim() === false || true) &&  // folio optional for demat
    (redeemMode === 'all' || Number(amount) > 0);

  const handleSubmit = async () => {
    if (!ucc) return;
    setStatus('loading'); setErrMsg('');
    try {
      const mobnum = ucc.mobnum.startsWith('+') ? ucc.mobnum : `+91${ucc.mobnum}`;
      const orderPayload: any = {
        type: 'r',
        mem_ord_ref_id: `RDM-${Date.now()}`,
        investor: { ucc: ucc.code },
        member: ucc.memberId,
        scheme: scheme.trim().toUpperCase(),
        amount: redeemMode === 'all' ? 0 : Number(amount),
        cur: 'INR',
        is_units: redeemMode === 'units',
        all_units: redeemMode === 'all',
        min_redeem_flag: false,
        folio: folio.trim(),
        is_fresh: false,
        phys_or_demat: physOrDemat,
        holder: [{ holder_rank: '1', email: ucc.email, mobnum }],
        email: ucc.email,
        mobnum,
        kyc_passed: true,
        dpc: true,
        payment_ref_id: '',
        is_nomination_opted: false,
        nomination_auth_mode: '',
      };
      if (isDemat && ucc.depository) {
        orderPayload.depository_acct = {
          depository: /^\d{8}$/.test(ucc.depository.dp_id) ? 'C' : 'N',
          dp_id: ucc.depository.dp_id,
          client_id: ucc.depository.client_id,
        };
      }
      if (isDemat && ucc.ifsc && ucc.accNo) {
        orderPayload.bank_acct = {
          ifsc: ucc.ifsc,
          no: ucc.accNo,
          type: ucc.accType === 'CB' ? 'CB' : 'SB',
          name: ucc.bankName ?? '',
        };
      }
      const res = await placeOrder([orderPayload]);
      if (!res.success) throw new Error(res.errorMessage ?? 'Redemption failed');
      setStatus('success');
      setTimeout(() => { onDone(); onClose(); }, 1400);
    } catch (e: any) {
      setStatus('error');
      setErrMsg(e?.message ?? 'Something went wrong');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-rose-600 to-rose-700 px-6 py-4 text-white flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <MinusCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Redeem Units</p>
            <p className="text-[11px] text-white/60">BSE StAR MF · order_new (type: r)</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {status === 'success' ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-bold text-gray-900">Redemption Placed!</p>
              <p className="text-xs text-gray-500">Your redemption order has been submitted to BSE StAR MF.</p>
            </div>
          ) : (
            <>
              {uccs.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Investor (UCC)</label>
                  <select value={selectedUcc} onChange={e => setSelectedUcc(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white">
                    {uccs.map(u => <option key={u.code} value={u.code}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheme Code (BSE)</label>
                <input value={scheme} onChange={e => { setScheme(e.target.value); setStatus('idle'); }}
                  placeholder="e.g. IDFCNF-GR"
                  className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-300 uppercase" />
              </div>
              {/* Physical/Demat badge */}
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border ${isDemat ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                <span>{isDemat ? '🏦 Demat redemption' : '📄 Physical redemption'}</span>
                <span className="ml-auto opacity-60">{isDemat ? 'depository_acct required' : 'folio required'}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Folio Number{isDemat ? ' (optional for demat)' : ''}
                </label>
                <input value={folio} onChange={e => { setFolio(e.target.value); setStatus('idle'); }}
                  placeholder={isDemat ? 'Leave blank for demat' : 'e.g. 1234567890'}
                  className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Redemption Type</label>
                <div className="flex gap-2 mt-1.5">
                  {(['amount', 'units', 'all'] as const).map(m => (
                    <button key={m} onClick={() => { setRedeemMode(m); setAmount(''); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                        redeemMode === m ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'
                      }`}>
                      {m === 'amount' ? '₹ Amount' : m === 'units' ? '# Units' : 'Full'}
                    </button>
                  ))}
                </div>
              </div>
              {redeemMode !== 'all' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {redeemMode === 'amount' ? 'Amount (₹)' : 'Number of Units'}
                  </label>
                  <input type="number" min={1} value={amount} onChange={e => { setAmount(e.target.value); setStatus('idle'); }}
                    placeholder={redeemMode === 'amount' ? 'e.g. 5000' : 'e.g. 100.5'}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
              )}
              {redeemMode === 'all' && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-xs text-rose-700 font-semibold">
                  ⚠️ This will redeem all units in the folio.
                </div>
              )}
              {status === 'error' && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">❌ {errMsg}</p>
              )}
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={!canSubmit || status === 'loading'}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {status === 'loading' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Placing…</> : 'Place Redemption'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── SIP Action Modal ─────────────────────────────────────────────────────────
type SipAction = 'cancel' | 'pause' | 'resume' | 'topup';

const SipActionModal: React.FC<{
  sip: SIPRecord;
  action: SipAction;
  onClose: () => void;
  onDone: () => void;
}> = ({ sip, action, onClose, onDone }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg]   = useState('');
  // cancel
  const [cancelReason, setCancelReason] = useState('');
  // pause
  const [pauseInstallments, setPauseInstallments] = useState('1');
  const [pauseFrom, setPauseFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  // topup
  const [topupAmount, setTopupAmount]   = useState('');
  const [topupFreq, setTopupFreq]       = useState('y');
  const [topupTxnDate, setTopupTxnDate] = useState('1');
  const [topupStart, setTopupStart]     = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [topupEnd, setTopupEnd] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });

  const titles: Record<SipAction, string> = {
    cancel: 'Cancel SIP', pause: 'Pause SIP', resume: 'Resume SIP', topup: 'Top-up SIP',
  };
  const icons: Record<SipAction, React.ReactNode> = {
    cancel: <Ban className="w-5 h-5 text-rose-600" />,
    pause:  <PauseCircle className="w-5 h-5 text-amber-600" />,
    resume: <PlayCircle className="w-5 h-5 text-emerald-600" />,
    topup:  <PlusCircle className="w-5 h-5 text-blue-600" />,
  };
  const iconBg: Record<SipAction, string> = {
    cancel: 'bg-rose-100', pause: 'bg-amber-100', resume: 'bg-emerald-100', topup: 'bg-blue-100',
  };
  const btnColor: Record<SipAction, string> = {
    cancel: 'bg-rose-600 hover:bg-rose-700',
    pause:  'bg-amber-500 hover:bg-amber-600',
    resume: 'bg-emerald-600 hover:bg-emerald-700',
    topup:  'bg-blue-600 hover:bg-blue-700',
  };

  const handleSubmit = async () => {
    setStatus('loading'); setErrMsg('');
    try {
      const regNo = String(sip.id);
      if (action === 'cancel')  await cancelSxp(regNo, 6, cancelReason || 'Do not want to continue', 'SIP');
      if (action === 'pause')   await pauseSxp(regNo, Number(pauseInstallments), pauseFrom);
      if (action === 'resume')  await resumeSxp(regNo, 'Ready to continue');
      if (action === 'topup')   await topupSxp(
        regNo, `TOPUP-${Date.now()}`, Number(topupAmount),
        topupStart, topupEnd, topupFreq, Number(topupTxnDate), '', '', true,
      );
      setStatus('success');
      setTimeout(() => { onDone(); onClose(); }, 1200);
    } catch (e: any) {
      setStatus('error');
      setErrMsg(e?.response?.data?.messages?.[0]?.errcode ?? e?.message ?? 'Action failed');
    }
  };

  const canSubmit =
    action === 'cancel'  ? true :
    action === 'pause'   ? Number(pauseInstallments) >= 1 :
    action === 'resume'  ? true :
    /* topup */            Number(topupAmount) > 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[action]}`}>
            {icons[action]}
          </div>
          <div>
            <p className="font-bold text-gray-900">{titles[action]}</p>
            <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{sip.scheme}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {/* SIP summary */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-bold text-gray-900">₹{Number(sip.amount).toLocaleString('en-IN')}/{sip.freq}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Reg. No.</span><span className="font-mono font-semibold text-gray-700">{sip.id}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">UCC</span><span className="font-mono font-semibold text-gray-700">{sip.ucc}</span></div>
        </div>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> {titles[action]} successful.
          </div>
        ) : (
          <>
            {/* Action-specific fields */}
            {action === 'cancel' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason (optional)</label>
                <textarea rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Goal achieved"
                  className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
              </div>
            )}
            {action === 'pause' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Installments to skip</label>
                  <input type="number" min={1} value={pauseInstallments} onChange={e => setPauseInstallments(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pause from date</label>
                  <input type="date" value={pauseFrom} onChange={e => setPauseFrom(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
              </div>
            )}
            {action === 'resume' && (
              <p className="text-sm text-gray-500">This will resume your paused SIP from the next installment date.</p>
            )}
            {action === 'topup' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top-up Amount (₹)</label>
                  <input type="number" min={1} value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequency</label>
                    <select value={topupFreq} onChange={e => setTopupFreq(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none bg-white">
                      <option value="m">Monthly</option>
                      <option value="q">Quarterly</option>
                      <option value="y">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Txn Day</label>
                    <input type="number" min={1} max={28} value={topupTxnDate} onChange={e => setTopupTxnDate(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date</label>
                    <input type="date" value={topupStart} onChange={e => setTopupStart(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date</label>
                    <input type="date" value={topupEnd} onChange={e => setTopupEnd(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">❌ {errMsg}</p>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || status === 'loading'}
                className={`flex-1 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 ${btnColor[action]}`}
              >
                {status === 'loading' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing…</> : titles[action]}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── SIPs Tab ──────────────────────────────────────────────────────────────────
const SIPsTab: React.FC<{ sip: ModuleData; onRefresh: () => void }> = ({ sip, onRefresh }) => {
  const [actionModal, setActionModal] = useState<{ sip: SIPRecord; action: SipAction } | null>(null);

  return (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      <TrendingUp className="w-4 h-4 text-emerald-500" />
      <p className="font-bold text-gray-900">My SIPs</p>
      <span className="ml-auto text-xs text-gray-400">{sip.data.length} active plans</span>
    </div>

    {!sip.loaded && <TabLoader />}
    {sip.loaded && sip.error && (
      <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{sip.error}</div>
    )}
    {sip.loaded && !sip.error && sip.data.length === 0 && (
      <EmptyState
        icon={<TrendingUp className="w-6 h-6" />}
        title="No SIPs running"
        sub="Go to Explore Funds and click 'Start SIP' on any fund to begin."
      />
    )}
    {sip.loaded && !sip.error && sip.data.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(sip.data as SIPRecord[]).map((s, i) => {
          const isActive  = s.status?.toLowerCase() === 'active';
          const isPaused  = s.status?.toLowerCase() === 'paused';
          return (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className={`text-[10px] font-bold border rounded-full px-2.5 py-1 ${statusColor(s.status)}`}>
                {s.status}
              </span>
            </div>
            {/* Scheme */}
            <p className="text-xs font-mono text-gray-500 truncate mb-1">{s.scheme}</p>
            {/* Amount */}
            <p className="text-xl font-bold text-gray-900">₹{Number(s.amount).toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400">{s.freq} · {s.installments} installments</p>
            {/* Details */}
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <Field label="SIP ID" value={String(s.id)} mono />
              <Field label="UCC" value={s.ucc} mono />
              <Field label="Start Date" value={s.startDate} />
            </div>
            {/* Action buttons */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              {isActive && (
                <>
                  <button onClick={() => setActionModal({ sip: s, action: 'pause' })}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg px-2.5 py-1.5 transition-colors">
                    <PauseCircle className="w-3 h-3" /> Pause
                  </button>
                  <button onClick={() => setActionModal({ sip: s, action: 'topup' })}
                    className="flex items-center gap-1 text-[10px] font-bold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition-colors">
                    <PlusCircle className="w-3 h-3" /> Top-up
                  </button>
                </>
              )}
              {isPaused && (
                <button onClick={() => setActionModal({ sip: s, action: 'resume' })}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1.5 transition-colors">
                  <PlayCircle className="w-3 h-3" /> Resume
                </button>
              )}
              {(isActive || isPaused) && (
                <button onClick={() => setActionModal({ sip: s, action: 'cancel' })}
                  className="flex items-center gap-1 text-[10px] font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-lg px-2.5 py-1.5 transition-colors">
                  <Ban className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    )}

    {actionModal && (
      <SipActionModal
        sip={actionModal.sip}
        action={actionModal.action}
        onClose={() => setActionModal(null)}
        onDone={onRefresh}
      />
    )}
  </div>
  );
};

// ─── Cancel Order Modal ──────────────────────────────────────────────────────
const CancelOrderModal: React.FC<{
  order: OrderRecord;
  onClose: () => void;
  onCancelled: () => void;
}> = ({ order, onClose, onCancelled }) => {
  const [remark, setRemark] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleCancel = async () => {
    if (!remark.trim()) return;
    setStatus('loading');
    try {
      await cancelOrder(Number(order.id), order.ucc, remark.trim());
      setStatus('success');
      setTimeout(() => { onCancelled(); onClose(); }, 1200);
    } catch (e: any) {
      setStatus('error');
      setErrMsg(e?.response?.data?.messages?.[0]?.errcode ?? e?.message ?? 'Cancellation failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Cancel Order</p>
            <p className="text-xs text-gray-400 font-mono">ID: {order.id}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-gray-400">Scheme</span><span className="font-semibold font-mono text-gray-700">{order.scheme}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-bold text-gray-900">₹{Number(order.amount).toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">UCC</span><span className="font-semibold font-mono text-gray-700">{order.ucc}</span></div>
        </div>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Order cancelled successfully.
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason for cancellation</label>
              <textarea
                rows={2}
                value={remark}
                onChange={e => { setRemark(e.target.value); setStatus('idle'); }}
                placeholder="e.g. Entered wrong amount"
                className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 resize-none"
              />
            </div>
            {status === 'error' && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">❌ {errMsg}</p>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Keep Order</button>
              <button
                onClick={handleCancel}
                disabled={!remark.trim() || status === 'loading'}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {status === 'loading' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cancelling…</> : 'Cancel Order'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Orders Tab ──────────────────────────────────────────────────────────────────
const ORDER_SECTIONS = [
  { key: 'lumpsum',  label: 'Lumpsum (Purchase)', icon: <ShoppingCart className="w-4 h-4 text-orange-500" />,   color: 'bg-orange-100',  iconColor: 'text-orange-600'  },
  { key: 'switch',   label: 'Switch Orders',       icon: <ArrowLeftRight className="w-4 h-4 text-cyan-500" />,   color: 'bg-cyan-100',    iconColor: 'text-cyan-600'    },
  { key: 'redeem',   label: 'Redemptions',         icon: <Wallet className="w-4 h-4 text-rose-500" />,           color: 'bg-rose-100',    iconColor: 'text-rose-600'    },
];

const CANCELLABLE_STATUSES = ['pending', 'open', 'created', 'submitted'];

const OrdersTab: React.FC<{ lumpsum: ModuleData; switchOrd: ModuleData; redeem: ModuleData; onRefresh: () => void }> = ({ lumpsum, switchOrd, redeem, onRefresh }) => {
  const [activeSection, setActiveSection] = useState('lumpsum');
  const [cancelTarget, setCancelTarget]   = useState<OrderRecord | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<OrderRecord | null>(null);
  const [redeemModal, setRedeemModal]     = useState(false);
  const [switchModal, setSwitchModal]     = useState(false);
  const [uccList, setUccList]             = useState<{ code: string; name: string; memberId: string; email: string; mobnum: string }[]>([]);
  const dataMap: Record<string, ModuleData> = { lumpsum, switch: switchOrd, redeem };
  const current = dataMap[activeSection];

  useEffect(() => {
    getUCCList({ start: 0, length: 50 })
      .then(res => {
        const list = (res?.data?.lists ?? []).map((inv: any) => {
          const h = inv.holder?.[0]; const c = h?.contact?.[0];
          const b = inv.bank_account?.[0];
          const dep = inv.depository?.[0];
          return {
            code:     inv.investor?.client_code ?? '',
            name:     `${h?.person?.first_name ?? ''} ${h?.person?.last_name ?? ''}`.trim() || inv.investor?.client_code,
            memberId: inv.member?.member_id ?? '',
            email:    c?.email_address ?? '',
            mobnum:   c?.contact_number ?? '',
            isDemat:  inv.is_client_demat === true,
            depository: dep ? { depository_code: dep.depository_code, dp_id: dep.dp_id, client_id: dep.client_id } : undefined,
            ifsc:     b?.ifsc_code ?? '',
            accNo:    b?.bank_acc_num ?? '',
            accType:  b?.bank_acc_type === 'CA' ? 'CB' : 'SB',
            bankName: b?.bank_name ?? '',
          };
        }).filter((u: any) => u.code);
        setUccList(list);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {/* Section tabs + Redeem button */}
      <div className="flex gap-2 flex-wrap items-center">
        {ORDER_SECTIONS.map(sec => (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              activeSection === sec.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {sec.icon} {sec.label}
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
              activeSection === sec.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {dataMap[sec.key].data.length}
            </span>
          </button>
        ))}
        <button
          onClick={() => setSwitchModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 border border-cyan-600 transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" /> New Switch
        </button>
        <button
          onClick={() => setRedeemModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-600 transition-colors"
        >
          <MinusCircle className="w-3.5 h-3.5" /> New Redemption
        </button>
      </div>

      {/* Content */}
      {!current.loaded && <TabLoader />}
      {current.loaded && current.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{current.error}</div>
      )}
      {current.loaded && !current.error && current.data.length === 0 && (
        <EmptyState
          icon={ORDER_SECTIONS.find(s => s.key === activeSection)?.icon}
          title="No orders found"
          sub="Orders placed via BSE StAR MF will appear here."
        />
      )}
      {current.loaded && !current.error && current.data.length > 0 && (
        <div className="space-y-3">
              <div className="hidden md:grid grid-cols-8 gap-3 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            <span className="col-span-2">Scheme</span>
            <span>Order ID</span>
            <span>UCC</span>
            <span>Amount</span>
            <span>Date</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {(current.data as OrderRecord[]).map((o, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-2xl px-5 py-4 grid grid-cols-2 md:grid-cols-8 gap-3 items-center hover:shadow-sm transition-shadow"
            >
              <div className="col-span-2 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate font-mono">{o.scheme || '—'}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Folio: {o.folio || '—'}</p>
              </div>
              <Field label="Order ID" value={String(o.id)} mono />
              <Field label="UCC" value={o.ucc} mono />
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Amount</p>
                <p className="text-sm font-bold text-gray-900">₹{Number(o.amount).toLocaleString('en-IN')}</p>
              </div>
              <Field label="Date" value={o.date} />
              <div>
                <span className={`text-[10px] font-bold border rounded-full px-2.5 py-1 ${statusColor(o.status)}`}>
                  {o.status}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setPaymentTarget(o)}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#1E3A6D] border border-[#1E3A6D]/30 bg-[#1E3A6D]/5 hover:bg-[#1E3A6D]/10 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <Receipt className="w-3 h-3" /> Payment
                </button>
                {CANCELLABLE_STATUSES.includes(o.status?.toLowerCase()) && (
                  <button
                    onClick={() => setCancelTarget(o)}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <Ban className="w-3 h-3" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <CancelOrderModal
          order={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={onRefresh}
        />
      )}

      {paymentTarget && (
        <PaymentDetailModal
          orderId={String(paymentTarget.id)}
          onClose={() => setPaymentTarget(null)}
        />
      )}

      {redeemModal && uccList.length > 0 && (
        <RedeemModal
          uccs={uccList}
          onClose={() => setRedeemModal(false)}
          onDone={() => { onRefresh(); setActiveSection('redeem'); }}
        />
      )}

      {switchModal && uccList.length > 0 && (
        <SwitchModal
          uccs={uccList}
          onClose={() => setSwitchModal(false)}
          onDone={() => { onRefresh(); setActiveSection('switch'); }}
        />
      )}
    </div>
  );
};

// ─── Register Mandate Modal ─────────────────────────────────────────────────
const RegisterMandateModal: React.FC<{
  uccs: { code: string; name: string; ifsc?: string; accNo?: string; accType?: string; bankName?: string; branch?: string }[];
  onClose: () => void;
  onDone: () => void;
}> = ({ uccs, onClose, onDone }) => {
  const [ucc, setUcc]           = useState(uccs[0]?.code ?? '');
  const [type, setType]         = useState<'U' | 'N' | 'X'>('U');
  const [requestType, setRequestType] = useState<'REGISTRATION' | 'ENTRY'>('REGISTRATION');
  const [ifsc, setIfsc]         = useState('');
  const [accNo, setAccNo]       = useState('');
  const [accType, setAccType]   = useState('SB');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch]     = useState('');
  const [vpa, setVpa]           = useState('');
  const [amount, setAmount]     = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validTill, setValidTill] = useState('2065-12-31');
  const [member, setMember]     = useState('0000');
  // ENACH ENTRY fields
  const [memberMandateId, setMemberMandateId] = useState('');
  const [umrnNumber, setUmrnNumber]           = useState('');
  const [utilityCode, setUtilityCode]         = useState('');
  const [sponsorCode, setSponsorCode]         = useState('');
  // NACH physical file upload
  const [fileBlob, setFileBlob] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg]     = useState('');
  const [result, setResult]     = useState<any>(null);

  // Auto-populate bank details from UCC when selection changes
  const selectedUccData = uccs.find(u => u.code === ucc);
  React.useEffect(() => {
    if (selectedUccData?.ifsc)    setIfsc(selectedUccData.ifsc.trim());
    if (selectedUccData?.accNo)   setAccNo(selectedUccData.accNo.trim());
    if (selectedUccData?.accType) setAccType(selectedUccData.accType);
    if (selectedUccData?.bankName) setBankName(selectedUccData.bankName.trim());
    if (selectedUccData?.branch)  setBranch(selectedUccData.branch.trim());
  }, [ucc]);

  // Cap valid_till to start_date + 30 years (BSE max)
  React.useEffect(() => {
    if (!startDate) return;
    const d = new Date(startDate);
    d.setFullYear(d.getFullYear() + 30);
    d.setDate(d.getDate() - 2);
    setValidTill(d.toISOString().split('T')[0]);
  }, [startDate]);

  const isEntry = type === 'N' && requestType === 'ENTRY';
  const isNach  = type === 'X';
  const hasBankOnFile = !!(selectedUccData?.ifsc && selectedUccData?.accNo);
  const upiAmountOk = type !== 'U' || Number(amount) <= 100000;
  const canSubmit = !!ucc && !!ifsc.trim() && !!accNo.trim() && !!bankName.trim() &&
    Number(amount) > 0 && upiAmountOk && (!isNach || !!fileBlob);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = () => setFileBlob((reader.result as string).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('loading'); setErrMsg('');
    try {
      const res = await registerMandate({
        ucc, member,
        bankDetails: {
          ifsc: ifsc.trim(), no: accNo.trim(), type: accType as 'SB' | 'CB',
          name: bankName.trim(), branch: branch.trim(),
          ...(type === 'U' && vpa.trim() ? { vpa: [vpa.trim()] } : {}),
        },
        amount: Number(amount),
        startDate, validTill, regDate: startDate,
        type, mode: type === 'U' ? 'DD' : 'ACH',
        requestType,
        ...(isEntry ? {
          memMandateInfo: {
            member_mandate_id: memberMandateId,
            mandate_status_date: new Date().toISOString(),
            umrn_number: umrnNumber,
            utility_code: utilityCode,
            sponsor_code: sponsorCode,
          },
          identifier: { identifier_type: '', file_name: '', file_blob: '', file_size: 0, issue_date: '' },
        } : {}),
        ...(isNach ? {
          identifier: { identifier_type: 'nach_scan_img', file_name: fileName, file_blob: fileBlob, file_size: fileSize },
        } : {}),
      });
      setResult(res);
      setStatus('success');
      setTimeout(() => { onDone(); onClose(); }, 1800);
    } catch (e: any) {
      setStatus('error');
      setErrMsg(e?.response?.data?.messages?.[0]?.errcode ?? e?.message ?? 'Registration failed');
    }
  };

  const typeLabels = { U: 'UPI Autopay', N: 'ENACH', X: 'NACH (Physical)' };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-purple-700 to-purple-800 px-6 py-4 text-white flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Register Mandate</p>
            <p className="text-[11px] text-white/60">BSE StAR MF · mandate_register</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {status === 'success' ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-bold text-gray-900">Mandate Registered!</p>
              <p className="text-xs text-gray-500">Your mandate has been submitted to BSE StAR MF.</p>
              {result?.data?.lists?.[0]?.exch_mandate_id && (
                <p className="text-xs font-mono text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                  Mandate ID: {result.data.lists[0].exch_mandate_id}
                </p>
              )}
            </div>
          ) : (
            <>
              {uccs.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Investor (UCC)</label>
                  <select value={ucc} onChange={e => setUcc(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none bg-white">
                    {uccs.map(u => <option key={u.code} value={u.code}>{u.name} ({u.code})</option>)}
                  </select>
                </div>
              )}

              {/* No bank account warning */}
              {!hasBankOnFile && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span><strong>No bank account on file</strong> for this UCC. Add a bank account via <strong>update_ucc</strong> before registering a mandate.</span>
                </div>
              )}

              {/* Mandate Type */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mandate Type</label>
                <div className="flex gap-2 mt-1.5">
                  {(['U', 'N', 'X'] as const).map(t => (
                    <button key={t} onClick={() => { setType(t); setRequestType('REGISTRATION'); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                        type === t ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                      }`}>
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* ENACH sub-type: REGISTRATION vs ENTRY */}
              {type === 'N' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Request Type</label>
                  <div className="flex gap-2 mt-1.5">
                    {(['REGISTRATION', 'ENTRY'] as const).map(rt => (
                      <button key={rt} onClick={() => setRequestType(rt)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                          requestType === rt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}>
                        {rt === 'REGISTRATION' ? 'Online (eNACH)' : 'Pre-approved (Entry)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">IFSC</label>
                  <input value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. ICIC0000178"
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300 uppercase" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Type</label>
                  <select value={accType} onChange={e => setAccType(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none bg-white">
                    <option value="SB">Savings (SB)</option>
                    <option value="CB">Current (CB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Number</label>
                <input value={accNo} onChange={e => setAccNo(e.target.value)}
                  placeholder="e.g. 017701504315"
                  className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Name</label>
                  <input value={bankName} onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. ICICI BANK"
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch</label>
                  <input value={branch} onChange={e => setBranch(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>

              {/* UPI VPA */}
              {type === 'U' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">UPI VPA (optional for Intent flow)</label>
                  <input value={vpa} onChange={e => setVpa(e.target.value)}
                    placeholder="e.g. name@hdfcbank"
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              )}

              {/* ENACH ENTRY extra fields */}
              {isEntry && (
                <div className="space-y-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Pre-approved Mandate Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Mandate ID</label>
                      <input value={memberMandateId} onChange={e => setMemberMandateId(e.target.value)}
                        placeholder="e.g. MM123456789"
                        className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">UMRN Number</label>
                      <input value={umrnNumber} onChange={e => setUmrnNumber(e.target.value)}
                        placeholder="e.g. UMRN987654321"
                        className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Utility Code</label>
                      <input value={utilityCode} onChange={e => setUtilityCode(e.target.value)}
                        placeholder="e.g. UTL000123"
                        className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sponsor Code</label>
                      <input value={sponsorCode} onChange={e => setSponsorCode(e.target.value)}
                        placeholder="e.g. SPN456789"
                        className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                  </div>
                </div>
              )}

              {/* NACH physical scan upload */}
              {isNach && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scanned Mandate Form (PNG/JPG)</label>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileChange}
                    className="w-full mt-1.5 text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200" />
                  {fileName && (
                    <p className="text-xs text-emerald-600 mt-1 font-semibold">✓ {fileName} ({(fileSize / 1024).toFixed(1)} KB)</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount (₹)</label>
                  <input type="number" min={1} max={type === 'U' ? 100000 : undefined} value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder={type === 'U' ? 'Max ₹1,00,000' : 'e.g. 15000'}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  {type === 'U' && Number(amount) > 100000 && (
                    <p className="text-xs text-rose-500 mt-1">UPI Autopay mandates are capped at ₹1,00,000 by BSE.</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Code</label>
                  <input value={member} onChange={e => setMember(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valid Till</label>
                  <input type="date" value={validTill} onChange={e => setValidTill(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-300" />
                </div>
              </div>

              {status === 'error' && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">❌ {errMsg}</p>
              )}

              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={!canSubmit || status === 'loading'}
                  className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {status === 'loading' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Registering…</> : 'Register Mandate'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Mandates Tab ─────────────────────────────────────────────────────────────
const MandatesTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [mandates, setMandates]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [uccs, setUccs]           = useState<{ code: string; name: string }[]>([]);
  const [registerModal, setRegisterModal] = useState(false);
  const [cancelTarget, setCancelTarget]   = useState<any | null>(null);
  const [linkRegNo, setLinkRegNo]         = useState('');
  const [linkMandateId, setLinkMandateId] = useState('');
  const [linkStatus, setLinkStatus]       = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [linkErr, setLinkErr]             = useState('');
  const [delinkRegNos, setDelinkRegNos]   = useState('');
  const [delinkStatus, setDelinkStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [delinkErr, setDelinkErr]         = useState('');

  const load = () => {
    setLoading(true); setError('');
    listMandates('', true, false, 0, 100)
      .then(res => { setMandates(res?.data?.lists ?? []); setLoading(false); })
      .catch(e => { setError(e?.message ?? 'Failed'); setLoading(false); });
  };

  useEffect(() => {
    load();
    getUCCList({ start: 0, length: 50 })
      .then(res => {
        const list = (res?.data?.lists ?? []).map((inv: any) => {
          const h = inv.holder?.[0];
          const b = inv.bank_account?.[0];
          return {
            code:     inv.investor?.client_code ?? '',
            name:     `${h?.person?.first_name ?? ''} ${h?.person?.last_name ?? ''}`.trim() || inv.investor?.client_code,
            ifsc:     b?.ifsc_code ?? '',
            accNo:    b?.bank_acc_num ?? '',
            accType:  b?.bank_acc_type === 'CA' ? 'CB' : 'SB',
            bankName: b?.bank_name ?? '',
            branch:   b?.branch ?? '',
          };
        }).filter((u: any) => u.code);
        setUccs(list);
      })
      .catch(() => {});
  }, []);

  const handleCancel = async (m: any) => {
    try {
      await cancelMandate([Number(m.exch_mandate_id ?? m.id)], m.investor?.ucc ?? m.ucc ?? '');
      load(); onRefresh();
    } catch (e: any) {
      alert(e?.message ?? 'Cancel failed');
    }
  };

  const handleLink = async () => {
    if (!linkRegNo || !linkMandateId) return;
    setLinkStatus('loading'); setLinkErr('');
    try {
      await linkMandate(linkRegNo.trim(), Number(linkMandateId.trim()));
      setLinkStatus('success'); setLinkRegNo(''); setLinkMandateId('');
      setTimeout(() => setLinkStatus('idle'), 2000);
    } catch (e: any) {
      setLinkStatus('error'); setLinkErr(e?.message ?? 'Link failed');
    }
  };

  const handleDelink = async () => {
    if (!delinkRegNos) return;
    setDelinkStatus('loading'); setDelinkErr('');
    try {
      await delinkMandate(delinkRegNos.split(',').map(s => s.trim()).filter(Boolean));
      setDelinkStatus('success'); setDelinkRegNos('');
      setTimeout(() => setDelinkStatus('idle'), 2000);
    } catch (e: any) {
      setDelinkStatus('error'); setDelinkErr(e?.message ?? 'Delink failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <CreditCard className="w-4 h-4 text-purple-600" />
        <p className="font-bold text-gray-900">Mandates</p>
        <span className="text-xs text-gray-400">{mandates.length} records</span>
        <button onClick={load} className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button onClick={() => setRegisterModal(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg px-3 py-1.5 transition-colors">
          <PlusCircle className="w-3.5 h-3.5" /> Register Mandate
        </button>
      </div>

      {/* List */}
      {loading && <TabLoader />}
      {!loading && error && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {!loading && !error && mandates.length === 0 && (
        <EmptyState icon={<CreditCard className="w-6 h-6" />} title="No mandates found" sub="Register a UPI, ENACH or NACH mandate to enable SIP auto-debit." />
      )}
      {!loading && !error && mandates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mandates.map((m, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                </div>
                <span className={`text-[10px] font-bold border rounded-full px-2.5 py-1 ${statusColor(m.status ?? 'pending')}`}>
                  {m.status ?? '—'}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">₹{Number(m.amount ?? 0).toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400">Mandate limit · {m.type === 'U' ? 'UPI' : m.type === 'N' ? 'ENACH' : m.type === 'X' ? 'NACH' : m.type ?? '—'}</p>
              </div>
              <div className="space-y-1.5">
                <Field label="Mandate ID" value={String(m.exch_mandate_id ?? m.id ?? '—')} mono />
                <Field label="UCC" value={m.investor?.ucc ?? m.ucc ?? '—'} mono />
                <Field label="Bank A/C" value={m.investor_bank_details?.no ?? m.bank_acc_num ?? '—'} mono />
                <Field label="Valid Till" value={m.valid_till ?? '—'} />
              </div>
              <button onClick={() => setCancelTarget(m)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-xl py-2 transition-colors mt-auto">
                <Ban className="w-3.5 h-3.5" /> Cancel Mandate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link / Delink */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Link */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-blue-600" />
            <p className="font-semibold text-gray-900 text-sm">Link Mandate to SIP</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SIP Reg. No.</label>
            <input value={linkRegNo} onChange={e => setLinkRegNo(e.target.value)}
              placeholder="e.g. 202500000004947"
              className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mandate ID</label>
            <input value={linkMandateId} onChange={e => setLinkMandateId(e.target.value)}
              placeholder="e.g. 500104151"
              className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          {linkStatus === 'error' && <p className="text-xs text-rose-600">{linkErr}</p>}
          {linkStatus === 'success' && <p className="text-xs text-emerald-600 font-semibold">✓ Linked successfully</p>}
          <button onClick={handleLink} disabled={!linkRegNo || !linkMandateId || linkStatus === 'loading'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {linkStatus === 'loading' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Linking…</> : <><Link className="w-3.5 h-3.5" /> Link Mandate</>}
          </button>
        </div>

        {/* Delink */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Unlink className="w-4 h-4 text-orange-600" />
            <p className="font-semibold text-gray-900 text-sm">Delink Mandate from SIP(s)</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SIP Reg. Nos. (comma-separated)</label>
            <input value={delinkRegNos} onChange={e => setDelinkRegNos(e.target.value)}
              placeholder="e.g. 202500000004947, 202500000004948"
              className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          {delinkStatus === 'error' && <p className="text-xs text-rose-600">{delinkErr}</p>}
          {delinkStatus === 'success' && <p className="text-xs text-emerald-600 font-semibold">✓ Delinked successfully</p>}
          <button onClick={handleDelink} disabled={!delinkRegNos || delinkStatus === 'loading'}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {delinkStatus === 'loading' ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Delinking…</> : <><Unlink className="w-3.5 h-3.5" /> Delink Mandate</>}
          </button>
        </div>
      </div>

      {/* Cancel confirm */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setCancelTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Ban className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Cancel Mandate?</p>
                <p className="text-xs text-gray-400 font-mono">ID: {cancelTarget.exch_mandate_id ?? cancelTarget.id}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">This will cancel the mandate and may affect linked SIPs.</p>
            <div className="flex gap-2">
              <button onClick={() => setCancelTarget(null)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50">Keep</button>
              <button onClick={() => { handleCancel(cancelTarget); setCancelTarget(null); }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">Cancel It</button>
            </div>
          </div>
        </div>
      )}

      {registerModal && uccs.length > 0 && (
        <RegisterMandateModal uccs={uccs} onClose={() => setRegisterModal(false)} onDone={() => { load(); onRefresh(); }} />
      )}
    </div>
  );
};

// ─── Explore Tab ──────────────────────────────────────────────────────────────
const ExploreTab: React.FC<{ onSwitchToSIPs: () => void }> = ({ onSwitchToSIPs }) => {
  const [schemes, setSchemes]   = useState<Scheme[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [category, setCategory] = useState('All');
  const [search, setSearch]     = useState('');
  const [investModal, setInvestModal] = useState<{ scheme: Scheme; mode: 'lumpsum' | 'sip' } | null>(null);
  const [uccs, setUccs] = useState<{ code: string; name: string; memberId: string; email: string; mobnum: string; isDemat: boolean; depository?: { depository_code: string; dp_id: string; client_id: string } }[]>([]);
  const [selectedUcc, setSelectedUcc] = useState('');

  useEffect(() => {
    getMasterSchemeList({ length: 200 })
      .then(res => { setSchemes(res?.data?.lists ?? []); setLoading(false); })
      .catch(e => { setError(e?.message ?? 'Failed to load schemes'); setLoading(false); });

    getUCCList({ start: 0, length: 50 })
      .then(res => {
        const list = (res?.data?.lists ?? []).map((inv: any) => {
          const h = inv.holder?.[0];
          const c = h?.contact?.[0];
          return {
            code:       inv.investor?.client_code ?? '',
            name:       `${h?.person?.first_name ?? ''} ${h?.person?.last_name ?? ''}`.trim() || inv.investor?.client_code,
            memberId:   inv.member?.member_id ?? '',
            email:      c?.email_address ?? '',
            mobnum:     c?.contact_number ?? '',
            isDemat:    inv.is_client_demat === true,
            depository: inv.depository?.[0] ? {
              depository_code: inv.depository[0].depository_code,
              dp_id:           inv.depository[0].dp_id,
              client_id:       inv.depository[0].client_id,
            } : undefined,
          };
        }).filter((u: any) => u.code);
        setUccs(list);
        if (list.length > 0) setSelectedUcc(list[0].code);
      })
      .catch(() => {});
  }, []);

  const categories = ['All', ...Array.from(new Set(schemes.map(s => s.scheme_category).filter(Boolean)))];

  const filtered = schemes
    .filter(s => category === 'All' || s.scheme_category === category)
    .filter(s =>
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.scheme_amc_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.scheme_amc_code?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-5">

      {/* Investor selector */}
      {uccs.length > 0 && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-500 shrink-0">Investing as</span>
          <select
            value={selectedUcc}
            onChange={e => setSelectedUcc(e.target.value)}
            className="flex-1 text-sm font-semibold text-gray-800 bg-transparent focus:outline-none"
          >
            {uccs.map(u => (
              <option key={u.code} value={u.code}>{u.name} ({u.code})</option>
            ))}
          </select>
        </div>
      )}
      {uccs.length === 0 && !loading && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-xs text-yellow-700 font-semibold">
          <User className="w-4 h-4" /> No investors registered. <a href="/bse-dashboard/add-ucc" className="underline">Add Investor</a> first.
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                category === cat
                  ? 'bg-[#00b386] text-white border-[#00b386]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#00b386] hover:text-[#00b386]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">{filtered.length} schemes</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search schemes or AMC..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] transition-all"
        />
      </div>

      {/* States */}
      {loading && <TabLoader />}
      {!loading && error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {/* Scheme cards grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((scheme, i) => (
            <SchemeCard
              key={`${scheme.scheme_isin || scheme.parent_scheme_code || 'scheme'}-${i}`}
              scheme={scheme}
              onInvest={(s, mode) => {
                if (!selectedUcc) return;
                setInvestModal({ scheme: s, mode });
              }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400 text-sm">
              No schemes found{search ? ` for "${search}"` : ''}.
            </div>
          )}
        </div>
      )}

      {/* Invest Modal */}
      {investModal && (() => {
        const ucc = uccs.find(u => u.code === selectedUcc);
        return (
          <InvestModal
            scheme={investModal.scheme}
            initialMode={investModal.mode}
            clientCode={selectedUcc}
            memberId={ucc?.memberId ?? ''}
            email={ucc?.email ?? ''}
            mobnum={ucc?.mobnum ?? ''}
            isDemat={ucc?.isDemat ?? false}
            depository={ucc?.depository}
            onClose={() => setInvestModal(null)}
            onViewSIPs={onSwitchToSIPs}
          />
        );
      })()}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const BSEDashboard: React.FC = () => {
  const navigate = useNavigate();
  const connected = isBSEConnected();

  // Redirect to login if not connected
  useEffect(() => {
    if (!connected) navigate('/mf-login', { replace: true });
  }, [connected]);

  const [ucc,      setUcc]      = useState<ModuleData>({ loaded: false, error: '', data: [] });
  const [mandate,  setMandate]  = useState<ModuleData>({ loaded: false, error: '', data: [] });
  const [sip,      setSip]      = useState<ModuleData>({ loaded: false, error: '', data: [] });
  const [lumpsum,  setLumpsum]  = useState<ModuleData>({ loaded: false, error: '', data: [] });
  const [switchOrd,setSwitchOrd]= useState<ModuleData>({ loaded: false, error: '', data: [] });
  const [redeem,   setRedeem]   = useState<ModuleData>({ loaded: false, error: '', data: [] });

  const loadAll = async () => {
    // Reset
    const reset = { loaded: false, error: '', data: [] };
    setUcc(reset); setMandate(reset); setSip(reset);
    setLumpsum(reset); setSwitchOrd(reset); setRedeem(reset);

    // 1. UCC
    try {
      const res = await getUCCList({ start: 0, length: 50 });
      const lists = res?.data?.lists ?? [];
      const mapped: UCCRecord[] = lists.map((inv: any) => {
        const holder = inv.holder?.[0];
        const bank   = inv.bank_account?.[0];
        return {
          ucc:      inv.investor?.client_code ?? '—',
          name:     `${holder?.person?.first_name ?? ''} ${holder?.person?.last_name ?? ''}`.trim() || '—',
          pan:      holder?.identifier?.[0]?.identifier_number ?? '—',
          email:    holder?.contact?.[0]?.email_address ?? '—',
          mobile:   holder?.contact?.[0]?.contact_number ?? '—',
          status:   inv.ucc_status ?? '—',
          bank:     bank?.bank_acc_num ?? '—',
          bankIfsc: bank?.ifsc_code ?? '—',
        };
      });
      setUcc({ loaded: true, error: '', data: mapped });
    } catch (e: any) {
      setUcc({ loaded: true, error: e?.message ?? 'Failed to load UCCs', data: [] });
    }

    // 2. Mandates
    try {
      const res = await listMandates('', true, false, 0, 50);
      const lists = res?.data?.lists ?? [];
      const mapped: MandateRecord[] = lists.map((m: any) => ({
        id:        m.exch_mandate_id ?? m.id ?? '—',
        ucc:       m.investor?.ucc ?? m.ucc ?? '—',
        bank:      m.investor_bank_details?.no ?? m.bank_acc_num ?? '—',
        amount:    m.amount ?? 0,
        status:    m.status ?? '—',
        startDate: m.start_date ?? '—',
        validTill: m.valid_till ?? '—',
      }));
      setMandate({ loaded: true, error: '', data: mapped });
    } catch (e: any) {
      setMandate({ loaded: true, error: e?.message ?? 'Failed to load mandates', data: [] });
    }

    // 3. SIPs
    try {
      const res = await listSxp({ type: ['SIP'] }, 0, 50);
      const lists = res?.data?.lists ?? [];
      const mapped: SIPRecord[] = lists.map((s: any) => ({
        id:           s.sxp_id ?? s.reg_no ?? s.id ?? '—',
        ucc:          s.investor?.ucc ?? '—',
        scheme:       s.src_scheme ?? s.scheme ?? '—',
        amount:       s.amount ?? 0,
        freq:         s.freq === 'm' ? 'Monthly' : s.freq === 'q' ? 'Quarterly' : s.freq ?? '—',
        startDate:    s.start_date ?? '—',
        status:       s.status ?? '—',
        installments: s.ninstallments ?? 0,
      }));
      setSip({ loaded: true, error: '', data: mapped });
    } catch (e: any) {
      setSip({ loaded: true, error: e?.message ?? 'Failed to load SIPs', data: [] });
    }

    // 4. All orders — fetched once, split by type client-side
    try {
      const res = await listOrders({}, 0, 200);
      const lists = res?.data?.lists ?? [];
      const mapOrder = (o: any, type: string): OrderRecord => ({
        id:     o.id ?? '—',
        ucc:    o.investor?.ucc ?? o.ucc ?? '—',
        scheme: o.scheme ?? '—',
        type,
        amount: o.amount ?? 0,
        status: o.status ?? '—',
        date:   o.created_at?.split('T')[0] ?? o.txn_date ?? '—',
        folio:  o.folio ?? '—',
      });
      setLumpsum({ loaded: true, error: '', data: lists.filter((o: any) => o.type === 'p').map((o: any) => mapOrder(o, 'Purchase')) });
      setSwitchOrd({ loaded: true, error: '', data: lists.filter((o: any) => o.type === 's').map((o: any) => mapOrder(o, 'Switch')) });
      setRedeem({ loaded: true, error: '', data: lists.filter((o: any) => o.type === 'r').map((o: any) => mapOrder(o, 'Redemption')) });
    } catch (e: any) {
      const err = e?.message ?? 'Failed to load orders';
      setLumpsum({ loaded: true, error: err, data: [] });
      setSwitchOrd({ loaded: true, error: err, data: [] });
      setRedeem({ loaded: true, error: err, data: [] });
    }
  };

  useEffect(() => { if (connected) loadAll(); }, []);

  const handleLogout = () => {
    clearBSEToken();
    navigate('/mf-login', { replace: true });
  };

  const [activeTab, setActiveTab] = useState('explore');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allLoaded = ucc.loaded && mandate.loaded && sip.loaded && lumpsum.loaded && switchOrd.loaded && redeem.loaded;

  if (!connected) return null;

  const NAV_TABS = [
    { id: 'explore',     label: 'Explore Funds',  icon: <Search className="w-5 h-5" /> },
    { id: 'investments', label: 'My Investments', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'sips',        label: 'My SIPs',        icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'orders',      label: 'Orders',         icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'mandates',    label: 'Mandates',       icon: <CreditCard className="w-5 h-5" /> },
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full bg-[#1E3A6D] ${ mobile ? 'w-72' : 'w-64' }`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
          <img src="/logo.png" alt="Lendrix" className="w-8 h-8 object-contain" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Lendrix MF</p>
          <p className="text-[10px] text-white/50">BSE StAR MF Platform</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* BSE status */}
      <div className="mx-4 mt-4 flex items-center gap-2 bg-[#00b386]/15 border border-[#00b386]/30 rounded-xl px-3 py-2">
        <CheckCircle2 className="w-4 h-4 text-[#00b386] shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-[#00b386]">BSE Connected</p>
          <p className="text-[10px] text-white/40">StAR MF · Direct Plans</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-5 space-y-1">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2">Navigation</p>
        {NAV_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#00b386] text-white shadow-lg shadow-[#00b386]/30'
                : 'text-white/60 hover:bg-white/8 hover:text-white'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-white' : 'text-white/50'}>{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        ))}
      </nav>

      {/* Quick actions */}
      <div className="px-3 mb-4 space-y-2">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-2">Quick Actions</p>
        <button
          onClick={() => { navigate('/bse-dashboard/add-ucc'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold bg-white/8 hover:bg-white/15 text-white transition-all border border-white/10"
        >
          <UserPlus className="w-5 h-5 text-[#00b386]" />
          Add Investor
        </button>

      </div>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-white/10 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-white/60 hover:bg-rose-500/15 hover:text-rose-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 shadow-2xl">
        <Sidebar />
      </aside>

      {/* ── Mobile Sidebar overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 shadow-2xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page title */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1E3A6D]">
                {NAV_TABS.find(t => t.id === activeTab)?.label}
              </span>
              <span className="hidden sm:block text-xs text-gray-400">· BSE StAR MF</span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-sm mx-4 relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search funds, AMCs..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#00b386]/30 focus:border-[#00b386] transition-all"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                title="Notifications"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-400 rounded-full" />
              </button>
              {/* Mobile: Add Investor shortcut */}
              <button
                onClick={() => navigate('/bse-dashboard/add-ucc')}
                className="lg:hidden flex items-center gap-1.5 text-xs font-semibold text-white bg-[#00b386] hover:bg-[#009e78] rounded-full px-3 py-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </header>

        {/* Hero strip */}
        <div className="bg-gradient-to-r from-[#1E3A6D] to-[#1a4f7a] text-white px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Lendrix · BSE StAR MF · Direct Plans</p>
              <h1 className="text-xl sm:text-2xl font-bold">
                Invest Smart. <span className="text-[#00b386]">Grow Faster.</span>
              </h1>
              <p className="text-xs text-white/60 mt-1">Zero commission · 2,500+ funds · SIP from ₹500</p>
            </div>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {[
                { v: '2,500+', l: 'Funds' },
                { v: '₹500',   l: 'Min SIP' },
                { v: '0%',     l: 'Commission' },
              ].map(s => (
                <div key={s.l} className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-center">
                  <p className="text-base font-bold">{s.v}</p>
                  <p className="text-[10px] text-white/50">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {activeTab === 'explore'     && <ExploreTab onSwitchToSIPs={() => setActiveTab('sips')} />}
          {activeTab === 'investments' && <InvestmentsTab ucc={ucc} mandate={mandate} />}
          {activeTab === 'sips'        && <SIPsTab sip={sip} onRefresh={loadAll} />}
          {activeTab === 'orders'      && <OrdersTab lumpsum={lumpsum} switchOrd={switchOrd} redeem={redeem} onRefresh={loadAll} />}
          {activeTab === 'mandates'    && <MandatesTab onRefresh={loadAll} />}
        </main>
      </div>
    </div>
  );
};

export default BSEDashboard;
