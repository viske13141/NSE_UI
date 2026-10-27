import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEAllotmentStatements from './NSEAllotmentStatements';
import { nseApi } from '@/services/nseApi';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Mutual funds Investments allotments UI', () => {
  it('converts date inputs and displays actual units, allotment NAV and amount separately', async () => {
    const api = vi.spyOn(nseApi, 'allotments').mockResolvedValue({ response_status: 'S', report_data: [{ orderno: '123', clientcode: 'TEST001', schemecode: 'TEST-GR', schemename: 'Test Fund', amount: '1000', allottedqty: '1000', allottednav: '10', allotmentamt: '10000', validflag: 'Y' }] });
    const update = vi.fn(); render(<NSEAllotmentStatements onRows={update} />);
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To date'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh allotments' }));
    expect(await screen.findByRole('heading', { name: 'Test Fund' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ from_date: '01-10-2026', to_date: '15-10-2026' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 confirmed allotment records');
    expect(screen.getByRole('status')).toHaveTextContent('₹10,000.00');
    expect(screen.getByText('Allotment NAV')).toBeInTheDocument();
    expect(screen.getByText('Original order amount')).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ units: 1000, nav: 10, allottedAmount: 10000, orderAmount: 1000 })]));
  });
  it('shows an empty report and validation failures without inventing holdings', async () => {
    vi.spyOn(nseApi, 'allotments').mockResolvedValueOnce({ response_status: 'S', report_data: [] }).mockRejectedValueOnce(new Error('Report unavailable'));
    render(<NSEAllotmentStatements onRows={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh allotments' }));
    expect(await screen.findByText('No allotments found for these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh allotments' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Report unavailable');
    expect(screen.queryByText('No allotments found for these filters.')).not.toBeInTheDocument();
  });
});
