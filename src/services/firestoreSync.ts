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
  SURAT_JALAN: 'suratJalan',
  PERMINTAAN: 'permintaan',
  LAPORAN_HARIAN: 'laporanHarian',
  AUDIT_LOG: 'auditLog',
};

/**
 * Check if initial seeding is needed and populate Firestore if empty.
 */
export async function seedInitialFirestoreDataIfEmpty(force = false): Promise<boolean> {
  try {
    if (!force) {
      const branchSnap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.BRANCHES));
      if (!branchSnap.empty) {
        return false; // Already seeded
      }

      // Check legacy cabang collection to migrate if exists
      const oldCabangSnap = await getDocs(collection(db, 'cabang'));
      if (!oldCabangSnap.empty) {
        console.log('Migrating branches from legacy cabang collection...');
        const migrateBatch = writeBatch(db);
        oldCabangSnap.forEach((d) => {
          const data = d.data();
          const branchId = data.id || data.branchId || d.id;
          migrateBatch.set(doc(db, FIRESTORE_COLLECTIONS.BRANCHES, branchId), {
            ...data,
            id: branchId,
            branchId,
            nama: data.nama || data.name || '',
            name: data.name || data.nama || '',
          });
        });
        await migrateBatch.commit();
        return true;
      }
    }

    console.log('Seeding initial data into Firestore...');
    const batch = writeBatch(db);

    // 1. Branches
    INITIAL_DATA_CABANG.forEach((c) => {
      const branchId = c.branchId || c.id;
      const ref = doc(db, FIRESTORE_COLLECTIONS.BRANCHES, branchId);
      batch.set(ref, {
        ...c,
        id: branchId,
        branchId,
        name: c.nama,
      });
    });

    // 2. Katalog
    INITIAL_KATALOG.forEach((k) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.KATALOG, k.id);
      batch.set(ref, k);
    });

    // 3. Karyawan
    INITIAL_KARYAWAN.forEach((k) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.KARYAWAN, k.id);
      batch.set(ref, k);
    });

    // 4. Bahan Baku
    INITIAL_BAHAN_BAKU.forEach((b) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.BAHAN_BAKU, b.id);
      batch.set(ref, b);
    });

    // 5. Stok Cabang
    Object.entries(INITIAL_STOK_CABANG).forEach(([cabangName, stok]) => {
      const safeId = encodeURIComponent(cabangName);
      const ref = doc(db, FIRESTORE_COLLECTIONS.STOK_CABANG, safeId);
      batch.set(ref, { cabang: cabangName, stok });
    });

    // 6. Status Toko
    Object.entries(INITIAL_TOKO_STATE).forEach(([cabangName, state]) => {
      const safeId = encodeURIComponent(cabangName);
      const ref = doc(db, FIRESTORE_COLLECTIONS.STATUS_TOKO, safeId);
      batch.set(ref, { cabang: cabangName, ...state });
    });

    // 7. Transaksi
    INITIAL_TRANSAKSI.forEach((t) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.TRANSAKSI, t.id);
      batch.set(ref, t);
    });

    // 8. Pengeluaran
    INITIAL_PENGELUARAN.forEach((p) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.PENGELUARAN, p.id);
      batch.set(ref, p);
    });

    // 9. Absensi
    INITIAL_ABSENSI.forEach((a) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.ABSENSI, a.id);
      batch.set(ref, a);
    });

    // 10. Surat Jalan
    INITIAL_SURAT_JALAN.forEach((sj) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.SURAT_JALAN, sj.id);
      batch.set(ref, sj);
    });

    // 11. Permintaan
    INITIAL_PERMINTAAN.forEach((req) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.PERMINTAAN, req.id);
      batch.set(ref, req);
    });

    // 12. Laporan Harian
    INITIAL_LAPORAN_HARIAN.forEach((lap) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.LAPORAN_HARIAN, lap.id);
      batch.set(ref, lap);
    });

    // 13. Audit Log
    INITIAL_AUDIT_LOG.forEach((log) => {
      const ref = doc(db, FIRESTORE_COLLECTIONS.AUDIT_LOG, log.id);
      batch.set(ref, log);
    });

    await batch.commit();
    console.log('Seeding initial data into Firestore complete!');
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
    return false;
  }
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
        if (items.length > 0) callbacks.onCabang(items);
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
        if (items.length > 0) callbacks.onKatalog(items);
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
        if (items.length > 0) callbacks.onKaryawan(items);
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
        if (items.length > 0) callbacks.onBahanBaku(items);
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
        if (Object.keys(map).length > 0) callbacks.onStokCabang(map);
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
        if (Object.keys(state).length > 0) callbacks.onStatusToko(state);
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
 * Mutation helpers with immediate Firestore persist
 */
export async function firestoreSaveCabang(cabang: DataCabang) {
  try {
    const branchId = cabang.branchId || cabang.id;
    const branchName = cabang.nama || cabang.name || '';
    const payload = {
      ...cabang,
      id: branchId,
      branchId,
      nama: branchName,
      name: branchName,
      updatedAt: new Date().toISOString(),
    };
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
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.KATALOG, menu.id), menu, { merge: true });
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
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.KARYAWAN, karyawan.id), karyawan, { merge: true });
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
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.BAHAN_BAKU, bahan.id), bahan, { merge: true });
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
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.STOK_CABANG, safeId), { cabang: cabangName, stok });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.STOK_CABANG}/${cabangName}`);
  }
}

export async function firestoreSaveStatusToko(cabangName: string, state: TokoState) {
  try {
    const safeId = encodeURIComponent(cabangName);
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.STATUS_TOKO, safeId), {
      cabang: cabangName,
      ...state,
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.STATUS_TOKO}/${cabangName}`);
  }
}

export async function firestoreSaveTransaksi(trx: Transaksi) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.TRANSAKSI, trx.id), trx, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.TRANSAKSI}/${trx.id}`);
  }
}

export async function firestoreSavePengeluaran(pengeluaran: PengeluaranToko) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.PENGELUARAN, pengeluaran.id), pengeluaran, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.PENGELUARAN}/${pengeluaran.id}`);
  }
}

export async function firestoreSaveAbsensi(absensi: Absensi) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.ABSENSI, absensi.id), absensi, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.ABSENSI}/${absensi.id}`);
  }
}

export async function firestoreSaveSuratJalan(sj: SuratJalan) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.SURAT_JALAN, sj.id), sj, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.SURAT_JALAN}/${sj.id}`);
  }
}

export async function firestoreSavePermintaan(req: PermintaanBarang) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.PERMINTAAN, req.id), req, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.PERMINTAAN}/${req.id}`);
  }
}

export async function firestoreSaveLaporanHarian(lap: LaporanHarian) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.LAPORAN_HARIAN, lap.id), lap, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.LAPORAN_HARIAN}/${lap.id}`);
  }
}

export async function firestoreSaveAuditLog(log: AuditLog) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTIONS.AUDIT_LOG, log.id), log, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.AUDIT_LOG}/${log.id}`);
  }
}
