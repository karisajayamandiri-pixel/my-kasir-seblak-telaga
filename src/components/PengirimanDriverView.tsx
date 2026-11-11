import React, { useState } from 'react';
import {
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  FileText,
  Calendar,
  Check,
  AlertCircle,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Karyawan, SuratJalan, StokCabangMap, Cabang, DataCabang, AppSettings } from '../types';
import { formatRupiah, getTodayStr, getNowShortTime } from '../utils/storage';
import { getStoreBranchNames } from '../utils/branchHelper';
import { DEFAULT_BUSINESS_NAME } from '../utils/theme';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface PengirimanDriverViewProps {
  currentUser: Karyawan;
  suratJalanList: SuratJalan[];
  stokCabang: StokCabangMap;
  onUpdateStokCabang: (newStok: StokCabangMap) => void;
  onUpdateSuratJalanStatus: (
    sjId: string,
    status: 'Dikirim' | 'Terkirim' | 'Diterima' | 'Selesai',
    meta?: {
      penerimaNama?: string;
      tanggalTerima?: string;
      jamTerima?: string;
      catatanPenerima?: string;
    }
  ) => void;
  onOpenPrintModal?: (type: 'suratJalan', data: SuratJalan) => void;
  dataCabangList?: DataCabang[];
  appSettings?: AppSettings;
}

export const PengirimanDriverView: React.FC<PengirimanDriverViewProps> = ({
  currentUser,
  suratJalanList,
  stokCabang,
  onUpdateStokCabang,
  onUpdateSuratJalanStatus,
  onOpenPrintModal,
  dataCabangList = [],
  appSettings,
}) => {
  const brandName = appSettings?.namaUsaha || DEFAULT_BUSINESS_NAME;
  const destinationBranches = getStoreBranchNames(dataCabangList);

  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterCabang, setFilterCabang] = useState<string>('Semua');
  const [showPickerStatus, setShowPickerStatus] = useState(false);
  const [showPickerCabang, setShowPickerCabang] = useState(false);

  // Filter deliveries
  const filteredList = suratJalanList.filter((sj) => {
    const matchCabang = filterCabang === 'Semua' || sj.cabangTujuan === filterCabang;
    let matchStatus = true;
    if (filterStatus === 'Dalam Perjalanan') {
      matchStatus = sj.status === 'Dikirim';
    } else if (filterStatus === 'Terkirim') {
      matchStatus = sj.status === 'Terkirim';
    } else if (filterStatus === 'Diterima') {
      matchStatus = sj.status === 'Diterima' || sj.status === 'Selesai';
    }
    return matchCabang && matchStatus;
  });

  // Action 1: Driver marks as Terkirim (Arrived at destination)
  const handleMarkTerkirim = (sj: SuratJalan) => {
    const confirmAction = confirm(
      `Tandai pengiriman ${sj.noSuratJalan} ke ${sj.cabangTujuan} sudah sampai di lokasi tujuan (Terkirim)?`
    );
    if (!confirmAction) return;

    onUpdateSuratJalanStatus(sj.id, 'Terkirim');
  };

  // Action 2: Driver marks as Diterima (after branch physical signature)
  const handleConfirmDiterima = (sj: SuratJalan) => {
    const confirmSign = confirm(
      `PENTING:\nApakah Kepala Toko / Kasir ${sj.cabangTujuan} SUDAH memeriksa barang fisik dan MENANDATANGANI lembar Surat Jalan fisik?\n\nKlik OK untuk menyelesaikan pengiriman dan menambah stok bahan baku cabang secara otomatis.`
    );
    if (!confirmSign) return;

    const penerimaNamaInput = prompt(
      `Masukkan nama petugas cabang ${sj.cabangTujuan} yang menandatangani Surat Jalan:`,
      'Kasir Bertugas'
    );
    if (penerimaNamaInput === null) return;

    const today = getTodayStr();
    const timeNow = getNowShortTime();

    // 1. Automatically update branch stock
    const targetCabang = sj.cabangTujuan as Exclude<Cabang, 'DC PUSAT'>;
    const currentBranchStock = { ...(stokCabang[targetCabang] || {}) };
    sj.items.forEach((it) => {
      const currentVal = currentBranchStock[it.bahanId] || 0;
      currentBranchStock[it.bahanId] = currentVal + it.qtyKirim;
    });

    const newStokMap: StokCabangMap = {
      ...stokCabang,
      [targetCabang]: currentBranchStock,
    };
    onUpdateStokCabang(newStokMap);

    // 2. Update Surat Jalan status to 'Diterima' (Selesai)
    onUpdateSuratJalanStatus(sj.id, 'Diterima', {
      penerimaNama: (penerimaNamaInput || 'Petugas Cabang').trim() + ' (Ttd Surat Jalan)',
      tanggalTerima: today,
      jamTerima: timeNow,
      catatanPenerima: 'Surat jalan fisik telah ditandatangani dan diverifikasi Driver.',
    });

    alert(
      `Pengiriman ${sj.noSuratJalan} berhasil diselesaikan (Status: Diterima)! Stok bahan baku cabang ${sj.cabangTujuan} telah otomatis bertambah.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Pengiriman Barang & Surat Jalan (Driver)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Driver bertugas: <strong className="text-slate-800 dark:text-slate-200">{currentUser.nama}</strong>. Tombol "Diterima" dipindahkan ke aplikasi Driver. Cabang hanya bertugas menandatangani surat jalan fisik.
          </p>
        </div>

        {/* Filters */}
        {/* Filters via BottomSheetPicker */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="w-auto">
            <BottomSheetPickerTrigger
              valueTitle={filterStatus === 'Semua' ? 'Semua Status' : filterStatus}
              onClick={() => setShowPickerStatus(true)}
              size="sm"
              icon={<Truck size={14} />}
              className="min-w-[130px]"
            />
            <BottomSheetPicker
              isOpen={showPickerStatus}
              onClose={() => setShowPickerStatus(false)}
              title="Pilih Status Pengiriman"
              selectedId={filterStatus}
              onSelect={(opt) => setFilterStatus(String(opt.id))}
              options={[
                { id: 'Semua', title: 'Semua Status', subtitle: 'Tampilkan semua status logistik' },
                { id: 'Dalam Perjalanan', title: 'Dalam Perjalanan', subtitle: 'Barang sedang dibawa armada Driver', badge: 'Dikirim' },
                { id: 'Terkirim', title: 'Terkirim', subtitle: 'Tiba di cabang tujuan, menunggu tanda tangan', badge: 'Menunggu Ttd' },
                { id: 'Diterima', title: 'Selesai / Diterima', subtitle: 'Surat jalan tuntas & stok cabang masuk', badge: 'Selesai' },
              ]}
            />
          </div>

          <div className="w-auto">
            <BottomSheetPickerTrigger
              valueTitle={filterCabang === 'Semua' ? 'Semua Cabang' : filterCabang}
              onClick={() => setShowPickerCabang(true)}
              size="sm"
              icon={<MapPin size={14} />}
              className="min-w-[140px]"
            />
            <BottomSheetPicker
              isOpen={showPickerCabang}
              onClose={() => setShowPickerCabang(false)}
              title="Pilih Cabang Tujuan"
              selectedId={filterCabang}
              onSelect={(opt) => setFilterCabang(String(opt.id))}
              options={[
                { id: 'Semua', title: 'Semua Cabang Tujuan', subtitle: 'Tampilkan semua destinasi cabang', badge: 'Semua' },
                ...destinationBranches.map((cName) => ({
                  id: cName,
                  title: `Cabang ${cName}`,
                  subtitle: 'Destinasi Pengantaran DC',
                })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Driver Instructions Card */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-black text-sm block text-amber-900 dark:text-amber-200">
            SOP Serah Terima Barang untuk Driver {brandName}:
          </span>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
            <li>Saat tiba di cabang tujuan, tekan tombol <strong>"Tandai Terkirim"</strong>.</li>
            <li>Serahkan barang dan minta Kepala Toko / Kasir cabang memeriksa fisik barang dan <strong>menandatangani surat jalan fisik</strong>.</li>
            <li>Setelah ditandatangani, Driver <strong>WAJIB menekan tombol "Konfirmasi Diterima"</strong> agar status di cabang otomatis berubah menjadi Diterima dan stok cabang bertambah.</li>
          </ol>
        </div>
      </div>

      {/* Deliveries Grid */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
          <Truck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-slate-600 dark:text-slate-300">Tidak ada pengiriman barang untuk filter ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.slice().reverse().map((sj) => {
            const isCompleted = sj.status === 'Diterima' || sj.status === 'Selesai';
            const isTerkirim = sj.status === 'Terkirim';
            const isDikirim = sj.status === 'Dikirim';

            return (
              <div
                key={sj.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border-2 p-5 shadow-sm space-y-4 transition ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-800/60'
                    : isTerkirim
                    ? 'border-amber-400 dark:border-amber-600/70 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-orange-300 dark:border-orange-700/70'
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 border-b dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                            : isTerkirim
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 animate-pulse'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60'
                        }`}
                      >
                        {isCompleted
                          ? 'Diterima / Selesai'
                          : isTerkirim
                          ? 'Terkirim - Siap Ttd Cabang'
                          : 'Dalam Perjalanan (Dikirim)'}
                      </span>
                      <span className="text-xs font-black text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-md">
                        Ke: {sj.cabangTujuan}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-base mt-1.5 font-mono">
                      {sj.noSuratJalan}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tgl Kirim: {sj.tanggal} {sj.jam} • Driver: <strong className="text-slate-700 dark:text-slate-200">{sj.driver}</strong>
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b dark:border-slate-700 pb-1">
                    <span>Bahan Baku yang Dikirim:</span>
                    <span>{sj.items.length} Macam Bahan</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {sj.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-slate-800 dark:text-slate-100 font-semibold"
                      >
                        <span>{it.namaBahan}</span>
                        <span className="font-black text-orange-700 dark:text-orange-400">
                          {it.qtyKirim} {it.satuan}
                        </span>
                      </div>
                    ))}
                  </div>

                  {(sj.biayaSolar > 0 || sj.setoran > 0) && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      {sj.biayaSolar > 0 && <span>Biaya Solar: {formatRupiah(sj.biayaSolar)}</span>}
                      {sj.setoran > 0 && <span>Titipan Setoran: {formatRupiah(sj.setoran)}</span>}
                    </div>
                  )}
                </div>

                {/* Delivery Completion Details if Diterima */}
                {isCompleted && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1 text-emerald-950 dark:text-emerald-200">
                    <div className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Barang Telah Diterima & Disahkan</span>
                    </div>
                    <div className="text-[11px] text-emerald-900 dark:text-emerald-200">
                      Penerima: <strong>{sj.penerimaNama || 'Kasir Cabang'}</strong>
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Waktu Terima: {sj.tanggalTerima} {sj.jamTerima}
                    </div>
                  </div>
                )}

                {/* DRIVER ACTION BUTTONS */}
                {!isCompleted && (
                  <div className="space-y-2 pt-1">
                    {/* Step 1: Tandai Terkirim */}
                    {isDikirim && (
                      <button
                        type="button"
                        onClick={() => handleMarkTerkirim(sj)}
                        className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Tandai Terkirim (Sampai di Lokasi Cabang)</span>
                      </button>
                    )}

                    {/* Step 2: Konfirmasi Diterima (Driver Wajib Klik setelah cabang tanda tangan) */}
                    {isTerkirim && (
                      <div className="space-y-2">
                        <div className="p-2.5 bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                          ✍️ Minta pihak cabang {sj.cabangTujuan} untuk memeriksa fisik barang & menandatangani lembar Surat Jalan fisik.
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConfirmDiterima(sj)}
                          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-95 animate-pulse"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Cabang Sudah Tanda Tangan: KLIK KONFIRMASI DITERIMA</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
