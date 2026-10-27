import { NSEIcon, NSEButton, NSESummary, NSEHeading } from '@/components/nse/NSEPresentation';
import NSEKycStatus from '@/components/nse/NSEKycStatus';
import NSEWorkspaceSection from '@/components/nse/NSEWorkspaceSection';
import NSEFatcaRegistration from '@/components/nse/NSEFatcaRegistration';
import NSEChangeApiSecret from '@/components/nse/NSEChangeApiSecret';
import NSENftUpdates from '@/components/nse/NSENftUpdates';
import NSEAmcPauseReport from '@/components/nse/NSEAmcPauseReport';
import NSEEkycRegistration from '@/components/nse/NSEEkycRegistration';
import NSEStepups from '@/components/nse/NSEStepups';
import NSEFundAgeReport from '@/components/nse/NSEFundAgeReport';
import NSEFundAllocationReport from '@/components/nse/NSEFundAllocationReport';
import NSEPoaUpload from '@/components/nse/NSEPoaUpload';
import NSETwoFaReport from '@/components/nse/NSETwoFaReport';
import NSEDeliveryReport from '@/components/nse/NSEDeliveryReport';
import NSEBankUpdate from '@/components/nse/NSEBankUpdate';
import NSEChequeUpload from '@/components/nse/NSEChequeUpload';
import NSEElogReport from '@/components/nse/NSEElogReport';
import NSEAofReport from '@/components/nse/NSEAofReport';
import NSEFatcaReport from '@/components/nse/NSEFatcaReport';
import NSEClientDetail from '@/components/nse/NSEClientDetail';
import NSEClientAuthorization from '@/components/nse/NSEClientAuthorization';
import NSESwitchFlow from '@/components/nse/NSESwitchFlow';
import NSETransactionReport from '@/components/nse/NSETransactionReport';
import NSELifecycleReport from '@/components/nse/NSELifecycleReport';
import NSEPayoutReport from '@/components/nse/NSEPayoutReport';
import NSERedemptionStatements from '@/components/nse/NSERedemptionStatements';
import NSESwpCancellations from '@/components/nse/NSESwpCancellations';
import NSESwpInstallmentsDue from '@/components/nse/NSESwpInstallmentsDue';
import NSESwpReport from '@/components/nse/NSESwpReport';
import NSEStpCancellations from '@/components/nse/NSEStpCancellations';
import NSEStpInstallmentsDue from '@/components/nse/NSEStpInstallmentsDue';
import NSEStpReport from '@/components/nse/NSEStpReport';
import NSEXsipTopups from '@/components/nse/NSEXsipTopups';
import NSESipTopups from '@/components/nse/NSESipTopups';
import NSESipNavigation from '@/components/nse/NSESipNavigation';
import NSEXsipCancellations from '@/components/nse/NSEXsipCancellations';
import NSEXsipInstallmentsDue from '@/components/nse/NSEXsipInstallmentsDue';
import NSEXsipReport from '@/components/nse/NSEXsipReport';
import NSEXsipFlow from '@/components/nse/NSEXsipFlow';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import NSESipCancellations from '@/components/nse/NSESipCancellations';
import NSESipReport from '@/components/nse/NSESipReport';
import NSESipInstallmentsDue from '@/components/nse/NSESipInstallmentsDue';
import NSEResendCommunication from '@/components/nse/NSEResendCommunication';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isNSEConnected, clearNSEToken } from '@/services/nseAuth';
import { getNSESchemeMaster, type NSEScheme } from '@/services/nseSchemeService';
import { NSEApiError } from '@/services/nseApi';
import NSEUpiStatusCheck from '@/components/nse/NSEUpiStatusCheck';
import NSEOrderReports from '@/components/nse/NSEOrderReports';
import NSEAllotmentStatements from '@/components/nse/NSEAllotmentStatements';
import NSEMandates from '@/components/nse/NSEMandates';
import type { NSEMandateRecord } from '@/services/nseMandateService';
import type { NSEAllotmentRow } from '@/services/nseAllotmentService';
import type { NSEOrderReportRow } from '@/services/nseOrderReportService';
import NSEInvestmentFlow, { type NSEDemoOrder } from '@/components/nse/NSEInvestmentFlow';
import { TrendingUp, ShoppingCart, Wallet, LogOut, Menu, X, Search, ArrowRight, CreditCard, CalendarDays, RefreshCw, Users, Shield, FileText } from 'lucide-react';

type SessionTab = 'explore' | 'investments' | 'sips' | 'orders' | 'mandates';
type Tab = SessionTab | 'transactions' | 'admin' | 'clients' | 'reports';
const SECTION_PATHS: Record<Tab, string> = { explore: 'explore-funds', clients: 'investor-details', mandates: 'bank-auto-debit', sips: 'sip-and-other-plans', orders: 'orders-this-visit', transactions: 'transactions', investments: 'unit-allotments', reports: 'reports', admin: 'admin' };
const NAVIGATION = [
  { id: 'admin', label: 'Admin', icon: Shield, description: 'User Master and Rights Management' },
  { id: 'clients', label: 'Investor details', icon: Users, description: 'Register an investor and complete KYC, bank details, documents and nominees.' },
  { id: 'transactions', label: 'Transactions', icon: FileText, description: 'View existing Mutual funds transactions and their order, payment and allotment status.' },
  { id: 'explore', label: 'Explore funds', icon: ShoppingCart, description: 'Find a mutual fund, compare scheme details, and start a purchase or SIP.' },
  { id: 'sips', label: 'SIP & other plans', icon: CalendarDays, description: 'Set up or manage regular investments, transfers and withdrawals.' },
  { id: 'mandates', label: 'Bank auto-debit', icon: CreditCard, description: 'Authorize a bank mandate for automatic payments and check its approval.' },
  { id: 'reports', label: 'Reports', icon: FileText, description: 'Client, order, plan, settlement and payment reports' },
  { id: 'orders', label: 'Orders this visit', icon: ShoppingCart, description: 'View orders placed during this visit and check their latest status.' },
  { id: 'investments', label: 'Unit allotments', icon: Wallet, description: 'Check the units allotted to your investments after payment and processing.' },
] as const;
const NAVIGATION_GROUPS = [
  { title: 'Start investing', tabs: ['explore', 'clients', 'mandates', 'sips'] },
  { title: 'Track investments', tabs: ['orders', 'transactions', 'investments'] },
  { title: 'Reports & settings', tabs: ['reports', 'admin'] },
] as const;
const PAGE_SIZE = 24;
const EMPTY_STATES: Record<Exclude<SessionTab, 'explore'>, { title: string; description: string; columns: string[] }> = {
  investments: { title: 'No Mutual funds investments to display', description: 'Your mutual fund holdings, units and portfolio values will appear here once Mutual funds investment data is connected.', columns: ['Scheme', 'Folio', 'Units', 'Invested amount', 'Current value'] },
  sips: { title: 'No Mutual funds SIPs to display', description: 'Track your systematic investment plans, installment amounts and upcoming dates here once Mutual funds SIP data is connected.', columns: ['Scheme', 'Installment', 'Frequency', 'Schedule', 'Status'] },
  orders: { title: 'No orders placed during this visit', description: 'Choose a fund to place an order, or find an order from an earlier visit.', columns: ['Order ID', 'Scheme', 'Transaction', 'Amount', 'Status'] },
  mandates: { title: 'No Mutual funds mandates to display', description: 'Your bank mandates and auto debit authorisations will appear here once Mutual funds mandate data is connected.', columns: ['Mandate ID', 'Bank account', 'Limit', 'Valid until', 'Status'] },
};

const NSEDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const connected = isNSEConnected();
  const [kycOpen, setKycOpen] = useState(false);
  const [report, setReport] = useState('orders');
  const [fatcaRegistrationOpen, setFatcaRegistrationOpen] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [nftOpen, setNftOpen] = useState(false);
  const [ekycOpen, setEkycOpen] = useState(false);
  const [poaOpen, setPoaOpen] = useState(false);
  const [bankUpdateOpen, setBankUpdateOpen] = useState(false);
  const [chequeOpen, setChequeOpen] = useState(false);
  const [elogOpen, setElogOpen] = useState(false);
  const [aofOpen, setAofOpen] = useState(false);
  const [fatcaOpen, setFatcaOpen] = useState(false);
  const [clientDetailOpen, setClientDetailOpen] = useState(false);
  const [authorizationOpen, setAuthorizationOpen] = useState(false);
  const sectionPath = location.pathname.replace(/^\/nse-dashboard\/?/, '').replace(/\/$/, '');
  const activeTab: Tab = (Object.entries(SECTION_PATHS).find(([, path]) => path === sectionPath)?.[0] as Tab) || 'clients';
  const [sipTab, setSipTab] = useState(() => new URLSearchParams(location.search).get('view') || 'existing');
  const [xsipTopupPlan, setXsipTopupPlan] = useState<{ id: string; name: string } | undefined>();
  const [swpDuePlan, setSwpDuePlan] = useState<{ id: string; name: string } | undefined>();
  const [stpDuePlan, setStpDuePlan] = useState<{ id: string; name: string } | undefined>();
  const [topupPlan, setTopupPlan] = useState<{ id: string; name: string } | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [category, setCategory] = useState('All categories');
  const [search, setSearch] = useState('');
  const [purchase, setPurchase] = useState('all');
  const [purchaseSort, setPurchaseSort] = useState('default');
  const [funds, setFunds] = useState<NSEScheme[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogMemberAuthError, setCatalogMemberAuthError] = useState(false);
  const [catalogAuthError, setCatalogAuthError] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState('All plans');
  const [switchFund, setSwitchFund] = useState<NSEScheme | null>(null);
  const [xsipFund, setXsipFund] = useState<NSEScheme | null>(null);
  const [selectedFund, setSelectedFund] = useState<NSEScheme | null>(null);
  const [investmentMode, setInvestmentMode] = useState<'buy' | 'sip'>('buy');
  const [demoOrders, setDemoOrders] = useState<NSEDemoOrder[]>([]);
  const [mandates, setMandates] = useState<NSEMandateRecord[]>([]);
  const openInvestment = (fund: NSEScheme, mode: 'buy' | 'sip') => {
    setSelectedFund(fund); setInvestmentMode(mode);
  };
  const recordOrder = (order: NSEDemoOrder) => setDemoOrders(previous => [order, ...previous.filter(item => item.id !== order.id)]);
  const recordAllotments = (rows: NSEAllotmentRow[]) => setDemoOrders(previous => previous.map(order => {
    if (!order.live || order.mode !== 'buy') return order;
    const confirmed = rows.find(row => row.confirmed && row.clientCode === order.clientCode && (row.orderId === order.exchangeOrderId || row.memberReference === order.id));
    return confirmed ? { ...order, allotmentConfirmed: true, rawStatus: 'ALLOTMENT CONFIRMED', remark: 'Confirmed units are available in the allotment statement.' } : order;
  }));
  const refreshOrderRows = (rows: NSEOrderReportRow[], provisional: boolean) => {
    if (provisional) return;
    setDemoOrders(previous => previous.map(order => {
      if (!order.live || order.mode !== 'buy') return order;
      const row = rows.find(item => item.clientCode === order.clientCode && (item.orderId === order.exchangeOrderId || item.memberReference === order.id));
      if (!row) return order;
      return { ...order, exchangeOrderId: row.orderId, rawStatus: row.status, remark: row.remark, status: row.status === 'INVALID' ? 'rejected' : 'pending', orderAccepted: row.status === 'VALID' };
    }));
  };
  const money = (value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const visibleOrders = activeTab === 'orders' ? demoOrders : activeTab === 'sips' ? demoOrders.filter(order => order.mode === 'sip') : activeTab === 'mandates' ? demoOrders.filter(order => order.mode === 'sip' && !order.live) : [];
  const orderCells = (order: NSEDemoOrder): string[] => {
    if (order.live && order.mode === 'sip' && activeTab === 'sips') return [order.fund, money(order.amount), order.frequency || 'Not reported', `${order.startDate || ''}${order.endDate ? ` → ${order.endDate}` : ` · ${order.installments} installments`}`, `${order.registrationProduct || 'SIP'} ? ${order.rawStatus || 'Pending'}${order.sipRegistrationId ? ` · ID ${order.sipRegistrationId}` : ''} · ${order.remark || ''}`];
    if (order.live && order.mode === 'switch') return [order.exchangeOrderId || order.id, `${order.fund} to ${order.targetScheme}`, 'One-time switch', order.allUnits ? 'All units' : order.transferUnits ? `${order.transferUnits} units` : money(order.amount), `${order.rawStatus} / Switch-in ${order.switchInOrderId || 'unconfirmed'} / ${order.remark}`];
    if (order.live && order.mode === 'swp') return [order.planRegistrationId || order.id, order.fund, `${order.frequency || ''} SWP`, order.transferUnits ? `${order.transferUnits} units` : money(order.amount), `${order.rawStatus || 'Pending'} ? ${order.remark || ''}`];
    if (order.live && order.mode === 'stp') return [order.planRegistrationId || order.id, `${order.fund} ? ${order.targetScheme || ''}`, `${order.frequency || ''} STP`, order.transferUnits ? `${order.transferUnits} units` : money(order.amount), `${order.rawStatus || 'Pending'} ? ${order.remark || ''}`];
    if (order.live) {
      const payment = order.paymentState ? order.paymentState === 'paid' ? order.allotmentConfirmed ? 'Payment completed · allotment confirmed' : 'Payment completed — awaiting allotment' : order.paymentState === 'initiated' ? 'Payment initiated — confirmation pending' : `Payment ${order.paymentState}` : '';
      return [order.sipRegistrationId || order.exchangeOrderId || order.id, order.fund, order.mode === 'sip' ? `${order.registrationProduct || 'SIP'} registration` : 'Purchase', money(order.amount), [order.rawStatus || 'Awaiting order confirmation', payment, order.remark, order.paymentRemark].filter(Boolean).join(' · ')];
    }
    const status = order.status === 'successful' ? activeTab === 'mandates' ? 'Demo authorized' : activeTab === 'sips' ? 'Demo registered' : order.mode !== 'buy' ? `Demo ${order.mode.toUpperCase()} registered` : 'Demo paid · awaiting allotment' : order.status === 'pending' ? 'Demo pending' : 'Demo failed';
    if (activeTab === 'sips') return [order.fund, money(order.amount), 'Monthly', `Day ${order.day} · ${order.installments} installments`, status];
    if (activeTab === 'mandates') return [order.id, order.bank, `${money(order.amount)}/month`, 'Demo · no live validity', status];
    return [order.id, order.targetScheme ? `${order.fund} → ${order.targetScheme}` : order.fund, order.mode === 'buy' ? 'Purchase' : `Monthly ${order.mode.toUpperCase()}`, money(order.amount), status];
  };
  useEffect(() => {
    if (!connected) navigate('/nse-login', { replace: true, state: { from: location.pathname + location.search } });
  }, [connected, navigate]);
  useEffect(() => {
    if (!connected || activeTab !== 'explore') return;
    let cancelled = false;
    setCatalogLoading(true); setCatalogError(''); setCatalogAuthError(false); setCatalogMemberAuthError(false); setFunds([]); setPage(1);
    getNSESchemeMaster().then(data => {
      if (!cancelled) setFunds(data);
    }).catch(error => {
      if (!cancelled) {
        const message = error instanceof Error ? error.message : 'Unable to load Mutual funds funds';
        setCatalogError(message);
        setCatalogMemberAuthError(error instanceof NSEApiError && error.status === 403 && /authentication|authorization|unauthori[sz]ed/i.test(message));
        setCatalogAuthError((error instanceof NSEApiError && [401, 403].includes(error.status)) || /authentication failed|unauthori[sz]ed|invalid.*(?:token|authorization)|expired.*token|log in to NSE again/i.test(message));
      }
    }).finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, [connected, catalogVersion, activeTab]);
  useEffect(() => { setPage(1); }, [category, search, plan, purchase, purchaseSort]);

  useEffect(() => {
    const view = new URLSearchParams(location.search).get('view') || 'existing';
    if (activeTab === 'sips' && view && ["stp-upcoming","stp-cancellations","swp-upcoming","swp-cancellations","swp-redemptions","swp-nondemat-payouts","swp-payouts","swps","stps","xsip-topups","amc-pauses","stepups","xsip-stepups","topups","existing","xsips","upcoming","xsip-upcoming","cancellations","xsip-cancellations","session"].includes(view)) setSipTab(view);
  }, [location.search, activeTab]);
  const changePlanView = (view: string) => { setSipTab(view); navigate({ pathname: '/nse-dashboard/' + SECTION_PATHS.sips, search: '?view=' + encodeURIComponent(view) }); };
  const selectTab = (tab: Tab) => { const path = '/nse-dashboard/' + SECTION_PATHS[tab]; if (location.pathname !== path) navigate(path); setSidebarOpen(false); };
  const active = NAVIGATION.find(item => item.id === activeTab)!;
  const ActiveIcon = active.icon;
  const resetFilters = () => { setSearch(''); setCategory('All categories'); setPlan('All plans'); setPurchase('all'); setPurchaseSort('default'); setPage(1); };
  const categories = [...new Set(funds.map(fund => fund.category))].sort();
  const plans = [...new Set(funds.map(fund => fund.plan))].sort();
  const filteredFunds = funds.filter(fund =>
    (category === 'All categories' || fund.category === category) &&
    (plan === 'All plans' || fund.plan === plan) &&
    (purchase === 'all' || (purchase === 'available' ? fund.active && fund.purchaseAllowed : !fund.active || !fund.purchaseAllowed)) &&
    `${fund.name} ${fund.amc} ${fund.category} ${fund.schemeCode} ${fund.isin} ${fund.plan}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  if (purchaseSort !== 'default') {
    filteredFunds.sort((a, b) => {
      if (a.minPurchase === null && b.minPurchase === null) return 0;
      if (a.minPurchase === null) return 1;
      if (b.minPurchase === null) return -1;
      return purchaseSort === 'high-to-low' ? b.minPurchase - a.minPurchase : a.minPurchase - b.minPurchase;
    });
  }
  const totalPages = Math.max(1, Math.ceil(filteredFunds.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedFunds = filteredFunds.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!connected) return null;

  const sidebar = (mobile = false) => (
    <div className={`flex h-full flex-col overflow-y-auto bg-[#102B78] ${mobile ? 'w-72' : 'w-64'}`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
          <img src="/logo.png" alt="Lendrix" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-200">Lendrix Mutual funds</p>
          <p className="text-xs text-slate-300">Mutual Fund Platform</p>
        </div>
        {mobile && <NSEButton aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="ml-auto p-2 text-white"><X className="h-5 w-5" /></NSEButton>}
      </div>
      <div className="mx-4 mt-5 rounded-xl border border-[#4C85CF]/20 bg-[#4C85CF]/10 px-3 py-3">
        <p className="text-xs font-semibold text-blue-200">Mutual funds</p>
        <p className="mt-1 text-xs text-slate-300">Mutual funds signed in · Live fund catalog</p>
      </div>
      <nav aria-label="Mutual funds mutual fund navigation" className="mt-6 flex-1 space-y-1 px-3">
        {NAVIGATION_GROUPS.map(group => <div key={group.title} className="pb-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{group.title}</p>
          <div className="space-y-1">{group.tabs.map(tab => {
            const { id, label, icon: Icon } = NAVIGATION.find(item => item.id === tab)!;
            return <NSEButton key={id} onClick={() => selectTab(id)} aria-current={activeTab === id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${activeTab === id ? 'bg-white text-[#102B78]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" /><span>{label}</span>
            </NSEButton>;
          })}</div>
        </div>)}

      </nav>
      <div className="border-t border-white/10 px-3 py-5">
        <NSEButton onClick={() => { clearNSEToken(); navigate('/nse-login', { replace: true }); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-rose-500/15 hover:text-rose-300">
          <LogOut className="h-5 w-5" /> Logout
        </NSEButton>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f7fc]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar()}</aside>
      {sidebarOpen && <div className="fixed inset-0 z-50 flex lg:hidden">
        <NSEButton aria-label="Close navigation overlay" className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <aside className="relative h-full">{sidebar(true)}</aside>
      </div>}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
          <NSEButton aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gray-600 lg:hidden"><Menu className="h-5 w-5" /></NSEButton>
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mutual funds</p><p className="truncate text-sm font-semibold text-slate-800">{active.label}</p></div><div className="ml-auto">{activeTab === 'clients' && <NSEButton onClick={() => navigate('/investor-registration')} className="rounded-lg bg-[#102B78] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1B3F96]">Register Mutual funds investor</NSEButton>}</div>
        </header>
        <section className="border-b border-slate-200 bg-white px-4 py-6 text-slate-900 sm:px-6">
          <NSEHeading as="h1" className="text-2xl font-bold sm:text-3xl"><ActiveIcon aria-hidden="true" className="h-6 w-6" />{active.label}</NSEHeading><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{active.description}</p>
        </section>
        <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
          {activeTab === 'admin' || activeTab === 'clients' ? <>
            <NSEWorkspaceSection section={activeTab} onAction={action => {
              const actions: Record<string, () => void> = {
                register: () => navigate('/investor-registration'), profiles: () => setClientDetailOpen(true), authorization: () => setAuthorizationOpen(true), kyc: () => setKycOpen(true), aof: () => setAofOpen(true), elog: () => setElogOpen(true),
                ekyc: () => setEkycOpen(true), nominees: () => setNftOpen(true), bank: () => setBankUpdateOpen(true), cheque: () => setChequeOpen(true),
                poa: () => setPoaOpen(true), secret: () => setSecretOpen(true), fatca: () => setFatcaRegistrationOpen(true),
              };
              actions[action]?.();
            }} />
          </> : activeTab === 'reports' ? <>
            <NSEWorkspaceSection section="reports" selected={report} onAction={action => {
              if (action === 'client') setClientDetailOpen(true);
              else if (action === 'authorization') setAuthorizationOpen(true);
              else if (action === 'fatca') setFatcaOpen(true);
              else if (action === 'aof') setAofOpen(true);
              else if (action === 'elog') setElogOpen(true);
              else if (action === 'sip') { changePlanView('existing'); }
              else if (action === 'xsip') { changePlanView('xsips'); }
              else if (action === 'stp') { changePlanView('stps'); }
              else if (action === 'swp') { changePlanView('swps'); }
              else setReport(action);
            }} />
            <section key={report} aria-label="Selected report" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {report === 'orders' && <NSEOrderReports onRows={refreshOrderRows} />}
              {report === 'allotment' && <NSEAllotmentStatements onRows={recordAllotments} />}
              {report === 'redemption' && <NSERedemptionStatements />}
              {report === 'payout' && <NSEPayoutReport />}
              {report === 'allocation' && <NSEFundAllocationReport />}
              {report === 'age' && <NSEFundAgeReport />}
              {report === 'delivery' && <NSEDeliveryReport />}
              {report === '2fa' && <NSETwoFaReport />}
              {report === 'transactions' && <NSETransactionReport />}
              {report === 'lifecycle' && <NSELifecycleReport />}
            </section>
          </> : activeTab === 'explore' ? <>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><NSEHeading as="h2" className="text-xl font-bold text-slate-900">Explore mutual funds</NSEHeading></div><NSEButton disabled={catalogLoading} onClick={() => setCatalogVersion(value => value + 1)} className="flex items-center gap-2 rounded-lg border border-[#102B78] px-3 py-2 text-sm font-semibold text-[#102B78] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${catalogLoading ? 'animate-spin' : ''}`} />Refresh funds</NSEButton></div>
            <section aria-label="Find and filter funds" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><NSEHeading as="h3" className="text-sm font-semibold text-slate-900">Find your next investment</NSEHeading><NSEButton type="button" onClick={resetFilters} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#102B78] hover:bg-blue-50">Reset filters</NSEButton></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="sm:col-span-2 xl:col-span-4 flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
                <Search className="h-4 w-4 text-gray-400" /><input aria-label="Search mutual funds" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by fund name, AMC or category" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Category<select aria-label="Fund category" value={category} onChange={event => setCategory(event.target.value)} className="mt-2 w-full font-normal text-slate-900 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
                {['All categories', ...categories].map(name => <option key={name}>{name}</option>)}
              </select></label>
              <label className="text-xs font-semibold text-slate-600">Plan type<select aria-label="Fund plan" value={plan} onChange={event => setPlan(event.target.value)} className="mt-2 w-full font-normal text-slate-900 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">{['All plans', ...plans].map(name => <option key={name}>{name}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-600">Purchase availability<select aria-label="Purchase availability" value={purchase} onChange={event => setPurchase(event.target.value)} className="mt-2 w-full font-normal text-slate-900 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"><option value="all">All purchase statuses</option><option value="available">Purchase available</option><option value="unavailable">Purchase unavailable</option></select></label>
              <label className="text-xs font-semibold text-slate-600">Sort by minimum investment<select aria-label="Sort by minimum purchase" value={purchaseSort} onChange={event => setPurchaseSort(event.target.value)} className="mt-2 w-full font-normal text-slate-900 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"><option value="default">Default order</option><option value="high-to-low">Minimum purchase: High to low</option><option value="low-to-high">Minimum purchase: Low to high</option></select></label>
              </div></section>
            {catalogLoading && <p role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-[#102B78]">Loading Mutual funds…</p>}
            {catalogError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>{catalogError}</p>{catalogMemberAuthError ? <><p className="mt-2">The API provider rejected upstream Mutual funds authentication while downloading the scheme master (HTTP 403). A new dashboard login will not update its Mutual funds member credentials. The provider must check its API secret, member authentication settings and environment. If the API secret was changed, update it in the provider backend.</p><NSEButton onClick={() => setCatalogVersion(value => value + 1)} className="mt-3 font-semibold underline">Retry after provider credentials are updated</NSEButton></> : catalogAuthError ? <><p className="mt-2">Mutual funds rejected authentication while loading the scheme master. Sign in again. If this continues after a new login, the API provider needs to check the member credentials and API secret used upstream.</p><NSEButton onClick={() => { clearNSEToken(); navigate('/nse-login', { replace: true }); }} className="mt-3 font-semibold underline">Sign in to Mutual funds again</NSEButton></> : <NSEButton onClick={() => setCatalogVersion(value => value + 1)} className="mt-3 font-semibold underline">Retry loading funds</NSEButton>}</div>}
            {!catalogLoading && !catalogError && <p aria-live="polite" className="text-sm text-gray-500">{filteredFunds.length.toLocaleString('en-IN')} schemes · Page {currentPage} of {totalPages}</p>}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pagedFunds.map(fund => <article key={fund.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#102B78]"><TrendingUp className="h-5 w-5" /></div>
                  <p className="text-xs font-medium text-gray-500">{fund.amc}</p>
                </div>
                <NSEHeading as="h3" className="flex-1 text-sm font-bold leading-relaxed text-slate-900">{fund.name}</NSEHeading>
                <p className="mt-2 break-all text-xs text-gray-500">Scheme code: {fund.schemeCode}{fund.settlementType && <> | Settlement: {fund.settlementType}</>}</p>
                <p className={fund.active && fund.purchaseAllowed ? "mt-3 text-xs font-medium text-emerald-700" : "mt-3 text-xs font-medium text-slate-500"}>{fund.active && fund.purchaseAllowed ? "Available to buy" : "Purchase unavailable"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#102B78]">{fund.category}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{fund.plan}</span>
                </div>
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">Minimum one-time investment</p><p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{fund.minPurchase !== null ? money(fund.minPurchase) : "Not provided"}</p></div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <NSEButton disabled={!fund.active || !fund.purchaseAllowed} onClick={() => openInvestment(fund, 'buy')} aria-label={`Buy ${fund.name}`} className="flex items-center justify-center gap-2 rounded-lg bg-[#102B78] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#1B3F96] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"><ShoppingCart className="h-4 w-4" />{fund.active && fund.purchaseAllowed ? 'Invest once' : 'Buy unavailable'}</NSEButton>
                  <NSEButton disabled={!fund.active || !fund.sipAllowed} onClick={() => openInvestment(fund, 'sip')} aria-label={`Start SIP in ${fund.name}`} className="flex items-center justify-center gap-2 rounded-lg border border-[#102B78] px-3 py-2.5 text-sm font-semibold text-[#102B78] hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"><CalendarDays className="h-4 w-4" />{fund.active && fund.sipAllowed ? 'Start SIP' : 'SIP unavailable'}</NSEButton>
                  <NSEButton disabled={!fund.active || !fund.sipAllowed} onClick={() => setXsipFund(fund)} aria-label={`Start XSIP in ${fund.name}`} className="rounded-lg border border-[#4C85CF] px-3 py-2.5 text-sm font-semibold text-[#102B78] disabled:opacity-40">{fund.active && fund.sipAllowed ? 'Start XSIP' : 'XSIP unavailable'}</NSEButton><NSEButton disabled={!fund.active || !fund.switchAllowed} onClick={() => setSwitchFund(fund)} className="rounded-lg border border-[#4C85CF] px-3 py-2.5 text-sm font-semibold text-[#102B78] disabled:opacity-40">{fund.active && fund.switchAllowed ? 'Switch fund' : 'Switch unavailable'}</NSEButton>
                </div>
                <details className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500"><NSESummary className="cursor-pointer font-medium text-slate-600">Scheme details & more information</NSESummary><p className="mt-3 break-all">Scheme code: {fund.schemeCode}</p>{fund.settlementType && <p className="mt-2">Mutual funds settlement code: {fund.settlementType}</p>}<p className="mt-3 leading-relaxed">XSIP is an additional Mutual funds systematic investment option. Switch fund moves an investment to another scheme within the same fund house.</p><p className="mt-2">{fund.active ? "Investment requests are submitted to Mutual funds." : "This scheme is currently inactive on Mutual funds."}</p></details>
              </article>)}
            </div>
            {!catalogLoading && !catalogError && filteredFunds.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No funds match your selection. Try a different search or reset your filters.</p>}
            {!catalogLoading && !catalogError && totalPages > 1 && <nav aria-label="Fund catalog pagination" className="flex items-center justify-between gap-3"><NSEButton disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-40">Previous</NSEButton><span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span><NSEButton disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="rounded-lg bg-[#102B78] px-4 py-2 text-sm text-white disabled:opacity-40">Next</NSEButton></nav>}

          </> : activeTab === 'transactions' ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><NSETransactionReport standalone /></section> : activeTab === 'investments' ? <NSEAllotmentStatements onRows={recordAllotments} /> : activeTab === 'mandates' ? <NSEMandates records={mandates} onRecord={record => setMandates(previous => [record, ...previous.filter(item => item.reference !== record.reference)])} /> : <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <Tabs value={activeTab === 'sips' ? sipTab : 'session'} onValueChange={changePlanView}>
            {activeTab === 'sips' && <>
              <NSESipNavigation value={sipTab} onChange={changePlanView} onExplore={() => selectTab('explore')} />
              <TabsContent value="stp-upcoming" className="mt-0"><NSEStpInstallmentsDue key={stpDuePlan?.id || 'all'} plan={stpDuePlan} /></TabsContent>
              <TabsContent value="stp-cancellations" className="mt-0"><NSEStpCancellations /></TabsContent>
              <TabsContent value="swp-upcoming" className="mt-0"><NSESwpInstallmentsDue key={swpDuePlan?.id || 'all'} plan={swpDuePlan} /></TabsContent>
              <TabsContent value="swp-cancellations" className="mt-0"><NSESwpCancellations /></TabsContent>
              <TabsContent value="swp-redemptions" className="mt-0"><NSERedemptionStatements /></TabsContent>
              <TabsContent value="swp-nondemat-payouts" className="mt-0"><NSEPayoutReport nonDemat /></TabsContent>
              <TabsContent value="swp-payouts" className="mt-0"><NSEPayoutReport /></TabsContent>
              <TabsContent value="swps" className="mt-0"><NSESwpReport onViewDue={plan => { setSwpDuePlan(plan); setSipTab('swp-upcoming'); }} /></TabsContent>
              <TabsContent value="stps" className="mt-0"><NSEStpReport onViewDue={plan => { setStpDuePlan(plan); setSipTab('stp-upcoming'); }} /></TabsContent>
              <TabsContent value="xsip-topups" className="mt-0"><NSEXsipTopups key={xsipTopupPlan?.id || 'all'} plan={xsipTopupPlan} /></TabsContent>
              <TabsContent value="amc-pauses" className="mt-0"><NSEAmcPauseReport /></TabsContent>
              <TabsContent value="stepups" className="mt-0"><NSEStepups /></TabsContent>
              <TabsContent value="xsip-stepups" className="mt-0"><NSEStepups /></TabsContent>
              <TabsContent value="topups" className="mt-0"><NSESipTopups key={topupPlan?.id || 'all'} plan={topupPlan} /></TabsContent>
              <TabsContent value="existing" className="mt-0"><NSESipReport onViewTopups={plan => { setTopupPlan(plan); setSipTab('topups'); }} /></TabsContent>
              <TabsContent value="xsips" className="mt-0"><NSEXsipReport onViewTopups={plan => { setXsipTopupPlan(plan); setSipTab('xsip-topups'); }} /></TabsContent>
              <TabsContent value="upcoming" className="mt-0"><NSESipInstallmentsDue /></TabsContent>
              <TabsContent value="xsip-upcoming" className="mt-0"><NSEXsipInstallmentsDue /></TabsContent>
              <TabsContent value="cancellations" className="mt-0"><NSESipCancellations /></TabsContent>
              <TabsContent value="xsip-cancellations" className="mt-0"><NSEXsipCancellations /></TabsContent>
            </>}
            {activeTab === 'orders' && <div className="border-b border-slate-100 p-5"><NSEButton onClick={() => { setReport('orders'); selectTab('reports'); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#102B78] hover:bg-blue-50">Find earlier orders</NSEButton></div>}
            <TabsContent value="session" className="mt-0">
            {activeTab !== 'orders' && <div className="border-b border-gray-100 p-5"><NSEHeading as="h2" className="text-xl font-bold text-slate-900">{activeTab === 'sips' ? 'Plans created this session' : active.label}</NSEHeading><p className="mt-1 text-sm text-gray-500">{activeTab === 'sips' ? 'SIP and XSIP requests made during this visit. Check My plans for the latest Mutual funds registration status.' : 'Demo mandate records for this session. Live SIP registration does not authorize a mandate.'}</p></div>}
            <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm">
              {(activeTab !== 'orders' || visibleOrders.length > 0) && <thead className="bg-gray-50 text-xs text-gray-500"><tr>{[...EMPTY_STATES[activeTab as Exclude<SessionTab, 'explore'>].columns, ...(activeTab === 'orders' ? ['Payment tracking'] : [])].map(column => <th key={column} scope="col" className="px-5 py-3 font-semibold">{column}</th>)}</tr></thead>}
              <tbody>{visibleOrders.length > 0 ? visibleOrders.map(order => <tr key={order.id} className="border-t border-gray-100">{orderCells(order).map((cell, index) => <td key={index} className="max-w-xs break-words px-5 py-4 text-xs text-gray-700">{cell}{index === 4 && order.live && order.mode === 'sip' && order.rawStatus === 'REG_SUCCESS' && order.sipRegistrationId && <NSEResendCommunication key={order.sipRegistrationId} productType={order.registrationProduct === 'XSIP' ? 'XSIP_REG' : 'SIP_REG'} productRefId={order.sipRegistrationId} />}</td>)}{activeTab === 'orders' && <td className="min-w-64 px-5 py-4">{order.live && order.orderAccepted && order.paymentMode === 'upi' ? <details><NSESummary className="cursor-pointer text-xs font-semibold text-[#102B78]">UPI payment status</NSESummary><div className="mt-3"><NSEUpiStatusCheck order={order} onUpdate={recordOrder} /></div></details> : <span className="text-xs text-gray-400">—</span>}</td>}</tr>) : <tr><td colSpan={EMPTY_STATES[activeTab as Exclude<SessionTab, 'explore'>].columns.length + (activeTab === 'orders' ? 1 : 0)} className="px-6 py-14 text-center">
                <ActiveIcon className="mx-auto mb-4 h-9 w-9 text-[#102B78]" /><NSEHeading as="h3" className="font-semibold text-slate-900">{EMPTY_STATES[activeTab as Exclude<SessionTab, 'explore'>].title}</NSEHeading>
                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{EMPTY_STATES[activeTab as Exclude<SessionTab, 'explore'>].description}</p>
                <NSEButton onClick={() => selectTab('explore')} className="mt-5 rounded-xl bg-[#102B78] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1B3F96]">Explore mutual funds</NSEButton>
              </td></tr>}</tbody>
            </table></div>
            </TabsContent></Tabs>
          </section>}
        </main>
      </div>
      {secretOpen && <NSEChangeApiSecret onClose={() => setSecretOpen(false)} />}
      {nftOpen && <NSENftUpdates onClose={() => setNftOpen(false)} />}
      {ekycOpen && <NSEEkycRegistration onClose={() => setEkycOpen(false)} />}
      {poaOpen && <NSEPoaUpload onClose={() => setPoaOpen(false)} />}
      {kycOpen && <NSEKycStatus onClose={() => setKycOpen(false)} />}
      {fatcaRegistrationOpen && <NSEFatcaRegistration onClose={() => setFatcaRegistrationOpen(false)} />}
      {bankUpdateOpen && <NSEBankUpdate onClose={() => setBankUpdateOpen(false)} />}
      {chequeOpen && <NSEChequeUpload onClose={() => setChequeOpen(false)} />}
      {elogOpen && <NSEElogReport onClose={() => setElogOpen(false)} />}
      {aofOpen && <NSEAofReport onClose={() => setAofOpen(false)} />}
      {fatcaOpen && <NSEFatcaReport onClose={() => setFatcaOpen(false)} />}
      {clientDetailOpen && <NSEClientDetail onClose={() => setClientDetailOpen(false)} />}
      {authorizationOpen && <NSEClientAuthorization onClose={() => setAuthorizationOpen(false)} />}
      {switchFund && <NSESwitchFlow scheme={{ name: switchFund.name, code: switchFund.schemeCode, amc: switchFund.amc }} targets={funds.filter(item => item.amc === switchFund.amc && item.active && item.switchAllowed).map(item => ({ name: item.name, code: item.schemeCode, amc: item.amc }))} onClose={() => setSwitchFund(null)} onRecord={recordOrder} onTrack={() => { setSwitchFund(null); selectTab('orders'); }} />}
      {xsipFund && <NSEXsipFlow fund={xsipFund} onClose={() => setXsipFund(null)} onRecord={recordOrder} onTrack={() => { setXsipFund(null); changePlanView('session'); }} />}
      {selectedFund && <NSEInvestmentFlow
        fund={selectedFund}
        mode={investmentMode}
        onClose={() => setSelectedFund(null)}
        onRecord={recordOrder}
        onTrack={mode => { if (mode === 'sip') changePlanView('session'); else selectTab('orders'); setSelectedFund(null); }}
      />}
    </div>
  );
};

export default NSEDashboard;
