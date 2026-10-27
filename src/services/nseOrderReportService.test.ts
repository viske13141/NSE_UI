import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNSEOrderReport, getNSEOrderReport, parseNSEOrderReport } from './nseOrderReportService';
import { nseApi } from './nseApi';
const filter = { from_date: '2026-10-09', to_date: '2026-10-15', trans_type: 'ALL', order_type: 'ALL', sub_order_type: 'ALL' };
const row = { order_id: '461912697480', client_code: 'TEST001', scheme_name: 'Test Fund', scheme_code: 'TEST-GR', order_date: '15/10/2026', order_status: 'VALID', order_remark: 'ALLOTMENT DONE', amount: '5000', quantity: '0.000', member_unique_id: 'REF001' };
afterEach(() => vi.restoreAllMocks());
describe('Mutual funds documented order reports', () => {
  it('validates inclusive seven-day dates and filter enums', () => {
    expect(buildNSEOrderReport(filter)).toMatchObject(filter);
    expect(() => buildNSEOrderReport({ ...filter, from_date: '2026-10-08' })).toThrow('seven calendar days');
    expect(() => buildNSEOrderReport({ ...filter, from_date: '2026-02-30' })).toThrow('valid report dates');
    expect(() => buildNSEOrderReport({ ...filter, trans_type: 'UNKNOWN' })).toThrow('Invalid trans type');
  });
  it('prioritizes numeric order IDs over member IDs and other filters', () => {
    const request = buildNSEOrderReport({ ...filter, client_code: 'TEST001', order_ids: '123, 456', member_unique_ids: 'REF001', order_type: 'SIP' });
    expect(request).toMatchObject({ order_ids: '123,456', order_type: 'ALL' });
    expect(request.member_unique_ids).toBeUndefined();
    expect(request.client_code).toBeUndefined();
  });
  it('includes provisional-only fields only for provisional requests', () => {
    const request = { ...filter, date_type: 'ORDER DATE', sip_reg_nos: '202608211027628' };
    expect(buildNSEOrderReport(request).date_type).toBeUndefined();
    expect(buildNSEOrderReport(request, true)).toMatchObject({ date_type: 'ORDER DATE', sip_reg_nos: '202608211027628' });
  });
  it('routes provisional requests and preserves VALID and allotment remarks without inventing units', async () => {
    const api = vi.spyOn(nseApi, 'provisionalOrders').mockResolvedValue({ response_status: 'S', report_data: [{ ...row, order_remark: 'PROVISIONAL ORDER' }] });
    expect((await getNSEOrderReport(filter, true))[0]).toMatchObject({ status: 'VALID', remark: 'PROVISIONAL ORDER', quantity: '0.000' });
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ date_type: 'REQUEST DATE' }));
    expect(parseNSEOrderReport({ response_status: 'S', report_data: [row] })[0]).toMatchObject({ remark: 'ALLOTMENT DONE', quantity: '0.000' });
  });
});
