import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNSEPurchase, submitNSEPurchase } from './nseOrderService';
import { nseApi } from './nseApi';
const investor = { clientCode: 'TEST001', name: 'Test Investor', kycType: 'KRA COMPLIANT', kycVerified: true, bank: { id: '1', label: 'Test Bank •••• 2222', status: 'ACTIVE', active: true, isDefault: true, accountNo: '000011112222' } };
const input = { schemeCode: 'Mutual funds-SCHEME', amount: 2000, investor, euin: 'E654321', bankReference: 'TEST-REF', transactionMode: 'C' as const, memberUniqueId: 'TESTREF001' };
afterEach(() => vi.restoreAllMocks());
describe('Mutual funds purchase order entry', () => {
  it.each(['C', 'N', 'P'] as const)('maps %s transaction mode without treating C as physical', mode => {
    expect(buildNSEPurchase({ ...input, transactionMode: mode, folio: mode === 'P' ? 'TESTFOLIO' : '' }).transaction_details[0].demat_physical).toBe(mode);
  });
  it('rejects demat modes that conflict with Client Master', () => {
    expect(() => buildNSEPurchase({ ...input, investor: { ...investor, clientType: 'P' } })).toThrow('must match');
    expect(() => buildNSEPurchase({ ...input, transactionMode: 'C', investor: { ...investor, depository: 'NSDL' } })).toThrow('must match');
    expect(buildNSEPurchase({ ...input, transactionMode: 'N', investor: { ...investor, depository: 'NSDL' } }).transaction_details[0].demat_physical).toBe('N');
  });
  it('requires folio for physical and additional orders and enforces documented limits', () => {
    expect(() => buildNSEPurchase({ ...input, transactionMode: 'P' })).toThrow('Folio is required');
    expect(() => buildNSEPurchase({ ...input, purchaseType: 'ADDITIONAL' })).toThrow('Folio is required');
    expect(() => buildNSEPurchase({ ...input, amount: 500, minAmount: 1000 })).toThrow('below the scheme minimum');
    expect(() => buildNSEPurchase({ ...input, maxAmount: 1000 })).toThrow('exceeds the scheme maximum');
    expect(() => buildNSEPurchase({ ...input, amount: 1000.001 })).toThrow('two decimal places');
    expect(() => buildNSEPurchase({ ...input, memberUniqueId: 'X'.repeat(26) })).toThrow('25 characters');
  });
  it('permits EUIN declaration N and does not require an account number for purchase', () => {
    const detail = buildNSEPurchase({ ...input, euin: '', euinDeclaration: 'N', investor: { ...investor, bank: { ...investor.bank, accountNo: undefined } } }).transaction_details[0];
    expect(detail).toMatchObject({ euin_number: '', euin_declaration: 'N', account_no: '', member_unique_id: 'TESTREF001', filler1: '' });
    expect(detail.trxn_order_id).toBeUndefined();
    expect(detail.trxn_status).toBeUndefined();
  });
  it('recognizes TRXN SUCCESS as acceptance while leaving payment pending', async () => {
    vi.spyOn(nseApi, 'placeOrder').mockResolvedValue({ transaction_details: [{ trxn_order_id: '432160000001', trxn_status: 'TRXN SUCCESS' }] });
    expect(await submitNSEPurchase(input)).toMatchObject({ status: 'pending', orderAccepted: true, exchangeOrderId: '432160000001', remark: 'Order accepted. Payment is pending.' });
  });
  it('uses the documented envelope and selected details rather than example credentials or identifiers', () => {
    const body = buildNSEPurchase(input);
    expect(body.transaction_details[0]).toMatchObject({ scheme_code: 'Mutual funds-SCHEME', client_code: 'TEST001', trxn_type: 'P', buy_sell_type: 'FRESH', demat_physical: 'C', order_amount: '2000', kyc_flag: 'Y', euin_number: 'E654321', euin_declaration: 'Y', account_no: '000011112222', bank_ref_no: 'TEST-REF' });
  });
  it('treats HTTP-success transaction failures and zero order IDs as rejection', async () => {
    vi.spyOn(nseApi, 'placeOrder').mockResolvedValue({ transaction_details: [{ trxn_order_id: '0', trxn_status: 'TRXN FAILED', trxn_remark: 'Scheme code - Mutual funds-SCHEME not found / disabled.' }] });
    expect(await submitNSEPurchase(input)).toEqual({ status: 'rejected', orderAccepted: false, exchangeOrderId: null, rawStatus: 'TRXN FAILED', remark: 'Scheme code - Mutual funds-SCHEME not found / disabled.' });
  });
  it('never treats an order ID as payment or unit allotment', async () => {
    vi.spyOn(nseApi, 'placeOrder').mockResolvedValue({ transaction_details: [{ trxn_order_id: '123', trxn_status: 'RECEIVED' }] });
    expect(await submitNSEPurchase(input)).toMatchObject({ status: 'pending', exchangeOrderId: '123' });
  });
  it('blocks unverified KYC and masked bank accounts before making a request', () => {
    expect(() => buildNSEPurchase({ ...input, investor: { ...investor, kycVerified: false } })).toThrow('Verified Mutual funds KYC');
    expect(() => buildNSEPurchase({ ...input, investor: { ...investor, bank: { ...investor.bank, accountNo: 'XXXX2222' } } })).toThrow('Invalid bank account number');
    expect(() => buildNSEPurchase({ ...input, euin: '' })).toThrow('valid EUIN');
  });
});
