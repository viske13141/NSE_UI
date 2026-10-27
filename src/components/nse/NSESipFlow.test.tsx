import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSESipFlow from './NSESipFlow';
import { nseApi } from '@/services/nseApi';

vi.mock('./NSEInvestorSelector', () => import('@/test/mockNSEInvestorSelector'));
beforeEach(() => { vi.spyOn(nseApi, 'mandateStatus').mockResolvedValue({ response_status: 'S', report_data: [{ clientCode: 'TESTCL001', mandateId: '123456', status: 'APPROVED', amount: '5000', bankName: 'Test bank' }] }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const fund = { name: 'Test fund', amc: 'Test AMC', amcCode: 'TEST_MF', plan: 'Regular', schemeCode: 'TEST-GR' };
function show() {
  render(<NSESipFlow fund={fund} onClose={vi.fn()} onRecord={vi.fn()} onTrack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Installment amount (₹)'), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-10-15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to investor' }));
}
it('populates member/physical mode and blocks review when an inactive bank is selected', async () => {
  show();
  expect(screen.getByLabelText('Mutual funds member code')).toHaveValue('1003338');
  expect(screen.getByLabelText('Mutual funds member code')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('SIP depository mode')).toHaveValue('P');
  expect(screen.getByRole('option', { name: 'CDSL demat (D / C)' })).toBeDisabled();
  await screen.findByRole('option', { name: /Test bank/ });
  fireEvent.change(screen.getByLabelText('Approved SIP mandate'), { target: { value: '123456' } });
  expect(screen.getByRole('button', { name: 'Review SIP' })).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Investor'), { target: { value: 'demo-kyc' } });
  expect(screen.getByRole('button', { name: 'Review SIP' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Find and verify the investor');
});
it('reviews and submits the optional document fields only after consent', async () => {
  const register = vi.spyOn(nseApi, 'registerSip').mockResolvedValue({ reg_data: [{ client_code: 'TESTCL001', sch_code: 'TEST-GR', reg_status: 'REG_SUCCESS', reg_id: '12345' }] });
  show();
  expect(screen.getByLabelText('Existing folio (optional)')).toHaveAttribute('maxlength', '15');
  await screen.findByRole('option', { name: /Test bank/ });
  fireEvent.change(screen.getByLabelText('Approved SIP mandate'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Existing folio (optional)'), { target: { value: '123456789012345' } });
  fireEvent.change(screen.getByLabelText('EUIN declaration'), { target: { value: 'N' } });
  expect(screen.queryByLabelText('EUIN')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Contact and distributor details (optional)'));
  for (const [label, value] of [['Primary holder mobile (optional)', '9000000000'], ['Primary holder email (optional)', 'test@example.com'], ['SIP remarks (optional)', 'Test remarks'], ['Sub-broker code (optional)', 'BROKER1'], ['Sub-broker ARN (optional)', 'ARN-1234']]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Review SIP' }));
  expect(await screen.findByRole('heading', { name: 'Review SIP registration' })).toBeInTheDocument();
  expect(screen.getByText('Test remarks')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Register SIP' })).toBeDisabled();
  expect(register).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the schedule/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Register SIP' }));
  expect(await screen.findByRole('heading', { name: 'SIP registered' })).toBeInTheDocument();
  expect(register).toHaveBeenCalledWith({ reg_data: [expect.objectContaining({ trans_mode: 'P', dp_txn_mode: 'P', folio_no: '123456789012345', primary_holder_mobile: '9000000000', primary_holder_email: 'test@example.com', sip_remarks: 'Test remarks', sub_broker_code: 'BROKER1', sub_broker_arn: 'ARN-1234', dpc_flag: 'Y' })] });
});
