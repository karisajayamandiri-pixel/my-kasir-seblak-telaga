import React from 'react';
import {
  Inbox,
  CheckCircle,
  Truck,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Karyawan, SuratJalan, StokCabangMap, DataCabang } from '../types';
import { formatRupiah } from '../utils/storage';
import { getBranchName } from '../utils/branchHelper';

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
  dataCabangList?: DataCabang[];
}

export const TerimaBarangView: React.FC<TerimaBarangViewProps> = ({
  currentUser,
  suratJalanList,
  dataCabangList = [],
}) => {
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList) || currentUser.cabang;

  const isForCurrentBranch = (cabangTujuan?: string) => {
    const resolvedTujuan = getBranchName(cabangTujuan || '', dataCabangList);
    return (
      resolvedTujuan === currentBranchName ||
      (cabangTujuan || '').trim().toUpperCase() === (currentUser.cabang || '').trim().toUpperCase()
    );
  };

  // Filter incoming shipments currently in transit or waiting signature for this branch
  const activeIncomingList = suratJalanList.filter(
    (sj) =>
      isForCurrentBranch(sj.cabangTujuan) &&
      (sj.status === 'Dikirim' || sj.status === 'Terkirim')
  );

  const historyList = suratJalanList.filter(
    (sj) =>
      isForCurrentBranch(sj.cabangTujuan) &&
      (sj.status === 'Diterima' || sj.status === 'Selesai')
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Penerimaan Pengiriman Barang Cabang ({currentBranchName})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Status pengiriman bahan baku dari DC Pusat. Tombol <strong>Diterima</strong> dikonfirmasi oleh Driver setelah lembar Surat Jalan fisik ditandatangani oleh pihak cabang.
          </p>
        </div>

        {activeIncomingList.length > 0 && (
          <div className="bg-amber-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-xs tabular-nums">
            <Truck className="w-4 h-4 shrink-0" />
            <span>{activeIncomingList.length} Pengiriman Aktif Menuju Cabang</span>
          </div>
        )}
      </div>

      {/* Info Callout: SOP Cabang */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-blue-950 dark:text-blue-100">
            SOP Penerimaan Barang di Cabang:
          </span>
          <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
            1. Periksa kesesuaian fisik bahan baku yang diantar oleh Driver dengan daftar rincian barang.
            <br />
            2. Tanda tangani lembar fisik Surat Jalan yang dibawa Driver.
            <br />
            3. Driver akan mengklik <strong>&quot;Konfirmasi Diterima&quot;</strong> di aplikasinya, dan status di cabang akan otomatis berubah menjadi <strong>Diterima</strong> serta stok cabang otomatis bertambah.
          </p>
        </div>
      </div>

      {/* Active Deliveries Section */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span>Pengiriman Sedang Berjalan / Menunggu Tanda Tangan</span>
        </h3>

        {activeIncomingList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              Tidak ada pengiriman yang sedang menuju {currentBranchName}.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Semua pengiriman sebelumnya telah selesai diterima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeIncomingList.map((sj) => {
              const isTerkirim = sj.status === 'Terkirim';
              const solar = Number(sj.biayaSolar) || 0;
              const setoran = Number(sj.setoran) || 0;

              return (
                <div
                  key={sj.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border-2 p-5 shadow-sm space-y-3.5 transition ${
                    isTerkirim
                      ? 'border-amber-400 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-blue-300 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                          isTerkirim
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            : 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                        }`}
                      >
                        {isTerkirim
                          ? 'Terkirim - Silakan Tanda Tangani Surat Jalan'
                          : 'Dalam Perjalanan Driver'}
                      </span>
                      <h4 className="font-black text-slate-800 dark:text-slate-100 text-base mt-1.5 font-mono">
                        {sj.noSuratJalan}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Driver: <strong className="text-slate-800 dark:text-slate-200">{sj.driver}</strong> • Tgl Kirim: {sj.tanggal} ({sj.jam})
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px]">
                      Daftar Bahan Baku yang Dibawa Driver:
                    </span>
                    <div className="space-y-1">
                      {(sj.items || []).map((it, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold tabular-nums"
                        >
                          <span>{it.namaBahan}</span>
                          <span className="font-black text-orange-700 dark:text-orange-400">
                            {it.qtyKirim} {it.satuan}
                          </span>
                        </div>
                      ))}
                    </div>

                    {(solar > 0 || setoran > 0) && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                        {solar > 0 && <span>Solar: {formatRupiah(solar)}</span>}
                        {setoran > 0 && <span>Titipan Setoran: {formatRupiah(setoran)}</span>}
                      </div>
                    )}
                  </div>

                  {/* Status Banner */}
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      isTerkirim
                        ? 'bg-amber-100/70 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Riwayat Barang Diterima ({historyList.length})</span>
        </h3>

        {historyList.length === 0 ? (
          <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            Belum ada arsip penerimaan barang selesai di cabang ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">No. Surat Jalan</th>
                  <th className="py-2.5 px-3">Tanggal Terima</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3">Disahkan Oleh</th>
                  <th className="py-2.5 px-3">Jumlah Item</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyList.slice().reverse().map((sj) => (
                  <tr key={sj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-800 dark:text-slate-100">
                      {sj.noSuratJalan}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 tabular-nums">
                      {sj.tanggalTerima || sj.tanggal} {sj.jamTerima ? `(${sj.jamTerima})` : ''}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">
                      {sj.driver}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-100 font-medium">
                      {sj.penerimaNama || 'Kasir Cabang'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                      {(sj.items || []).reduce((s, it) => s + (Number(it.qtyTerima || it.qtyKirim) || 0), 0)} unit
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Diterima &amp; Selesai
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

