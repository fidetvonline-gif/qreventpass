import QRCode from 'qrcode';

/**
 * Generates a high-quality data URL representing the QR code for a given token.
 */
export async function generateQRDataUrl(token: string, size = 320): Promise<string> {
  try {
    const url = await QRCode.toDataURL(token, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a', // Deep slate / black
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return url;
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    throw err;
  }
}

/**
 * Generate a unique token for a guest following EVP-XXXX-XXXX-XXXX pattern
 */
export function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (len: number) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `EVP-${part(4)}-${part(4)}-${part(4)}`;
}

/**
 * Generate a reference number for registration tracking
 */
export function generateReferenceNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `REF-${num}`;
}
