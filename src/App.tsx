/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Karyawan,
  BahanBaku,
  KatalogMenu,
  StokCabangMap,
  Transaksi,
  PermintaanBarang,
  SuratJalan,
  Absensi,
  LaporanHarian,
  AllTokoState,
  ActiveTab,
  Cabang,
  SuratJalanItem,
  DataCabang,
  AuditLog,
  PengeluaranToko,
  StatusPengeluaran,
  StatusPesanan,
} from './types';
import {
  INITIAL_KARYAWAN,
  INITIAL_BAHAN_BAKU,
  INITIAL_KATALOG,
  INITIAL_STOK_CABANG,
  INITIAL_TRANSAKSI,
  INITIAL_PERMINTAAN,
  INITIAL_SURAT_JALAN,
  INITIAL_ABSENSI,
  INITIAL_LAPORAN_HARIAN,
  INITIAL_TOKO_STATE,
  INITIAL_DATA_CABANG,
  INITIAL_AUDIT_LOG,
  INITIAL_PENGELUARAN,
} from './data/initialData';
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  getTodayStr,
  getNowShortTime,
  getNowTimeStr,
  formatRupiah,
} from './utils/storage';
import {
  seedInitialFirestoreDataIfEmpty,
  subscribeToRealtimeFirestore,
  firestoreSaveCabang,
  firestoreDeleteCabang,
  firestoreSaveKatalog,
  firestoreDeleteKatalog,
  firestoreSaveKaryawan,
  firestoreDeleteKaryawan,
  firestoreSaveBahanBaku,
  firestoreDeleteBahanBaku,
  firestoreSaveStokCabang,
  firestoreSaveStatusToko,
  firestoreSaveTransaksi,
  firestoreSavePengeluaran,
  firestoreSaveAbsensi,
  firestoreSaveSuratJalan,
  firestoreSavePermintaan,
  firestoreSaveLaporanHarian,
  firestoreSaveAuditLog,
} from './services/firestoreSync';

// Components
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { BahanBakuView } from './components/BahanBakuView';
import { KatalogMenuView } from './components/KatalogMenuView';
import { StokCabangView } from './components/StokCabangView';
import { SuratJalanDcView } from './components/SuratJalanDcView';
import { TerimaBarangView } from './components/TerimaBarangView';
import { AbsensiView } from './components/AbsensiView';
import { BukaTutupTokoView } from './components/BukaTutupTokoView';
import { PengeluaranView } from './components/PengeluaranView';
import { KaryawanView } from './components/KaryawanView';
import { DataOwnerView } from './components/DataOwnerView';
import { PengirimanDriverView } from './components/PengirimanDriverView';
import { DataCabangView } from './components/DataCabangView';
import { LaporanView } from './components/LaporanView';
import { PesananView } from './components/PesananView';
import { PrintModal, PrintDocumentType } from './components/PrintModal';
import { RotateCcw, AlertTriangle, LogOut } from 'lucide-react';
import { getBranchName } from './utils/branchHelper';

export default function App() {
  // Requirement 2: "Saat buka link, redirect WAJIB ke /login dulu. Jangan langsung dashboard. Semua route harus cek login."
  // Initialize currentUser as null on fresh app load
  const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Master Data Cabang (Requirement 1: Simpan LocalStorage 'dataCabang')
  const [dataCabangList, setDataCabangList] = useState<DataCabang[]>(() =>
    loadFromStorage<DataCabang[]>(STORAGE_KEYS.CABANG, INITIAL_DATA_CABANG)
  );

  // Master & Operational Datasets
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>(() => {
    const loaded = loadFromStorage<Karyawan[]>(STORAGE_KEYS.KARYAWAN, INITIAL_KARYAWAN);
    return loaded.map((k) => {
      if (k.jabatan === 'Owner') {
        return {
          ...k,
          username: 'rizal',
          password: '990002',
        };
      }
      return k;
    });
  });

  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>(() =>
    loadFromStorage<BahanBaku[]>(STORAGE_KEYS.BAHAN_BAKU, INITIAL_BAHAN_BAKU)
  );

  const [katalogList, setKatalogList] = useState<KatalogMenu[]>(() =>
    loadFromStorage<KatalogMenu[]>(STORAGE_KEYS.KATALOG, INITIAL_KATALOG)
  );

  const [stokCabang, setStokCabang] = useState<StokCabangMap>(() =>
    loadFromStorage<StokCabangMap>(STORAGE_KEYS.STOK_CABANG, INITIAL_STOK_CABANG)
  );

  const [transaksiList, setTransaksiList] = useState<Transaksi[]>(() =>
    loadFromStorage<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, INITIAL_TRANSAKSI)
  );

  const [permintaanList, setPermintaanList] = useState<PermintaanBarang[]>(() =>
    loadFromStorage<PermintaanBarang[]>(STORAGE_KEYS.PERMINTAAN_BARANG, INITIAL_PERMINTAAN)
  );

  const [suratJalanList, setSuratJalanList] = useState<SuratJalan[]>(() =>
    loadFromStorage<SuratJalan[]>(STORAGE_KEYS.SURAT_JALAN, INITIAL_SURAT_JALAN)
  );

  const [absensiList, setAbsensiList] = useState<Absensi[]>(() =>
    loadFromStorage<Absensi[]>(STORAGE_KEYS.ABSENSI, INITIAL_ABSENSI)
  );

  const [laporanHarianList, setLaporanHarianList] = useState<LaporanHarian[]>(() =>
    loadFromStorage<LaporanHarian[]>(STORAGE_KEYS.LAPORAN_HARIAN, INITIAL_LAPORAN_HARIAN)
  );

  const [tokoState, setTokoState] = useState<AllTokoState>(() =>
    loadFromStorage<AllTokoState>(STORAGE_KEYS.TOKO_STATE, INITIAL_TOKO_STATE)
  );

  // Requirement 3: Permanent Audit Log (Anti-fraud, append-only, LocalStorage)
  const [auditLogList, setAuditLogList] = useState<AuditLog[]>(() =>
    loadFromStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOG, INITIAL_AUDIT_LOG)
  );

  // Requirement 2: Used Nota Hashes (Anti-Fraud: reject duplicate receipt photos)
  const [usedNotaHashes, setUsedNotaHashes] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEYS.USED_NOTA_HASHES, [])
  );

  // Requirement 2 & 5: Pengeluaran Toko & 1-Click ACC Owner
  const [pengeluaranList, setPengeluaranList] = useState<PengeluaranToko[]>(() =>
    loadFromStorage<PengeluaranToko[]>(STORAGE_KEYS.PENGELUARAN, INITIAL_PENGELUARAN)
  );

  // Print Modal State
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    type: PrintDocumentType | null;
    data: any;
  }>({
    isOpen: false,
    type: null,
    data: null,
  });

  // Logout Confirm Modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync route in browser address bar & enforce login check on every route
  useEffect(() => {
    try {
      if (!currentUser) {
        window.history.replaceState(null, '', '/login');
      } else {
        window.history.replaceState(null, '', `/${activeTab}`);
      }
    } catch {
      // Safe fallback
    }
  }, [currentUser, activeTab]);

  // Realtime Firestore synchronization for all master data across all devices/phones
  useEffect(() => {
    // 1. Remove obsolete local master keys from localStorage
    try {
      localStorage.removeItem(STORAGE_KEYS.CABANG);
      localStorage.removeItem(STORAGE_KEYS.KARYAWAN);
      localStorage.removeItem(STORAGE_KEYS.BAHAN_BAKU);
      localStorage.removeItem(STORAGE_KEYS.KATALOG);
      localStorage.removeItem(STORAGE_KEYS.STOK_CABANG);
      localStorage.removeItem(STORAGE_KEYS.TOKO_STATE);
    } catch {}

    // 2. Check and seed initial data if Firestore collections are empty
    seedInitialFirestoreDataIfEmpty().catch((err) => {
      console.warn('Initial Firestore seed check notice:', err);
    });

    // 3. Listen to real-time changes on Firestore collections
    const unsubscribe = subscribeToRealtimeFirestore({
      onCabang: (list) => setDataCabangList(list),
      onKatalog: (list) => setKatalogList(list),
      onKaryawan: (list) => {
        const formatted = list.map((k) =>
          k.jabatan === 'Owner'
            ? { ...k, username: 'rizal', password: '990002' }
            : k
        );
        setKaryawanList(formatted);
      },
      onBahanBaku: (list) => setBahanBakuList(list),
      onStokCabang: (map) => setStokCabang(map),
      onStatusToko: (state) => setTokoState(state),
      onTransaksi: (list) => {
        setTransaksiList(list);
        saveToStorage(STORAGE_KEYS.TRANSAKSI, list);
      },
      onPengeluaran: (list) => setPengeluaranList(list),
      onAbsensi: (list) => setAbsensiList(list),
      onSuratJalan: (list) => setSuratJalanList(list),
      onPermintaan: (list) => setPermintaanList(list),
      onLaporanHarian: (list) => setLaporanHarianList(list),
      onAuditLog: (list) => setAuditLogList(list),
    });

    return () => unsubscribe();
  }, []);

  // Transaksi local cache & anti-fraud hashes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TRANSAKSI, transaksiList);
  }, [transaksiList]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USED_NOTA_HASHES, usedNotaHashes);
  }, [usedNotaHashes]);

  // Auth Handlers
  const handleLoginSuccess = (user: Karyawan, selectedCabang: string) => {
    // If Owner chooses a specific branch, set duty to that branch
    const effectiveCabang = (
      user.jabatan === 'Owner' && selectedCabang !== 'DC PUSAT'
        ? selectedCabang
        : user.cabang
    ) as Cabang;

    const loggedInUser: Karyawan = {
      ...user,
      cabang: effectiveCabang,
    };

    setCurrentUser(loggedInUser);

    if (
      loggedInUser.jabatan === 'Kitchen' ||
      (loggedInUser.jabatan as string) === 'KITCHEN' ||
      loggedInUser.jabatan === 'Crew Store' ||
      (loggedInUser.jabatan as string) === 'CREW STORE'
    ) {
      setActiveTab('pesanan');
    } else if (loggedInUser.jabatan === 'Driver') {
      setActiveTab('pengirimanDriver');
    } else if (effectiveCabang === 'DC PUSAT' || loggedInUser.jabatan === 'Owner') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('pos');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setCurrentUser(null);
    setShowLogoutConfirm(false);
    setActiveTab('dashboard');
    try {
      window.history.replaceState(null, '', '/login');
    } catch {}
  };

  // Restock DC Handler (Kulakan)
  const handleRestockDc = (bahanId: string, qtyTambah: number) => {
    const target = bahanBakuList.find((b) => b.id === bahanId);
    if (!target) return;
    const updated = { ...target, stokDC: target.stokDC + qtyTambah };
    setBahanBakuList((prev) =>
      prev.map((b) => (b.id === bahanId ? updated : b))
    );
    firestoreSaveBahanBaku(updated);
  };

  // Surat Jalan Creation Handler (Kurangi stok DC)
  const handleAddSuratJalan = (newSj: SuratJalan) => {
    newSj.items.forEach((it) => {
      const b = bahanBakuList.find((x) => x.id === it.bahanId);
      if (b) {
        const updatedB = { ...b, stokDC: Math.max(0, b.stokDC - it.qtyKirim) };
        firestoreSaveBahanBaku(updatedB);
      }
    });
    setSuratJalanList((prev) => [...prev, newSj]);
    firestoreSaveSuratJalan(newSj);
  };

  // Update Permintaan Status Handler
  const handleUpdatePermintaanStatus = (
    permintaanId: string,
    status: PermintaanBarang['status'],
    sjId?: string
  ) => {
    const target = permintaanList.find((p) => p.id === permintaanId);
    if (target) {
      const updated = {
        ...target,
        status,
        suratJalanId: sjId || target.suratJalanId,
      };
      setPermintaanList((prev) =>
        prev.map((p) => (p.id === permintaanId ? updated : p))
      );
      firestoreSavePermintaan(updated);
    }
  };

  // Confirm Penerimaan Barang di Cabang
  const handleConfirmTerimaSuratJalan = (
    sjId: string,
    penerimaNama: string,
    verifiedItems: SuratJalanItem[],
    catatan?: string
  ) => {
    const target = suratJalanList.find((s) => s.id === sjId);
    if (target) {
      const updated = {
        ...target,
        status: 'Selesai' as const,
        tanggalTerima: getTodayStr(),
        jamTerima: getNowShortTime(),
        penerimaNama,
        items: verifiedItems,
        catatanPenerima: catatan,
      };
      setSuratJalanList((prev) =>
        prev.map((s) => (s.id === sjId ? updated : s))
      );
      firestoreSaveSuratJalan(updated);

      if (target.permintaanId) {
        handleUpdatePermintaanStatus(target.permintaanId, 'Selesai');
      }
    }
  };

  // Driver Delivery Status Update Handler
  const handleUpdateSuratJalanStatus = (
    sjId: string,
    status: 'Dikirim' | 'Terkirim' | 'Diterima' | 'Selesai',
    meta?: {
      penerimaNama?: string;
      tanggalTerima?: string;
      jamTerima?: string;
      catatanPenerima?: string;
    }
  ) => {
    const target = suratJalanList.find((s) => s.id === sjId);
    if (target) {
      const updated = {
        ...target,
        status,
        penerimaNama: meta?.penerimaNama || target.penerimaNama,
        tanggalTerima: meta?.tanggalTerima || target.tanggalTerima,
        jamTerima: meta?.jamTerima || target.jamTerima,
        catatanPenerima: meta?.catatanPenerima || target.catatanPenerima,
      };
      setSuratJalanList((prev) =>
        prev.map((s) => (s.id === sjId ? updated : s))
      );
      firestoreSaveSuratJalan(updated);

      if ((status === 'Diterima' || status === 'Selesai') && target.permintaanId) {
        handleUpdatePermintaanStatus(target.permintaanId, 'Selesai');
      }
    }
  };

  // Owner Update Handler (NIB and profile)
  const handleUpdateOwner = (updatedOwner: Karyawan) => {
    setKaryawanList((prev) =>
      prev.map((k) => (k.id === updatedOwner.id ? updatedOwner : k))
    );
    if (currentUser && currentUser.id === updatedOwner.id) {
      setCurrentUser(updatedOwner);
    }
    firestoreSaveKaryawan(updatedOwner);
  };

  // Requirement 3: Permanent Audit Log Handler (anti-fraud, read-only)
  const handleAddAuditLog = (
    log: Omit<AuditLog, 'id' | 'tanggal' | 'jam'> & { tanggal?: string; jam?: string }
  ) => {
    const newEntry: AuditLog = {
      id: 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tanggal: log.tanggal || getTodayStr(),
      jam: log.jam || getNowTimeStr(),
      siapa: log.siapa,
      cabang: log.cabang,
      aksi: log.aksi,
      nominal: log.nominal,
      keterangan: log.keterangan,
    };
    setAuditLogList((prev) => [...prev, newEntry]);
    firestoreSaveAuditLog(newEntry);
  };

  // Requirement 2: Register used receipt signature/hash
  const handleRegisterNotaHash = (hash: string) => {
    if (!hash) return;
    setUsedNotaHashes((prev) => (prev.includes(hash) ? prev : [...prev, hash]));
  };

  // Transaksi Handlers
  const handleAddTransaksi = (trx: Transaksi) => {
    setTransaksiList((prev) => [trx, ...prev]);
    firestoreSaveTransaksi(trx);
    handleAddAuditLog({
      siapa: `${trx.kasirNama} (${trx.kasirJabatan || 'KASIR'})`,
      cabang: trx.cabang,
      aksi: 'Transaksi Kasir',
      nominal: trx.total,
      keterangan: `Invoice #${trx.invoiceNo} (${trx.metodeBayar}) - ${trx.items.length} menu`,
      tanggal: trx.tanggal,
      jam: trx.jam,
    });
  };

  // Retur Transaksi Handler (Kembalikan stok cabang)
  const handleReturTransaksi = (trxId: string, alasan: string) => {
    const targetTrx = transaksiList.find((t) => t.id === trxId);
    if (!targetTrx || targetTrx.status === 'Retur') return;

    const currentCabang = targetTrx.cabang as Exclude<Cabang, 'DC PUSAT'>;
    const branchStock = { ...(stokCabang[currentCabang] || {}) };

    targetTrx.items.forEach((cartItem) => {
      cartItem.resep.forEach((recipe) => {
        const returnedQty = recipe.qtyPakai * cartItem.qty;
        const current = branchStock[recipe.bahanId] || 0;
        branchStock[recipe.bahanId] = current + returnedQty;
      });
    });

    setStokCabang((prev) => ({
      ...prev,
      [currentCabang]: branchStock,
    }));
    firestoreSaveStokCabang(currentCabang, branchStock);

    const updatedTrx: Transaksi = {
      ...targetTrx,
      status: 'Retur',
      alasanRetur: alasan,
      waktuRetur: `${getTodayStr()} ${getNowShortTime()}`,
    };
    setTransaksiList((prev) =>
      prev.map((t) => (t.id === trxId ? updatedTrx : t))
    );
    firestoreSaveTransaksi(updatedTrx);

    handleAddAuditLog({
      siapa: currentUser ? `${currentUser.nama} (${currentUser.jabatan})` : 'Petugas Kasir',
      cabang: targetTrx.cabang,
      aksi: 'Retur Transaksi',
      nominal: targetTrx.total,
      keterangan: `Retur Invoice #${targetTrx.invoiceNo}: ${alasan}`,
    });
  };

  // Batalkan Pesanan Handler (Kembalikan stok bahan & kemasan cabang, update statusPesanan = 'DIBATALKAN', catat ke audit log)
  const handleBatalkanPesanan = (trxId: string, alasan: string) => {
    const targetTrx = transaksiList.find((t) => t.id === trxId);
    if (!targetTrx || targetTrx.status === 'Retur' || targetTrx.statusPesanan === 'DIBATALKAN') return;

    // Proteksi: Pesanan yang sudah lunas hanya bisa dibatalkan oleh Owner atau Admin DC Pusat
    const isLunas =
      targetTrx.statusPembayaran === 'LUNAS' ||
      targetTrx.statusPesanan === 'LUNAS' ||
      targetTrx.statusPesanan === 'Selesai';
    const isOwnerOrAdminPusat =
      currentUser?.jabatan === 'Owner' ||
      currentUser?.cabang === 'DC PUSAT' ||
      currentUser?.jabatan === 'Admin DC Pusat';

    if (isLunas && !isOwnerOrAdminPusat) {
      alert(
        'Peringatan: Pesanan yang sudah lunas pembayaran TIDAK BISA dibatalkan oleh Kasir/Crew Store!\nHanya Owner atau Admin DC Pusat yang memiliki hak akses untuk membatalkan pesanan lunas.'
      );
      return;
    }

    const currentCabang = targetTrx.cabang as Exclude<Cabang, 'DC PUSAT'>;
    const branchStock = { ...(stokCabang[currentCabang] || {}) };

    // 1. Kembalikan stok bahan makanan dan minuman
    targetTrx.items.forEach((cartItem) => {
      cartItem.resep.forEach((recipe) => {
        const returnedQty = recipe.qtyPakai * cartItem.qty;
        const current = branchStock[recipe.bahanId] || 0;
        branchStock[recipe.bahanId] = current + returnedQty;
      });
    });

    // 2. Kembalikan stok kemasan jika pesanan Take Away atau Delivery
    if (targetTrx.tipePesanan !== 'Dine In') {
      const kemasanBowl = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('bowl')) || b.id === 'bhn-17'
      );
      const kemasanPlastik = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('plastik')) || b.id === 'bhn-18'
      );
      const kemasanCup = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('cup')) || b.id === 'bhn-19'
      );

      targetTrx.items.forEach((cartItem) => {
        const hasKemasanInResep = cartItem.resep.some((r) => {
          const b = bahanBakuList.find((bk) => bk.id === r.bahanId);
          return b?.kategori === 'Kemasan';
        });

        if (!hasKemasanInResep) {
          const isDrink =
            cartItem.nama.toLowerCase().includes('teh') ||
            cartItem.nama.toLowerCase().includes('jeruk') ||
            cartItem.kode.startsWith('MN');

          if (isDrink && kemasanCup) {
            branchStock[kemasanCup.id] = (branchStock[kemasanCup.id] || 0) + cartItem.qty;
          } else {
            if (kemasanBowl) {
              branchStock[kemasanBowl.id] = (branchStock[kemasanBowl.id] || 0) + cartItem.qty;
            }
            if (kemasanPlastik) {
              branchStock[kemasanPlastik.id] = (branchStock[kemasanPlastik.id] || 0) + 1;
            }
          }
        }
      });
    }

    setStokCabang((prev) => ({
      ...prev,
      [currentCabang]: branchStock,
    }));
    firestoreSaveStokCabang(currentCabang, branchStock);

    const updatedTrx: Transaksi = {
      ...targetTrx,
      status: 'Retur',
      statusPesanan: 'DIBATALKAN',
      alasanRetur: alasan,
      waktuRetur: `${getTodayStr()} ${getNowShortTime()}`,
    };
    setTransaksiList((prev) =>
      prev.map((t) => (t.id === trxId ? updatedTrx : t))
    );
    firestoreSaveTransaksi(updatedTrx);

    handleAddAuditLog({
      siapa: currentUser ? `${currentUser.nama} (${currentUser.jabatan})` : 'Petugas Kasir',
      cabang: targetTrx.cabang,
      aksi: 'Pembatalan Pesanan',
      nominal: targetTrx.total,
      keterangan: `Batal Pesanan #${targetTrx.nomorPesanan || targetTrx.invoiceNo}: ${alasan}`,
    });
  };

  // Handler Update Status Pesanan (MENUNGGU -> DIPROSES -> SIAP ANTAR -> BELUM BAYAR -> LUNAS)
  const handleUpdateStatusPesanan = (
    trxId: string,
    statusPesanan: StatusPesanan,
    paymentMeta?: { bayar?: number; kembali?: number; metodeBayar?: 'Cash' | 'QRIS' }
  ): Transaksi | null => {
    const nowTime = getNowTimeStr();
    let updatedTarget: Transaksi | null = null;
    setTransaksiList((prev) =>
      prev.map((t) => {
        if (t.id !== trxId) return t;
        const isDiproses = statusPesanan === 'DIPROSES' || statusPesanan === 'Sedang Dibuat';
        const isSelesai = statusPesanan === 'LUNAS' || statusPesanan === 'Selesai';
        const updated: Transaksi = {
          ...t,
          statusPesanan,
          ...(paymentMeta || isSelesai ? { statusPembayaran: 'LUNAS' } : {}),
          ...(paymentMeta?.metodeBayar ? { metodeBayar: paymentMeta.metodeBayar } : {}),
          ...(paymentMeta?.bayar !== undefined ? { bayar: paymentMeta.bayar } : {}),
          ...(paymentMeta?.kembali !== undefined ? { kembali: paymentMeta.kembali } : {}),
          ...((isDiproses || t.waktuMulaiDibuat)
            ? { waktuMulaiDibuat: t.waktuMulaiDibuat || nowTime }
            : {}),
          ...((isSelesai || t.waktuSelesai)
            ? { waktuSelesai: t.waktuSelesai || nowTime }
            : {}),
        };
        updatedTarget = updated;
        return updated;
      })
    );

    if (updatedTarget) {
      firestoreSaveTransaksi(updatedTarget);
    }
    return updatedTarget;
  };

  // Absensi Handlers
  const handleAddAbsensi = (newAbsen: Absensi) => {
    setAbsensiList((prev) => [...prev, newAbsen]);
    firestoreSaveAbsensi(newAbsen);
  };

  const handleAbsenPulang = (absenId: string, jamPulang: string, durasi: string) => {
    const target = absensiList.find((a) => a.id === absenId);
    if (target) {
      const updated = { ...target, jamPulang, durasi };
      setAbsensiList((prev) =>
        prev.map((a) => (a.id === absenId ? updated : a))
      );
      firestoreSaveAbsensi(updated);
    }
  };

  // Toko State Handlers
  const handleUpdateTokoState = (
    cabang: Exclude<Cabang, 'DC PUSAT'>,
    newState: any
  ) => {
    const current = tokoState[cabang] || { status: 'Belum Buka' };
    const updated = {
      ...current,
      ...newState,
    };
    setTokoState((prev) => ({
      ...prev,
      [cabang]: updated,
    }));
    firestoreSaveStatusToko(cabang, updated);
  };

  const handleAddLaporanHarian = (lap: LaporanHarian) => {
    setLaporanHarianList((prev) => [...prev, lap]);
    firestoreSaveLaporanHarian(lap);
  };

  // Pengeluaran Toko Handlers (Input Kasir & 1-Click ACC DC Pusat / Owner)
  const handleAddPengeluaran = (item: PengeluaranToko) => {
    setPengeluaranList((prev) => [item, ...prev]);
    firestoreSavePengeluaran(item);
  };

  const handleUpdateStatusPengeluaran = (
    id: string,
    status: StatusPengeluaran,
    catatan?: string
  ) => {
    let updatedTarget: PengeluaranToko | null = null;
    setPengeluaranList((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated: PengeluaranToko = {
          ...p,
          status,
          accOleh: currentUser ? `${currentUser.nama} (${currentUser.jabatan})` : 'Owner DC Pusat',
          accWaktu: `${getTodayStr()} ${getNowShortTime()}`,
          catatanAcc:
            catatan ||
            (status === 'Disetujui'
              ? 'Disetujui oleh Owner DC Pusat'
              : 'Ditolak oleh Owner DC Pusat'),
        };
        updatedTarget = updated;
        return updated;
      })
    );

    if (updatedTarget) {
      firestoreSavePengeluaran(updatedTarget);
    }

    // Audit Log Permanen Otomatis
    const target = pengeluaranList.find((p) => p.id === id);
    if (target && currentUser) {
      handleAddAuditLog({
        siapa: `${currentUser.nama} (${currentUser.jabatan})`,
        cabang: target.cabang,
        aksi: status === 'Disetujui' ? 'ACC Pengeluaran' : 'Tolak Pengeluaran',
        nominal: target.nominal,
        keterangan: `${status === 'Disetujui' ? 'Menyetujui (ACC)' : 'Menolak'} pengeluaran toko ${target.keterangan} sebesar ${formatRupiah(target.nominal)} untuk cabang ${target.cabang}${catatan ? ` - Catatan: ${catatan}` : ''}`,
      });
    }
  };

  // Data Cabang Handlers with Cascading Updates
  const handleAddCabang = (newC: DataCabang) => {
    setDataCabangList((prev) => [...prev, newC]);
    firestoreSaveCabang(newC);
    setStokCabang((prev) => ({
      ...prev,
      [newC.nama]: prev[newC.nama] || {},
    }));
    firestoreSaveStokCabang(newC.nama, {});
    firestoreSaveStatusToko(newC.nama, { status: 'Belum Buka' });
  };

  const handleUpdateCabang = (updatedC: DataCabang) => {
    const oldBranch = dataCabangList.find((c) => c.id === updatedC.id);
    const oldName = oldBranch?.nama;
    const newName = updatedC.nama;

    setDataCabangList((prev) =>
      prev.map((c) => (c.id === updatedC.id ? updatedC : c))
    );
    firestoreSaveCabang(updatedC);

    // Jika nama cabang diubah/diedit, cascade ke semua data yang berhubungan otomatis!
    if (oldName && oldName !== newName) {
      // 1. Data Karyawan
      karyawanList.forEach((k) => {
        if (k.cabang === oldName) {
          firestoreSaveKaryawan({ ...k, cabang: newName });
        }
      });
      setKaryawanList((prev) =>
        prev.map((k) => (k.cabang === oldName ? { ...k, cabang: newName } : k))
      );

      // 2. Sesi login user yang aktif
      if (currentUser && currentUser.cabang === oldName) {
        setCurrentUser({ ...currentUser, cabang: newName });
      }

      // 3. Stok Cabang
      if (stokCabang[oldName]) {
        firestoreSaveStokCabang(newName, stokCabang[oldName]);
      }
      setStokCabang((prev) => {
        const next = { ...prev };
        if (next[oldName] !== undefined) {
          next[newName] = next[oldName];
          delete next[oldName];
        }
        return next;
      });

      // 4. Status Buka / Tutup Toko State
      if (tokoState[oldName]) {
        firestoreSaveStatusToko(newName, tokoState[oldName]);
      }
      setTokoState((prev) => {
        const next = { ...prev };
        if (next[oldName] !== undefined) {
          next[newName] = next[oldName];
          delete next[oldName];
        }
        return next;
      });

      // 5. Transaksi POS
      transaksiList.forEach((t) => {
        if (t.cabang === oldName) {
          firestoreSaveTransaksi({ ...t, cabang: newName });
        }
      });
      setTransaksiList((prev) =>
        prev.map((t) => (t.cabang === oldName ? { ...t, cabang: newName } : t))
      );

      // 6. Absensi
      absensiList.forEach((a) => {
        if (a.cabang === oldName) {
          firestoreSaveAbsensi({ ...a, cabang: newName });
        }
      });
      setAbsensiList((prev) =>
        prev.map((a) => (a.cabang === oldName ? { ...a, cabang: newName } : a))
      );

      // 7. Permintaan Barang
      permintaanList.forEach((p) => {
        if (p.cabang === oldName) {
          firestoreSavePermintaan({ ...p, cabang: newName });
        }
      });
      setPermintaanList((prev) =>
        prev.map((p) => (p.cabang === oldName ? { ...p, cabang: newName } : p))
      );

      // 8. Surat Jalan DC
      suratJalanList.forEach((s) => {
        if (s.cabangTujuan === oldName) {
          firestoreSaveSuratJalan({ ...s, cabangTujuan: newName });
        }
      });
      setSuratJalanList((prev) =>
        prev.map((s) => (s.cabangTujuan === oldName ? { ...s, cabangTujuan: newName } : s))
      );

      // 9. Pengeluaran Toko
      pengeluaranList.forEach((p) => {
        if (p.cabang === oldName) {
          firestoreSavePengeluaran({ ...p, cabang: newName });
        }
      });
      setPengeluaranList((prev) =>
        prev.map((p) => (p.cabang === oldName ? { ...p, cabang: newName } : p))
      );

      // 10. Laporan Harian
      laporanHarianList.forEach((l) => {
        if (l.cabang === oldName) {
          firestoreSaveLaporanHarian({ ...l, cabang: newName });
        }
      });
      setLaporanHarianList((prev) =>
        prev.map((l) => (l.cabang === oldName ? { ...l, cabang: newName } : l))
      );
    }
  };

  const handleDeleteCabang = (id: string) => {
    setDataCabangList((prev) => prev.filter((c) => c.id !== id));
    firestoreDeleteCabang(id);
  };

  // Katalog Menu Handlers with Firestore Realtime Sync
  const handleAddKatalog = (menu: KatalogMenu) => {
    setKatalogList((prev) => [...prev, menu]);
    firestoreSaveKatalog(menu);
  };
  const handleUpdateKatalog = (menu: KatalogMenu) => {
    setKatalogList((prev) => prev.map((k) => (k.id === menu.id ? menu : k)));
    firestoreSaveKatalog(menu);
  };
  const handleDeleteKatalog = (id: string) => {
    setKatalogList((prev) => prev.filter((k) => k.id !== id));
    firestoreDeleteKatalog(id);
  };

  // Bahan Baku Handlers with Firestore Realtime Sync
  const handleAddBahanBaku = (b: BahanBaku) => {
    setBahanBakuList((prev) => [...prev, b]);
    firestoreSaveBahanBaku(b);
  };
  const handleUpdateBahanBaku = (b: BahanBaku) => {
    setBahanBakuList((prev) => prev.map((item) => (item.id === b.id ? b : item)));
    firestoreSaveBahanBaku(b);
  };
  const handleDeleteBahanBaku = (id: string) => {
    setBahanBakuList((prev) => prev.filter((item) => item.id !== id));
    firestoreDeleteBahanBaku(id);
  };

  // Karyawan Handlers with Firestore Realtime Sync
  const handleAddKaryawan = (k: Karyawan) => {
    setKaryawanList((prev) => [...prev, k]);
    firestoreSaveKaryawan(k);
  };
  const handleUpdateKaryawan = (k: Karyawan) => {
    setKaryawanList((prev) => prev.map((item) => (item.id === k.id ? k : item)));
    firestoreSaveKaryawan(k);
  };
  const handleDeleteKaryawan = (id: string) => {
    setKaryawanList((prev) => prev.filter((item) => item.id !== id));
    firestoreDeleteKaryawan(id);
  };

  // Permintaan Barang Handler with Firestore Realtime Sync
  const handleAddPermintaan = (req: PermintaanBarang) => {
    setPermintaanList((prev) => [...prev, req]);
    firestoreSavePermintaan(req);
  };

  // Stock Cabang Handler with Realtime Firestore Persistence
  const handleUpdateStokCabang: React.Dispatch<React.SetStateAction<StokCabangMap>> = (action) => {
    setStokCabang((prev) => {
      const next = typeof action === 'function' ? (action as any)(prev) : action;
      Object.entries(next).forEach(([cabangName, stockObj]) => {
        if (JSON.stringify(prev[cabangName]) !== JSON.stringify(stockObj)) {
          firestoreSaveStokCabang(cabangName, stockObj as Record<string, number>);
        }
      });
      return next;
    });
  };

  // Reset to initial demo data (Helper for user testing)
  const handleResetData = async () => {
    if (
      confirm(
        'PERINGATAN: Apakah Anda yakin ingin mereset seluruh data kembali ke setelan awal demo PADAHERANG 01, BANJARSARI 02, CIAWTALI 03 & DC PUSAT?'
      )
    ) {
      localStorage.clear();
      await seedInitialFirestoreDataIfEmpty(true);
      setCurrentUser(null);
      setActiveTab('dashboard');
    }
  };

  // Print Modal Triggers
  const openPrintModal = (type: PrintDocumentType, data: any) => {
    setPrintModalState({
      isOpen: true,
      type,
      data,
    });
  };

  const closePrintModal = () => {
    setPrintModalState({
      isOpen: false,
      type: null,
      data: null,
    });
  };

  // Requirement 2: Enforce Login on link open (redirect ke /login dulu)
  if (!currentUser) {
    return (
      <LoginModal
        karyawanList={karyawanList}
        dataCabangList={dataCabangList}
        onLoginSuccess={handleLoginSuccess}
        onUpdateKaryawan={(updatedK) => {
          setKaryawanList((prev) =>
            prev.map((item) => (item.id === updatedK.id ? updatedK : item))
          );
          firestoreSaveKaryawan(updatedK);
        }}
      />
    );
  }

  const isDcPusatOrOwner = currentUser.cabang === 'DC PUSAT' || currentUser.jabatan === 'Owner';
  const userBranchName = getBranchName(currentUser.cabang, dataCabangList);
  const activeOrdersCount = transaksiList.filter((t) => {
    if (t.status === 'Retur') return false;
    const isOngoing = (t.statusPesanan || 'Menunggu') === 'Menunggu' || t.statusPesanan === 'Sedang Dibuat';
    if (!isOngoing) return false;
    if (isDcPusatOrOwner) return true;
    const tBranch = getBranchName(t.cabang, dataCabangList);
    return tBranch === userBranchName || t.cabang === currentUser.cabang;
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        suratJalanList={suratJalanList}
        permintaanList={permintaanList}
        pengeluaranList={pengeluaranList}
        dataCabangList={dataCabangList}
        activeOrdersCount={activeOrdersCount}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            setActiveTab={setActiveTab}
            bahanBakuList={bahanBakuList}
            transaksiList={transaksiList}
            permintaanList={permintaanList}
            suratJalanList={suratJalanList}
            absensiList={absensiList}
            tokoState={tokoState}
            dataCabangList={dataCabangList}
          />
        )}

        {activeTab === 'pos' && (
          <PosView
            currentUser={currentUser}
            katalogList={katalogList}
            bahanBakuList={bahanBakuList}
            stokCabang={stokCabang}
            onUpdateStokCabang={handleUpdateStokCabang}
            transaksiList={transaksiList}
            onAddTransaksi={handleAddTransaksi}
            onReturTransaksi={handleReturTransaksi}
            tokoState={tokoState}
            absensiList={absensiList}
            onOpenPrintModal={openPrintModal}
            onNavigateToTab={setActiveTab}
            dataCabangList={dataCabangList}
          />
        )}

        {activeTab === 'pesanan' && (
          <PesananView
            currentUser={currentUser}
            transaksiList={transaksiList}
            onUpdateStatusPesanan={handleUpdateStatusPesanan}
            onBatalkanPesanan={handleBatalkanPesanan}
            dataCabangList={dataCabangList}
            onOpenPrintModal={openPrintModal}
            onNavigateToPos={() => setActiveTab('pos')}
          />
        )}

        {activeTab === 'katalog' && (
          <KatalogMenuView
            currentUser={currentUser}
            katalogList={katalogList}
            bahanBakuList={bahanBakuList}
            stokCabang={stokCabang}
            onAddKatalog={handleAddKatalog}
            onUpdateKatalog={handleUpdateKatalog}
            onDeleteKatalog={handleDeleteKatalog}
            onOpenPrintModal={(type, data) => openPrintModal(type, data)}
            onNavigateToPos={() => setActiveTab('pos')}
            tokoState={tokoState}
          />
        )}

        {activeTab === 'dataCabang' && isDcPusatOrOwner && (
          <DataCabangView
            dataCabangList={dataCabangList}
            onAddCabang={handleAddCabang}
            onUpdateCabang={handleUpdateCabang}
            onDeleteCabang={handleDeleteCabang}
          />
        )}

        {activeTab === 'bahanBaku' && isDcPusatOrOwner && (
          <BahanBakuView
            bahanBakuList={bahanBakuList}
            onAddBahanBaku={handleAddBahanBaku}
            onUpdateBahanBaku={handleUpdateBahanBaku}
            onDeleteBahanBaku={handleDeleteBahanBaku}
            onRestockDc={handleRestockDc}
            onOpenPrintModal={openPrintModal}
          />
        )}

        {activeTab === 'stokCabang' && (
          <StokCabangView
            currentUser={currentUser}
            bahanBakuList={bahanBakuList}
            stokCabang={stokCabang}
            permintaanList={permintaanList}
            dataCabangList={dataCabangList}
            onAddPermintaan={handleAddPermintaan}
          />
        )}

        {activeTab === 'suratJalan' && isDcPusatOrOwner && (
          <SuratJalanDcView
            currentUser={currentUser}
            bahanBakuList={bahanBakuList}
            permintaanList={permintaanList}
            suratJalanList={suratJalanList}
            karyawanList={karyawanList}
            dataCabangList={dataCabangList}
            onAddSuratJalan={handleAddSuratJalan}
            onUpdatePermintaanStatus={handleUpdatePermintaanStatus}
            onOpenPrintModal={openPrintModal}
          />
        )}

        {activeTab === 'terimaBarang' && currentUser.cabang !== 'DC PUSAT' && (
          <TerimaBarangView
            currentUser={currentUser}
            suratJalanList={suratJalanList}
            stokCabang={stokCabang}
            onUpdateStokCabang={handleUpdateStokCabang}
            onConfirmTerimaSuratJalan={handleConfirmTerimaSuratJalan}
          />
        )}

        {activeTab === 'absensi' && (
          <AbsensiView
            currentUser={currentUser}
            absensiList={absensiList}
            karyawanList={karyawanList}
            onAddAbsensi={handleAddAbsensi}
            onAbsenPulang={handleAbsenPulang}
            onOpenPrintModal={openPrintModal}
            dataCabangList={dataCabangList}
          />
        )}

        {activeTab === 'bukaTutup' && (
          <BukaTutupTokoView
            currentUser={currentUser}
            transaksiList={transaksiList}
            laporanHarianList={laporanHarianList}
            tokoState={tokoState}
            onUpdateTokoState={handleUpdateTokoState}
            onAddLaporanHarian={handleAddLaporanHarian}
            absensiList={absensiList}
            karyawanList={karyawanList}
            onAddAuditLog={handleAddAuditLog}
            pengeluaranList={pengeluaranList}
            onOpenPrintModal={openPrintModal}
            dataCabangList={dataCabangList}
          />
        )}

        {/* Menu PENGELUARAN TOKO (Input Kasir Cabang & ACC 1-Klik Owner DC Pusat) */}
        {activeTab === 'pengeluaran' && (
          <PengeluaranView
            currentUser={currentUser}
            pengeluaranList={pengeluaranList}
            onAddPengeluaran={handleAddPengeluaran}
            onUpdateStatusPengeluaran={handleUpdateStatusPengeluaran}
            usedNotaHashes={usedNotaHashes}
            onRegisterNotaHash={handleRegisterNotaHash}
            onAddAuditLog={handleAddAuditLog}
            dataCabangList={dataCabangList}
          />
        )}

        {activeTab === 'pengirimanDriver' && (
          <PengirimanDriverView
            currentUser={currentUser}
            suratJalanList={suratJalanList}
            stokCabang={stokCabang}
            onUpdateStokCabang={handleUpdateStokCabang}
            onUpdateSuratJalanStatus={handleUpdateSuratJalanStatus}
            onOpenPrintModal={openPrintModal}
            dataCabangList={dataCabangList}
          />
        )}

        {activeTab === 'karyawan' && isDcPusatOrOwner && (
          <KaryawanView
            karyawanList={karyawanList}
            dataCabangList={dataCabangList}
            onAddKaryawan={handleAddKaryawan}
            onUpdateKaryawan={handleUpdateKaryawan}
            onDeleteKaryawan={handleDeleteKaryawan}
            onOpenPrintModal={openPrintModal}
          />
        )}

        {activeTab === 'dataOwner' && currentUser.jabatan === 'Owner' && (
          <DataOwnerView
            currentUser={currentUser}
            onUpdateOwner={handleUpdateOwner}
          />
        )}

        {activeTab === 'laporan' && (
          <LaporanView
            transaksiList={transaksiList}
            laporanHarianList={laporanHarianList}
            bahanBakuList={bahanBakuList}
            stokCabang={stokCabang}
            katalogList={katalogList}
            karyawanList={karyawanList}
            auditLogList={auditLogList}
            pengeluaranList={pengeluaranList}
            dataCabangList={dataCabangList}
            onOpenPrintModal={openPrintModal}
          />
        )}
      </main>

      {/* Footer & Reset Data Helper */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>My Kasir POS Seblak Prasmanan</strong> • Multi-Cabang PADAHERANG 01, BANJARSARI 02, CIAWTALI 03 & DC Pusat
          </span>
          <button
            onClick={handleResetData}
            className="text-[11px] text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer transition"
            title="Kembalikan semua data ke setelan awal demo"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Data Demo</span>
          </button>
        </div>
      </footer>

      {/* PRINT MODAL OVERLAY */}
      {printModalState.isOpen && (
        <PrintModal
          type={printModalState.type}
          data={printModalState.data}
          onClose={closePrintModal}
          katalogList={katalogList}
          bahanBakuList={bahanBakuList}
          dataCabangList={dataCabangList}
          karyawanList={karyawanList}
        />
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center">
              <LogOut className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-800">
                Konfirmasi Logout
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda ingin keluar dari akun <strong>{currentUser.nama}</strong> ({currentUser.cabang})?
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
