import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMFSchemes } from '@/hooks/useMFSchemes';
import type { TransformedScheme } from '@/services/starmf/schemeTransformService';
import {
  Search, SlidersHorizontal, TrendingUp, Shield, Zap, Star,
  ChevronRight, ArrowUpRight, X, Loader2, BookmarkPlus,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Equity', 'Debt', 'Hybrid', 'Index & ETF', 'ELSS', 'Liquid'];
const SORT_OPTIONS = [
  { label: 'Popularity',   value: 'popular' },
  { label: 'Returns: High to Low', value: 'returns_desc' },
  { label: 'Returns: Low to High', value: 'returns_asc' },
  { label: 'Name: A–Z',    value: 'name_asc' },
  { label: 'Min Amount ↑', value: 'min_asc' },
];
const RISK_LEVELS = ['All Risk', 'Low', 'Moderate', 'High', 'Very High'];

// Deterministic mock returns based on scheme name hash (consistent per fund)
function mockReturns(name: string): { y1: number; y3: number; y5: number } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  const base = 8 + (h % 20);
  return { y1: +(base + (h % 7) - 3).toFixed(1), y3: +(base + 2).toFixed(1), y5: +(base + 4).toFixed(1) };
}

function mockNAV(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return +((h % 900) + 10).toFixed(2);
}

function mockRating(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return 3 + (h % 3); // 3, 4, or 5
}

function getRisk(scheme: TransformedScheme): string {
  const n = scheme.name.toLowerCase();
  if (n.includes('liquid') || n.includes('overnight') || n.includes('money market')) return 'Low';
  if (n.includes('debt') || n.includes('bond') || n.includes('gilt') || n.includes('income')) return 'Low to Moderate';
  if (n.includes('hybrid') || n.includes('balanced') || n.includes('conservative')) return 'Moderate';
  if (n.includes('index') || n.includes('nifty') || n.includes('sensex') || n.includes('etf')) return 'Moderate';
  if (n.includes('small') || n.includes('micro')) return 'Very High';
  if (n.includes('mid')) return 'High';
  if (n.includes('elss') || n.includes('tax')) return 'High';
  return 'Moderate to High';
}

function getCategory(scheme: TransformedScheme): string {
  const n = scheme.name.toLowerCase();
  if (n.includes('liquid') || n.includes('overnight') || n.includes('money market')) return 'Liquid';
  if (n.includes('elss') || n.includes('tax saver') || n.includes('tax saving')) return 'ELSS';
  if (n.includes('index') || n.includes('nifty') || n.includes('sensex') || n.includes('etf')) return 'Index & ETF';
  if (n.includes('hybrid') || n.includes('balanced') || n.includes('aggressive') || n.includes('conservative')) return 'Hybrid';
  if (n.includes('debt') || n.includes('bond') || n.includes('gilt') || n.includes('income') || n.includes('credit')) return 'Debt';
  return 'Equity';
}

function getRiskColor(risk: string) {
  if (risk === 'Low') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (risk === 'Low to Moderate') return 'text-teal-600 bg-teal-50 border-teal-200';
  if (risk === 'Moderate') return 'text-blue-600 bg-blue-50 border-blue-200';
  if (risk === 'Moderate to High') return 'text-amber-600 bg-amber-50 border-amber-200';
  if (risk === 'High') return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-rose-600 bg-rose-50 border-rose-200';
}

function getCategoryColor(cat: string) {
  const map: Record<string, string> = {
    'Equity':    'text-blue-700 bg-blue-50',
    'Debt':      'text-purple-700 bg-purple-50',
    'Hybrid':    'text-amber-700 bg-amber-50',
    'Index & ETF': 'text-cyan-700 bg-cyan-50',
    'ELSS':      'text-emerald-700 bg-emerald-50',
    'Liquid':    'text-gray-700 bg-gray-100',
  };
  return map[cat] ?? 'text-gray-700 bg-gray-100';
}

// AMC short name from full scheme name
function amcShort(name: string): string {
  const stopWords = ['Mutual', 'Fund', 'MF', 'Asset', 'Trustee', 'Management'];
  return name.split(' ').filter(w => !stopWords.includes(w)).slice(0, 2).join(' ');
}

// AMC logo letter avatar
function AmcAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-orange-500', 'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xff;
  const color = colors[h % colors.length];
  const letter = name.trim()[0]?.toUpperCase() ?? '?';
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  return (
    <div className={`${sz} ${color} rounded-xl flex items-center justify-center text-white font-bold shrink-0`}>
      {letter}
    </div>
  );
}

// Star rating
function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= count ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`} />
      ))}
    </div>
  );
}

// Mini sparkline SVG
function Sparkline({ positive }: { positive: boolean }) {
  const color = positive ? '#10b981' : '#f43f5e';
  const path = positive
    ? 'M0,20 C10,18 20,14 30,12 S50,6 60,4 S80,2 90,1'
    : 'M0,2 C10,4 20,8 30,10 S50,14 60,16 S80,18 90,20';
  return (
    <svg viewBox="0 0 90 22" className="w-16 h-6" preserveAspectRatio="none">
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Fund Card ────────────────────────────────────────────────────────────────
const FundCard: React.FC<{ scheme: TransformedScheme; onInvest: () => void }> = ({ scheme, onInvest }) => {
  const returns = mockReturns(scheme.name);
  const nav = mockNAV(scheme.name);
  const rating = mockRating(scheme.name);
  const risk = getRisk(scheme);
  const category = getCategory(scheme);
  const isPositive = returns.y1 >= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Top */}
      <div className="p-4 flex-1">
        <div className="flex items-start gap-3">
          <AmcAvatar name={scheme.parentSchemeName || scheme.name} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{scheme.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{amcShort(scheme.parentSchemeName || scheme.name)}</p>
          </div>
          <button className="text-gray-300 hover:text-blue-500 transition-colors shrink-0 mt-0.5">
            <BookmarkPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(category)}`}>{category}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRiskColor(risk)}`}>{risk}</span>
          {scheme.plan === 'Direct' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">Direct</span>
          )}
        </div>

        {/* Returns row */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[['1Y', returns.y1], ['3Y', returns.y3], ['5Y', returns.y5]].map(([label, val]) => (
            <div key={label as string} className="text-center">
              <p className={`text-sm font-bold ${Number(val) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {Number(val) >= 0 ? '+' : ''}{val}%
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label} returns</p>
            </div>
          ))}
        </div>

        {/* NAV + sparkline */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400">NAV</p>
            <p className="text-sm font-semibold text-gray-800">₹{nav}</p>
          </div>
          <Sparkline positive={isPositive} />
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Min SIP</p>
            <p className="text-sm font-semibold text-gray-800">₹{(scheme.minPurchaseAmount ?? 500).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="mt-3 flex items-center gap-2">
          <Stars count={rating} />
          <span className="text-[10px] text-gray-400">{rating}.0 / 5</span>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2">
        <button
          onClick={onInvest}
          className="flex-1 bg-[#0D3B66] hover:bg-[#092d4e] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          Invest Now
        </button>
        <button
          onClick={onInvest}
          className="px-3 py-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const MFInvestPage: React.FC = () => {
  const navigate = useNavigate();
  const { amcs, allSchemes, loading, error, retry } = useMFSchemes();

  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [sort, setSort]           = useState('popular');
  const [risk, setRisk]           = useState('All Risk');
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 12;

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, category, sort, risk]);

  const filtered = useMemo(() => {
    let list = allSchemes;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.parentSchemeName.toLowerCase().includes(q) ||
        s.isin.toLowerCase().includes(q)
      );
    }

    if (category !== 'All') {
      list = list.filter(s => getCategory(s) === category);
    }

    if (risk !== 'All Risk') {
      list = list.filter(s => getRisk(s).startsWith(risk));
    }

    if (sort === 'name_asc') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'returns_desc') list = [...list].sort((a, b) => mockReturns(b.name).y1 - mockReturns(a.name).y1);
    else if (sort === 'returns_asc')  list = [...list].sort((a, b) => mockReturns(a.name).y1 - mockReturns(b.name).y1);
    else if (sort === 'min_asc')      list = [...list].sort((a, b) => (a.minPurchaseAmount ?? 500) - (b.minPurchaseAmount ?? 500));

    return list;
  }, [allSchemes, search, category, sort, risk]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = paginated.length < filtered.length;

  const handleInvest = (scheme: TransformedScheme) => {
    navigate(`/dashboard/mf/orders/purchase?scheme=${encodeURIComponent(scheme.bseCode || scheme.isin)}&name=${encodeURIComponent(scheme.name)}`);
  };

  // Category counts
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allSchemes.length };
    allSchemes.forEach(s => {
      const c = getCategory(s);
      counts[c] = (counts[c] ?? 0) + 1;
    });
    return counts;
  }, [allSchemes]);

  return (
    <div className="space-y-5">

      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0D3B66] to-[#1565a8] p-6 text-white">
        <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Lendrix Ventech</p>
        <h1 className="text-2xl font-bold mt-1">Invest in Mutual Funds</h1>
        <p className="text-sm text-blue-100 mt-1">Direct plans · Zero commission · BSE StAR MF powered</p>
        <div className="mt-4 flex gap-6">
          {[['1000+', 'Funds'], ['₹500', 'Min SIP'], ['0%', 'Commission']].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="text-lg font-bold">{val}</p>
              <p className="text-xs text-blue-200">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mock data notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <strong>Note:</strong> NAV, returns, ratings and sparklines shown on fund cards are illustrative estimates
        derived from scheme names. They are <strong>not real market data</strong>. Actual NAV and performance
        data require a separate data feed not yet integrated. Scheme codes, plan types and minimum investment
        amounts are sourced from BSE StAR MF and are accurate.
      </div>

      {/* Search + Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search funds, AMC, ISIN..."
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilter(f => !f)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${showFilter ? 'bg-[#0D3B66] text-white border-[#0D3B66]' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="hidden sm:block px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Level</p>
            <div className="flex flex-wrap gap-2">
              {RISK_LEVELS.map(r => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${risk === r ? 'bg-[#0D3B66] text-white border-[#0D3B66]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:hidden">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort By</p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setSort(o.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${sort === o.value ? 'bg-[#0D3B66] text-white border-[#0D3B66]' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
              category === cat
                ? 'bg-[#0D3B66] text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {cat}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${category === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {catCounts[cat] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-800">{paginated.length}</span> of <span className="font-semibold text-gray-800">{filtered.length}</span> funds
          {search && <> for "<span className="text-blue-600">{search}</span>"</>}
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-gray-500">Loading funds from BSE StAR MF...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="font-semibold text-gray-900">Unable to load funds</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button onClick={retry} className="mt-4 px-5 py-2.5 bg-[#0D3B66] text-white rounded-xl text-sm font-semibold hover:bg-[#092d4e] transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Fund grid */}
      {!loading && !error && (
        <>
          {paginated.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
              <Search className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="mt-3 font-semibold text-gray-500">No funds found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search or filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginated.map((scheme, i) => (
                <FundCard key={`${scheme.isin}-${i}`} scheme={scheme} onInvest={() => handleInvest(scheme)} />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setPage(p => p + 1)}
                className="px-8 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                Load more funds ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MFInvestPage;
