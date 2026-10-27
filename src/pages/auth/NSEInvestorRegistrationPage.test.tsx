import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import NSEInvestorRegistrationPage from './NSEInvestorRegistrationPage';

const auth = vi.hoisted(() => ({ connected: true }));
vi.mock('@/services/nseAuth', () => ({ isNSEConnected: () => auth.connected }));
vi.mock('@/components/nse/NSEUccRegistration', () => ({
  default: ({ presentation, onClose, onViewReport }: {
    presentation: string;
    onClose: () => void;
    onViewReport: () => void;
  }) => <section aria-label="Registration form" data-presentation={presentation}>
    <button onClick={onClose}>Back callback</button>
    <button onClick={onViewReport}>View Client Registration Report</button>
  </section>,
}));

function CurrentPath() {
  const loc = useLocation();
  return (
    <>
      <output aria-label="Current path">{loc.pathname}</output>
      <output aria-label="Location state">{JSON.stringify(loc.state)}</output>
    </>
  );
}

afterEach(() => {
  cleanup();
  auth.connected = true;
});

it('renders the registration page using page presentation when authenticated', () => {
  render(<MemoryRouter initialEntries={['/investor-registration']}><NSEInvestorRegistrationPage /></MemoryRouter>);
  expect(screen.getByRole('region', { name: 'Registration form' })).toHaveAttribute('data-presentation', 'page');
});

it('redirects unauthenticated visitors to the existing NSE login route', () => {
  auth.connected = false;
  render(<MemoryRouter initialEntries={['/investor-registration']}><Routes>
    <Route path="/investor-registration" element={<NSEInvestorRegistrationPage />} />
    <Route path="/nse-login" element={<CurrentPath />} />
  </Routes></MemoryRouter>);
  expect(screen.getByLabelText('Current path')).toHaveTextContent('/nse-login');
});

it('opens the existing investor report from the registration report action', () => {
  render(<MemoryRouter initialEntries={['/investor-registration']}><NSEInvestorRegistrationPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'View Client Registration Report' }));
  expect(screen.getByRole('dialog', { name: 'Mutual funds investor profiles' })).toBeInTheDocument();
});

it('uses the dashboard as the standalone page back destination when no returnTo is set', () => {
  render(<MemoryRouter initialEntries={['/investor-registration']}><NSEInvestorRegistrationPage /><CurrentPath /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Back callback' }));
  expect(screen.getByLabelText('Current path')).toHaveTextContent('/nse-dashboard');
});

it('returns to the mutual-funds route when returnTo is provided in location state', () => {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/investor-registration', state: { returnTo: '/mutual-funds' } }]}>
      <Routes>
        <Route path="/investor-registration" element={<NSEInvestorRegistrationPage />} />
        <Route path="/mutual-funds" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Back callback' }));
  expect(screen.getByLabelText('Current path')).toHaveTextContent('/mutual-funds');
});

it('passes pendingAction back in location state when returning to mutual-funds', () => {
  const pendingAction = { type: 'sip', fund: { id: 'f1', name: 'Test Fund', schemeCode: 'TF001' } };
  render(
    <MemoryRouter initialEntries={[{ pathname: '/investor-registration', state: { returnTo: '/mutual-funds', pendingAction } }]}>
      <Routes>
        <Route path="/investor-registration" element={<NSEInvestorRegistrationPage />} />
        <Route path="/mutual-funds" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Back callback' }));
  expect(screen.getByLabelText('Current path')).toHaveTextContent('/mutual-funds');
  const state = JSON.parse(screen.getByLabelText('Location state').textContent || '{}');
  expect(state.pendingAction.type).toBe('sip');
  expect(state.pendingAction.fund.schemeCode).toBe('TF001');
});
