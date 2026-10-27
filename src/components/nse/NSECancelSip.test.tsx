import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSECancelSip from './NSECancelSip';
import * as service from '@/services/nseSipCancellationService';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('requires reason, review and explicit confirmation before sending once', async () => {
  const cancel = vi.spyOn(service, 'cancelNSESip').mockResolvedValue('Cancellation confirmed'); const done = vi.fn();
  render(<NSECancelSip sipId="123" clientCode="TEST001" scheme="Test fund" investor="Test investor" onCancelled={done} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel SIP' }));
  fireEvent.change(screen.getByLabelText('Cancellation reason'), { target: { value: '07' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review cancellation' }));
  expect(cancel).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Confirm SIP cancellation' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm SIP cancellation' }));
  expect(await screen.findByText(/Cancellation confirmed/)).toBeInTheDocument();
  expect(cancel).toHaveBeenCalledExactlyOnceWith('TEST001', '123', '07', '');
  expect(done).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: 'Confirm SIP cancellation' })).not.toBeInTheDocument();
});

it('explains an in-process order rejection without marking the SIP cancelled or allowing a duplicate', async () => {
  const cancel = vi.spyOn(service, 'cancelNSESip').mockRejectedValue(new Error('SIP Can not be cancelled as order is under process'));
  const done = vi.fn();
  render(<NSECancelSip sipId="123" clientCode="TEST001" scheme="Test fund" investor="Test investor" onCancelled={done} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel SIP' }));
  fireEvent.change(screen.getByLabelText('Cancellation reason'), { target: { value: '07' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review cancellation' }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm SIP cancellation' }));
  expect(await screen.findByText('Cancellation was not accepted while an order is processing.')).toBeInTheDocument();
  expect(done).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Confirm SIP cancellation' })).not.toBeInTheDocument();
});
