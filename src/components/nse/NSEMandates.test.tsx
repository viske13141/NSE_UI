import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEMandates from './NSEMandates';
import { nseApi, NSEApiError } from '@/services/nseApi';
vi.mock('./NSEInvestorSelector', () => import('@/test/mockNSEInvestorSelector'));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function review(record = vi.fn()) {
  render(<NSEMandates records={[]} onRecord={record} />);
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Register mandate' }), { button: 0, ctrlKey: false });
  fireEvent.change(screen.getByLabelText('Maximum debit amount (₹)'), { target: { value: '100000' } });
  fireEvent.change(screen.getByLabelText('Account type'), { target: { value: 'SB' } });
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-10-15' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2100-10-15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review mandate' }));
}
describe('Mutual funds live mandate UI', () => {
  it('shows a definitive 422 processing rejection instead of confirmation unknown', async () => {
    vi.spyOn(nseApi, 'registerMandate').mockRejectedValue(new NSEApiError('We are not able to process Mandate registration.', 422));
    const record = vi.fn(); review(record);
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Register mandate' }));
    expect(await screen.findByRole('heading', { name: 'Mandate registration rejected' })).toBeInTheDocument();
    expect(screen.getByText('We are not able to process Mandate registration.')).toBeInTheDocument();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected', rawStatus: 'Request rejected (422)' }));
  });
  it('requires consent and reports registration as approval pending', async () => {
    const api = vi.spyOn(nseApi, 'registerMandate').mockResolvedValue({ reg_data: [{ reg_id: '2026101510018', reg_status: 'REG_SUCCESS' }] });
    const record = vi.fn(); review(record);
    expect(screen.getByRole('button', { name: 'Register mandate' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Register mandate' }));
    expect(await screen.findByRole('heading', { name: 'Mandate registered — approval pending' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ reg_data: [expect.objectContaining({ mandate_type: 'E', ac_type: 'SB', start_date: '15/10/2099' })] }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ status: 'registered' }));
  });
  it('records an uncertain backend outcome without an automatic retry', async () => {
    const api = vi.spyOn(nseApi, 'registerMandate').mockRejectedValue(new Error('Check mandate status before retrying'));
    const record = vi.fn(); review(record);
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Register mandate' }));
    expect(await screen.findByRole('heading', { name: 'Mandate confirmation unknown' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ status: 'unknown' }));
  });
});
