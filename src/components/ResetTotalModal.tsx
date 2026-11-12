import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  ShoppingBag,
  Receipt,
  Layers,
  Truck,
  CalendarCheck,
  Store,
  FileText,
  Package,
  UtensilsCrossed,
  Building2,
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
  pesanan: number;
  pengeluaran: number;
  permintaanStokCabang: number;
  suratJalan: number;
  absensi: number;
  bukaTutupToko: number;
  laporan: number;
  bahanBakuDc: number;
  katalogMenu: number;
  dataCabang: number;
  dataKaryawan: number; // strictly excluding Owner
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
    pesanan: true,
    pengeluaran: true,
    permintaanStokCabang: true,
    suratJalan: true,
    absensi: true,
    bukaTutupToko: true,
    laporan: true,
    bahanBakuDc: true,
    katalogMenu: true,
    dataCabang: true,
    dataKaryawan: true,
  });

  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<FullResetResult | null>(null);

  // Live counts state (initialized from props, refreshed via direct Firestore query on open)
  const [counts, setCounts] = useState<ResetCollectionCounts>(
    dataCounts || {
      pesanan: 0,
      pengeluaran: 0,
      permintaanStokCabang: 0,
      suratJalan: 0,
      absensi: 0,
      bukaTutupToko: 0,
      laporan: 0,
      bahanBakuDc: 0,
      katalogMenu: 0,
      dataCabang: 0,
      dataKaryawan: 0,
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
          permintaanSnap,
          stokCabangSnap,
          suratJalanSnap,
          absensiSnap,
          statusTokoSnap,
          laporanSnap,
          auditSnap,
          bahanSnap,
          katalogSnap,
          branchesSnap,
          karyawanSnap,
        ] = await Promise.allSettled([
          getDocs(collection(db, 'transaksi')),
          getDocs(collection(db, 'pengeluaran')),
          getDocs(collection(db, 'permintaan')),
          getDocs(collection(db, 'stokCabang')),
          getDocs(collection(db, 'suratJalan')),
          getDocs(collection(db, 'absensi')),
          getDocs(collection(db, 'statusToko')),
          getDocs(collection(db, 'laporanHarian')),
          getDocs(collection(db, 'auditLog')),
          getDocs(collection(db, 'bahanBaku')),
          getDocs(collection(db, 'katalog')),
          getDocs(collection(db, 'branches')),
          getDocs(collection(db, 'karyawan')),
        ]);

        if (!isMounted) return;

        const pesananCount = trxSnap.status === 'fulfilled' ? trxSnap.value.size : (dataCounts?.pesanan ?? 0);
        const pengeluaranCount = pengeluaranSnap.status === 'fulfilled' ? pengeluaranSnap.value.size : (dataCounts?.pengeluaran ?? 0);
        const permintaanStokCount =
          (permintaanSnap.status === 'fulfilled' ? permintaanSnap.value.size : 0) +
          (stokCabangSnap.status === 'fulfilled' ? stokCabangSnap.value.size : 0);
        const suratJalanCount = suratJalanSnap.status === 'fulfilled' ? suratJalanSnap.value.size : (dataCounts?.suratJalan ?? 0);
        const absensiCount = absensiSnap.status === 'fulfilled' ? absensiSnap.value.size : (dataCounts?.absensi ?? 0);
        const bukaTutupCount = statusTokoSnap.status === 'fulfilled' ? statusTokoSnap.value.size : (dataCounts?.bukaTutupToko ?? 0);
        const laporanCount =
          (laporanSnap.status === 'fulfilled' ? laporanSnap.value.size : 0) +
          (auditSnap.status === 'fulfilled' ? auditSnap.value.size : 0);
        const bahanDcCount = bahanSnap.status === 'fulfilled' ? bahanSnap.value.size : (dataCounts?.bahanBakuDc ?? 0);
        const katalogCount = katalogSnap.status === 'fulfilled' ? katalogSnap.value.size : (dataCounts?.katalogMenu ?? 0);
        const cabangCount = branchesSnap.status === 'fulfilled' ? branchesSnap.value.size : (dataCounts?.dataCabang ?? 0);

        // Karyawan: Strictly EXCLUDE Owner (usr-0, Owner, OWNER_EMAIL)
        let karyawanTrialCount = 0;
        if (karyawanSnap.status === 'fulfilled') {
          karyawanTrialCount = karyawanSnap.value.docs.filter((d) => {
            const data = d.data();
            const isOwnerDoc =
              d.id === 'usr-0' ||
              (data?.jabatan || '').trim().toUpperCase() === 'OWNER' ||
              data?.role === 'owner' ||
              (data?.email && data.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
            return !isOwnerDoc;
          }).length;
        } else if (dataCounts?.dataKaryawan !== undefined) {
          karyawanTrialCount = dataCounts.dataKaryawan;
        }

        setCounts({
          pesanan: pesananCount,
          pengeluaran: pengeluaranCount,
          permintaanStokCabang: permintaanStokCount || dataCounts?.permintaanStokCabang || 0,
          suratJalan: suratJalanCount,
          absensi: absensiCount,
          bukaTutupToko: bukaTutupCount || dataCounts?.bukaTutupToko || 0,
          laporan: laporanCount || dataCounts?.laporan || 0,
          bahanBakuDc: bahanDcCount,
          katalogMenu: katalogCount,
          dataCabang: cabangCount,
          dataKaryawan: karyawanTrialCount,
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
      pesanan: true,
      pengeluaran: true,
      permintaanStokCabang: true,
      suratJalan: true,
      absensi: true,
      bukaTutupToko: true,
      laporan: true,
      bahanBakuDc: true,
      katalogMenu: true,
      dataCabang: true,
      dataKaryawan: true,
    });
  };

  const handleDeselectAll = () => {
    setOptions({
      pesanan: false,
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
      setErrorMsg('Pilih minimal satu kategori data yang ingin direset.');
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
        setTimeout(() => {
          setSuccessResult(null);
          setConfirmInput('');
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message || 'Gagal mereset data Firestore.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem saat mereset data.');
    } finally {
      setIsResetting(false);
    }
  };

  // 11 Specific Items Config
  const checklistItems: Array<{
    key: keyof FullResetOptions;
    title: string;
    count: number;
    badgeUnit: string;
    collections: string;
    icon: React.ReactNode;
    isProtectedOwner?: boolean;
  }> = [
    {
      key: 'pesanan',
      title: '1. Pesanan',
      count: counts.pesanan,
      badgeUnit: 'Data',
      collections: 'transaksi, orders, pesanan',
      icon: <ShoppingBag className="w-4 h-4" />,
    },
    {
      key: 'pengeluaran',
      title: '2. Pengeluaran Toko',
      count: counts.pengeluaran,
      badgeUnit: 'Data',
      collections: 'pengeluaran',
      icon: <Receipt className="w-4 h-4" />,
    },
    {
      key: 'permintaanStokCabang',
      title: '3. Permintaan & Stock Cabang',
      count: counts.permintaanStokCabang,
      badgeUnit: 'Data',
      collections: 'permintaan, stokCabang, stocks',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      key: 'suratJalan',
      title: '4. Surat Jalan DC',
      count: counts.suratJalan,
      badgeUnit: 'Data',
      collections: 'suratJalan',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      key: 'absensi',
      title: '5. Absensi',
      count: counts.absensi,
      badgeUnit: 'Data',
      collections: 'absensi',
      icon: <CalendarCheck className="w-4 h-4" />,
    },
    {
      key: 'bukaTutupToko',
      title: '6. Buka/Tutup Toko',
      count: counts.bukaTutupToko,
      badgeUnit: 'Status Cabang',
      collections: 'statusToko',
      icon: <Store className="w-4 h-4" />,
    },
    {
      key: 'laporan',
      title: '7. Laporan',
      count: counts.laporan,
      badgeUnit: 'Data',
      collections: 'laporanHarian, auditLog, divoid',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: 'bahanBakuDc',
      title: '8. Bahan Baku & DC',
      count: counts.bahanBakuDc,
      badgeUnit: 'Item',
      collections: 'bahanBaku, ingredients, bahan',
      icon: <Package className="w-4 h-4" />,
    },
    {
      key: 'katalogMenu',
      title: '9. Katalog Menu',
      count: counts.katalogMenu,
      badgeUnit: 'Menu',
      collections: 'katalog, menus, products',
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
    {
      key: 'dataCabang',
      title: '10. Data Cabang',
      count: counts.dataCabang,
      badgeUnit: 'Cabang',
      collections: 'branches, cabang, dataCabang',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      key: 'dataKaryawan',
      title: '11. Data Karyawan (jangan hapus Owner)',
      count: counts.dataKaryawan,
      badgeUnit: 'Staf/Crew',
      collections: 'karyawan, employees (Kecuali Owner)',
      icon: <UserCheck className="w-4 h-4" />,
      isProtectedOwner: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border-2 border-red-300 dark:border-red-800 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full">
                  Owner Security Zone
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Database className="w-3 h-3 text-red-500" />
                  Cloud Firestore
                </span>
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg leading-tight mt-0.5">
                Modal RESET TOTAL (11 Kategori)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Centang item yang ingin direset menjadi <strong>0 data</strong>. Data akan dikosongkan total pakai Firestore batch delete.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successResult && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs space-y-1.5">
            <div className="font-extrabold text-sm flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successResult.message}</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Sinkronisasi Firestore berjalan otomatis dan jendela akan tertutup dalam beberapa detik...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-2xl text-red-800 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email Verification Banner */}
        <div
          className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            isOwnerEmail
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <span>Otorisasi Owner: {OWNER_EMAIL}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Status:{' '}
              {isOwnerEmail
                ? 'Terverifikasi sebagai Akun Owner yang sah'
                : 'Akses Ditolak (Bukan Owner)'}
            </div>
          </div>
          <div className="text-[10px] font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            {userEmail || 'Owner Mode'}
          </div>
        </div>

        {/* Selection Category Cards - Exactly 11 Items */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-100">
                Pilih Dari 11 Data Yang Mau Direset (0 Data):
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
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] cursor-pointer transition"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 font-medium rounded-lg text-[11px] cursor-pointer transition"
              >
                Kosongkan
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {checklistItems.map((item) => {
              const isChecked = options[item.key];

              return (
                <div
                  key={item.key}
                  onClick={() => handleToggle(item.key)}
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                    isChecked
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-500 text-rose-950 dark:text-rose-200 shadow-xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isChecked
                          ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs flex items-center gap-2">
                        <span>{item.title}</span>
                        <span
                          className={`text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full ${
                            item.count > 0
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.count} {item.badgeUnit}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Koleksi: <code className="bg-black/5 dark:bg-white/10 px-1 rounded">{item.collections}</code>
                      </div>
                      {item.isProtectedOwner && (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800 w-fit">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          <span>Data Owner (Rizal Maulana / DC PUSAT) TIDAK ditampilkan & TIDAK akan dihapus</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Double Confirm Input Section */}
          <div className="bg-red-50/80 dark:bg-red-950/40 p-4 rounded-2xl border border-red-200 dark:border-red-800 space-y-2.5">
            <div className="text-xs text-red-950 dark:text-red-200 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>Konfirmasi Keamanan: Ketik persis kata di bawah untuk mereset</span>
            </div>
            <div className="text-[11px] text-red-800 dark:text-red-300">
              Ketik:{' '}
              <strong className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400">
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
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border-2 border-red-300 dark:border-red-700 rounded-xl font-mono font-black text-sm text-red-900 dark:text-red-200 placeholder:text-slate-300 dark:placeholder:text-slate-500 placeholder:font-sans focus:outline-none focus:border-red-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isResetting}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 ${
                canSubmit
                  ? 'bg-rose-900 hover:bg-black text-white cursor-pointer active:scale-95 shadow-red-900/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              {isResetting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Mereset Koleksi Firestore via Batch...</span>
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
