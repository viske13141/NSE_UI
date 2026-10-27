import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearNseSsoMemory,
  consumeNseSsoState,
  exchangeNseSsoCode,
  getLendrixRetryUrl,
  getNseSsoMe,
} from '@/services/nseCustomerSso';

type CallbackRequest = {
  code: string | null;
  state: string | null;
};

type CallbackStatus = 'loading' | 'error';

export default function NSESsoCallbackPage() {
  const navigate = useNavigate();
  const callbackRequest = useMemo<CallbackRequest>(() => {
    const url = new URL(window.location.href);
    const fragmentParams = new URLSearchParams(url.hash.slice(1));
    return {
      code: fragmentParams.get('code') ?? url.searchParams.get('code'),
      state: fragmentParams.get('state') ?? url.searchParams.get('state'),
    };
  }, []);
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [message, setMessage] = useState('Connecting your Lendrix session to Mutual Funds…');

  useLayoutEffect(() => {
    const url = new URL(window.location.href);
    window.history.replaceState(
      window.history.state,
      document.title,
      url.pathname,
    );
  }, []);

  useEffect(() => {
    const { code, state } = callbackRequest;
    let active = true;
    void Promise.resolve()
      .then(async () => {
        if (!consumeNseSsoState(state)) {
          throw new Error('This sign-in handoff could not be verified. Return to Lendrix and open Mutual Funds again.');
        }
        if (!code) {
          throw new Error('The Mutual Funds sign-in link is missing its authorization code. Return to Lendrix and retry.');
        }
        await exchangeNseSsoCode(code);
        await getNseSsoMe();
        if (active) navigate('/mutual-funds', { replace: true });
      })
      .catch((error: unknown) => {
        clearNseSsoMemory();
        if (!active) return;
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Unable to connect your Lendrix session. Return to Lendrix and try again.',
        );
      });
    return () => {
      active = false;
    };
  }, [callbackRequest, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fc] px-4">
      <section
        aria-live="polite"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        {status === 'loading' ? (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-[#102B78]" />
            <h1 className="text-xl font-semibold text-slate-900">Opening Mutual Funds</h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Unable to open Mutual Funds</h1>
            <p role="alert" className="mt-3 text-sm text-slate-600">{message}</p>
            <a
              href={getLendrixRetryUrl()}
              className="mt-6 inline-flex rounded-lg bg-[#102B78] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1B3F96]"
            >
              Return to Lendrix to retry
            </a>
          </>
        )}
      </section>
    </main>
  );
}
