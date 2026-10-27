import { afterEach, expect, it, vi } from 'vitest';
import { uploadNSEFatcaImage } from './nseFatcaUploadService';
import { NSE_TOKEN_KEY } from './nseApi';
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
const file = () => new File([new Uint8Array([255, 216, 255, 224, 0])], 'fatca.jpg', { type: 'image/jpeg' });
it('rejects individual and malformed PAN before sending', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(uploadNSEFatcaImage('ABCPD1234F', file())).rejects.toThrow('non-individual');
  await expect(uploadNSEFatcaImage('string', file())).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it('sends raw base64 and requires status 100 for a non-individual PAN', async () => {
  sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ status: '100', message: 'Image Uploaded Successfully.' }) }); vi.stubGlobal('fetch', fetcher);
  await expect(uploadNSEFatcaImage('ABCHD1234F', file())).resolves.toContain('Successfully');
  expect(fetcher).toHaveBeenCalledWith('/nse-api/fatca/image-upload', expect.objectContaining({ body: JSON.stringify({ pan_no: 'ABCHD1234F', file_name: 'fatca.jpg', file_data: '/9j/4AA=' }) }));
  fetcher.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ status: '101', message: 'Invalid PAN detail.' }) });
  await expect(uploadNSEFatcaImage('ABCHD1234F', file())).rejects.toThrow('Invalid PAN detail');
});

it('accepts a signed PDF and marks the attempt only immediately before the API call', async () => {
  sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ status: '100', message: 'Uploaded' }) });
  vi.stubGlobal('fetch', fetcher);
  const started = vi.fn();
  await expect(uploadNSEFatcaImage('ABCHD1234F', new File(['%PDF-test'], 'signed.pdf'), started)).resolves.toBe('Uploaded');
  expect(started).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects oversized files and renamed documents without marking an upload attempt', async () => {
  const started = vi.fn(), fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(uploadNSEFatcaImage('ABCHD1234F', new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'signed.jpg'), started)).rejects.toThrow('3 MB');
  await expect(uploadNSEFatcaImage('ABCHD1234F', new File(['%PDF-test'], 'signed.jpg'), started)).rejects.toThrow('contents');
  expect(started).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
});
