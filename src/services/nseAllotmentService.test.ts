import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNSEAllotmentRequest, getNSEAllotments, parseNSEAllotments } from './nseAllotmentService';
import { nseApi } from './nseApi';
const filter = { from_date: '15-09-2026', to_date: '15-10-2026' };
const row = { orderno: '451480000468', clientcode: 'TEST001', schemecode: 'TEST-GR', schemename: 'Test Fund', amount: '1000.00', qty: ' ', allottedqty: '1000.0000', allottednav: '10.0000', allotmentamt: '10000.00', validflag: 'Y', foliono: ' ', reportdate: '2026-10-15', orderdate: '2026-10-14', member_unique_id: 'REF001' };
afterEach(() => vi.restoreAllMocks());
describe('Mutual funds allotment statement', () => {
  it('uses DD-MM-YYYY and permits only a 30-day gap', () => {
    expect(buildNSEAllotmentRequest(filter)).toMatchObject({ ...filter, date_type: 'ORD_DATE' });
    expect(() => buildNSEAllotmentRequest({ ...filter, from_date: '2026-09-15' })).toThrow('DD-MM-YYYY');
    expect(() => buildNSEAllotmentRequest({ ...filter, from_date: '14-09-2026' })).toThrow('30 days');
    expect(() => buildNSEAllotmentRequest({ ...filter, from_date: '31-09-2026' })).toThrow('valid allotment dates');
  });
  it('prioritizes order IDs over references and other filters', () => {
    expect(buildNSEAllotmentRequest({ ...filter, order_ids: '123, 456', member_unique_ids: 'REF001', client_code: 'TEST001' })).toEqual({ ...filter, order_ids: '123,456' });
    expect(() => buildNSEAllotmentRequest({ ...filter, order_ids: 'string' })).toThrow('numeric order IDs');
  });
  it('maps allotted fields rather than original order fields and deduplicates exact records', () => {
    const result = parseNSEAllotments({ response_status: 'S', report_data: [row, row] });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ orderId: '451480000468', clientCode: 'TEST001', units: 1000, nav: 10, allottedAmount: 10000, orderAmount: 1000, folio: '', confirmed: true });
  });
  it('does not confirm invalid, zero or missing allotments', () => {
    const result = parseNSEAllotments({ response_status: 'S', report_data: [{ ...row, validflag: 'N' }, { ...row, allottedqty: '0' }, { ...row, allottedqty: ' ', allottednav: ' ' }] });
    expect(result.every(item => !item.confirmed)).toBe(true);
    expect(result[2].units).toBeNull();
  });
  it('handles report failures and fetches with documented date basis', async () => {
    const api = vi.spyOn(nseApi, 'allotments').mockResolvedValue({ response_status: 'S', report_data: [row] });
    expect(await getNSEAllotments({ ...filter, date_type: 'ALT_DATE' })).toHaveLength(1);
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ date_type: 'ALT_DATE' }));
    expect(() => parseNSEAllotments({ response_status: 'F', error_remark: 'Invalid IDs' })).toThrow('Invalid IDs');
  });
});
