import { nseRequest } from './nseApi';

// NSE Invest Web FAQ (28 November 2025), sections 5.20-5.21.
export const FATCA_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export function validateNSEFatcaImage(pan: string, file: File) {
  const normalizedPan = pan.trim().toUpperCase();
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(normalizedPan)) throw new Error('Enter a valid 10-character PAN');
  if (normalizedPan[3] === 'P') throw new Error('Signed-image upload requires a non-individual or HUF PAN. For an individual PAN, choose Individual declaration.');
  if (file.name.length > 40 || !/\.(jpg|jpeg|tif|tiff|pdf)$/i.test(file.name)) throw new Error('Choose a JPG, JPEG, TIF, TIFF or PDF file with a filename of up to 40 characters');
  if (!file.size || file.size > FATCA_IMAGE_MAX_BYTES) throw new Error('Choose a nonempty signed document up to 3 MB');
  return normalizedPan;
}
export async function uploadNSEFatcaImage(pan: string, file: File, onRequestStart?: () => void) {
  const normalizedPan = validateNSEFatcaImage(pan, file);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected image'));
    reader.readAsDataURL(file);
  });
  const fileData = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Array.from(atob(fileData.slice(0, 12)), character => character.charCodeAt(0));
  const starts = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const extension = file.name.split('.').pop()?.toLowerCase();
  const valid = extension === 'pdf' ? starts([37, 80, 68, 70, 45])
    : extension === 'tif' || extension === 'tiff' ? starts([73, 73, 42, 0]) || starts([77, 77, 0, 42])
    : starts([255, 216, 255]);
  if (!valid) throw new Error('The file contents do not match its extension. Choose the original signed document.');
  onRequestStart?.();
  const response = await nseRequest<{ status?: string; message?: string }>('/fatca/image-upload', { pan_no: normalizedPan, file_name: file.name, file_data: fileData });
  if (String(response?.status) !== '100') throw new Error(response?.message || 'Mutual funds did not confirm image upload');
  return response.message || 'FATCA image uploaded successfully';
}
