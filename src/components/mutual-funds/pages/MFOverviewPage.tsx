import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Wallet, Activity, ShoppingCart,
  ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, AlertCircle,
  PlusCircle, List, PieChart, Receipt, ArrowLeftRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import iwAxios from '@/api/axios';
import { resolvePAN } from '../hooks/useDemoPAN';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SnapshotRow {
  name: string;
  total: number;
  equity?: number;
  hybridValue?: number;
  other?: number;
}

interface OverviewData {
  currentValue: number;
  purchaseValue: number;
  gain: number;
  xirr: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtPct = (n: number | null) =>
  n == null || isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

const todayStr = new Date().toISOString().split('T')[0];

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Explore Funds',   href: '/dashboard/mf/invest',          icon: ShoppingCart,   color: 'bg-blue-50 text-blue-700 hover:bg-blue-100'    },
  { label: 'Start a SIP',     href: '/dashboard/mf/sips/register',   icon: PlusCircle,     color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { label: 'My Portfolio',    href: '/dashboard/mf/portfolio',        icon: PieChart,       color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
  { label: 'My SIPs',         href: '/dashboard/mf/sips',            icon: Activity,       color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'    },
  { label: 'Redeem',          href: '/dashboard/mf/orders/redeem',   icon: Receipt,        color: 'bg-rose-50 text-rose-700 hover:bg-rose-100'    },
  { label: 'Switch',          href: '/dashboard/mf/orders/switch',   icon: ArrowLeftRight, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { label: 'Order History',   href: '/dashboard/mf/orders/list',     icon: List,           color: 'bg-gray-50 text-gray-700 hover:bg-gray-100'    },
  { label: 'Capital Gains',   href: '/dashboard/mf/capital-gains',   icon: TrendingUp,     color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
];

// ── NSE Platform Banner ───────────────────────────────────────────────────────

const NSEBanner: React.FC = () => (
  <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-[#0D3B66] to-[#1565a8] p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">NSE Mutual Fund Platform</p>
      <p className="text-base font-bold mt-0.5">Direct NSE MF investments, SIPs, mandates and reports</p>
      <p className="text-xs text-blue-200 mt-1">Separate session required — uses your NSE member credentials</p>
    </div>
    <Link
      to="/nse-login"
      className="shrink-0 inline-flex items-center gap-2 bg-white text-[#0D3B66] font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
    >
      Open NSE Platform <ArrowUpRight className="w-4 h-4" />
    </Link>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const MFOverviewPage: React.FC = () => {
  const pan = resolvePAN();

  const [data, setData]       = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!pan) return;
    setLoading(true);
    setError(null);
    try {
      const filters = [
        { toDate: todayStr },
        { fromDate: '2000-01-01' },
        { pan, panWiseData: true },
      ];
      const preferences = [
        { products: [{ name: 'MF', isRequired: true }] },
        { includeBenchmark: false },
      ];
      const { data: json } = await iwAxios.get('/aggregator/reports/getInvestmentSnapShot', {
        params: {
          filters: JSON.stringify(filters),
          preferences: JSON.stringify(preferences),
        },
      });

      if (json.status === -1) {
        // Client not found or no data — show empty state, not an error
        setData(null);
        return;
      }
      if (json.status !== 0) throw new Error(json.message ?? 'Failed to load portfolio snapshot');

      const rows: SnapshotRow[] = Array.isArray(json.result?.data) ? json.result.data : [];
      const get = (name: string) => rows.find(r => r.name === name)?.total ?? 0;

      setData({
        currentValue:  get('currentValue'),
        purchaseValue: get('purchaseValue'),
        gain:          get('gain'),
        xirr:          rows.find(r => r.name === 'XIRR')?.total ?? null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unable to load portfolio data';
      // Surface only non-sensitive messages
      setError(msg.includes('401') || msg.includes('403') || msg.includes('token')
        ? 'Session expired. Please sign in again.'
        : msg);
    } finally {
      setLoading(false);
    }
  }, [pan]);

  useEffect(() => { load(); }, [load]);

  const gainPositive = (data?.gain ?? 0) >= 0;
  const absReturn = data && data.purchaseValue > 0
    ? ((data.currentValue - data.purchaseValue) / data.purchaseValue) * 100
    : null;

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mutual Funds Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pan ? `Portfolio for PAN: ${pan}` : 'Your investment summary'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Portfolio summary banner */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-gray-500">Loading portfolio data…</span>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Unable to load portfolio</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      ) : !pan ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-10 text-center">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No investor PAN configured</p>
            <p className="text-sm text-gray-400 mt-1">
              Visit <Link to="/dashboard/mf/investor-profile" className="text-blue-600 underline">Investor Profile</Link> to set up your account.
            </p>
          </CardContent>
        </Card>
      ) : data && data.currentValue > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden border-0 shadow-md bg-gradient-to-br from-[#0D3B66] to-[#1a5fa8] text-white"
        >
          <div className="flex flex-col lg:flex-row">
            {/* Current value */}
            <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-white/10">
              <p className="text-xs uppercase tracking-widest text-white/60 mb-1">Current Portfolio Value</p>
              <p className="text-4xl font-extrabold tracking-tight">{fmt(data.currentValue)}</p>
              <div className="flex items-center gap-2 mt-2">
                {gainPositive
                  ? <ArrowUpRight className="w-4 h-4 text-green-300" />
                  : <ArrowDownRight className="w-4 h-4 text-red-300" />}
                <span className={`text-sm font-semibold ${gainPositive ? 'text-green-300' : 'text-red-300'}`}>
                  {gainPositive ? '+' : ''}{fmt(data.gain)}
                </span>
                <span className="text-xs text-white/50">unrealized gain</span>
              </div>
              <p className="text-xs text-white/40 mt-3">
                Source: Investwell · as of {todayStr}
              </p>
            </div>

            {/* Metric pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/10 lg:w-[55%]">
              {[
                { icon: <Wallet className="w-4 h-4" />,    label: 'Invested',    value: fmt(data.purchaseValue),       up: true },
                { icon: <TrendingUp className="w-4 h-4" />, label: 'Abs. Return', value: fmtPct(absReturn),             up: (absReturn ?? 0) >= 0 },
                { icon: <Activity className="w-4 h-4" />,   label: 'XIRR',        value: fmtPct(data.xirr),             up: (data.xirr ?? 0) >= 0 },
                { icon: gainPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
                  label: 'Gain / Loss', value: `${gainPositive ? '+' : ''}${fmt(data.gain)}`, up: gainPositive },
              ].map((m, i) => (
                <div key={i} className="bg-white/5 hover:bg-white/10 transition-colors p-4">
                  <div className="flex items-center gap-1.5 text-white/50 mb-1">
                    {m.icon}
                    <span className="text-xs uppercase tracking-wide">{m.label}</span>
                  </div>
                  <p className={`text-base font-bold ${m.up ? 'text-white' : 'text-red-300'}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="p-10 text-center">
            <PieChart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">No portfolio data found</p>
            <p className="text-sm text-gray-400 mt-1">Start investing to see your portfolio summary here.</p>
            <Link
              to="/dashboard/mf/invest"
              className="inline-flex items-center gap-2 mt-4 bg-[#0D3B66] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#092d4e] transition-colors"
            >
              <ShoppingCart className="w-4 h-4" /> Explore Funds
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
            <Link
              key={href}
              to={href}
              className={`flex flex-col items-center gap-2 rounded-2xl border border-gray-200 p-4 text-center transition-all hover:shadow-md ${color}`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* NSE platform banner */}
      <NSEBanner />

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Portfolio data is sourced from Investwell and reflects the last available NAV.
        Returns shown are based on purchase cost and current value — they are not guaranteed future returns.
        NAV and returns for individual schemes are available on the{' '}
        <Link to="/dashboard/mf/portfolio" className="underline">Portfolio</Link> page.
      </p>
    </div>
  );
};

export default MFOverviewPage;
