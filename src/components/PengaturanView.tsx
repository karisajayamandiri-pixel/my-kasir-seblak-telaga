import React, { useState } from 'react';
import {
  Settings,
  Database,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Server,
  CloudCheck,
  ShieldAlert,
  Trash2,
  HardDrive,
  Users,
  Store,
  UtensilsCrossed,
  Receipt,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  Karyawan,
  DataCabang,
  KatalogMenu,
  BahanBaku,
  Transaksi,
  PengeluaranToko,
  Absensi,
  OWNER_EMAIL,
} from '../types';
import { resetToDemoDataInFirestore } from '../services/firestoreSync';

interface PengaturanViewProps {
  currentUser: Karyawan;
  dataCabangList: DataCabang[];
  karyawanList: Karyawan[];
  katalogList: KatalogMenu[];
  bahanBakuList: BahanBaku[];
  transaksiList: Transaksi[];
  pengeluaranList: PengeluaranToko[];
  absensiList: Absensi[];
  onManualResetSuccess?: () => void;
  onOpenResetModal?: () => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  currentUser,
  dataCabangList,
  karyawanList,
  katalogList,
  bahanBakuList,
  transaksiList,
  pengeluaranList,
  absensiList,
  onManualResetSuccess,
  onOpenResetModal,
}) => {
  const isOwner = currentUser.jabatan === 'Owner';
  const effectiveEmail = currentUser.email || (isOwner ? OWNER_EMAIL : '');
  const isOwnerEmail = effectiveEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();

  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleOpenResetModal = () => {
    setConfirmInput('');
    setModalError(null);
    setShowConfirmModal(true);
  };

  const handleExecuteReset = async () => {
    if (!isOwnerEmail) {
      setModalError(`Akses Ditolak: Hanya akun dengan email ${OWNER_EMAIL} yang dapat mereset data demo.`);
      return;
    }

    if (confirmInput.trim().toUpperCase() !== 'RESET') {
      setModalError("Ketik kata 'RESET' persis seperti petunjuk.");
      return;
    }

    setIsResetting(true);
    setModalError(null);
    setStatusMessage(null);

    try {
      const res = await resetToDemoDataInFirestore(effectiveEmail);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Data demo (dengan penanda isDemo=true) berhasil di-reset ke Firebase Firestore. Hanya Owner yang dapat menghapus data ini.',
        });
        setShowConfirmModal(false);
        if (onManualResetSuccess) onManualResetSuccess();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Gagal mereset data ke Firestore.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Terjadi kesalahan saat mereset data ke Firestore.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md">
                <Settings className="w-4 h-4" />
                <span>PENGATURAN SISTEM</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Firestore Realtime Aktif</span>
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-wide text-white">
              Pengaturan Database & Status Sistem
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Sistem POS Seblak Telaga menggunakan Cloud Firestore sebagai sumber kebenaran data tunggal.
              Auto-seed data dinonaktifkan secara permanen sehingga data Anda tidak akan pernah tertimpa
              secara otomatis saat refresh, publish, atau membuka aplikasi.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Database Status & Persistence Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Status Database</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Cloud Firestore</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Terhubung & sinkron realtime ke semua HP kasir & admin.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Cabang Aktif</span>
            <Store className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {dataCabangList.length} <span className="text-xs font-semibold text-slate-500">Cabang</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Data master cabang disimpan permanen di Firestore.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Katalog Menu Seblak</span>
            <UtensilsCrossed className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {katalogList.length} <span className="text-xs font-semibold text-slate-500">Item Menu</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {bahanBakuList.length} master bahan baku terdaftar di DC.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {transaksiList.length} <span className="text-xs font-semibold text-slate-500">Transaksi</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Riwayat tersimpan aman di Firestore, anti-hilang saat refresh.
          </p>
        </div>
      </div>

      {/* Persistence Policy Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Kebijakan Persistensi Data (Anti Timpa & Anti Auto-Reset)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-slate-800 block text-xs">1. Tidak Ada Auto-Seed</span>
            <p className="text-slate-600 leading-relaxed">
              Aplikasi tidak lagi memanggil auto-seeding pada <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">useEffect</code> awal saat web dibuka atau di-publish.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-slate-800 block text-xs">2. Single Source of Truth</span>
            <p className="text-slate-600 leading-relaxed">
              Data yang Anda input di kasir, cabang, atau DC langsung tersimpan ke Cloud Firestore dan di-cache aman di browser.
            </p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-slate-800 block text-xs">3. Reset Demo Manual Saja</span>
            <p className="text-slate-600 leading-relaxed">
              Data demo hanya bisa dimuat jika Anda menekan tombol merah <span className="font-bold text-red-600">"Reset Data Demo"</span> secara sengaja di halaman ini.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Manual Demo Reset */}
      <div className="bg-red-50/60 border-2 border-red-200 rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-red-950">
              Zona Bahaya: Reset Data Demo Manual
            </h3>
            <p className="text-xs text-red-800 leading-relaxed max-w-3xl">
              Gunakan fitur ini <strong>HANYA</strong> jika Anda ingin mengembalikan seluruh database ke kondisi contoh awal demo
              (3 Cabang: Padaherang 01, Banjarsari 02, Ciawtali 03, Katalog Seblak lengkap, Resep, Data Karyawan, dan Contoh Transaksi).
              Semua data transaksi dan perubahan baru yang dibuat saat ini akan ditimpa dengan data demo.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-red-200">
          <div className="text-[11px] text-red-700 font-semibold space-y-0.5">
            <div>
              🔒 Keamanan: Hanya akun dengan email <strong>{OWNER_EMAIL}</strong> yang dapat mereset data demo.
            </div>
            <div className="text-slate-500 font-normal">
              Email aktif saat ini: <code className="bg-white/80 px-1 py-0.5 rounded text-slate-800">{effectiveEmail || 'Tidak terdeteksi'}</code>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenResetModal && (
              <button
                type="button"
                onClick={() => onOpenResetModal()}
                disabled={!isOwnerEmail}
                className={`px-4 py-2.5 font-black rounded-2xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95 ${
                  isOwnerEmail
                    ? 'bg-rose-900 hover:bg-black text-white shadow-rose-950/40 border border-rose-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                }`}
                title={isOwnerEmail ? 'Pilih koleksi data trial yang ingin dihapus total' : `Terkunci: Email harus ${OWNER_EMAIL}`}
              >
                <Trash2 className="w-4 h-4 text-rose-300 stroke-[2.5]" />
                <span>🗑️ RESET TOTAL - HAPUS SEMUA DATA TRIAL</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenResetModal}
              disabled={isResetting || !isOwnerEmail}
              className={`px-4 py-2.5 font-bold rounded-2xl text-xs flex items-center gap-2 border transition cursor-pointer active:scale-95 ${
                isOwnerEmail
                  ? 'bg-white hover:bg-red-50 text-red-700 border-red-300 shadow-xs'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none'
              }`}
              title="Isi ulang data contoh demo awal Seblak"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Muat Ulang Data Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Ganda Reset Demo (Bukan sekadar confirm browser) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">Konfirmasi Reset Data Demo</h4>
                <p className="text-xs text-slate-500">Security Check: Owner Email Verification</p>
              </div>
            </div>

            {/* Email Check Banner */}
            <div className={`p-3 rounded-2xl border text-xs ${
              isOwnerEmail
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {isOwnerEmail ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>Email Otorisasi: {OWNER_EMAIL}</span>
              </div>
              <div className="mt-1 text-[11px] opacity-85">
                Status Akun: {isOwnerEmail ? 'Terverifikasi sebagai Owner yang sah.' : `Ditolak (Email saat ini: ${effectiveEmail || 'Kosong'})`}
              </div>
            </div>

            {modalError && (
              <div className="p-2.5 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="text-xs text-slate-700 space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <p>
                Seluruh dokumen demo yang dibuat akan ditandai dengan metadata <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">isDemo: true</code>.
              </p>
              <p className="text-slate-500 text-[11px]">
                Sesuai Firestore Rules, hanya Owner ({OWNER_EMAIL}) yang memiliki izin menghapus data bertanda demo tersebut.
              </p>
              <p className="font-bold text-red-600 pt-1">
                Ketik kata <span className="underline uppercase tracking-wider">RESET</span> di bawah untuk mengeksekusi:
              </p>
            </div>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => {
                setConfirmInput(e.target.value);
                setModalError(null);
              }}
              placeholder="Ketik RESET"
              disabled={!isOwnerEmail || isResetting}
              className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 focus:border-red-500 rounded-xl font-mono text-center font-black tracking-widest text-slate-900 text-sm focus:outline-none disabled:bg-slate-100"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting || !isOwnerEmail || confirmInput.trim().toUpperCase() !== 'RESET'}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mereset Data...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Ya, Reset Data Demo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
