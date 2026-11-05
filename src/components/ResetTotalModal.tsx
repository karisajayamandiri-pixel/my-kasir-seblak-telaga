import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
  Users,
  Package,
  FileText,
  UserCheck,
  ShieldAlert,
  CheckSquare,
  Square,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FullResetOptions, FullResetResult, OWNER_EMAIL } from '../types';

export interface ResetCollectionCounts {
  pesananTransaksi: number;
  menuKategori: number;
  pelanggan: number;
  bahanBakuStok: number;
  laporanDivoid: number;
  karyawanTrial: number; // strictly excluding Owner
}

interface ResetTotalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  isOwner: boolean;
  onExecuteReset: (options: FullResetOptions) => Promise<FullResetResult>;
  dataCounts?: ResetCollectionCounts;
}

export const ResetTotalModal: React.FC<ResetTotalModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  isOwner,
  onExecuteReset,
  dataCounts,
}) => {
  const isOwnerEmail =
    userEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase() || isOwner;

  const [options, setOptions] = useState<FullResetOptions>({
    pesananTransaksi: true,
    menuKategori: true,
    pelanggan: true,
    bahanBakuStok: true,
    laporanDivoid: true,
    karyawanTrial: true,
  });

  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<FullResetResult | null>(null);

  // Live counts state (initialized from props, updated via direct Firestore query on open)
  const [counts, setCounts] = useState<ResetCollectionCounts>(
    dataCounts || {
      pesananTransaksi: 0,
      menuKategori: 0,
      pelanggan: 0,
      bahanBakuStok: 0,
      laporanDivoid: 0,
      karyawanTrial: 0,
    }
  );
  const [isLoadingCounts, setIsLoadingCounts] = useState<boolean>(false);

  // Sync initial props
  useEffect(() => {
    if (dataCounts) {
      setCounts(dataCounts);
    }
  }, [dataCounts]);

  // Query Firestore collection doc counts on open to show exact real-time numbers
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchDocCounts = async () => {
      setIsLoadingCounts(true);
      try {
        const [
          trxSnap,
          pengeluaranSnap,
          katalogSnap,
          pelangganSnap,
          bahanSnap,
          stokCabangSnap,
          laporanSnap,
          auditSnap,
          absensiSnap,
          suratJalanSnap,
          permintaanSnap,
          karyawanSnap,
        ] = await Promise.allSettled([
          getDocs(collection(db, 'transaksi')),
          getDocs(collection(db, 'pengeluaran')),
          getDocs(collection(db, 'katalog')),
          getDocs(collection(db, 'pelanggan')),
          getDocs(collection(db, 'bahanBaku')),
          getDocs(collection(db, 'stokCabang')),
          getDocs(collection(db, 'laporanHarian')),
          getDocs(collection(db, 'auditLog')),
          getDocs(collection(db, 'absensi')),
          getDocs(collection(db, 'suratJalan')),
          getDocs(collection(db, 'permintaan')),
          getDocs(collection(db, 'karyawan')),
        ]);

        if (!isMounted) return;

        const trxCount =
          (trxSnap.status === 'fulfilled' ? trxSnap.value.size : 0) +
          (pengeluaranSnap.status === 'fulfilled' ? pengeluaranSnap.value.size : 0);

        const katalogCount =
          katalogSnap.status === 'fulfilled' ? katalogSnap.value.size : (dataCounts?.menuKategori ?? 0);

        const pelangganCount =
          pelangganSnap.status === 'fulfilled' ? pelangganSnap.value.size : (dataCounts?.pelanggan ?? 0);

        const bahanStokCount =
          (bahanSnap.status === 'fulfilled' ? bahanSnap.value.size : 0) +
          (stokCabangSnap.status === 'fulfilled' ? stokCabangSnap.value.size : 0);

        const laporanDivoidCount =
          (laporanSnap.status === 'fulfilled' ? laporanSnap.value.size : 0) +
          (auditSnap.status === 'fulfilled' ? auditSnap.value.size : 0) +
          (absensiSnap.status === 'fulfilled' ? absensiSnap.value.size : 0) +
          (suratJalanSnap.status === 'fulfilled' ? suratJalanSnap.value.size : 0) +
          (permintaanSnap.status === 'fulfilled' ? permintaanSnap.value.size : 0);

        // Karyawan Trial: Strictly EXCLUDE Owner (usr-0, Owner, OWNER_EMAIL)
        let karyawanTrialCount = 0;
        if (karyawanSnap.status === 'fulfilled') {
          karyawanTrialCount = karyawanSnap.value.docs.filter((d) => {
            const data = d.data();
            const isOwnerDoc =
              d.id === 'usr-0' ||
              data?.jabatan === 'Owner' ||
              data?.role === 'owner' ||
              (data?.email && data.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
            return !isOwnerDoc;
          }).length;
        } else if (dataCounts?.karyawanTrial !== undefined) {
          karyawanTrialCount = dataCounts.karyawanTrial;
        }

        setCounts({
          pesananTransaksi: trxCount || dataCounts?.pesananTransaksi || 0,
          menuKategori: katalogCount || dataCounts?.menuKategori || 0,
          pelanggan: pelangganCount || dataCounts?.pelanggan || 0,
          bahanBakuStok: bahanStokCount || dataCounts?.bahanBakuStok || 0,
          laporanDivoid: laporanDivoidCount || dataCounts?.laporanDivoid || 0,
          karyawanTrial: karyawanTrialCount,
        });
      } catch (err) {
        console.warn('Gagal membaca count dokumen Firestore:', err);
      } finally {
        if (isMounted) setIsLoadingCounts(false);
      }
    };

    fetchDocCounts();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (key: keyof FullResetOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setOptions({
      pesananTransaksi: true,
      menuKategori: true,
      pelanggan: true,
      bahanBakuStok: true,
      laporanDivoid: true,
      karyawanTrial: true,
    });
  };

  const handleDeselectAll = () => {
    setOptions({
      pesananTransaksi: false,
      menuKategori: false,
      pelanggan: false,
      bahanBakuStok: false,
      laporanDivoid: false,
      karyawanTrial: false,
    });
  };

  const hasAnySelected = Object.values(options).some(Boolean);
  const isConfirmMatched = confirmInput.trim().toUpperCase() === 'RESET TOTAL';
  const canSubmit = isOwnerEmail && hasAnySelected && isConfirmMatched && !isResetting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessResult(null);

    if (!isOwnerEmail) {
      setErrorMsg(`Akses Ditolak: Hanya Owner (${OWNER_EMAIL}) yang berhak menjalankan reset.`);
      return;
    }

    if (!hasAnySelected) {
      setErrorMsg('Pilih minimal satu kategori data yang ingin dihapus.');
      return;
    }

    if (!isConfirmMatched) {
      setErrorMsg("Ketik kata 'RESET TOTAL' persis dengan huruf besar untuk konfirmasi.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await onExecuteReset(options);
      if (res.success) {
        setSuccessResult(res);
        // Otomatis reload setelah 2.2 detik agar seluruh state Firestore tersinkron bersih
        setTimeout(() => {
          window.location.reload();
        }, 2200);
      } else {
        setErrorMsg(res.message || 'Gagal mereset data Firestore.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem saat mereset data.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border-2 border-red-300 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                  Owner Security Zone
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Database className="w-3 h-3 text-red-500" />
                  Cloud Firestore
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-lg leading-tight mt-0.5">
                Pilih Data Yang Mau Dihapus
              </h3>
              <p className="text-xs text-slate-500">
                Pilih koleksi Firebase yang akan dikosongkan secara total pakai batch write agar sistem bersih seperti toko baru.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successResult && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-xs space-y-1.5 animate-bounce">
            <div className="font-extrabold text-sm flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successResult.message}</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              Halaman akan di-reload otomatis dalam 2 detik untuk memastikan seluruh counter dashboard menjadi 0...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-2xl text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email Verification Banner */}
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            isOwnerEmail
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Otorisasi Owner: {OWNER_EMAIL}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Status:{' '}
              {isOwnerEmail
                ? '✅ Terverifikasi sebagai Akun Owner yang sah'
                : '❌ Akses Ditolak (Bukan Owner)'}
            </div>
          </div>
          <div className="text-[10px] font-mono bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-600">
            {userEmail || 'Owner Mode'}
          </div>
        </div>

        {/* Selection Category Cards */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800">
                Pilih Koleksi Firebase yang Mau Dihapus:
              </span>
              {isLoadingCounts && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Menghitung...
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer transition"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-medium rounded-lg text-[11px] cursor-pointer transition"
              >
                Kosongkan
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {/* 1. Pesanan & Transaksi */}
            <div
              onClick={() => handleToggle('pesananTransaksi')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                options.pesananTransaksi
                  ? 'bg-rose-50/70 border-rose-500 text-rose-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    options.pesananTransaksi
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-2">
                    <span>Pesanan & Transaksi Kasir</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        counts.pesananTransaksi > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {counts.pesananTransaksi} Data
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Koleksi: <code className="bg-black/5 px-1 rounded">transaksi</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">orders</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">pesanan</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">pengeluaran</code>
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {options.pesananTransaksi ? (
                  <CheckSquare className="w-5 h-5 text-rose-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>

            {/* 2. Menu & Kategori */}
            <div
              onClick={() => handleToggle('menuKategori')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                options.menuKategori
                  ? 'bg-rose-50/70 border-rose-500 text-rose-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    options.menuKategori
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-2">
                    <span>Menu & Kategori Produk Seblak</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        counts.menuKategori > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {counts.menuKategori} Data
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Koleksi: <code className="bg-black/5 px-1 rounded">katalog</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">menus</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">products</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">categories</code>
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {options.menuKategori ? (
                  <CheckSquare className="w-5 h-5 text-rose-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>

            {/* 3. Pelanggan */}
            <div
              onClick={() => handleToggle('pelanggan')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                options.pelanggan
                  ? 'bg-rose-50/70 border-rose-500 text-rose-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    options.pelanggan ? 'bg-rose-200 text-rose-800' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-2">
                    <span>Data Pelanggan Trial</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        counts.pelanggan > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {counts.pelanggan} Data
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Koleksi: <code className="bg-black/5 px-1 rounded">pelanggan</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">customers</code>
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {options.pelanggan ? (
                  <CheckSquare className="w-5 h-5 text-rose-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>

            {/* 4. Bahan Baku & Stok */}
            <div
              onClick={() => handleToggle('bahanBakuStok')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                options.bahanBakuStok
                  ? 'bg-rose-50/70 border-rose-500 text-rose-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    options.bahanBakuStok
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-2">
                    <span>Bahan Baku & Stok Cabang</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        counts.bahanBakuStok > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {counts.bahanBakuStok} Data
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Koleksi: <code className="bg-black/5 px-1 rounded">bahanBaku</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">ingredients</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">stokCabang</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">stocks</code>
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {options.bahanBakuStok ? (
                  <CheckSquare className="w-5 h-5 text-rose-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>

            {/* 5. Laporan & Divoid */}
            <div
              onClick={() => handleToggle('laporanDivoid')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                options.laporanDivoid
                  ? 'bg-rose-50/70 border-rose-500 text-rose-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    options.laporanDivoid
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-2">
                    <span>Laporan Harian, Divoid & Audit Log</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        counts.laporanDivoid > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {counts.laporanDivoid} Data
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Koleksi: <code className="bg-black/5 px-1 rounded">laporanHarian</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">auditLog</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">absensi</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">suratJalan</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">permintaan</code>
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {options.laporanDivoid ? (
                  <CheckSquare className="w-5 h-5 text-rose-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>

            {/* 6. Karyawan Trial - DIPROTEKSI: OWNER TIDAK DITAMPILKAN & TIDAK AKAN DIHAPUS */}
            <div
              onClick={() => handleToggle('karyawanTrial')}
              className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                options.karyawanTrial
                  ? 'bg-rose-50/70 border-rose-500 text-rose-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    options.karyawanTrial
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs flex items-center gap-2">
                    <span>Karyawan Trial (Staf Kasir & Crew)</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        counts.karyawanTrial > 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {counts.karyawanTrial} Data Staf
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Koleksi: <code className="bg-black/5 px-1 rounded">karyawan</code>,{' '}
                    <code className="bg-black/5 px-1 rounded">employees</code>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-300 w-fit">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Data Owner (Haji Hendra / DC PUSAT) TIDAK ditampilkan & TIDAK akan dihapus</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {options.karyawanTrial ? (
                  <CheckSquare className="w-5 h-5 text-rose-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300" />
                )}
              </div>
            </div>
          </div>

          {/* Double Confirm Input Section */}
          <div className="bg-red-50/80 p-4 rounded-2xl border border-red-200 space-y-2.5">
            <div className="text-xs text-red-950 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Konfirmasi Keamanan: Ketik persis kata di bawah untuk menghapus</span>
            </div>
            <div className="text-[11px] text-red-800">
              Ketik:{' '}
              <strong className="font-mono bg-white px-2 py-0.5 rounded border border-red-300 text-red-600">
                RESET TOTAL
              </strong>
            </div>
            <input
              type="text"
              required
              disabled={isResetting}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Ketik RESET TOTAL..."
              className="w-full px-3.5 py-2.5 bg-white border-2 border-red-300 rounded-xl font-mono font-black text-sm text-red-900 placeholder:text-slate-300 placeholder:font-sans focus:outline-none focus:border-red-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isResetting}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 ${
                canSubmit
                  ? 'bg-rose-900 hover:bg-black text-white cursor-pointer active:scale-95 shadow-red-900/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Menghapus Koleksi Firestore via Batch...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Hapus Yang Dipilih</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
