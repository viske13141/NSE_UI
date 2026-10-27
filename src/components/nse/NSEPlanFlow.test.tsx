vi.mock('./NSEInvestorSelector', () => import('@/test/mockNSEInvestorSelector'));
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEPlanFlow from './NSEPlanFlow';
afterEach(cleanup);
const source = { name: 'Source Fund', code: 'SRC', amc: 'AMC' };
const destination = { name: 'Destination Fund', code: 'DST', amc: 'AMC' };
describe('Mutual funds systematic plan preview', () => {
  it('requires a destination and consent before recording an STP', () => {
    const record = vi.fn();
    render(<NSEPlanFlow type="STP" scheme={source} targets={[source, destination]} onClose={vi.fn()} onRecord={record} onTrack={vi.fn()} />);
    expect(screen.queryByRole('option', { name: 'Source Fund · SRC' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Destination scheme'), { target: { value: 'DST' } });
    fireEvent.change(screen.getByLabelText('Transfer amount (₹)'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review STP' }));
    expect(screen.getByRole('button', { name: 'Simulate STP registered' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate STP registered' }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ mode: 'stp', fund: 'Source Fund', targetScheme: 'Destination Fund', amount: 1000, status: 'successful' }));
  });
  it('records SWP failures and updates the same reference on retry', () => {
    const record = vi.fn(); const track = vi.fn();
    render(<NSEPlanFlow type="SWP" scheme={source} targets={[]} onClose={vi.fn()} onRecord={record} onTrack={track} />);
    fireEvent.change(screen.getByLabelText('Withdrawal amount (₹)'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review SWP' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate failure' }));
    expect(record.mock.calls[0][0].status).toBe('rejected');
    fireEvent.click(screen.getByRole('button', { name: 'Review demo outcome' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate SWP registered' }));
    expect(record.mock.calls[1][0]).toMatchObject({ id: record.mock.calls[0][0].id, mode: 'swp', status: 'successful' });
    fireEvent.click(screen.getByRole('button', { name: 'View orders' }));
    expect(track).toHaveBeenCalledTimes(1);
  });
});
