export const STORAGE_KEYS = {
  KARYAWAN: 'seblak_karyawan',
  BAHAN_BAKU: 'seblak_bahanBaku',
  KATALOG: 'seblak_katalog',
  STOK_CABANG: 'seblak_stokCabang',
  TRANSAKSI: 'seblak_transaksi',
  PERMINTAAN_BARANG: 'seblak_permintaanBarang',
  SURAT_JALAN: 'seblak_suratJalan',
  ABSENSI: 'seblak_absensi',
  LAPORAN_HARIAN: 'seblak_laporanHarian',
  CABANG: 'dataCabang',
  DATA_CABANG: 'dataCabang',
  TOKO_STATE: 'seblak_statusToko',
  SESSION: 'seblak_session',
  AUDIT_LOG: 'seblak_audit_log',
  USED_NOTA_HASHES: 'seblak_used_nota_hashes',
  PENGELUARAN: 'seblak_pengeluaran',
};

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error(`Error loading key "${key}" from localStorage:`, e);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving key "${key}" to localStorage:`, e);
  }
}

export function formatRupiah(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0]; // 'HH:MM:SS'
}

export function getNowShortTime(): string {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function generateInvoiceNo(cabang: string): string {
  const prefix = cabang.replace(/\s+/g, '').toUpperCase();
  const dateStr = getTodayStr().replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRX-${prefix}-${dateStr}-${rand}`;
}

export function generatePermintaanNo(cabang: string): string {
  const prefix = cabang.replace(/\s+/g, '').toUpperCase();
  const dateStr = getTodayStr().replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `REQ-${prefix}-${dateStr}-${rand}`;
}

export function generateSuratJalanNo(): string {
  const dateStr = getTodayStr().replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `SJ-DC-${dateStr}-${rand}`;
}

/**
 * Fast string hashing (FNV-1a 32-bit variant) returning hexadecimal checksum
 */
export function computeStringHash(str: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  // Include length and sample character to increase entropy
  const tail = str.length > 50 ? str.slice(str.length - 20) : '';
  let h2 = 0x27d4eb2f;
  for (let j = 0; j < tail.length; j++) {
    h2 ^= tail.charCodeAt(j);
    h2 = Math.imul(h2, 0x1000193);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `H-${hex1}-${hex2}-${str.length}`;
}

/**
 * Compresses an image client-side:
 * - Max resolution 800px
 * - Canvas JPEG quality 0.6
 * - Target size <= 200KB
 * - If still > 300KB, rejects with "Foto terlalu besar, coba foto lebih dekat"
 */
export async function compressImage(
  file: File,
  maxResolution = 800,
  initialQuality = 0.6
): Promise<{ dataUrl: string; hash: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) {
        reject(new Error('File kosong'));
        return;
      }

      // Compute raw fingerprint for duplicate detection
      const rawHash = computeStringHash(rawResult);

      const img = new Image();
      img.onerror = () => {
        reject(new Error('Format file gambar tidak didukung'));
      };

      img.onload = () => {
        try {
          let origWidth = img.width;
          let origHeight = img.height;

          // 1. Enforce max resolution 800px
          let targetWidth = origWidth;
          let targetHeight = origHeight;
          if (targetWidth > maxResolution || targetHeight > maxResolution) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxResolution) / targetWidth);
              targetWidth = maxResolution;
            } else {
              targetWidth = Math.round((targetWidth * maxResolution) / targetHeight);
              targetHeight = maxResolution;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Gagal memproses kanvas gambar'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // 2. Initial compression with canvas JPEG quality 0.6
          let quality = initialQuality;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          const calcSizeKb = (dataUrl: string) => {
            const base64Part = dataUrl.split(',')[1] || '';
            const byteSize = (base64Part.length * 3) / 4;
            return Math.round(byteSize / 1024);
          };

          let currentSizeKb = calcSizeKb(compressedDataUrl);

          // If size > 200KB, progressively optimize quality/resolution to reach <= 200KB
          let iterations = 0;
          while (currentSizeKb > 200 && iterations < 3) {
            iterations++;
            quality = Math.max(0.35, quality - 0.1);
            if (iterations >= 2) {
              targetWidth = Math.round(targetWidth * 0.85);
              targetHeight = Math.round(targetHeight * 0.85);
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            }
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            currentSizeKb = calcSizeKb(compressedDataUrl);
          }

          // 3. Rule: Jika foto masih > 300KB, tolak dan tampilkan pesan
          if (currentSizeKb > 300) {
            reject(new Error('Foto terlalu besar, coba foto lebih dekat'));
            return;
          }

          const finalHash = `${rawHash}::${computeStringHash(compressedDataUrl)}`;

          resolve({
            dataUrl: compressedDataUrl,
            hash: finalHash,
            sizeKb: currentSizeKb,
          });
        } catch (err: any) {
          reject(new Error(err.message || 'Gagal mengompres gambar'));
        }
      };

      img.src = rawResult;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Calculates current LocalStorage usage and returns % remaining capacity (based on 5MB standard)
 */
export function getLocalStorageUsage(): {
  usedKb: number;
  totalKb: number;
  percentUsed: number;
  percentRemaining: number;
} {
  let totalChars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key);
        totalChars += key.length + (val ? val.length : 0);
      }
    }
  } catch (e) {
    console.error('Error calculating localStorage:', e);
  }

  // 1 character in UTF-16 localStorage is 2 bytes
  const usedBytes = totalChars * 2;
  const usedKb = Math.round(usedBytes / 1024);
  const totalKb = 5120; // 5 MB typical browser localStorage limit
  const percentUsed = Math.min(100, Math.round((usedKb / totalKb) * 100));
  const percentRemaining = Math.max(0, 100 - percentUsed);

  return {
    usedKb,
    totalKb,
    percentUsed,
    percentRemaining,
  };
}

/**
 * Format Indonesian telephone number for WhatsApp API (e.g. 081234 -> 6281234)
 */
export function formatWaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

