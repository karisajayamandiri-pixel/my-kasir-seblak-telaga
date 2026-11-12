import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Database,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  Store,
  UtensilsCrossed,
  Receipt,
  X,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Palette,
  Sun,
  Moon,
  Save,
  Check,
  Truck,
} from 'lucide-react';
import {
  Karyawan,
  DataCabang,
  KatalogMenu,
  BahanBaku,
  Transaksi,
  PengeluaranToko,
  Absensi,
  AppSettings,
  ThemeColorId,
  ThemeMode,
  OWNER_EMAIL,
} from '../types';
import { resetToDemoDataInFirestore } from '../services/firestoreSync';
import { compressLogoImage } from '../utils/storage';
import {
  DEFAULT_LOGO_URL,
  DEFAULT_BUSINESS_NAME,
  THEME_COLOR_PRESETS,
  getThemePreset,
} from '../utils/theme';

interface PengaturanViewProps {
  currentUser: Karyawan;
  dataCabangList: DataCabang[];
  karyawanList: Karyawan[];
  katalogList: KatalogMenu[];
  bahanBakuList: BahanBaku[];
  transaksiList: Transaksi[];
  pengeluaranList: PengeluaranToko[];
  absensiList: Absensi[];
  appSettings: AppSettings;
  onSaveAppSettings: (settings: AppSettings) => Promise<void> | void;
  onManualResetSuccess?: () => void;
  onOpenResetModal?: () => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  currentUser,
  dataCabangList,
  katalogList,
  bahanBakuList,
  transaksiList,
  appSettings,
  onSaveAppSettings,
  onManualResetSuccess,
  onOpenResetModal,
}) => {
  const isOwner = (currentUser.jabatan || '').trim().toLowerCase() === 'owner';
  const effectiveEmail = currentUser.email || (isOwner ? OWNER_EMAIL : '');
  const isOwnerEmail = effectiveEmail.trim().toLowerCase() === OWNER_EMAIL.toLowerCase();

  // Brand & Logo draft state
  const [draftNamaUsaha, setDraftNamaUsaha] = useState(appSettings.namaUsaha);
  const [draftTagline, setDraftTagline] = useState(appSettings.tagline || '');
  const [draftLogoUrl, setDraftLogoUrl] = useState(appSettings.logoUrl);
  const [draftTarifDelivery1Km, setDraftTarifDelivery1Km] = useState<number>(
    appSettings.tarifDelivery1Km !== undefined ? appSettings.tarifDelivery1Km : 2500
  );
  const [draftTarifDeliveryPer500m, setDraftTarifDeliveryPer500m] = useState<number>(
    appSettings.tarifDeliveryPer500m !== undefined ? appSettings.tarifDeliveryPer500m : 500
  );
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [autoRemoveWhiteBg, setAutoRemoveWhiteBg] = useState<boolean>(true);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSavingDeliveryTarif, setIsSavingDeliveryTarif] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync local draft when realtime appSettings updates from Firestore
  useEffect(() => {
    setDraftNamaUsaha(appSettings.namaUsaha);
    setDraftTagline(appSettings.tagline || '');
    setDraftLogoUrl(appSettings.logoUrl);
    setDraftTarifDelivery1Km(appSettings.tarifDelivery1Km !== undefined ? appSettings.tarifDelivery1Km : 2500);
    setDraftTarifDeliveryPer500m(appSettings.tarifDeliveryPer500m !== undefined ? appSettings.tarifDeliveryPer500m : 500);
  }, [appSettings.namaUsaha, appSettings.tagline, appSettings.logoUrl, appSettings.tarifDelivery1Km, appSettings.tarifDeliveryPer500m]);

  // Reset & notification states
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [toastNotification, setToastNotification] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const showSuccessToast = (title: string, message: string) => {
    setToastNotification({ title, message });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.title === title && prev?.message === message ? null : prev));
    }, 4500);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage(null);
    setSelectedFileName(file.name);
    setIsProcessingLogo(true);
    try {
      const { dataUrl } = await compressLogoImage(file, 320, autoRemoveWhiteBg);
      setDraftLogoUrl(dataUrl);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal membaca file logo. Gunakan format PNG, JPG, WebP, atau SVG.',
      });
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleResetDefaultLogo = () => {
    setDraftLogoUrl(DEFAULT_LOGO_URL);
    setSelectedFileName('logo-telaga-warna.png (Bawaan)');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = draftNamaUsaha.trim();
    if (!cleanName) {
      setStatusMessage({
        type: 'error',
        text: 'Nama Usaha tidak boleh kosong!',
      });
      return;
    }

    setIsSavingBranding(true);
    setStatusMessage(null);
    try {
      const isNameChanged = cleanName.toLowerCase() !== appSettings.namaUsaha.trim().toLowerCase();
      await onSaveAppSettings({
        ...appSettings,
        namaUsaha: cleanName,
        tagline: draftTagline.trim(),
        logoUrl: draftLogoUrl || DEFAULT_LOGO_URL,
      });

      const msg = isNameChanged
        ? `Identitas usaha diperbarui menjadi "${cleanName}". Tampilan Login, Header, Struk, Laporan, dan data master terkait otomatis menyesuaikan.`
        : 'Logo, Nama Usaha, dan Slogan Struk berhasil disimpan & disinkronkan ke seluruh perangkat.';
      setStatusMessage({ type: 'success', text: msg });
      showSuccessToast('Logo & Nama Usaha Disimpan', msg);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal menyimpan pengaturan logo & nama usaha.',
      });
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSaveDeliveryTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    const tarif1Km = Number(draftTarifDelivery1Km);
    const tarifPer500m = Number(draftTarifDeliveryPer500m);

    if (isNaN(tarif1Km) || tarif1Km < 0) {
      setStatusMessage({
        type: 'error',
        text: 'Tarif dasar 1 km harus berupa angka valid (minimal Rp 0)!',
      });
      return;
    }

    if (isNaN(tarifPer500m) || tarifPer500m < 0) {
      setStatusMessage({
        type: 'error',
        text: 'Tarif tambahan per 0.5 km harus berupa angka valid (minimal Rp 0)!',
      });
      return;
    }

    setIsSavingDeliveryTarif(true);
    setStatusMessage(null);
    try {
      await onSaveAppSettings({
        ...appSettings,
        tarifDelivery1Km: tarif1Km,
        tarifDeliveryPer500m: tarifPer500m,
      });

      const msg = `Tarif pengiriman berhasil diperbarui: Dasar 1 km = Rp ${tarif1Km.toLocaleString('id-ID')} & tambahan per 0.5 km = Rp ${tarifPer500m.toLocaleString('id-ID')}. Berlaku otomatis di POS Kasir.`;
      setStatusMessage({ type: 'success', text: msg });
      showSuccessToast('Tarif Ongkir Disimpan', msg);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal menyimpan pengaturan tarif pengiriman.',
      });
    } finally {
      setIsSavingDeliveryTarif(false);
    }
  };

  const handleSelectThemeColor = async (temaWarna: ThemeColorId) => {
    const preset = getThemePreset(temaWarna);
    try {
      await onSaveAppSettings({
        ...appSettings,
        temaWarna,
      });
      showSuccessToast('Tema Warna Diperbarui', `Tema "${preset.nama}" aktif di seluruh tampilan.`);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal menyimpan pilihan warna tema.',
      });
    }
  };

  const handleSelectThemeMode = async (modeTampilan: ThemeMode) => {
    try {
      await onSaveAppSettings({
        ...appSettings,
        modeTampilan,
      });
      showSuccessToast(
        'Mode Tampilan Diubah',
        modeTampilan === 'dark' ? 'Mode Gelap (Dark Mode) diaktifkan.' : 'Mode Terang (Light Mode) diaktifkan.'
      );
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Gagal mengubah mode tampilan.',
      });
    }
  };

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

  const activePreset = getThemePreset(appSettings.temaWarna);
  const previewBrandName = draftNamaUsaha.trim() || appSettings.namaUsaha || DEFAULT_BUSINESS_NAME;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-2 bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md">
                <Settings className="w-4 h-4" />
                <span>PENGATURAN APLIKASI &amp; SISTEM</span>
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-wide text-white">
              Identitas Usaha, Tema & Pengaturan Sistem
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Kelola Logo usaha, Nama Usaha <strong>{appSettings.namaUsaha}</strong>, pilihan Tema Tampilan, serta
              sinkronisasi Cloud Firestore. Perubahan logo, nama usaha, dan tema langsung berlaku di layar Login,
              Header, Struk Kasir, Tiket Dapur, Laporan, dan seluruh modul.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg cursor-pointer text-slate-500 dark:text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: EDIT LOGO & NAMA USAHA */}
      <form
        onSubmit={handleSaveBranding}
        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span>Edit Logo &amp; Nama Usaha</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unggah file logo usaha baru &amp; ubah nama usaha untuk memperbarui tampilan Login, Header, Dashboard Watermark, dan Struk cetak.
            </p>
          </div>
          <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300 self-start sm:self-auto">
            Sinkron ke Semua Halaman &amp; Data
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Logo Column */}
          <div className="lg:col-span-5 space-y-4">
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">
              Logo Usaha Saat Ini (Transparan Tanpa Kotak Putih)
            </label>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="w-24 h-24 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-2 flex items-center justify-center shrink-0 overflow-hidden bg-slate-100/60 dark:bg-slate-900/50">
                <img
                  src={draftLogoUrl || DEFAULT_LOGO_URL}
                  alt={`Logo ${previewBrandName}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
                />
              </div>

              <div className="space-y-1.5 text-xs min-w-0 flex-1">
                <div className="font-black text-slate-800 dark:text-slate-100 truncate">
                  {previewBrandName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedFileName
                    ? `File dipilih: ${selectedFileName}`
                    : draftLogoUrl === DEFAULT_LOGO_URL
                    ? 'Menggunakan logo default bawaan'
                    : 'Logo kustom aktif'}
                </div>
                {draftLogoUrl !== DEFAULT_LOGO_URL && (
                  <button
                    type="button"
                    onClick={handleResetDefaultLogo}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Logo Bawaan</span>
                  </button>
                )}
              </div>
            </div>

            {/* File Picker Field */}
            <div className="space-y-2">
              <label
                htmlFor="logo-file-upload"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>Pilih File Gambar Logo (PNG, JPG, WebP, SVG)</span>
              </label>

              <input
                ref={fileInputRef}
                id="logo-file-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoFileChange}
                disabled={isProcessingLogo || isSavingBranding}
                className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-orange-400 dark:hover:border-orange-500 rounded-2xl p-2 transition"
              />

              <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={autoRemoveWhiteBg}
                  onChange={(e) => setAutoRemoveWhiteBg(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Otomatis hapus background putih polos agar logo transparan</span>
              </label>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isProcessingLogo
                  ? 'Memproses dan menghapus latar belakang putih logo...'
                  : 'Gambar otomatis dioptimalkan menjadi transparan (tanpa kotak putih) untuk Login, Header, Dashboard Watermark & Struk.'}
              </p>
            </div>
          </div>

          {/* Business Name & Live Preview Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                  Nama Usaha <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={draftNamaUsaha}
                  onChange={(e) => setDraftNamaUsaha(e.target.value)}
                  placeholder="Contoh: TELAGA WARNA"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-200 mb-1.5">
                  Tagline / Slogan Struk (Opsional)
                </label>
                <input
                  type="text"
                  value={draftTagline}
                  onChange={(e) => setDraftTagline(e.target.value)}
                  placeholder="Contoh: Pedas Gurih Bikin Nagih"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Efek Otomatis:</strong> Apabila <strong>Nama Usaha</strong> diubah lalu disimpan, seluruh teks nama
              usaha di halaman <strong>Login</strong>, <strong>Header Atas</strong>, <strong>Struk Thermal &amp; Bluetooth</strong>,{' '}
              <strong>Tiket Dapur</strong>, <strong>Laporan</strong>, <strong>Slip Gaji</strong>, serta data cabang/katalog yang
              memuat nama usaha lama otomatis ikut berubah.
            </div>

            {/* Live Mini Preview Header + Struk */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pratinjau Tampilan Header &amp; Kop Struk
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Preview Header Bar */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <div className="brand-gradient px-3 py-2.5 text-white flex items-center gap-2">
                    <span className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={draftLogoUrl || DEFAULT_LOGO_URL}
                        alt="Preview Header"
                        className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black tracking-wide truncate">
                        MY KASIR POS {previewBrandName.toUpperCase()}
                      </div>
                      <div className="text-[9px] text-white/80 truncate">
                        {draftTagline.trim() || 'Multi-Cabang POS'}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">
                    Pratinjau Banner Header &amp; Login
                  </div>
                </div>

                {/* Preview Kop Struk */}
                <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white text-black p-3 font-mono text-center space-y-0.5">
                  <div className="w-7 h-7 mx-auto mb-1 overflow-hidden">
                    <img
                      src={draftLogoUrl || DEFAULT_LOGO_URL}
                      alt="Preview Struk"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="font-black text-xs tracking-wider uppercase truncate">
                    {previewBrandName}
                  </div>
                  {draftTagline.trim() && (
                    <div className="text-[9px] text-slate-600 italic truncate">{draftTagline.trim()}</div>
                  )}
                  <div className="text-[9px] text-slate-400 border-t border-dashed border-slate-300 pt-1 mt-1">
                    Pratinjau Header Struk Kasir
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Klik tombol simpan untuk menerapkan perubahan logo &amp; nama usaha ke seluruh perangkat secara realtime.
          </div>
          <button
            type="submit"
            disabled={isSavingBranding || isProcessingLogo}
            className="w-full sm:w-auto px-6 py-3 brand-gradient hover:opacity-95 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-xs"
          >
            {isSavingBranding ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Logo &amp; Nama Usaha</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* SECTION 2: TEMA TAMPILAN APLIKASI */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Palette className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span>Pengaturan Tema Tampilan</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih Mode Terang / Gelap serta palet warna utama aplikasi sesuai kenyamanan kasir dan pengelola.
            </p>
          </div>
          <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 self-start sm:self-auto flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{
                backgroundImage: `linear-gradient(135deg, ${activePreset.swatchHex[0]}, ${activePreset.swatchHex[1]})`,
              }}
            />
            <span>Tema Aktif: {activePreset.nama}</span>
          </div>
        </div>

        {/* Mode Tampilan Light / Dark */}
        <div className="space-y-3">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
            1. Mode Layar Aplikasi
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelectThemeMode('light')}
              className={`p-4 rounded-2xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                appSettings.modeTampilan === 'light'
                  ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/40'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900 dark:text-slate-100">
                    Mode Terang (Light Mode)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Latar cerah kontras tinggi, nyaman untuk area outlet siang hari
                  </div>
                </div>
              </div>
              {appSettings.modeTampilan === 'light' && (
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectThemeMode('dark')}
              className={`p-4 rounded-2xl border-2 text-left flex items-center justify-between transition cursor-pointer ${
                appSettings.modeTampilan === 'dark'
                  ? 'border-orange-500 bg-slate-800 text-white'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-sky-400 border border-slate-700 flex items-center justify-center shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-xs text-slate-900 dark:text-slate-100">
                    Mode Gelap (Dark Mode)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Latar gelap hemat mata saat kasir operasional malam hari
                  </div>
                </div>
              </div>
              {appSettings.modeTampilan === 'dark' && (
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Warna Tema */}
        <div className="space-y-3">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
            2. Warna Aksen &amp; Identitas Brand
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {THEME_COLOR_PRESETS.map((preset) => {
              const isSelected = appSettings.temaWarna === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectThemeColor(preset.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/60 dark:bg-slate-800 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-xl shrink-0 shadow-inner border border-white/40"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${preset.swatchHex[0]}, ${preset.swatchHex[1]})`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                        {preset.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {preset.deskripsi}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3: PENGATURAN TARIF JARAK PENGIRIMAN (DELIVERY ORDER) */}
      <form
        onSubmit={handleSaveDeliveryTarif}
        className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span>Pengaturan Tarif Jarak Pengiriman (Delivery Order)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Atur tarif dasar pengiriman 1 km dan kelipatan penambahan biaya otomatis per 0,5 km untuk seluruh cabang.
            </p>
          </div>
          <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300 self-start sm:self-auto bg-orange-50 dark:bg-orange-950/60 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
            Kalkulator Otomatis Kasir POS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          {/* Tarif Dasar 1 KM */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block font-extrabold text-slate-800 dark:text-slate-100">
              Tarif Dasar Pengiriman Jarak 1 KM (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={draftTarifDelivery1Km}
                onChange={(e) => setDraftTarifDelivery1Km(Number(e.target.value) || 0)}
                placeholder="2500 atau 3000"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-sm font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Biaya pengiriman dasar untuk jarak s/d 1 km (Contoh: <strong>Rp 2.500</strong> diubah menjadi <strong>Rp 3.000</strong>).
            </p>
          </div>

          {/* Tambahan per 0.5 KM */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block font-extrabold text-slate-800 dark:text-slate-100">
              Biaya Tambahan Per Setiap 0,5 KM (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={draftTarifDeliveryPer500m}
                onChange={(e) => setDraftTarifDeliveryPer500m(Number(e.target.value) || 0)}
                placeholder="500"
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono text-sm font-black text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Penambahan ongkir otomatis setiap kelipatan 0,5 km seterusnya (Contoh: <strong>+Rp 500</strong> per 500 meter).
            </p>
          </div>
        </div>

        {/* Live Simulation Preview Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
          <div className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>Simulasi Kalkulasi Ongkir Otomatis Sesuai Tarif yang Diatur:</span>
            <span className="text-[10px] text-slate-400 font-normal">Otomatis sinkron ke menu POS Kasir</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs tabular-nums">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 font-semibold">≤ 200 meter</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">GRATIS</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 font-semibold">200m - 500m</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Rp {Math.max(0, draftTarifDelivery1Km - draftTarifDeliveryPer500m).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-700 ring-1 ring-orange-400/40">
              <span className="block text-[10px] text-orange-700 dark:text-orange-300 font-bold">1 KM (Dasar)</span>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                Rp {draftTarifDelivery1Km.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 font-semibold">1,5 KM</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Rp {(draftTarifDelivery1Km + draftTarifDeliveryPer500m).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 font-semibold">2 KM</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Rp {(draftTarifDelivery1Km + draftTarifDeliveryPer500m * 2).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 font-semibold">2,5 KM</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Rp {(draftTarifDelivery1Km + draftTarifDeliveryPer500m * 3).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="block text-[10px] text-slate-400 font-semibold">3 KM</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                Rp {(draftTarifDelivery1Km + draftTarifDeliveryPer500m * 4).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Perubahan tarif pengiriman akan langsung tersimpan di Cloud Firestore dan otomatis diterapkan pada menu POS Kasir Delivery Order.
          </div>
          <button
            type="submit"
            disabled={isSavingDeliveryTarif}
            className="w-full sm:w-auto px-6 py-3 brand-gradient hover:opacity-95 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-xs"
          >
            {isSavingDeliveryTarif ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Tarif Jarak Pengiriman</span>
              </>
            )}
          </button>
        </div>
      </form>


      {/* Grid: Database Status & Persistence Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Status Database</span>
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-slate-100">
            <span>Cloud Firestore Terhubung</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Terhubung &amp; sinkron realtime ke semua HP kasir &amp; admin.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Cabang Aktif</span>
            <Store className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {dataCabangList.length}{' '}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cabang</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Data master cabang disimpan permanen di Firestore.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Katalog Menu {appSettings.namaUsaha}</span>
            <UtensilsCrossed className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {katalogList.length}{' '}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Item Menu</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {bahanBakuList.length} master bahan baku terdaftar di DC.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
            <Receipt className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {transaksiList.length}{' '}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Transaksi</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Riwayat tersimpan aman di Firestore, anti-hilang saat refresh.
          </p>
        </div>
      </div>

      {/* Persistence Policy Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Kebijakan Persistensi Data (Anti Timpa &amp; Anti Auto-Reset)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">1. Tidak Ada Auto-Seed</span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Aplikasi tidak lagi memanggil auto-seeding pada{' '}
              <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">useEffect</code> awal saat
              web dibuka atau di-publish.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">2. Single Source of Truth</span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Data yang Anda input di kasir, cabang, atau DC langsung tersimpan ke Cloud Firestore dan di-cache aman di
              browser.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">3. Reset Demo Manual Saja</span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Data demo hanya bisa dimuat jika Anda menekan tombol merah{' '}
              <span className="font-bold text-red-600 dark:text-red-400">&quot;Reset Data Demo&quot;</span> secara
              sengaja di halaman ini.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Manual Demo Reset */}
      <div className="bg-red-50/60 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900/80 rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 rounded-2xl shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-red-950 dark:text-red-100">
              Zona Bahaya: Reset Data Demo Manual
            </h3>
            <p className="text-xs text-red-800 dark:text-red-200/90 leading-relaxed max-w-3xl">
              Gunakan fitur ini <strong>HANYA</strong> jika Anda ingin mengembalikan seluruh database ke kondisi contoh
              awal demo {appSettings.namaUsaha} (cabang operasional, katalog menu, resep, data karyawan, dan contoh
              transaksi). Semua data transaksi dan perubahan baru yang dibuat saat ini akan ditimpa dengan data demo.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-red-200 dark:border-red-900/60">
          <div className="text-[11px] text-red-700 dark:text-red-300 font-semibold space-y-0.5">
            <div>
              Keamanan: Hanya akun dengan email <strong>{OWNER_EMAIL}</strong> yang dapat mereset data demo.
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-normal">
              Email aktif saat ini:{' '}
              <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">
                {effectiveEmail || 'Tidak terdeteksi'}
              </code>
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
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none'
                }`}
                title={isOwnerEmail ? 'Pilih koleksi data trial yang ingin dihapus total' : `Terkunci: Email harus ${OWNER_EMAIL}`}
              >
                <Trash2 className="w-4 h-4 text-rose-300 stroke-[2.5]" />
                <span>RESET TOTAL - HAPUS SEMUA DATA TRIAL</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenResetModal}
              disabled={isResetting || !isOwnerEmail}
              className={`px-4 py-2.5 font-bold rounded-2xl text-xs flex items-center gap-2 border transition cursor-pointer active:scale-95 ${
                isOwnerEmail
                  ? 'bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
              }`}
              title={`Isi ulang data contoh demo awal ${appSettings.namaUsaha}`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Muat Ulang Data Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Ganda Reset Demo */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-slate-100">Konfirmasi Reset Data Demo</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Security Check: Owner Email Verification</p>
              </div>
            </div>

            {/* Email Check Banner */}
            <div
              className={`p-3 rounded-2xl border text-xs ${
                isOwnerEmail
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {isOwnerEmail ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <span>Email Otorisasi: {OWNER_EMAIL}</span>
              </div>
              <div className="mt-1 text-[11px] opacity-85">
                Status Akun:{' '}
                {isOwnerEmail ? 'Terverifikasi sebagai Owner yang sah.' : `Ditolak (Email saat ini: ${effectiveEmail || 'Kosong'})`}
              </div>
            </div>

            {modalError && (
              <div className="p-2.5 bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p>
                Seluruh dokumen demo yang dibuat akan ditandai dengan metadata{' '}
                <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">isDemo: true</code>.
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Sesuai Firestore Rules, hanya Owner ({OWNER_EMAIL}) yang memiliki izin menghapus data bertanda demo
                tersebut.
              </p>
              <p className="font-bold text-red-600 dark:text-red-400 pt-1">
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
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 focus:border-red-500 rounded-xl font-mono text-center font-black tracking-widest text-slate-900 dark:text-slate-100 text-sm focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isResetting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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

      {/* Floating Success Toast */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-500 flex items-start gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 flex-1">
            <div className="font-extrabold text-white">{toastNotification.title}</div>
            <div className="text-slate-300">{toastNotification.message}</div>
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
