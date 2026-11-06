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
  TransaksiItem,
  TipePesanan,
  OWNER_EMAIL,
  FullResetOptions,
  FullResetResult,
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
  generateInvoiceNo,
} from './utils/storage';
import {
  resetToDemoDataInFirestore,
  executeFullResetInFirestore,
  executeQuickOrdersReset,
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
  firestoreDeleteAbsensi,
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
import { PesananView, normalizeStatusPesanan, getStatusRank } from './components/PesananView';
import { PengaturanView } from './components/PengaturanView';
import { PrintModal, PrintDocumentType } from './components/PrintModal';
import { ResetTotalModal } from './components/ResetTotalModal';
import { RotateCcw, AlertTriangle, LogOut, CheckCircle, X } from 'lucide-react';
import { getBranchName } from './utils/branchHelper';

export default function App() {
  // Requirement 2: "Saat buka link, redirect WAJIB ke /login dulu. Jangan langsung dashboard. Semua route harus cek login."
  // Initialize currentUser as null on fresh app load
  const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Master Data Cabang (Load from storage cache, fallback to empty array if none)
  const [dataCabangList, setDataCabangList] = useState<DataCabang[]>(() =>
    loadFromStorage<DataCabang[]>(STORAGE_KEYS.CABANG, [])
  );

  // Master & Operational Datasets: persistent from Firestore (cached in storage)
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>(() => {
    const loaded = loadFromStorage<Karyawan[]>(STORAGE_KEYS.KARYAWAN, []);
    return loaded.map((k) => {
      if (k.jabatan === 'Owner') {
        return {
          ...k,
          username: k.username || 'rizal',
          password: k.password || '990002',
        };
      }
      return k;
    });
  });

  const [bahanBakuList, setBahanBakuList] = useState<BahanBaku[]>(() =>
    loadFromStorage<BahanBaku[]>(STORAGE_KEYS.BAHAN_BAKU, [])
  );

  const [katalogList, setKatalogList] = useState<KatalogMenu[]>(() =>
    loadFromStorage<KatalogMenu[]>(STORAGE_KEYS.KATALOG, [])
  );

  const [stokCabang, setStokCabang] = useState<StokCabangMap>(() =>
    loadFromStorage<StokCabangMap>(STORAGE_KEYS.STOK_CABANG, {})
  );

  const [transaksiList, setTransaksiList] = useState<Transaksi[]>(() =>
    loadFromStorage<Transaksi[]>(STORAGE_KEYS.TRANSAKSI, [])
  );

  const [permintaanList, setPermintaanList] = useState<PermintaanBarang[]>(() =>
    loadFromStorage<PermintaanBarang[]>(STORAGE_KEYS.PERMINTAAN_BARANG, [])
  );

  const [suratJalanList, setSuratJalanList] = useState<SuratJalan[]>(() =>
    loadFromStorage<SuratJalan[]>(STORAGE_KEYS.SURAT_JALAN, [])
  );

  const [absensiList, setAbsensiList] = useState<Absensi[]>(() =>
    loadFromStorage<Absensi[]>(STORAGE_KEYS.ABSENSI, [])
  );

  const [laporanHarianList, setLaporanHarianList] = useState<LaporanHarian[]>(() =>
    loadFromStorage<LaporanHarian[]>(STORAGE_KEYS.LAPORAN_HARIAN, [])
  );

  const [tokoState, setTokoState] = useState<AllTokoState>(() =>
    loadFromStorage<AllTokoState>(STORAGE_KEYS.TOKO_STATE, {})
  );

  // Requirement 3: Permanent Audit Log (Anti-fraud, append-only, LocalStorage)
  const [auditLogList, setAuditLogList] = useState<AuditLog[]>(() =>
    loadFromStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOG, [])
  );

  // Requirement 2: Used Nota Hashes (Anti-Fraud: reject duplicate receipt photos)
  const [usedNotaHashes, setUsedNotaHashes] = useState<string[]>(() =>
    loadFromStorage<string[]>(STORAGE_KEYS.USED_NOTA_HASHES, [])
  );

  // Requirement 2 & 5: Pengeluaran Toko & 1-Click ACC Owner
  const [pengeluaranList, setPengeluaranList] = useState<PengeluaranToko[]>(() =>
    loadFromStorage<PengeluaranToko[]>(STORAGE_KEYS.PENGELUARAN, [])
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

  // Footer Reset Demo Modal (Replaces browser confirm)
  const [showFooterResetModal, setShowFooterResetModal] = useState(false);
  const [isResettingFooter, setIsResettingFooter] = useState(false);
  const [footerResetMsg, setFooterResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Full Reset Modal State (Owner Total Reset)
  const [showFullResetModal, setShowFullResetModal] = useState(false);
  const [resetToastMessage, setResetToastMessage] = useState<string | null>(null);

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

  // Realtime Firestore synchronization for all data (AUTO-SEED PERMANENTLY DISABLED)
  useEffect(() => {
    // Listen to real-time changes directly from Firestore
    const unsubscribe = subscribeToRealtimeFirestore({
      onCabang: (list) => {
        setDataCabangList(list);
        saveToStorage(STORAGE_KEYS.CABANG, list);
      },
      onKatalog: (list) => {
        setKatalogList(list);
        saveToStorage(STORAGE_KEYS.KATALOG, list);
      },
      onKaryawan: (list) => {
        const formatted = list.map((k) =>
          k.jabatan === 'Owner'
            ? { ...k, username: k.username || 'rizal', password: k.password || '990002' }
            : k
        );
        setKaryawanList(formatted);
        saveToStorage(STORAGE_KEYS.KARYAWAN, formatted);
      },
      onBahanBaku: (list) => {
        setBahanBakuList(list);
        saveToStorage(STORAGE_KEYS.BAHAN_BAKU, list);
      },
      onStokCabang: (map) => {
        setStokCabang(map);
        saveToStorage(STORAGE_KEYS.STOK_CABANG, map);
      },
      onStatusToko: (state) => {
        setTokoState(state);
        saveToStorage(STORAGE_KEYS.TOKO_STATE, state);
      },
      onTransaksi: (list) => {
        setTransaksiList((prev) => {
          const prevMap = new Map(prev.map((t) => [t.id, t]));
          const merged = list.map((incoming) => {
            const existing = prevMap.get(incoming.id);
            if (!existing) return incoming;
            const incRank = getStatusRank(incoming.statusPesanan);
            const existRank = getStatusRank(existing.statusPesanan);
            // Status hanya boleh maju, tidak boleh mundur
            const isSpecialStatus =
              incoming.status === 'Retur' ||
              incoming.statusPesanan === 'DIVOID' ||
              incoming.statusPesanan === 'DIBATALKAN';
            if (!isSpecialStatus && existRank > incRank) {
              return { ...incoming, statusPesanan: existing.statusPesanan };
            }
            return incoming;
          });
          saveToStorage(STORAGE_KEYS.TRANSAKSI, merged);
          return merged;
        });
      },
      onPengeluaran: (list) => {
        setPengeluaranList(list);
        saveToStorage(STORAGE_KEYS.PENGELUARAN, list);
      },
      onAbsensi: (list) => {
        setAbsensiList(list);
        saveToStorage(STORAGE_KEYS.ABSENSI, list);
      },
      onSuratJalan: (list) => {
        setSuratJalanList(list);
        saveToStorage(STORAGE_KEYS.SURAT_JALAN, list);
      },
      onPermintaan: (list) => {
        setPermintaanList(list);
        saveToStorage(STORAGE_KEYS.PERMINTAAN_BARANG, list);
      },
      onLaporanHarian: (list) => {
        setLaporanHarianList(list);
        saveToStorage(STORAGE_KEYS.LAPORAN_HARIAN, list);
      },
      onAuditLog: (list) => {
        setAuditLogList(list);
        saveToStorage(STORAGE_KEYS.AUDIT_LOG, list);
      },
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

  // Helper: Kembalikan stok bahan & kemasan ke stok cabang
  const restoreStockItems = (
    cabang: Cabang,
    items: TransaksiItem[],
    tipePesanan?: TipePesanan
  ) => {
    if (cabang === 'DC PUSAT') return;
    const currentCabang = cabang as Exclude<Cabang, 'DC PUSAT'>;
    const branchStock = { ...(stokCabang[currentCabang] || {}) };

    // 1. Kembalikan stok bahan makanan/minuman
    items.forEach((cartItem) => {
      cartItem.resep.forEach((recipe) => {
        const returnedQty = recipe.qtyPakai * cartItem.qty;
        branchStock[recipe.bahanId] = (branchStock[recipe.bahanId] || 0) + returnedQty;
      });
    });

    // 2. Kembalikan stok kemasan jika Take Away atau Delivery
    if (tipePesanan !== 'Dine In') {
      const kemasanBowl = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('bowl')) || b.id === 'bhn-17'
      );
      const kemasanPlastik = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('plastik')) || b.id === 'bhn-18'
      );
      const kemasanCup = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('cup')) || b.id === 'bhn-19'
      );

      items.forEach((cartItem) => {
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
  };

  // Helper: Kurangi stok bahan & kemasan dari cabang
  const deductStockItems = (
    cabang: Cabang,
    items: TransaksiItem[],
    tipePesanan?: TipePesanan
  ) => {
    if (cabang === 'DC PUSAT') return;
    const currentCabang = cabang as Exclude<Cabang, 'DC PUSAT'>;
    const branchStock = { ...(stokCabang[currentCabang] || {}) };

    // 1. Kurangi stok bahan makanan & resep
    items.forEach((cartItem) => {
      cartItem.resep.forEach((recipe) => {
        const usedQty = recipe.qtyPakai * cartItem.qty;
        branchStock[recipe.bahanId] = Math.max(0, (branchStock[recipe.bahanId] || 0) - usedQty);
      });
    });

    // 2. Kurangi stok kemasan jika Take Away atau Delivery
    if (tipePesanan !== 'Dine In') {
      const kemasanBowl = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('bowl')) || b.id === 'bhn-17'
      );
      const kemasanPlastik = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('plastik')) || b.id === 'bhn-18'
      );
      const kemasanCup = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('cup')) || b.id === 'bhn-19'
      );

      items.forEach((cartItem) => {
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
            branchStock[kemasanCup.id] = Math.max(0, (branchStock[kemasanCup.id] || 0) - cartItem.qty);
          } else {
            if (kemasanBowl) {
              branchStock[kemasanBowl.id] = Math.max(0, (branchStock[kemasanBowl.id] || 0) - cartItem.qty);
            }
            if (kemasanPlastik) {
              branchStock[kemasanPlastik.id] = Math.max(0, (branchStock[kemasanPlastik.id] || 0) - 1);
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
  };

  // Batalkan Pesanan: Pesanan belum bayar bisa dibatalkan, pesanan lunas TIDAK BISA dibatalkan (harus divoid)
  const handleBatalkanPesanan = (trxId: string, alasan: string) => {
    const targetTrx = transaksiList.find((t) => t.id === trxId);
    if (!targetTrx || targetTrx.status === 'Retur' || targetTrx.statusPesanan === 'DIBATALKAN') return;

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
        '⛔ Pesanan yang SUDAH LUNAS tidak bisa dibatalkan oleh Crew Store!\nHanya Owner atau Admin DC Pusat yang berhak membatalkan pesanan lunas. Untuk pelanggan yang ingin ubah menu, silakan gunakan fitur Void & Ganti.'
      );
      return;
    }

    // Kembalikan stok bahan & kemasan
    restoreStockItems(targetTrx.cabang, targetTrx.items, targetTrx.tipePesanan);

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
      aksi: isLunas ? 'Pembatalan Pesanan Lunas (Otorisasi Owner/Admin Pusat)' : 'Pembatalan Pesanan Belum Bayar',
      nominal: targetTrx.total,
      keterangan: `${isLunas ? '[BATAL PESANAN LUNAS - DANA KEMBALI KE PELANGGAN] ' : ''}Batal Pesanan #${targetTrx.nomorPesanan || targetTrx.invoiceNo}: ${alasan}`,
    });
  };

  // Ubah Pesanan Belum Bayar: Ubah menu/item, kembalikan stok lama & kurangi stok baru
  const handleEditPesananBelumBayar = (
    trxId: string,
    updatedData: {
      items: TransaksiItem[];
      nomorMeja?: string;
      pelangganNama?: string;
      pelangganTelepon?: string;
      pelangganAlamat?: string;
      tipePesanan?: TipePesanan;
      ongkir?: number;
      jarakKm?: number;
    }
  ) => {
    const targetTrx = transaksiList.find((t) => t.id === trxId);
    if (!targetTrx || targetTrx.status === 'Retur' || targetTrx.statusPesanan === 'DIBATALKAN') return;

    const isLunas =
      targetTrx.statusPembayaran === 'LUNAS' ||
      targetTrx.statusPesanan === 'LUNAS' ||
      targetTrx.statusPesanan === 'Selesai';

    if (isLunas) {
      alert(
        '⛔ Pesanan yang sudah lunas tidak bisa diedit secara langsung! Gunakan fitur VOID & Ganti Pesanan.'
      );
      return;
    }

    // 1. Kembalikan stok lama
    restoreStockItems(targetTrx.cabang, targetTrx.items, targetTrx.tipePesanan);

    // 2. Hitung total baru
    const newItems = updatedData.items;
    const newSubtotal = newItems.reduce((acc, i) => acc + i.subtotal, 0);
    const newTotalModal = newItems.reduce((acc, i) => acc + i.hargaModal * i.qty, 0);
    const newOngkir = updatedData.ongkir !== undefined ? updatedData.ongkir : (targetTrx.ongkir || 0);
    const newTotal = newSubtotal + newOngkir;
    const newTotalUntung = newTotal - newTotalModal;
    const effectiveTipe = updatedData.tipePesanan || targetTrx.tipePesanan;

    // 3. Kurangi stok baru
    deductStockItems(targetTrx.cabang, newItems, effectiveTipe);

    const updatedTrx: Transaksi = {
      ...targetTrx,
      items: newItems,
      subtotalPesanan: newSubtotal,
      ongkir: newOngkir,
      jarakKm: updatedData.jarakKm !== undefined ? updatedData.jarakKm : targetTrx.jarakKm,
      total: newTotal,
      totalModal: newTotalModal,
      totalUntung: newTotalUntung,
      nomorMeja: updatedData.nomorMeja ?? targetTrx.nomorMeja,
      pelangganNama: updatedData.pelangganNama ?? targetTrx.pelangganNama,
      pelangganTelepon: updatedData.pelangganTelepon ?? targetTrx.pelangganTelepon,
      pelangganAlamat: updatedData.pelangganAlamat ?? targetTrx.pelangganAlamat,
      tipePesanan: effectiveTipe,
    };

    setTransaksiList((prev) =>
      prev.map((t) => (t.id === trxId ? updatedTrx : t))
    );
    firestoreSaveTransaksi(updatedTrx);

    handleAddAuditLog({
      siapa: currentUser ? `${currentUser.nama} (${currentUser.jabatan})` : 'Petugas Kasir',
      cabang: targetTrx.cabang,
      aksi: 'Ubah Pesanan Belum Bayar',
      nominal: newTotal,
      keterangan: `Ubah Pesanan #${targetTrx.nomorPesanan || targetTrx.invoiceNo}: ${newItems.length} menu (Total baru: ${formatRupiah(newTotal)})`,
    });
  };

  // VOID & Ganti Pesanan Lunas:
  // Data lama TIDAK DIHAPUS di Firebase, statusnya diubah jadi DIVOID & Retur, buatkan pesanan baru
  // Hitung selisih: jika baru lebih murah -> uang kembalian; jika baru lebih mahal -> tagihan tambahan
  const handleVoidPesananLunas = (
    oldTrxId: string,
    payload: {
      newItems: TransaksiItem[];
      nomorMeja?: string;
      pelangganNama?: string;
      pelangganTelepon?: string;
      pelangganAlamat?: string;
      alasanVoid: string;
      metodeBayarTambahan?: 'Cash' | 'QRIS';
      bayarTambahan?: number;
    }
  ): { oldTrx: Transaksi; newTrx: Transaksi; selisih: number } | null => {
    const oldTrx = transaksiList.find((t) => t.id === oldTrxId);
    if (!oldTrx || oldTrx.status === 'Retur' || oldTrx.statusPesanan === 'DIVOID') {
      alert('Pesanan tidak ditemukan atau sudah divoid/retur.');
      return null;
    }

    const isLunas =
      oldTrx.statusPembayaran === 'LUNAS' ||
      oldTrx.statusPesanan === 'LUNAS' ||
      oldTrx.statusPesanan === 'Selesai';

    if (!isLunas) {
      alert('Pesanan belum lunas dapat langsung diedit atau dibatalkan tanpa proses void!');
      return null;
    }

    // Requirement 3: Hanya bisa di-VOID saat status masih MENUNGGU
    const normStatus = normalizeStatusPesanan(oldTrx.statusPesanan, oldTrx.status);
    if (normStatus !== 'MENUNGGU') {
      alert('Sesuai aturan, pesanan lunas hanya dapat di-VOID saat masih berstatus MENUNGGU sebelum diproses/dimasak di dapur.');
      return null;
    }

    // Requirement 7: Hanya 1 kali VOID
    if (oldTrx.voidDariInvoice) {
      alert('Pesanan ini sudah pernah melalui proses VOID pengganti. Pesanan hanya dapat di-VOID maksimal 1 kali.');
      return null;
    }

    // 1. Kembalikan stok pesanan lama
    restoreStockItems(oldTrx.cabang, oldTrx.items, oldTrx.tipePesanan);

    // 2. Hitung harga dan selisih (Requirement 4: Jangan jumlahkan menu lama dengan baru, hitung selisihnya)
    const newSubtotal = payload.newItems.reduce((acc, i) => acc + i.subtotal, 0);
    const newTotalModal = payload.newItems.reduce((acc, i) => acc + i.hargaModal * i.qty, 0);
    const newOngkir = oldTrx.ongkir || 0;
    const newTotal = newSubtotal + newOngkir;
    const newTotalUntung = newTotal - newTotalModal;
    const selisih = newTotal - oldTrx.total; // > 0: tagihan tambahan, < 0: kembalian

    // Generate Invoice Baru
    const newInvoiceNo = generateInvoiceNo(oldTrx.cabang);
    const nowTime = getNowTimeStr();
    const todayDate = getTodayStr();

    let newStatusPembayaran: 'LUNAS' | 'BELUM BAYAR' = 'LUNAS';
    let newBayar = newTotal;
    let newKembali = 0;

    if (selisih > 0) {
      // Lebih mahal: butuh tagihan tambahan
      const tambahan = payload.bayarTambahan || 0;
      if (tambahan >= selisih) {
        newStatusPembayaran = 'LUNAS';
        newBayar = oldTrx.total + tambahan;
        newKembali = Math.max(0, tambahan - selisih);
      } else {
        newStatusPembayaran = 'BELUM BAYAR';
        newBayar = oldTrx.total;
        newKembali = 0;
      }
    } else if (selisih < 0) {
      // Lebih murah: uang kembalian diserahkan kasir ke pelanggan
      newStatusPembayaran = 'LUNAS';
      newBayar = newTotal;
      newKembali = 0;
    } else {
      // Pas
      newStatusPembayaran = 'LUNAS';
      newBayar = newTotal;
      newKembali = 0;
    }

    // 3. Update transaksi lama: JANGAN DIHAPUS di Firebase, ubah status jadi DIVOID & Retur (Requirement 3 & 6)
    const updatedOldTrx: Transaksi = {
      ...oldTrx,
      status: 'Retur',
      statusPesanan: 'DIVOID',
      voidKeInvoice: newInvoiceNo,
      selisihVoid: selisih,
      keteranganVoid: payload.alasanVoid,
      alasanRetur: `Void & Ganti ke #${newInvoiceNo}: ${payload.alasanVoid}`,
      waktuRetur: `${todayDate} ${getNowShortTime()}`,
      itemsPengganti: payload.newItems,
      totalPengganti: newTotal,
    };

    // 4. Buat pesanan baru (Requirement 4 & 7: total hanya menu baru, status awal MENUNGGU, max 1x void)
    const newTrx: Transaksi = {
      id: 'trx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      invoiceNo: newInvoiceNo,
      cabang: oldTrx.cabang,
      tanggal: todayDate,
      jam: nowTime,
      kasirId: currentUser?.id || oldTrx.kasirId,
      kasirNama: currentUser?.nama || oldTrx.kasirNama,
      kasirJabatan: currentUser?.jabatan || oldTrx.kasirJabatan,
      kasirBertugas: currentUser?.nama || oldTrx.kasirBertugas,
      items: payload.newItems,
      tipePesanan: oldTrx.tipePesanan,
      subtotalPesanan: newSubtotal,
      ongkir: newOngkir,
      jarakKm: oldTrx.jarakKm,
      nomorMeja: payload.nomorMeja ?? oldTrx.nomorMeja,
      pelangganNama: payload.pelangganNama ?? oldTrx.pelangganNama,
      pelangganTelepon: payload.pelangganTelepon ?? oldTrx.pelangganTelepon,
      pelangganAlamat: payload.pelangganAlamat ?? oldTrx.pelangganAlamat,
      takeAwayId: oldTrx.takeAwayId,
      nomorPesanan: oldTrx.nomorPesanan,
      statusPesanan: 'MENUNGGU',
      statusPembayaran: newStatusPembayaran,
      total: newTotal,
      totalModal: newTotalModal,
      totalUntung: newTotalUntung,
      metodeBayar: payload.metodeBayarTambahan || oldTrx.metodeBayar,
      bayar: newBayar,
      kembali: newKembali,
      status: 'Sukses',
      voidDariInvoice: oldTrx.invoiceNo,
      selisihVoid: selisih,
      keteranganVoid: payload.alasanVoid,
      itemsLama: oldTrx.items,
      totalLama: oldTrx.total,
    };

    // 5. Kurangi stok baru
    deductStockItems(oldTrx.cabang, payload.newItems, oldTrx.tipePesanan);

    // 6. Simpan transaksi lama (status DIVOID) dan transaksi baru ke Firestore
    firestoreSaveTransaksi(updatedOldTrx);
    firestoreSaveTransaksi(newTrx);

    // 7. Update state transaksiList
    setTransaksiList((prev) => [
      newTrx,
      ...prev.map((t) => (t.id === oldTrxId ? updatedOldTrx : t)),
    ]);

    // 8. Catat ke Audit Log
    const selisihDesc =
      selisih < 0
        ? `Kembalikan Uang: ${formatRupiah(Math.abs(selisih))}`
        : selisih > 0
        ? `Tagihan Tambahan: ${formatRupiah(selisih)}`
        : 'Biaya Pas';

    handleAddAuditLog({
      siapa: currentUser ? `${currentUser.nama} (${currentUser.jabatan})` : 'Petugas Kasir',
      cabang: oldTrx.cabang,
      aksi: 'Void & Ganti Pesanan',
      nominal: oldTrx.total,
      keterangan: `Void #${oldTrx.invoiceNo} ➔ Baru #${newInvoiceNo} (${selisihDesc}) - Alasan: ${payload.alasanVoid}`,
    });

    return { oldTrx: updatedOldTrx, newTrx, selisih };
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

        // Requirement 2: Status hanya boleh maju, tidak boleh mundur
        const currentRank = getStatusRank(t.statusPesanan);
        const targetRank = getStatusRank(statusPesanan);
        const isBatalOrVoid = statusPesanan === 'DIBATALKAN' || statusPesanan === 'DIVOID';

        if (!isBatalOrVoid && currentRank > 0 && targetRank > 0 && targetRank < currentRank) {
          console.warn(`[Status Protection] Mencegah status pesanan mundur dari ${t.statusPesanan} (rank ${currentRank}) ke ${statusPesanan} (rank ${targetRank})`);
          updatedTarget = t;
          return t;
        }

        const normTarget = normalizeStatusPesanan(statusPesanan);
        const isDiproses = normTarget === 'DIPROSES';
        const isSelesai = normTarget === 'LUNAS';

        const updated: Transaksi = {
          ...t,
          statusPesanan: normTarget,
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
    setAbsensiList((prev) => {
      const idx = prev.findIndex(
        (a) => a.id === newAbsen.id || (a.karyawanId === newAbsen.karyawanId && a.tanggal === newAbsen.tanggal)
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newAbsen;
        return next;
      }
      return [...prev, newAbsen];
    });
    firestoreSaveAbsensi(newAbsen);
  };

  const handleDeleteAbsensi = (absenId: string) => {
    setAbsensiList((prev) => prev.filter((a) => a.id !== absenId));
    firestoreDeleteAbsensi(absenId);
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

  // Full Reset Trigger & Execution (Owner Total Reset)
  const handleOpenFullResetModal = () => {
    setShowFullResetModal(true);
  };

  const handleExecuteFullReset = async (options: FullResetOptions): Promise<FullResetResult> => {
    const userEmail = currentUser?.email || (currentUser?.jabatan === 'Owner' ? OWNER_EMAIL : '');
    const result = await executeFullResetInFirestore(options, userEmail);

    if (result.success) {
      // 1. Pesanan
      if (options.pesanan) {
        setTransaksiList([]);
        saveToStorage(STORAGE_KEYS.TRANSAKSI, []);
      }

      // 2. Pengeluaran Toko
      if (options.pengeluaran) {
        setPengeluaranList([]);
        saveToStorage(STORAGE_KEYS.PENGELUARAN, []);
      }

      // 3. Permintaan & Stock Cabang
      if (options.permintaanStokCabang) {
        setPermintaanList([]);
        setStokCabang({});
        saveToStorage(STORAGE_KEYS.PERMINTAAN_BARANG, []);
        saveToStorage(STORAGE_KEYS.STOK_CABANG, {});
      }

      // 4. Surat Jalan DC
      if (options.suratJalan) {
        setSuratJalanList([]);
        saveToStorage(STORAGE_KEYS.SURAT_JALAN, []);
      }

      // 5. Absensi
      if (options.absensi) {
        setAbsensiList([]);
        saveToStorage(STORAGE_KEYS.ABSENSI, []);
      }

      // 6. Buka/Tutup Toko
      if (options.bukaTutupToko) {
        setTokoState({});
        saveToStorage(STORAGE_KEYS.TOKO_STATE, {});
      }

      // 7. Laporan
      if (options.laporan) {
        setLaporanHarianList([]);
        setAuditLogList([]);
        saveToStorage(STORAGE_KEYS.LAPORAN_HARIAN, []);
        saveToStorage(STORAGE_KEYS.AUDIT_LOG, []);
      }

      // 8. Bahan Baku & DC
      if (options.bahanBakuDc) {
        setBahanBakuList([]);
        saveToStorage(STORAGE_KEYS.BAHAN_BAKU, []);
      }

      // 9. Katalog Menu
      if (options.katalogMenu) {
        setKatalogList([]);
        saveToStorage(STORAGE_KEYS.KATALOG, []);
      }

      // 10. Data Cabang
      if (options.dataCabang) {
        setDataCabangList([]);
        saveToStorage(STORAGE_KEYS.DATA_CABANG, []);
      }

      // 11. Data Karyawan (Amankan Owner)
      if (options.dataKaryawan) {
        setKaryawanList((prev) => {
          const preserved = prev.filter(
            (k) =>
              k.id === 'usr-0' ||
              k.jabatan === 'Owner' ||
              (k.email && k.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
          );
          saveToStorage(STORAGE_KEYS.KARYAWAN, preserved);
          return preserved;
        });
      }

      setResetToastMessage(result.message);
    }

    return result;
  };

  // Reset to initial demo data (Manual Action only from Pengaturan / Owner with UI modal)
  const handleResetData = () => {
    setFooterResetMsg(null);
    setShowFooterResetModal(true);
  };

  const handleExecuteFooterReset = async () => {
    const userEmail = currentUser?.email || (currentUser?.jabatan === 'Owner' ? OWNER_EMAIL : '');
    if (userEmail.trim().toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      setFooterResetMsg({
        type: 'error',
        text: `Akses ditolak: Hanya akun Owner (${OWNER_EMAIL}) yang berhak menjalankan reset data demo.`,
      });
      return;
    }

    setIsResettingFooter(true);
    setFooterResetMsg(null);
    try {
      const res = await resetToDemoDataInFirestore(userEmail);
      if (res.success) {
        setFooterResetMsg({
          type: 'success',
          text: 'Data demo (dengan isDemo: true) berhasil di-reset ke Firestore.',
        });
      } else {
        setFooterResetMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (e: any) {
      setFooterResetMsg({
        type: 'error',
        text: e?.message || 'Gagal mereset data demo.',
      });
    } finally {
      setIsResettingFooter(false);
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
    if (t.status === 'Retur' || t.statusPesanan === 'DIVOID' || t.statusPesanan === 'DIBATALKAN') return false;
    const norm = normalizeStatusPesanan(t.statusPesanan, t.status);
    const isOngoing = norm === 'MENUNGGU' || norm === 'DIPROSES' || norm === 'SIAP ANTAR' || norm === 'BELUM BAYAR';
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
            onOpenResetModal={handleOpenFullResetModal}
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
            katalogList={katalogList}
            bahanBakuList={bahanBakuList}
            stokCabang={stokCabang}
            onUpdateStatusPesanan={handleUpdateStatusPesanan}
            onBatalkanPesanan={handleBatalkanPesanan}
            onEditPesananBelumBayar={handleEditPesananBelumBayar}
            onVoidPesananLunas={handleVoidPesananLunas}
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
            onDeleteAbsensi={handleDeleteAbsensi}
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

        {activeTab === 'pengaturan' && isDcPusatOrOwner && (
          <PengaturanView
            currentUser={currentUser}
            dataCabangList={dataCabangList}
            karyawanList={karyawanList}
            katalogList={katalogList}
            bahanBakuList={bahanBakuList}
            transaksiList={transaksiList}
            pengeluaranList={pengeluaranList}
            absensiList={absensiList}
            onManualResetSuccess={() => {
              // demo reset completed
            }}
            onOpenResetModal={handleOpenFullResetModal}
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

      {/* RESET DATA DEMO UI MODAL (Bukan confirm() browser) */}
      {showFooterResetModal && (() => {
        const userEmail = currentUser?.email || (currentUser?.jabatan === 'Owner' ? OWNER_EMAIL : '');
        const isOwnerEmail = userEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center">
                <RotateCcw className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  Konfirmasi Reset Data Demo
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Security Check: Otorisasi Akun Owner
                </p>
              </div>

              {/* Status Message */}
              {footerResetMsg ? (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold text-left ${
                    footerResetMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-red-50 text-red-900 border border-red-300'
                  }`}
                >
                  {footerResetMsg.text}
                </div>
              ) : (
                <div className="text-left text-xs space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold">Email Pengguna:</span>
                    <span className="font-mono font-bold text-slate-800">{userEmail || 'Tidak terdeteksi'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold">Email Wajib (Owner):</span>
                    <span className="font-mono font-bold text-red-600">{OWNER_EMAIL}</span>
                  </div>

                  {isOwnerEmail ? (
                    <p className="text-slate-600 pt-1 leading-relaxed">
                      Apakah Anda yakin ingin mengisi ulang database Firestore dengan data contoh demo Seblak Telaga?
                      Dokumen demo akan diberi tanda <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">isDemo: true</code> dan hanya dapat dihapus oleh Owner.
                    </p>
                  ) : (
                    <div className="p-2.5 bg-red-100/80 border border-red-300 text-red-800 rounded-xl font-bold text-center">
                      ⛔ Akses Ditolak: Hanya akun dengan email <strong>{OWNER_EMAIL}</strong> yang berhak menjalankan reset data demo.
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowFooterResetModal(false)}
                  disabled={isResettingFooter}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  {footerResetMsg ? 'Tutup' : 'Batal'}
                </button>
                {!footerResetMsg && isOwnerEmail && (
                  <button
                    type="button"
                    onClick={handleExecuteFooterReset}
                    disabled={isResettingFooter}
                    className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    {isResettingFooter ? 'Mereset Data...' : 'Ya, Reset Sekarang'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* FULL RESET TOTAL MODAL (Owner Total Reset) */}
      {currentUser && (
        <ResetTotalModal
          isOpen={showFullResetModal}
          onClose={() => setShowFullResetModal(false)}
          userEmail={currentUser.email || (currentUser.jabatan === 'Owner' ? OWNER_EMAIL : '')}
          isOwner={currentUser.jabatan === 'Owner'}
          onExecuteReset={handleExecuteFullReset}
          dataCounts={{
            pesanan: transaksiList.length,
            pengeluaran: pengeluaranList.length,
            permintaanStokCabang: permintaanList.length + Object.keys(stokCabang).length,
            suratJalan: suratJalanList.length,
            absensi: absensiList.length,
            bukaTutupToko: Object.keys(tokoState).length,
            laporan: laporanHarianList.length + auditLogList.length,
            bahanBakuDc: bahanBakuList.length,
            katalogMenu: katalogList.length,
            dataCabang: dataCabangList.length,
            dataKaryawan: karyawanList.filter(
              (k) =>
                k.id !== 'usr-0' &&
                k.jabatan !== 'Owner' &&
                (!k.email || k.email.toLowerCase() !== OWNER_EMAIL.toLowerCase())
            ).length,
          }}
        />
      )}

      {/* FLOATING SUCCESS TOAST NOTIFICATION */}
      {resetToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-500 flex items-start gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-extrabold text-white">Full Reset Berhasil!</div>
            <div className="text-slate-300">{resetToastMessage}</div>
          </div>
          <button
            onClick={() => setResetToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
