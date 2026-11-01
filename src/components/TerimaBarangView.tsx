import React from 'react';
import {
  Inbox,
  CheckCircle,
  AlertCircle,
  Truck,
  Package,
  Calendar,
  Clock,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Karyawan, SuratJalan, StokCabangMap, Cabang } from '../types';
import { formatRupiah } from '../utils/storage';

interface TerimaBarangViewProps {
  currentUser: Karyawan;
  suratJalanList: SuratJalan[];
  stokCabang: StokCabangMap;
  onUpdateStokCabang: (newStok: StokCabangMap) => void;
  onConfirmTerimaSuratJalan?: (
    sjId: string,
    penerimaNama: string,
    verifiedItems: any[],
    catatan?: string
  ) => void;
}

export const TerimaBarangView: React.FC<TerimaBarangViewProps> = ({
  currentUser,
  suratJalanList,
}) => {
  const currentCabang = currentUser.cabang as Exclude<Cabang, 'DC PUSAT'>;

  // Filter incoming shipments currently in transit or waiting signature for this branch
  const activeIncomingList = suratJalanList.filter(
    (sj) =>
      sj.cabangTujuan === currentUser.cabang &&
      (sj.status === 'Dikirim' || sj.status === 'Terkirim')
  );

  const historyList = suratJalanList.filter(
    (sj) =>
      sj.cabangTujuan === currentUser.cabang &&
      (sj.status === 'Diterima' || sj.status === 'Selesai')
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Penerimaan Pengiriman Barang Cabang ({currentUser.cabang})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Status pengiriman bahan baku dari DC Pusat. Sesuai sistem baru, <strong>tombol Diterima ditekan oleh Driver</strong> setelah lembar Surat Jalan fisik ditandatangani oleh cabang.
          </p>
        </div>

        {activeIncomingList.length > 0 && (
          <div className="bg-amber-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-xs">
            <Truck className="w-4 h-4 animate-bounce" />
            <span>{activeIncomingList.length} Pengiriman Aktif Menuju Cabang</span>
          </div>
        )}
      </div>

      {/* Info Callout: SOP Cabang */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-blue-950">
            SOP Penerimaan Barang di Cabang:
          </span>
          <p className="text-[11px] text-blue-800">
            1. Periksa kesesuaian fisik bahan baku yang diantar oleh Driver dengan daftar rincian barang.
            <br />
            2. Tanda tangani lembar fisik Surat Jalan yang dibawa Driver.
            <br />
            3. Driver akan mengklik <strong>"Konfirmasi Diterima"</strong> di aplikasinya, dan status di cabang akan otomatis berubah menjadi <strong>Diterima</strong> serta stok cabang otomatis bertambah.
          </p>
        </div>
      </div>

      {/* Active Deliveries Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-600" />
          <span>Pengiriman Sedang Berjalan / Menunggu Tanda Tangan</span>
        </h3>

        {activeIncomingList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            <p className="font-semibold text-slate-600">
              Tidak ada pengiriman yang sedang menuju {currentUser.cabang}.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Semua pengiriman sebelumnya telah selesai diterima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeIncomingList.map((sj) => {
              const isTerkirim = sj.status === 'Terkirim';

              return (
                <div
                  key={sj.id}
                  className={`bg-white rounded-2xl border-2 p-5 shadow-sm space-y-3.5 transition ${
                    isTerkirim ? 'border-amber-400 bg-amber-50/20' : 'border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isTerkirim
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {isTerkirim
                          ? 'Terkirim - Silakan Tanda Tangani Surat Jalan'
                          : 'Dalam Perjalanan Driver'}
                      </span>
                      <h4 className="font-black text-slate-800 text-base mt-1.5 font-mono">
                        {sj.noSuratJalan}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Driver: <strong className="text-slate-800">{sj.driver}</strong> • Tgl Kirim: {sj.tanggal} ({sj.jam})
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block text-[11px]">
                      Daftar Bahan Baku yang Dibawa Driver:
                    </span>
                    <div className="space-y-1">
                      {sj.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-slate-700 font-semibold"
                        >
                          <span>{it.namaBahan}</span>
                          <span className="font-black text-orange-700">
                            {it.qtyKirim} {it.satuan}
                          </span>
                        </div>
                      ))}
                    </div>

                    {(sj.biayaSolar > 0 || sj.setoran > 0) && (
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-600 font-medium">
                        {sj.biayaSolar > 0 && <span>Solar: {formatRupiah(sj.biayaSolar)}</span>}
                        {sj.setoran > 0 && <span>Titipan Setoran: {formatRupiah(sj.setoran)}</span>}
                      </div>
                    )}
                  </div>

                  {/* Status Banner instead of action button */}
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      isTerkirim
                        ? 'bg-amber-100/70 border-amber-300 text-amber-900'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] leading-relaxed">
                      {isTerkirim
                        ? 'Driver sudah tiba di cabang. Mohon periksa fisik barang dan tanda tangani surat jalan fisik. Driver yang akan mengklik Diterima pada aplikasinya.'
                        : 'Barang sedang dibawa driver dari DC Pusat menuju lokasi cabang.'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History of Received Deliveries */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Riwayat Barang Diterima ({historyList.length})</span>
        </h3>

        {historyList.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            Belum ada arsip penerimaan barang selesai di cabang ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">No. Surat Jalan</th>
                  <th className="py-2.5 px-3">Tanggal Terima</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3">Disahkan Oleh</th>
                  <th className="py-2.5 px-3">Jumlah Item</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.slice().reverse().map((sj) => (
                  <tr key={sj.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-800">
                      {sj.noSuratJalan}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {sj.tanggalTerima || sj.tanggal} {sj.jamTerima ? `(${sj.jamTerima})` : ''}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {sj.driver}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {sj.penerimaNama || 'Kasir Cabang'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-orange-600">
                      {sj.items.reduce((s, it) => s + (it.qtyTerima || it.qtyKirim), 0)} unit
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Diterima & Selesai
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
