import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSELifecycleReport from './NSELifecycleReport';
import { NSE_TOKEN_KEY } from '@/services/nseApi';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); });
it('shows independent lifecycle stages and masks payment accounts', async () => {
  sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ response_status: 'S', report_data: [{ product_type: 'PUR', product_id: '123', order_status: 'VALID', payment_status: 'SUCCESS', payment_account_no: '000011112222', primary_holder_authentication_status: 'SUCCESS', reconciliation_status: 'SUCCESS' }] }) }));
  render(<NSELifecycleReport />);
  fireEvent.click(screen.getByText('Order lifecycle — track processing'));
  fireEvent.click(screen.getByRole('button', { name: 'Load order lifecycle' }));
  expect(await screen.findByText('PUR · 123')).toBeInTheDocument();
  expect(screen.getByText('VALID')).toBeInTheDocument();
  expect(screen.getByText('•••• 2222')).toBeInTheDocument();
  expect(screen.queryByText('000011112222')).not.toBeInTheDocument();
});

it('keeps empty unrelated mandate stages collapsed instead of presenting them as incomplete tasks', async () => {
 sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
 vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ response_status: 'S', report_data: [{ product_type: 'MANDATE REGISTRATION', product_id: '123', client_code: 'TEST001', mandate_status: 'UNDER PROCESSING', mandate_umrn: 'TEST-UMRN' }] }) }));
 render(<NSELifecycleReport />);
 fireEvent.click(screen.getByText(/Order lifecycle .* track processing/));
 fireEvent.click(screen.getByRole('button', { name: 'Load order lifecycle' }));
 await screen.findByText('UNDER PROCESSING');
 expect(screen.queryByRole('heading', { name: 'Redemption payout' })).not.toBeInTheDocument();
 expect(screen.getByText('Other stages not reported')).toBeInTheDocument();
 expect(screen.getByText('TEST-UMRN')).toBeInTheDocument();
});
