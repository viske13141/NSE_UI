import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEWorkflowGuide from './NSEWorkflowGuide';
import NSEKycStatus from './NSEKycStatus';
import NSEClientReadiness from './NSEClientReadiness';
import { nseApi, NSE_TOKEN_KEY } from '@/services/nseApi';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });
it('opens the relevant task only on an explicit guidance action and explains searched terms', () => {
 const action = vi.fn(); render(<NSEWorkflowGuide section="clients" onAction={action} />);
 expect(action).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button', { name: 'Check KYC status' }));
 expect(action).toHaveBeenCalledWith('kyc');
 fireEvent.click(screen.getByText('What do these terms mean?'));
 fireEvent.change(screen.getByLabelText('Find a term'), { target: { value: 'EUIN' } });
 expect(screen.getByText(/AMFI identifier/)).toBeInTheDocument();
 expect(screen.queryByText('Unique Client Code: the investor account identifier assigned by the member.')).not.toBeInTheDocument();
});
it('checks KYC without treating a successful report as investment eligibility', async () => {
 const api = vi.spyOn(nseApi, 'clientKyc').mockResolvedValue({ response_status: 'S', report_data: [{ client_code: 'TEST001', client_pan: 'ABCPD1234F', kyc_status: 'SUCCESS', status_remark: '07- KYC Validated' }] });
 render(<NSEKycStatus onClose={vi.fn()} />);
 expect(api).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Client code'), { target: { value: 'TEST001' } });
 fireEvent.change(screen.getByLabelText('PAN (optional)'), { target: { value: 'ABCPD1234F' } });
 fireEvent.click(screen.getByRole('button', { name: 'Check KYC status' }));
 expect(await screen.findByRole('status')).toHaveTextContent('07- KYC Validated');
 expect(screen.getByRole('status')).toHaveTextContent('KYC verification passed');
 expect(api).toHaveBeenCalledWith({ pan_no: 'ABCPD1234F' });
});
it('fetches matching client consent links without resending communications automatically', async () => {
 sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
 const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ productType: 'CL_ACT', productRefId: 'TEST001', firstHolderLink: 'https://www.nseinvest.com/test-consent' }) });
 vi.stubGlobal('fetch', fetcher);
 render(<NSEClientReadiness row={{ client_code: 'TEST001', primary_holder_pan: 'ABCPD1234F', tax_status: '01', first_holder_fatca_exists: 'Y', first_holder_aof_exists: 'N' }} />);
 expect(screen.getByText('Yes')).toBeInTheDocument(); expect(screen.getByText('No')).toBeInTheDocument();
 expect(fetcher).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('How to complete client consent'));
 fireEvent.click(screen.getByRole('button', { name: 'Get client consent links' }));
 expect(await screen.findByRole('link', { name: 'First holder: open client authorization' })).toHaveAttribute('href', 'https://www.nseinvest.com/test-consent');
 expect(fetcher).toHaveBeenCalledTimes(1);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ productType: 'CL_ACT', productRefId: 'TEST001' });
});
it('does not offer individual OTP actions for a non-individual client', () => {
 render(<NSEClientReadiness row={{ client_code: 'CORP01', primary_holder_pan: 'ABCCD1234F', tax_status: '04' }} />);
 fireEvent.click(screen.getByText('How to complete client consent'));
 expect(screen.queryByRole('button', { name: 'Get client consent links' })).not.toBeInTheDocument();
 expect(screen.getByText(/use AOF upload where applicable/)).toBeInTheDocument();
});
