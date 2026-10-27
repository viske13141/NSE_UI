import { afterEach, describe, expect, it, vi } from 'vitest';
import { nseApi, NSE_TOKEN_KEY } from './nseApi';
// These fixture filters are deliberately opaque: this test validates the client
// transport without asserting undocumented exchange date formats/filter codes.
const filters = { from_date: 'TEST-FROM', to_date: 'TEST-TO', trans_type: 'TEST-TRANSACTION', order_type: 'TEST-ORDER', sub_order_type: 'TEST-SUBORDER' };
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
describe('Mutual funds order status report validation', () => {
  it('rejects the supplied nonnumeric placeholder and more than 50 IDs before sending', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(nseApi.orderStatus({ ...filters, order_ids: 'string' })).rejects.toThrow('numeric values');
    await expect(nseApi.orderStatus({ ...filters, order_ids: Array.from({ length: 51 }, (_, i) => String(i + 1)).join(',') })).rejects.toThrow('at most 50');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects Swagger placeholders in required date/filter fields', async () => {
    await expect(nseApi.orderStatus({ ...filters, from_date: 'string', order_ids: '123' })).rejects.toThrow('Swagger placeholders');
  });
  it('surfaces a report-level F response even when HTTP status is 200', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ response_status: 'F', report_data: [], error_remark: 'Invalid report filters' }) })));
    await expect(nseApi.orderStatus({ ...filters, order_ids: '123' })).rejects.toThrow('Invalid report filters');
  });
  it('preserves successful records without inventing status mappings', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    const row = { order_id: '123', arbitrary_status_field: 'UNMAPPED' };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ response_status: 'S', report_data: [row] }) })));
    expect((await nseApi.orderStatus({ ...filters, order_ids: '123' })).report_data).toEqual([row]);
  });
});
