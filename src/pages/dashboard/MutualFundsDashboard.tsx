/**
 * MutualFundsDashboard
 *
 * Customer-facing scheme browsing uses the Lendrix SSO cookie. NSE admin bearer
 * authentication remains confined to the internal NSE routes.
 */
import React, { useEffect, useRef, useState } from 'react';
import { getPublicSchemeMaster, type NSEScheme } from '@/services/nseSchemeService';
import {
  getLendrixRetryUrl,
  getNseCustomerRegistrationStatus,
  getNseSsoMe,
  logoutNseSsoSession,
  NseCustomerSsoError,
  type CustomerRegistrationStatus,
} from '@/services/nseCustomerSso';
import { NSEButton, NSEHeading } from '@/components/nse/NSEPresentation';
import RegistrationPromptDialog from '@/components/nse/RegistrationPromptDialog';
import {
  TrendingUp, ShoppingCart, CalendarDays, RefreshCw, Search, LogOut,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

const PAGE_SIZE = 24;

type PendingAction =
  | { type: 'buy' | 'sip'; fund: NSEScheme }
  | { type: 'xsip'; fund: NSEScheme }
  | { type: 'switch'; fund: NSEScheme };

export default function MutualFundsDashboard() {
  const location = useLocation();

  const restoredAction = (location.state as { pendingAction?: PendingAction } | null)?.pendingAction;

  const [funds, setFunds] = useState<NSEScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [registrationStatus, setRegistrationStatus] = useState<CustomerRegistrationStatus>('unknown');
  const [registrationError, setRegistrationError] = useState('');
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [plan, setPlan] = useState('All plans');
  const [purchase, setPurchase] = useState('all');
  const [page, setPage] = useState(1);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(restoredAction ?? null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [actionMessage, setActionMessage] = useState(() =>
    restoredAction
      ? `Your selected ${restoredAction.type.toUpperCase()} action for ${restoredAction.fund.name} is retained. Select the action again after your registration status is verified.`
      : '',
  );

  const money = (v: number) => v.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  useEffect(() => {
    let cancelled = false;

    const loadCustomerDashboard = async () => {
      await getNseSsoMe();
      const [registrationResult, schemesResult] = await Promise.allSettled([
        getNseCustomerRegistrationStatus(),
        getPublicSchemeMaster(),
      ]);

      if (cancelled) return;

      if (registrationResult.status === 'fulfilled') {
        setRegistrationStatus(registrationResult.value.registration_status);
      } else {
        setRegistrationStatus('unknown');
        setRegistrationError(
          registrationResult.reason instanceof Error
            ? registrationResult.reason.message
            : 'Unable to verify your NSE registration status.',
        );
      }

      if (schemesResult.status === 'fulfilled') {
        setFunds(schemesResult.value);
      } else {
        const schemeError = schemesResult.reason;
        setError(schemeError instanceof Error ? schemeError.message : 'Unable to load schemes');
        setAuthError(schemeError instanceof NseCustomerSsoError && schemeError.status === 401);
      }
    };

    void loadCustomerDashboard()
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to verify the Mutual Funds SSO session.');
        setAuthError(err instanceof NseCustomerSsoError && err.status === 401);
        setRegistrationStatus('unknown');
        setRegistrationError('Your NSE registration status is unavailable until your SSO session is verified.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRegistrationLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [catalogVersion]);

  const categories = [...new Set(funds.map(f => f.category))].sort();
  const plans = [...new Set(funds.map(f => f.plan))].sort();

  const filtered = funds.filter(f =>
    (category === 'All categories' || f.category === category) &&
    (plan === 'All plans' || f.plan === plan) &&
    (purchase === 'all' ||
      (purchase === 'available' ? f.active && f.purchaseAllowed : !f.active || !f.purchaseAllowed)) &&
    `${f.name} ${f.amc} ${f.category} ${f.schemeCode} ${f.plan}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleAction = (action: PendingAction) => {
    setPendingAction(action);
    setActionMessage('');

    if (registrationLoading) {
      setActionMessage('Your NSE registration status is still being checked. Please try again in a moment.');
      return;
    }

    if (registrationStatus === 'registered') {
      setActionMessage(
        'Your verified NSE client-code mapping is registered, but customer-authorized investment APIs are not available yet. No order was submitted. Required backend APIs: POST /api/v1/customer/order/entry, /api/v1/customer/sip/register, /api/v1/customer/xsip/register, and /api/v1/customer/switch/entry.',
      );
    } else if (registrationStatus === 'unlinked') {
      setShowPrompt(true);
    } else if (registrationStatus === 'pending') {
      setActionMessage('Your NSE investor registration is pending. Please wait for verification before investing.');
    } else if (registrationStatus === 'failed') {
      setActionMessage('Your latest NSE investor registration attempt was not approved. Contact Lendrix support for help.');
    } else if (registrationStatus === 'linking_required') {
      setActionMessage('Your NSE client-code mapping still requires verified linking. Entering a client code here will not register your account.');
    } else {
      setActionMessage('Your NSE registration status could not be verified. Investment actions are disabled until it can be confirmed.');
    }
  };

  const handleRegister = () => {
    setShowPrompt(false);
    if (pendingAction) {
      setActionMessage(
        `Customer NSE registration is not available in this SSO session yet. Your selected ${pendingAction.type.toUpperCase()} action for ${pendingAction.fund.name} is retained. A client code must be linked by a verified backend process; entering one in the browser will not register you.`,
      );
    }
  };

  const handleCancelPrompt = () => {
    setShowPrompt(false);
    setPendingAction(null);
    setActionMessage('');
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setLogoutError('');
    try {
      await logoutNseSsoSession();
      window.location.assign(getLendrixRetryUrl());
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : 'Unable to log out of Mutual Funds. Please retry.');
    } finally {
      setLogoutLoading(false);
    }
  };

  const retryLoading = () => {
    setLoading(true);
    setError('');
    setAuthError(false);
    setFunds([]);
    setPage(1);
    setRegistrationStatus('unknown');
    setRegistrationLoading(true);
    setRegistrationError('');
    setCatalogVersion(version => version + 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fc]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#102B78]">
            <img src="/logo.png" alt="Lendrix" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lendrix</p>
            <p className="text-sm font-semibold text-slate-800">Mutual Funds</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 sm:inline">
            Registration: {registrationLoading ? 'Checking…' : registrationStatus.replace('_', ' ')}
          </span>
          <NSEButton
            disabled={logoutLoading}
            onClick={() => void handleLogout()}
            aria-label="Log out of Mutual Funds"
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {logoutLoading ? 'Logging out…' : 'Log out'}
          </NSEButton>
        </div>
      </header>

      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        {registrationError && (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Registration status is unavailable. You can still browse schemes, but investment actions remain disabled. {registrationError}
          </p>
        )}
        {logoutError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {logoutError}
          </p>
        )}
        {actionMessage && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {actionMessage}
          </p>
        )}
        {/* Page title */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <NSEHeading as="h1" className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Explore Mutual Funds
          </NSEHeading>
          <NSEButton
            disabled={loading}
            onClick={retryLoading}
            className="flex items-center gap-2 rounded-lg border border-[#102B78] px-3 py-2 text-sm font-semibold text-[#102B78] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </NSEButton>
        </div>

        {/* Filters */}
        <section
          aria-label="Find and filter funds"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <NSEHeading as="h2" className="text-sm font-semibold text-slate-900">
              Find your next investment
            </NSEHeading>
            <NSEButton
              onClick={() => { setSearch(''); setCategory('All categories'); setPlan('All plans'); setPurchase('all'); setPage(1); }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#102B78] hover:bg-blue-50"
            >
              Reset filters
            </NSEButton>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="sm:col-span-2 xl:col-span-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                aria-label="Search mutual funds"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by fund name, AMC or category"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Category
              <select
                aria-label="Fund category"
                value={category}
                onChange={e => { setCategory(e.target.value); setPage(1); }}
                className="mt-2 w-full font-normal text-slate-900 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                {['All categories', ...categories].map(n => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Plan type
              <select
                aria-label="Fund plan"
                value={plan}
                onChange={e => { setPlan(e.target.value); setPage(1); }}
                className="mt-2 w-full font-normal text-slate-900 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                {['All plans', ...plans].map(n => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Purchase availability
              <select
                aria-label="Purchase availability"
                value={purchase}
                onChange={e => { setPurchase(e.target.value); setPage(1); }}
                className="mt-2 w-full font-normal text-slate-900 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <option value="all">All purchase statuses</option>
                <option value="available">Purchase available</option>
                <option value="unavailable">Purchase unavailable</option>
              </select>
            </label>
          </div>
        </section>

        {/* Status */}
        {loading && (
          <p role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-[#102B78]">
            Loading schemes…
          </p>
        )}
        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <p>{error}</p>
            {authError
              ? (
                <p className="mt-2">
                  Your Lendrix SSO session may have expired.{' '}
                  <a className="font-semibold underline" href={getLendrixRetryUrl()}>
                    Return to your signed-in Lendrix account and open Mutual Funds again.
                  </a>
                </p>
              )
              : (
                <NSEButton
                  onClick={retryLoading}
                  className="mt-3 font-semibold underline"
                >
                  Retry loading funds
                </NSEButton>
              )}
          </div>
        )}
        {!loading && !error && (
          <p aria-live="polite" className="text-sm text-gray-500">
            {filtered.length.toLocaleString('en-IN')} schemes · Page {currentPage} of {totalPages}
          </p>
        )}

        {/* Scheme cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paged.map(fund => (
            <article
              key={fund.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#102B78]">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-gray-500">{fund.amc}</p>
              </div>
              <NSEHeading as="h3" className="flex-1 text-sm font-bold leading-relaxed text-slate-900">
                {fund.name}
              </NSEHeading>
              <p className="mt-2 break-all text-xs text-gray-500">
                Scheme code: {fund.schemeCode}
                {fund.settlementType && <> | Settlement: {fund.settlementType}</>}
              </p>
              <p className={fund.active && fund.purchaseAllowed
                ? 'mt-3 text-xs font-medium text-emerald-700'
                : 'mt-3 text-xs font-medium text-slate-500'}
              >
                {fund.active && fund.purchaseAllowed ? 'Available to buy' : 'Purchase unavailable'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#102B78]">
                  {fund.category}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                  {fund.plan}
                </span>
              </div>
              <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Minimum one-time investment</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                  {fund.minPurchase !== null ? money(fund.minPurchase) : 'Not provided'}
                </p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <NSEButton
                  disabled={!fund.active || !fund.purchaseAllowed}
                  onClick={() => handleAction({ type: 'buy', fund })}
                  aria-label={`Invest once in ${fund.name}`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#102B78] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#1B3F96] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {fund.active && fund.purchaseAllowed ? 'Invest Once' : 'Buy unavailable'}
                </NSEButton>
                <NSEButton
                  disabled={!fund.active || !fund.sipAllowed}
                  onClick={() => handleAction({ type: 'sip', fund })}
                  aria-label={`Start SIP in ${fund.name}`}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#102B78] px-3 py-2.5 text-sm font-semibold text-[#102B78] hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                >
                  <CalendarDays className="h-4 w-4" />
                  {fund.active && fund.sipAllowed ? 'Start SIP' : 'SIP unavailable'}
                </NSEButton>
                <NSEButton
                  disabled={!fund.active || !fund.sipAllowed}
                  onClick={() => handleAction({ type: 'xsip', fund })}
                  aria-label={`Start XSIP in ${fund.name}`}
                  className="rounded-lg border border-[#4C85CF] px-3 py-2.5 text-sm font-semibold text-[#102B78] disabled:opacity-40"
                >
                  {fund.active && fund.sipAllowed ? 'Start XSIP' : 'XSIP unavailable'}
                </NSEButton>
                <NSEButton
                  disabled={!fund.active || !fund.switchAllowed}
                  onClick={() => handleAction({ type: 'switch', fund })}
                  aria-label={`Switch fund for ${fund.name}`}
                  className="rounded-lg border border-[#4C85CF] px-3 py-2.5 text-sm font-semibold text-[#102B78] disabled:opacity-40"
                >
                  {fund.active && fund.switchAllowed ? 'Switch Fund' : 'Switch unavailable'}
                </NSEButton>
              </div>
            </article>
          ))}
        </div>

        {!loading && !error && filtered.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No funds match your selection. Try a different search or reset your filters.
          </p>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <nav aria-label="Fund catalog pagination" className="flex items-center justify-between gap-3">
            <NSEButton
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </NSEButton>
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            <NSEButton
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg bg-[#102B78] px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Next
            </NSEButton>
          </nav>
        )}
      </main>

      {/* Registration prompt */}
      {showPrompt && pendingAction && (
        <RegistrationPromptDialog
          onRegister={handleRegister}
          onCancel={handleCancelPrompt}
        />
      )}

    </div>
  );
}
