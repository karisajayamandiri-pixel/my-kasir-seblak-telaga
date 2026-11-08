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
import { Karyawan, SuratJalan, StokCabangMap, Cabang, DataCabang } from '../types';
import { formatRupiah, getTodayStr, getNowShortTime } from '../utils/storage';
import { getStoreBranchNames } from '../utils/branchHelper';

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
}

export const PengirimanDriverView: React.FC<PengirimanDriverViewProps> = ({
  currentUser,
  suratJalanList,
  stokCabang,
  onUpdateStokCabang,
  onUpdateSuratJalanStatus,
  onOpenPrintModal,
  dataCabangList = [],
}) => {
  const destinationBranches = getStoreBranchNames(dataCabangList);

  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterCabang, setFilterCabang] = useState<string>('Semua');

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
            <Truck className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Pengiriman Barang & Surat Jalan (Driver)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Driver bertugas: <strong>{currentUser.nama}</strong>. Tombol "Diterima" dipindahkan ke aplikasi Driver. Cabang hanya bertugas menandatangani surat jalan fisik.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 shadow-xs"
          >
            <option value="Semua">Semua Status</option>
            <option value="Dalam Perjalanan">Dalam Perjalanan (Dikirim)</option>
            <option value="Terkirim">Terkirim (Menunggu Ttd)</option>
            <option value="Diterima">Selesai / Diterima</option>
          </select>

          <select
            value={filterCabang}
            onChange={(e) => setFilterCabang(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 shadow-xs"
          >
            <option value="Semua">Semua Cabang Tujuan</option>
            {destinationBranches.map((cName) => (
              <option key={cName} value={cName}>
                Cabang {cName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Instructions Card */}
      <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-black text-sm block text-amber-900">
            SOP Serah Terima Barang untuk Driver TELAGA WARNA:
          </span>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-amber-800">
            <li>Saat tiba di cabang tujuan, tekan tombol <strong>"Tandai Terkirim"</strong>.</li>
            <li>Serahkan barang dan minta Kepala Toko / Kasir cabang memeriksa fisik barang dan <strong>menandatangani surat jalan fisik</strong>.</li>
            <li>Setelah ditandatangani, Driver <strong>WAJIB menekan tombol "Konfirmasi Diterima"</strong> agar status di cabang otomatis berubah menjadi Diterima dan stok cabang bertambah.</li>
          </ol>
        </div>
      </div>

      {/* Deliveries Grid */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-600">Tidak ada pengiriman barang untuk filter ini.</p>
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
                className={`bg-white rounded-3xl border-2 p-5 shadow-sm space-y-4 transition ${
                  isCompleted
                    ? 'border-emerald-200'
                    : isTerkirim
                    ? 'border-amber-400 bg-amber-50/20'
                    : 'border-orange-300'
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isTerkirim
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {isCompleted
                          ? 'Diterima / Selesai'
                          : isTerkirim
                          ? 'Terkirim - Siap Ttd Cabang'
                          : 'Dalam Perjalanan (Dikirim)'}
                      </span>
                      <span className="text-xs font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                        Ke: {sj.cabangTujuan}
                      </span>
                    </div>
                    <h3 className="font-black text-slate-800 text-base mt-1.5 font-mono">
                      {sj.noSuratJalan}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tgl Kirim: {sj.tanggal} {sj.jam} • Driver: <strong className="text-slate-700">{sj.driver}</strong>
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 border-b pb-1">
                    <span>Bahan Baku yang Dikirim:</span>
                    <span>{sj.items.length} Macam Bahan</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {sj.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-slate-800 font-semibold"
                      >
                        <span>{it.namaBahan}</span>
                        <span className="font-black text-orange-700">
                          {it.qtyKirim} {it.satuan}
                        </span>
                      </div>
                    ))}
                  </div>

                  {(sj.biayaSolar > 0 || sj.setoran > 0) && (
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] font-semibold text-slate-600">
                      {sj.biayaSolar > 0 && <span>Biaya Solar: {formatRupiah(sj.biayaSolar)}</span>}
                      {sj.setoran > 0 && <span>Titipan Setoran: {formatRupiah(sj.setoran)}</span>}
                    </div>
                  )}
                </div>

                {/* Delivery Completion Details if Diterima */}
                {isCompleted && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1 text-emerald-950">
                    <div className="flex items-center gap-1 font-bold text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Barang Telah Diterima & Disahkan</span>
                    </div>
                    <div className="text-[11px] text-emerald-900">
                      Penerima: <strong>{sj.penerimaNama || 'Kasir Cabang'}</strong>
                    </div>
                    <div className="text-[10px] text-emerald-700">
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
                        <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-[11px] text-amber-900 font-medium">
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
