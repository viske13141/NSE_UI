import React, { useEffect } from 'react';
import type { NSEInvestorSelection } from '@/services/nseInvestorService';
export default function MockNSEInvestorSelector({ onChange }: { onChange: (value: NSEInvestorSelection | null) => void }) {
  const select = (id: string) => onChange({ clientCode: id === 'demo-registration' ? '' : 'TESTCL001', name: 'Test Investor', kycType: 'KRA COMPLIANT', memberCode: '1003338', clientType: 'NON DEMAT', depository: 'PHYS', kycVerified: true, bank: { id: 'test-bank', accountNo: '000011112222', ifsc: 'TEST0001234', label: 'Test Bank •••• 1234', status: id === 'demo-kyc' ? 'PENDING' : 'ACTIVE', active: id !== 'demo-kyc', isDefault: true } });
  useEffect(() => { select('demo-ready'); }, []);
  return <label>Investor<select defaultValue="demo-ready" onChange={event => select(event.target.value)}><option value="demo-ready">Test ready investor</option><option value="demo-kyc">Test inactive bank</option><option value="demo-registration">Test missing client code</option></select></label>;
}
