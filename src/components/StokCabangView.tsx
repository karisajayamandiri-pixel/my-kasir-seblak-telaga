import React, { useState } from 'react';
import {
  Package,
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  FileText,
  Warehouse,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  Karyawan,
  BahanBaku,
  StokCabangMap,
  PermintaanBarang,
  Cabang,
  PermintaanBarangItem,
  DataCabang,
} from '../types';
import {
  getTodayStr,
  getNowShortTime,
  generatePermintaanNo,
} from '../utils/storage';

interface StokCabangViewProps {
  currentUser: Karyawan;
  bahanBakuList: BahanBaku[];
  stokCabang: StokCabangMap;
  permintaanList: PermintaanBarang[];
  dataCabangList?: DataCabang[];
  onAddPermintaan: (permintaan: PermintaanBarang) => void;
}

export const StokCabangView: React.FC<StokCabangViewProps> = ({
  currentUser,
  bahanBakuList,
  stokCabang,
  permintaanList,
  dataCabangList = [],
  onAddPermintaan,
}) => {
  const isRoving =
    currentUser.jabatan === 'Supervisor Area' ||
    currentUser.jabatan === 'Owner' ||
    currentUser.jabatan === 'Admin DC Pusat' ||
    currentUser.cabang === 'DC PUSAT';

  const availableBranches = (dataCabangList && dataCabangList.length > 0)
    ? dataCabangList.filter((c) => c.nama.trim().toUpperCase() !== 'DC PUSAT')
    : [
        { id: '1', nama: 'PADAHERANG 01', status: 'Aktif' },
        { id: '2', nama: 'BANJARSARI 02', status: 'Aktif' },
        { id: '3', nama: 'CIAWTALI 03', status: 'Aktif' },
      ];

  const defaultCabang = (
    currentUser.cabang === 'DC PUSAT' ? (availableBranches[0]?.nama || 'PADAHERANG 01') : currentUser.cabang
  ) as string;

  const [activeBranch, setActiveBranch] = useState<string>(defaultCabang);
  const branchStock = stokCabang[activeBranch] || {};

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'stok' | 'permintaan'>('stok');
  const [showModalMinta, setShowModalMinta] = useState(false);

  // Form minta barang state
  const [itemsMinta, setItemsMinta] = useState<PermintaanBarangItem[]>([]);
  const [catatanMinta, setCatatanMinta] = useState('');

  // Filtered ingredients
  const filteredBahan = bahanBakuList.filter((b) =>
    b.nama.toLowerCase().includes(search.toLowerCase())
  );

  // Requests for currently active branch
  const myRequests = permintaanList.filter((p) => p.cabang === activeBranch);

  const openMintaModal = () => {
    setItemsMinta([
      {
        bahanId: bahanBakuList[0]?.id || '',
        namaBahan: bahanBakuList[0]?.nama || '',
        satuan: bahanBakuList[0]?.satuan || '',
        qtyMinta: 10,
      },
    ]);
    setCatatanMinta('Permintaan restock bahan harian dari cabang');
    setShowModalMinta(true);
  };

  const addItemRow = () => {
    if (bahanBakuList.length === 0) return;
    setItemsMinta((prev) => [
      ...prev,
      {
        bahanId: bahanBakuList[0].id,
        namaBahan: bahanBakuList[0].nama,
        satuan: bahanBakuList[0].satuan,
        qtyMinta: 10,
      },
    ]);
  };

  const updateItemRow = (index: number, bahanId: string, qtyMinta: number) => {
    const selectedBhn = bahanBakuList.find((b) => b.id === bahanId);
    setItemsMinta((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              bahanId,
              namaBahan: selectedBhn?.nama || '',
              satuan: selectedBhn?.satuan || '',
              qtyMinta,
            }
          : item
      )
    );
  };

  const removeItemRow = (index: number) => {
    setItemsMinta((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitPermintaan = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsMinta.length === 0) return;

    const newReq: PermintaanBarang = {
      id: 'req-' + Date.now(),
      noPermintaan: generatePermintaanNo(activeBranch),
      cabang: activeBranch,
      tanggal: getTodayStr(),
      jam: getNowShortTime(),
      items: itemsMinta,
      catatan: catatanMinta.trim(),
      status: 'Menunggu',
    };

    onAddPermintaan(newReq);
    setShowModalMinta(false);
    setActiveTab('permintaan');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Permintaan & Stok Cabang ({activeBranch})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Setiap cabang dapat mengirim permintaan barang ke DC Pusat dan memantau persediaan stok harian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch switcher for roving roles */}
          {isRoving && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs shadow-xs">
              <span className="text-[11px] font-bold text-slate-500">Cabang:</span>
              <select
                value={activeBranch}
                onChange={(e) => setActiveBranch(e.target.value as Exclude<Cabang, 'DC PUSAT'>)}
                className="font-bold text-orange-700 bg-transparent focus:outline-none cursor-pointer"
              >
                {availableBranches.map((c) => (
                  <option key={c.id} value={c.nama}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={openMintaModal}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <Send className="w-4 h-4" />
            <span>+ Kirim Permintaan ke DC</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('stok')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'stok'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Sisa Stok Bahan Cabang</span>
        </button>

        <button
          onClick={() => setActiveTab('permintaan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'permintaan'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Permintaan ke DC ({myRequests.length})</span>
        </button>
      </div>

      {activeTab === 'stok' ? (
        <div className="space-y-3">
          {/* Search Bar Card */}
          <div className="bg-white rounded-[16px] border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari bahan baku..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Sisa stok berkurang otomatis setiap transaksi POS berhasil ({filteredBahan.length} bahan).
            </div>
          </div>

          {/* Vertical Card List (1 Baris = 1 Card Putih rounded-16px) */}
          <div className="space-y-3">
            {filteredBahan.length === 0 ? (
              <div className="bg-white rounded-[16px] border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-xs">
                Tidak ada bahan baku yang cocok dengan pencarian.
              </div>
            ) : (
              filteredBahan.map((b) => {
                const currentQty = branchStock[b.id] ?? 0;
                const isLow = currentQty <= (b.stokMinimum * 0.4); // threshold for branch

                return (
                  <div
                    key={b.id}
                    className={`bg-white rounded-[16px] border p-4 sm:p-5 shadow-xs hover:shadow-sm transition space-y-3 ${
                      isLow ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {b.kategori && (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-orange-100 text-orange-800">
                              {b.kategori}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                            Satuan: {b.satuan}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isLow ? 'Menipis' : 'Aman'}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-800 break-words whitespace-normal">
                          {b.nama}
                        </h3>
                        {b.keterangan && (
                          <p className="text-xs text-slate-400 break-words whitespace-normal leading-relaxed">
                            {b.keterangan}
                          </p>
                        )}
                      </div>

                      <div className="self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setItemsMinta([
                              {
                                bahanId: b.id,
                                namaBahan: b.nama,
                                satuan: b.satuan,
                                qtyMinta: b.stokMinimum,
                              },
                            ]);
                            setCatatanMinta(`Permintaan mendesak stok ${b.nama} menipis`);
                            setShowModalMinta(true);
                          }}
                          className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Minta Ini ke DC</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3 sm:p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          Sisa Stok Cabang ({activeBranch})
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black break-words whitespace-normal ${
                            isLow ? 'text-red-600' : 'text-slate-900'
                          }`}
                        >
                          {typeof currentQty === 'number'
                            ? currentQty % 1 === 0
                              ? currentQty
                              : currentQty.toFixed(2)
                            : currentQty}{' '}
                          {b.satuan}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          Batas Min. Aman Cabang
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-600 break-words whitespace-normal">
                          {(b.stokMinimum * 0.4).toFixed(1)} {b.satuan}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          Status Ketersediaan
                        </span>
                        <span className={`text-xs sm:text-sm font-bold ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
                          {isLow ? 'Perlu Restock Segera' : 'Stok Masih Cukup'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* TAB: Riwayat Permintaan */
        <div className="bg-white rounded-[16px] border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold text-slate-800 text-sm">
              Status Permintaan Barang ke DC Pusat
            </h3>
            <span className="text-xs text-slate-500">
              *Stok belum bertambah saat status Menunggu/Dikirim. Stok bertambah saat Anda klik Terima Barang.
            </span>
          </div>

          {myRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada permintaan barang yang diajukan ke DC.
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.slice().reverse().map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 bg-white rounded-[16px] border border-slate-200 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span className="font-black text-slate-800 text-sm break-words">
                        {req.noPermintaan}
                      </span>
                      <span className="text-slate-400">• {req.tanggal} {req.jam}</span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full font-extrabold text-[10px] self-start sm:self-auto ${
                        req.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'Dikirim'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Status: {req.status}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600">
                      Daftar Bahan Baku Diminta:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {req.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="bg-white px-2.5 py-1 rounded-lg font-semibold text-slate-700 text-[11px] border border-slate-200 shadow-2xs break-words"
                        >
                          {item.namaBahan}: <strong className="text-orange-600">{item.qtyMinta} {item.satuan}</strong>
                        </span>
                      ))}
                    </div>
                    {req.catatan && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60 break-words whitespace-normal">
                        Catatan: "{req.catatan}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Minta Barang ke DC */}
      {showModalMinta && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-800 text-base">
                  Form Permintaan Bahan ke DC Pusat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalMinta(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPermintaan} className="space-y-4 text-xs">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-orange-900 font-semibold">
                    Cabang Pemohon: <strong>{activeBranch}</strong>
                  </p>
                  <span className="text-[10px] text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-md font-bold">
                    Oleh: {currentUser.nama} ({currentUser.jabatan})
                  </span>
                </div>
                {isRoving && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-orange-800">Ubah Cabang Pemohon:</span>
                    <select
                      value={activeBranch}
                      onChange={(e) => setActiveBranch(e.target.value as Exclude<Cabang, 'DC PUSAT'>)}
                      className="text-xs bg-white border border-orange-300 rounded px-2 py-0.5 font-bold text-orange-900"
                    >
                      {availableBranches.map((c) => (
                        <option key={c.id} value={c.nama}>
                          Cabang {c.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="text-[10px] text-orange-700 pt-0.5">
                  Permintaan langsung diteruskan ke DC Pusat. Petugas DC akan menyiapkan bahan baku dan menerbitkan Surat Jalan resmi.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Bahan Baku yang Diminta:
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-orange-600 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Tambah Baris Bahan
                  </button>
                </div>

                {itemsMinta.map((row, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                  >
                    <div className="flex-1">
                      <select
                        value={row.bahanId}
                        onChange={(e) =>
                          updateItemRow(index, e.target.value, row.qtyMinta)
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        {bahanBakuList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nama} (Satuan: {b.satuan})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        required
                        min={0.1}
                        step="any"
                        placeholder="Qty"
                        value={row.qtyMinta}
                        onChange={(e) =>
                          updateItemRow(
                            index,
                            row.bahanId,
                            Number(e.target.value)
                          )
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold"
                      />
                    </div>

                    <span className="text-[11px] text-slate-500 font-semibold w-8">
                      {row.satuan}
                    </span>

                    {itemsMinta.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Keperluan / Pesan untuk DC
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Stok telur dan bakso segera habis menjelang malam minggu..."
                  value={catatanMinta}
                  onChange={(e) => setCatatanMinta(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModalMinta(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Permintaan ke DC</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
