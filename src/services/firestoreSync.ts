import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DataCabang,
  KatalogMenu,
  Karyawan,
  BahanBaku,
  StokCabangMap,
  AllTokoState,
  Transaksi,
  PengeluaranToko,
  Absensi,
  SuratJalan,
  PermintaanBarang,
  LaporanHarian,
  AuditLog,
  TokoState,
  PengaturanOff,
  MenuCabang,
  OWNER_EMAIL,
  FullResetOptions,
  FullResetResult,
} from '../types';
import {
  INITIAL_DATA_CABANG,
  INITIAL_KATALOG,
  INITIAL_KARYAWAN,
  INITIAL_BAHAN_BAKU,
  INITIAL_STOK_CABANG,
  INITIAL_TOKO_STATE,
  INITIAL_TRANSAKSI,
  INITIAL_PERMINTAAN,
  INITIAL_SURAT_JALAN,
  INITIAL_ABSENSI,
  INITIAL_LAPORAN_HARIAN,
  INITIAL_AUDIT_LOG,
  INITIAL_PENGELUARAN,
} from '../data/initialData';

// Firestore collection names
export const FIRESTORE_COLLECTIONS = {
  BRANCHES: 'branches',
  CABANG: 'branches',
  KATALOG: 'katalog',
  KARYAWAN: 'karyawan',
  BAHAN_BAKU: 'bahanBaku',
  STOK_CABANG: 'stokCabang',
  STATUS_TOKO: 'statusToko',
  TRANSAKSI: 'transaksi',
  PENGELUARAN: 'pengeluaran',
  ABSENSI: 'absensi',
  PENGATURAN_OFF: 'pengaturan_off',
  MENU_CABANG: 'menu_cabang',
  SURAT_JALAN: 'suratJalan',
  PERMINTAAN: 'permintaan',
  LAPORAN_HARIAN: 'laporanHarian',
  AUDIT_LOG: 'auditLog',
};

/**
 * Auto-seeding otomatis saat aplikasi dibuka dimatikan permanen (Sesuai instruksi).
 * Fungsi ini HANYA mengeksekusi jika dipanggil secara manual dari tombol 'Reset Data Demo' di Pengaturan oleh Owner.
 */
export async function seedInitialFirestoreDataIfEmpty(force = false, callerEmail?: string): Promise<boolean> {
  if (!force) {
    // AUTO-SEED MATI PERMANEN. Tidak pernah mengisi data otomatis saat app dibuka/refresh/publish.
    return false;
  }
  return (await resetToDemoDataInFirestore(callerEmail)).success;
}

export async function resetToDemoDataInFirestore(callerEmail?: string): Promise<{ success: boolean; message: string }> {
  try {
    const emailToCheck = (callerEmail || '').trim().toLowerCase();
    if (emailToCheck !== OWNER_EMAIL.toLowerCase()) {
      console.warn(`Unauthorized reset attempt by email: "${emailToCheck}". Expected: "${OWNER_EMAIL}"`);
      return {
        success: false,
        message: `Akses Ditolak: Fungsi reset hanya bisa dijalankan jika user.email == ${OWNER_EMAIL}. Akun saat ini: ${emailToCheck || '(tidak terdaftar email)'}.`,
      };
    }

    console.log(`Security check passed for Owner (${emailToCheck}). Seeding demo data with isDemo=true into Firestore...`);
    const batch = writeBatch(db);

    // 1. Branches
    INITIAL_DATA_CABANG.forEach((c) => {
      const branchId = c.branchId || c.id;
      const ref = doc(db, FIRESTORE_COLLECTIONS.BRANCHES, branchId);
      batch.set(ref, sanitizeForFirestore({
        ...c,
        id: branchId,
        branchId,
        name: c.nama,
        isDemo: true,
      }));
    });

    // 2. Katalog
    INITIAL_KATALOG.forEach((k) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.KATALOG, k.id);
      batch.set(ref, sanitizeForFirestore({ ...k, isDemo: true }));
    });

    // 3. Karyawan
    INITIAL_KARYAWAN.forEach((k) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.KARYAWAN, k.id);
      batch.set(ref, sanitizeForFirestore({ ...k, isDemo: true }));
    });

    // 4. Bahan Baku
    INITIAL_BAHAN_BAKU.forEach((b) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.BAHAN_BAKU, b.id);
      batch.set(ref, sanitizeForFirestore({ ...b, isDemo: true }));
    });

    // 5. Stok Cabang
    Object.entries(INITIAL_STOK_CABANG).forEach(([cabangName, stok]) => {
      const safeId = encodeURIComponent(cabangName);
      const ref = doc(db, FIRESTORE_COLLECTIONS.STOK_CABANG, safeId);
      batch.set(ref, sanitizeForFirestore({ cabang: cabangName, stok, isDemo: true }));
    });

    // 6. Status Toko
    Object.entries(INITIAL_TOKO_STATE).forEach(([cabangName, state]) => {
      const safeId = encodeURIComponent(cabangName);
      const ref = doc(db, FIRESTORE_COLLECTIONS.STATUS_TOKO, safeId);
      batch.set(ref, sanitizeForFirestore({ cabang: cabangName, ...state, isDemo: true }));
    });

    // 7. Transaksi
    INITIAL_TRANSAKSI.forEach((t) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.TRANSAKSI, t.id);
      batch.set(ref, sanitizeForFirestore({ ...t, isDemo: true }));
    });

    // 8. Pengeluaran
    INITIAL_PENGELUARAN.forEach((p) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.PENGELUARAN, p.id);
      batch.set(ref, sanitizeForFirestore({ ...p, isDemo: true }));
    });

    // 9. Absensi
    INITIAL_ABSENSI.forEach((a) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.ABSENSI, a.id);
      batch.set(ref, sanitizeForFirestore({ ...a, isDemo: true }));
    });

    // 10. Surat Jalan
    INITIAL_SURAT_JALAN.forEach((sj) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.SURAT_JALAN, sj.id);
      batch.set(ref, sanitizeForFirestore({ ...sj, isDemo: true }));
    });

    // 11. Permintaan
    INITIAL_PERMINTAAN.forEach((req) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.PERMINTAAN, req.id);
      batch.set(ref, sanitizeForFirestore({ ...req, isDemo: true }));
    });

    // 12. Laporan Harian
    INITIAL_LAPORAN_HARIAN.forEach((lap) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.LAPORAN_HARIAN, lap.id);
      batch.set(ref, sanitizeForFirestore({ ...lap, isDemo: true }));
    });

    // 13. Audit Log
    INITIAL_AUDIT_LOG.forEach((log) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.AUDIT_LOG, log.id);
      batch.set(ref, sanitizeForFirestore({ ...log, isDemo: true }));
    });

    await batch.commit();
    console.log('Seeding initial data into Firestore complete with isDemo=true!');
    return { success: true, message: 'Data demo berhasil di-reset ke Firestore.' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
    return { success: false, message: 'Gagal mereset data demo ke Firestore.' };
  }
}

/**
 * Helper: Menghapus seluruh dokumen dalam collection menggunakan writeBatch dalam kelipatan 400 dokumen
 * Menjamin tidak melebihi limit 500 operasi Firestore per batch.
 */
async function deleteCollectionInBatches(
  collectionName: string,
  filterFn?: (docData: any, docId: string) => boolean
): Promise<number> {
  let count = 0;
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      console.log(`Menghapus collection ${collectionName}: 0 dokumen`);
      return 0;
    }

    const docsToDelete = snap.docs.filter((d) => {
      if (!filterFn) return true;
      return filterFn(d.data(), d.id);
    });

    console.log(`Menghapus collection ${collectionName}: ${docsToDelete.length} dokumen`);

    const CHUNK_SIZE = 400;
    for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
      const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
      count += chunk.length;
    }
  } catch (err) {
    console.warn(`Gagal menghapus dokumen dari collection ${collectionName}:`, err);
  }
  return count;
}

/**
 * FUNGSI FULL RESET TOTAL:
 * Menghapus data trial/uji coba berdasarkan kategori yang dicentang oleh Owner.
 * Menjamin akun Owner dan konfigurasi toko tidak terhapus.
 */
export async function executeFullResetInFirestore(
  options: FullResetOptions,
  callerEmail?: string
): Promise<FullResetResult> {
  const emailToCheck = (callerEmail || '').trim().toLowerCase();
  if (emailToCheck !== OWNER_EMAIL.toLowerCase()) {
    console.warn(`Akses ditolak: Full reset hanya diizinkan untuk email ${OWNER_EMAIL}. Akun saat ini: ${emailToCheck || 'anonim'}`);
    return {
      success: false,
      totalDeleted: 0,
      collectionCount: 0,
      message: `Akses Ditolak: Hanya akun Owner (${OWNER_EMAIL}) yang berhak menjalankan Full Reset Total.`,
      affectedCategories: [],
    };
  }

  let totalDeleted = 0;
  const affectedCollections: string[] = [];
  const affectedCategories: string[] = [];

  try {
    // 1. Pesanan
    if (options.pesanan) {
      affectedCategories.push('Pesanan');
      const collectionsToClean = ['transaksi', 'orders', 'pesanan', 'transactions', 'sales'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 2. Pengeluaran Toko
    if (options.pengeluaran) {
      affectedCategories.push('Pengeluaran Toko');
      const collectionsToClean = ['pengeluaran'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 3. Permintaan & Stock Cabang
    if (options.permintaanStokCabang) {
      affectedCategories.push('Permintaan & Stock Cabang');
      const collectionsToClean = ['permintaan', 'stokCabang', 'stocks'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 4. Surat Jalan DC
    if (options.suratJalan) {
      affectedCategories.push('Surat Jalan DC');
      const collectionsToClean = ['suratJalan'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 5. Absensi
    if (options.absensi) {
      affectedCategories.push('Absensi');
      const collectionsToClean = ['absensi'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 6. Buka/Tutup Toko
    if (options.bukaTutupToko) {
      affectedCategories.push('Buka/Tutup Toko');
      const collectionsToClean = ['statusToko'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 7. Laporan
    if (options.laporan) {
      affectedCategories.push('Laporan');
      const collectionsToClean = [
        'laporanHarian',
        'auditLog',
        'divoid',
        'dibatalkan',
        'logs',
        'reports',
      ];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 8. Bahan Baku & DC
    if (options.bahanBakuDc) {
      affectedCategories.push('Bahan Baku & DC');
      const collectionsToClean = ['bahanBaku', 'ingredients', 'bahan'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 9. Katalog Menu
    if (options.katalogMenu) {
      affectedCategories.push('Katalog Menu');
      const collectionsToClean = ['katalog', 'menus', 'products', 'categories'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 10. Data Cabang
    if (options.dataCabang) {
      affectedCategories.push('Data Cabang');
      const collectionsToClean = ['branches', 'cabang', 'dataCabang'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col);
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    // 11. Data Karyawan (jangan hapus Owner)
    // KECUALI: JANGAN HAPUS akun Owner (Haji Hendra, usr-0, jabatan Owner, email OWNER_EMAIL)
    if (options.dataKaryawan) {
      affectedCategories.push('Data Karyawan');
      const collectionsToClean = ['karyawan', 'employees'];
      for (const col of collectionsToClean) {
        const deleted = await deleteCollectionInBatches(col, (data, docId) => {
          const isOwnerDoc =
            docId === 'usr-0' ||
            data?.jabatan === 'Owner' ||
            data?.role === 'owner' ||
            (data?.email && data.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
          return !isOwnerDoc; // Hanya hapus jika BUKAN akun Owner
        });
        if (deleted > 0) {
          totalDeleted += deleted;
          if (!affectedCollections.includes(col)) affectedCollections.push(col);
        }
      }
    }

    console.log(`FULL RESET SELESAI: ${totalDeleted} dokumen dihapus dari ${affectedCollections.length} koleksi.`);
    return {
      success: true,
      totalDeleted,
      collectionCount: affectedCollections.length,
      message: `✅ ${totalDeleted} data trial berhasil dihapus di ${affectedCollections.length || 1} koleksi (${affectedCategories.join(', ')}).`,
      affectedCategories,
    };
  } catch (error: any) {
    console.error('Error saat menjalankan full reset:', error);
    return {
      success: false,
      totalDeleted,
      collectionCount: affectedCollections.length,
      message: `Gagal menjalankan reset: ${error?.message || String(error)}`,
      affectedCategories,
    };
  }
}

/**
 * FUNGSI HAPUS CEPAT: CUMA PESANAN
 */
export async function executeQuickOrdersReset(callerEmail?: string): Promise<FullResetResult> {
  return executeFullResetInFirestore(
    {
      pesanan: true,
      pengeluaran: false,
      permintaanStokCabang: false,
      suratJalan: false,
      absensi: false,
      bukaTutupToko: false,
      laporan: false,
      bahanBakuDc: false,
      katalogMenu: false,
      dataCabang: false,
      dataKaryawan: false,
    },
    callerEmail
  );
}

/**
 * Realtime Subscriptions
 */
export function subscribeToRealtimeFirestore(callbacks: {
  onCabang: (list: DataCabang[]) => void;
  onKatalog: (list: KatalogMenu[]) => void;
  onKaryawan: (list: Karyawan[]) => void;
  onBahanBaku: (list: BahanBaku[]) => void;
  onStokCabang: (map: StokCabangMap) => void;
  onStatusToko: (state: AllTokoState) => void;
  onTransaksi: (list: Transaksi[]) => void;
  onPengeluaran: (list: PengeluaranToko[]) => void;
  onAbsensi: (list: Absensi[]) => void;
  onPengaturanOff?: (list: PengaturanOff[]) => void;
  onMenuCabang?: (list: MenuCabang[]) => void;
  onSuratJalan: (list: SuratJalan[]) => void;
  onPermintaan: (list: PermintaanBarang[]) => void;
  onLaporanHarian: (list: LaporanHarian[]) => void;
  onAuditLog: (list: AuditLog[]) => void;
}): () => void {
  const unsubscribers: (() => void)[] = [];

  // 1. Branches (Firestore collection `branches` berdasarkan `branchId`)
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.BRANCHES),
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          const branchId = data.branchId || data.id || d.id;
          const branchName = data.nama || data.name || '';
          return {
            ...data,
            id: branchId,
            branchId,
            nama: branchName,
            name: branchName,
          } as DataCabang;
        });
        callbacks.onCabang(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.BRANCHES)
    )
  );

  // 2. Katalog
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.KATALOG),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as KatalogMenu);
        callbacks.onKatalog(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.KATALOG)
    )
  );

  // 3. Karyawan
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.KARYAWAN),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Karyawan);
        callbacks.onKaryawan(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.KARYAWAN)
    )
  );

  // 4. Bahan Baku
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.BAHAN_BAKU),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as BahanBaku);
        callbacks.onBahanBaku(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.BAHAN_BAKU)
    )
  );

  // 5. Stok Cabang
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.STOK_CABANG),
      (snap) => {
        const map: StokCabangMap = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.cabang && data.stok) {
            map[data.cabang] = data.stok;
          }
        });
        callbacks.onStokCabang(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.STOK_CABANG)
    )
  );

  // 6. Status Toko
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.STATUS_TOKO),
      (snap) => {
        const state: AllTokoState = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.cabang) {
            state[data.cabang] = {
              status: data.status || 'Belum Buka',
              jamBuka: data.jamBuka,
              jamTutup: data.jamTutup,
              kasirNama: data.kasirNama,
              modalAwal: data.modalAwal,
              terakhirUpdate: data.terakhirUpdate,
              terakhirTutupTanggal: data.terakhirTutupTanggal,
              sudahTutupHariIni: data.sudahTutupHariIni,
            };
          }
        });
        callbacks.onStatusToko(state);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.STATUS_TOKO)
    )
  );

  // 7. Transaksi
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.TRANSAKSI),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Transaksi);
        callbacks.onTransaksi(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.TRANSAKSI)
    )
  );

  // 8. Pengeluaran
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.PENGELUARAN),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as PengeluaranToko);
        callbacks.onPengeluaran(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.PENGELUARAN)
    )
  );

  // 9. Absensi
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.ABSENSI),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as Absensi);
        callbacks.onAbsensi(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.ABSENSI)
    )
  );

  // 9b. Pengaturan Off
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.PENGATURAN_OFF),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as PengaturanOff);
        if (callbacks.onPengaturanOff) callbacks.onPengaturanOff(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.PENGATURAN_OFF)
    )
  );

  // 9c. Menu Cabang
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.MENU_CABANG),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as MenuCabang);
        if (callbacks.onMenuCabang) callbacks.onMenuCabang(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.MENU_CABANG)
    )
  );

  // 10. Surat Jalan
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.SURAT_JALAN),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as SuratJalan);
        callbacks.onSuratJalan(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.SURAT_JALAN)
    )
  );

  // 11. Permintaan
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.PERMINTAAN),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as PermintaanBarang);
        callbacks.onPermintaan(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.PERMINTAAN)
    )
  );

  // 12. Laporan Harian
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.LAPORAN_HARIAN),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as LaporanHarian);
        callbacks.onLaporanHarian(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.LAPORAN_HARIAN)
    )
  );

  // 13. Audit Log
  unsubscribers.push(
    onSnapshot(
      collection(db, FIRESTORE_COLLECTIONS.AUDIT_LOG),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as AuditLog);
        callbacks.onAuditLog(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, FIRESTORE_COLLECTIONS.AUDIT_LOG)
    )
  );

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Recursively removes keys with `undefined` values from an object or array,
 * because Firestore setDoc/updateDoc fails when an unsupported undefined value is passed.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as T;
  }
  return data;
}

/**
 * Mutation helpers with immediate Firestore persist
 */
export async function firestoreSaveCabang(cabang: DataCabang) {
  try {
    const branchId = cabang.branchId || cabang.id;
    const branchName = cabang.nama || cabang.name || '';
    const payload = sanitizeForFirestore({
      ...cabang,
      id: branchId,
      branchId,
      nama: branchName,
      name: branchName,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.BRANCHES, branchId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.BRANCHES}/${cabang.id}`);
  }
}

export async function firestoreDeleteCabang(id: string) {
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.BRANCHES, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.BRANCHES}/${id}`);
  }
}

export async function firestoreSaveKatalog(menu: KatalogMenu) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.KATALOG, menu.id), sanitizeForFirestore(menu), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.KATALOG}/${menu.id}`);
  }
}

export async function firestoreDeleteKatalog(id: string) {
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.KATALOG, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.KATALOG}/${id}`);
  }
}

export async function firestoreSaveKaryawan(karyawan: Karyawan) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.KARYAWAN, karyawan.id), sanitizeForFirestore(karyawan), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.KARYAWAN}/${karyawan.id}`);
  }
}

export async function firestoreDeleteKaryawan(id: string) {
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.KARYAWAN, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.KARYAWAN}/${id}`);
  }
}

export async function firestoreSaveBahanBaku(bahan: BahanBaku) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.BAHAN_BAKU, bahan.id), sanitizeForFirestore(bahan), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.BAHAN_BAKU}/${bahan.id}`);
  }
}

export async function firestoreDeleteBahanBaku(id: string) {
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.BAHAN_BAKU, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.BAHAN_BAKU}/${id}`);
  }
}

export async function firestoreSaveStokCabang(cabangName: string, stok: Record<string, number>) {
  try {
    const safeId = encodeURIComponent(cabangName);
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.STOK_CABANG, safeId), sanitizeForFirestore({ cabang: cabangName, stok }));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.STOK_CABANG}/${cabangName}`);
  }
}

export async function firestoreSaveStatusToko(cabangName: string, state: TokoState) {
  try {
    const safeId = encodeURIComponent(cabangName);
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.STATUS_TOKO, safeId), sanitizeForFirestore({
      cabang: cabangName,
      ...state,
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.STATUS_TOKO}/${cabangName}`);
  }
}

export async function firestoreSaveTransaksi(trx: Transaksi) {
  try {
    const cleanTrx = sanitizeForFirestore(trx);
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.TRANSAKSI, trx.id), cleanTrx, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.TRANSAKSI}/${trx.id}`);
  }
}

export async function firestoreSavePengeluaran(pengeluaran: PengeluaranToko) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.PENGELUARAN, pengeluaran.id), sanitizeForFirestore(pengeluaran), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.PENGELUARAN}/${pengeluaran.id}`);
  }
}

export async function firestoreSaveAbsensi(absensi: Absensi) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.ABSENSI, absensi.id), sanitizeForFirestore(absensi), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.ABSENSI}/${absensi.id}`);
  }
}

export async function firestoreDeleteAbsensi(id: string) {
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.ABSENSI, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.ABSENSI}/${id}`);
  }
}

export async function firestoreSaveSuratJalan(sj: SuratJalan) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.SURAT_JALAN, sj.id), sanitizeForFirestore(sj), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.SURAT_JALAN}/${sj.id}`);
  }
}

export async function firestoreSavePermintaan(req: PermintaanBarang) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.PERMINTAAN, req.id), sanitizeForFirestore(req), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.PERMINTAAN}/${req.id}`);
  }
}

export async function firestoreSaveLaporanHarian(lap: LaporanHarian) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.LAPORAN_HARIAN, lap.id), sanitizeForFirestore(lap), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.LAPORAN_HARIAN}/${lap.id}`);
  }
}

export async function firestoreSaveAuditLog(log: AuditLog) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.AUDIT_LOG, log.id), sanitizeForFirestore(log), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.AUDIT_LOG}/${log.id}`);
  }
}

export async function firestoreSavePengaturanOff(poff: PengaturanOff) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.PENGATURAN_OFF, poff.cabangId), sanitizeForFirestore(poff), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.PENGATURAN_OFF}/${poff.cabangId}`);
  }
}

export async function firestoreSaveMenuCabang(mc: MenuCabang) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.MENU_CABANG, mc.id), sanitizeForFirestore(mc), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.MENU_CABANG}/${mc.id}`);
  }
}

export async function firestoreSaveMenuCabangBatch(menuId: string, cabangIds: string[], allBranches: DataCabang[]) {
  try {
    const isAll = cabangIds.length === 0 || cabangIds.includes('ALL');
    const batch = writeBatch(db);
    allBranches.forEach((b) => {
      const cId = b.branchId || b.id;
      const docId = `${menuId}_${cId}`;
      const isTampil = isAll || cabangIds.includes(cId) || cabangIds.includes(b.nama);
      const record: MenuCabang = {
        id: docId,
        menu_id: menuId,
        cabang_id: cId,
        is_tampil: isTampil,
        updatedAt: new Date().toISOString(),
      };
      batch.set(doc(db, FIRESTORE_COLLECTIONS.MENU_CABANG, docId), sanitizeForFirestore(record), { merge: true });
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.MENU_CABANG}/batch_${menuId}`);
  }
}
