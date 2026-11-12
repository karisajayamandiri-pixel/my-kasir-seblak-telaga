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
  PENGATURAN_OFF: 'seblak_pengaturan_off',
  MENU_CABANG: 'seblak_menu_cabang',
  PENGATURAN_GAJI: 'seblak_pengaturan_gaji',
  APP_SETTINGS: 'seblak_app_settings',
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

/**
 * Resize & compress uploaded business logo image for Firestore (< 200KB) while preserving PNG/WebP transparency
 */
export async function compressLogoImage(
  file: File,
  maxSize = 320,
  removeWhiteBg = true
): Promise<{ dataUrl: string; sizeKb: number }> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Ukuran file logo maksimal 8 MB');
  }

  const stripWhiteBackground = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return false;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let alreadyHasAlpha = false;
    const sampleCornerOffsets = [
      0,
      (w - 1) * 4,
      (h - 1) * w * 4,
      ((h - 1) * w + (w - 1)) * 4,
    ];
    for (const off of sampleCornerOffsets) {
      if (data[off + 3] < 200) {
        alreadyHasAlpha = true;
      }
    }

    const isNearWhite = (idx: number): boolean => {
      const a = data[idx + 3];
      if (a < 30) return true;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      return r >= 225 && g >= 225 && b >= 225 && maxC - minC <= 28;
    };

    const isCornerWhiteBg = sampleCornerOffsets.some((off) => data[off + 3] >= 200 && isNearWhite(off));
    if (!isCornerWhiteBg) {
      return alreadyHasAlpha;
    }

    const totalPixels = w * h;
    const visited = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    const tryEnqueue = (x: number, y: number) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const p = y * w + x;
      if (visited[p]) return;
      const idx = p * 4;
      if (isNearWhite(idx)) {
        visited[p] = 1;
        queue[tail++] = p;
      }
    };

    for (let x = 0; x < w; x++) {
      tryEnqueue(x, 0);
      tryEnqueue(x, h - 1);
    }
    for (let y = 1; y < h - 1; y++) {
      tryEnqueue(0, y);
      tryEnqueue(w - 1, y);
    }

    while (head < tail) {
      const p = queue[head++];
      const idx = p * 4;
      data[idx + 3] = 0;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) tryEnqueue(x - 1, y);
      if (x + 1 < w) tryEnqueue(x + 1, y);
      if (y > 0) tryEnqueue(x, y - 1);
      if (y + 1 < h) tryEnqueue(x, y + 1);
    }

    // Soften 1px bright anti-aliased fringe adjacent to cleared background
    for (let p = 0; p < totalPixels; p++) {
      if (!visited[p]) continue;
      const x = p % w;
      const y = (p - x) / w;
      const neighbors = [
        x > 0 ? p - 1 : -1,
        x + 1 < w ? p + 1 : -1,
        y > 0 ? p - w : -1,
        y + 1 < h ? p + w : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || visited[n]) continue;
        const idx = n * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a > 0) {
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          if (r >= 200 && g >= 200 && b >= 200 && maxC - minC <= 38) {
            const luminance = (r + g + b) / 3;
            const factor = Math.max(0.15, Math.min(1, (255 - luminance) / 55));
            data[idx + 3] = Math.round(a * factor);
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return true;
  };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file logo'));
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) {
        reject(new Error('File logo kosong'));
        return;
      }

      const calcSizeKb = (dataUrl: string) => {
        const base64Part = dataUrl.split(',')[1] || '';
        return Math.round(((base64Part.length * 3) / 4) / 1024);
      };

      // Small SVG can be kept cleanly
      if (file.type === 'image/svg+xml' && calcSizeKb(rawResult) <= 180) {
        resolve({ dataUrl: rawResult, sizeKb: calcSizeKb(rawResult) });
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar logo tidak didukung. Gunakan PNG, JPG, WEBP, atau SVG.'));
      img.onload = () => {
        try {
          let targetWidth = img.width || maxSize;
          let targetHeight = img.height || maxSize;

          if (targetWidth > maxSize || targetHeight > maxSize) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.max(1, Math.round((targetHeight * maxSize) / targetWidth));
              targetWidth = maxSize;
            } else {
              targetWidth = Math.max(1, Math.round((targetWidth * maxSize) / targetHeight));
              targetHeight = maxSize;
            }
          }

          const renderCanvas = (w: number, h: number): { canvas: HTMLCanvasElement; hasTransparency: boolean } => {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const cx = c.getContext('2d');
            if (!cx) {
              throw new Error('Gagal memproses kanvas logo');
            }
            cx.clearRect(0, 0, w, h);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(img, 0, 0, w, h);
            const hasAlpha = removeWhiteBg ? stripWhiteBackground(c) : false;
            return { canvas: c, hasTransparency: hasAlpha };
          };

          const { canvas, hasTransparency } = renderCanvas(targetWidth, targetHeight);
          const isTransparentCandidate =
            hasTransparency ||
            file.type === 'image/png' ||
            file.type === 'image/webp' ||
            file.type === 'image/svg+xml';

          let output = canvas.toDataURL(isTransparentCandidate ? 'image/png' : 'image/jpeg', 0.85);
          let sizeKb = calcSizeKb(output);

          if (sizeKb > 180 && isTransparentCandidate) {
            output = canvas.toDataURL('image/webp', 0.85);
            sizeKb = calcSizeKb(output);
          }

          let scale = 0.8;
          let tries = 0;
          while (sizeKb > 180 && tries < 3) {
            tries++;
            const w = Math.max(64, Math.round(targetWidth * scale));
            const h = Math.max(64, Math.round(targetHeight * scale));
            const nextRender = renderCanvas(w, h);
            output = nextRender.canvas.toDataURL(
              isTransparentCandidate ? 'image/webp' : 'image/jpeg',
              0.8 - tries * 0.1
            );
            sizeKb = calcSizeKb(output);
            scale *= 0.8;
          }

          if (sizeKb > 280) {
            reject(new Error('Ukuran logo setelah kompresi masih terlalu besar. Pilih gambar dengan resolusi lebih kecil.'));
            return;
          }

          resolve({ dataUrl: output, sizeKb });
        } catch (err: any) {
          reject(new Error(err?.message || 'Gagal mengompresi gambar logo'));
        }
      };

      img.src = rawResult;
    };

    reader.readAsDataURL(file);
  });
}

