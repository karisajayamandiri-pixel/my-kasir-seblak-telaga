import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Send,
  Clock,
  Search,
  FileText,
  Warehouse,
  X,
} from 'lucide-react';
import {
  Karyawan,
  BahanBaku,
  StokCabangMap,
  PermintaanBarang,
  PermintaanBarangItem,
  DataCabang,
} from '../types';
import {
  getTodayStr,
  getNowShortTime,
  generatePermintaanNo,
} from '../utils/storage';
import { getBranchName, isPusatBranch } from '../utils/branchHelper';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

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
  const jabatanUpper = (currentUser.jabatan || '').trim().toUpperCase();
  const isRoving =
    ['SUPERVISOR AREA', 'OWNER', 'ADMIN DC PUSAT', 'ADMIN'].includes(jabatanUpper) ||
    isPusatBranch(currentUser.cabang, dataCabangList);

  const availableBranches = (dataCabangList || []).filter(
    (c) => c.nama.trim().toUpperCase() !== 'DC PUSAT'
  );

  const userBranchResolved =
    getBranchName(currentUser.cabang_id || currentUser.cabang, dataCabangList) ||
    currentUser.cabang;

  const defaultCabang = isPusatBranch(currentUser.cabang, dataCabangList)
    ? (availableBranches[0]?.nama || '')
    : userBranchResolved;

  const [activeBranch, setActiveBranch] = useState<string>(defaultCabang);

  useEffect(() => {
    if (!activeBranch && defaultCabang) {
      setActiveBranch(defaultCabang);
    }
  }, [activeBranch, defaultCabang]);

  const activeBranchObj = dataCabangList.find(
    (c) => c.nama === activeBranch || c.id === activeBranch || c.branchId === activeBranch
  );
  const branchStock =
    stokCabang[activeBranch] ||
    (activeBranchObj?.branchId ? stokCabang[activeBranchObj.branchId] : undefined) ||
    (activeBranchObj?.id ? stokCabang[activeBranchObj.id] : undefined) ||
    {};

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'stok' | 'permintaan'>('stok');
  const [showModalMinta, setShowModalMinta] = useState(false);

  // Form minta barang state
  const [itemsMinta, setItemsMinta] = useState<PermintaanBarangItem[]>([]);
  const [catatanMinta, setCatatanMinta] = useState('');

  // BottomSheetPicker states
  const [showPickerBranch, setShowPickerBranch] = useState(false);
  const [pickerItemRowIndex, setPickerItemRowIndex] = useState<number | null>(null);

  // Filtered ingredients
  const filteredBahan = bahanBakuList.filter((b) =>
    (b.nama || '').toLowerCase().includes(search.toLowerCase())
  );

  // Requests for currently active branch
  const myRequests = permintaanList.filter(
    (p) => (getBranchName(p.cabang, dataCabangList) || p.cabang) === activeBranch
  );

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
            <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Permintaan & Stok Cabang ({activeBranch || '-'})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Setiap cabang dapat mengirim permintaan barang ke DC Pusat dan memantau persediaan stok harian.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch switcher for roving roles via BottomSheetPicker */}
          {isRoving && (
            <div className="w-auto">
              <BottomSheetPickerTrigger
                valueTitle={activeBranch ? `Cabang: ${activeBranch}` : ''}
                placeholder="Pilih cabang..."
                onClick={() => setShowPickerBranch(true)}
                size="sm"
                className="min-w-[140px]"
              />
              <BottomSheetPicker
                isOpen={showPickerBranch}
                onClose={() => setShowPickerBranch(false)}
                title="Pilih Cabang Pantau Stok"
                selectedId={activeBranch}
                onSelect={(opt) => setActiveBranch(String(opt.id))}
                options={availableBranches.map((c) => ({
                  id: c.nama,
                  title: c.nama,
                  subtitle: c.alamat || 'Cabang Toko Operasional',
                }))}
              />
            </div>
          )}

          <button
            onClick={openMintaModal}
            disabled={!activeBranch}
            className="px-4 py-2 brand-gradient hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Permintaan ke DC</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stok')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'stok'
              ? 'brand-tab-active'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Sisa Stok Bahan Cabang</span>
        </button>

        <button
          onClick={() => setActiveTab('permintaan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'permintaan'
              ? 'brand-tab-active'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Riwayat Permintaan ke DC ({myRequests.length})</span>
        </button>
      </div>

      {activeTab === 'stok' ? (
        <div className="space-y-3">
          {/* Search Bar Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari bahan baku..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
              Sisa stok berkurang otomatis setiap transaksi POS berhasil ({filteredBahan.length} bahan).
            </div>
          </div>

          {/* Vertical Card List (1 Baris = 1 Card Putih rounded-16px) */}
          <div className="space-y-3">
            {filteredBahan.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs shadow-xs">
                Tidak ada bahan baku yang cocok dengan pencarian.
              </div>
            ) : (
              filteredBahan.map((b) => {
                const currentQty = Number(branchStock[b.id] ?? 0) || 0;
                const branchMin = (Number(b.stokMinimum) || 0) * 0.4;
                const isLow = currentQty <= branchMin;

                return (
                  <div
                    key={b.id}
                    className={`bg-white dark:bg-slate-900 rounded-[16px] border p-4 sm:p-5 shadow-xs hover:shadow-sm transition space-y-3 ${
                      isLow ? 'border-red-300 dark:border-red-800 ring-1 ring-red-200 dark:ring-red-900/50' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {b.kategori && (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300">
                              {b.kategori}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold">
                            Satuan: {b.satuan}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {isLow ? 'Menipis' : 'Aman'}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 break-words whitespace-normal">
                          {b.nama}
                        </h3>
                        {b.keterangan && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 break-words whitespace-normal leading-relaxed">
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
                                qtyMinta: Number(b.stokMinimum) || 1,
                              },
                            ]);
                            setCatatanMinta(`Permintaan mendesak stok ${b.nama} menipis`);
                            setShowModalMinta(true);
                          }}
                          className="px-3.5 py-2 bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Minta Ini ke DC</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 dark:bg-slate-800/60 p-3 sm:p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 tabular-nums">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                          Sisa Stok Cabang ({activeBranch})
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black break-words whitespace-normal ${
                            isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {currentQty % 1 === 0 ? currentQty : currentQty.toFixed(2)} {b.satuan}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                          Batas Min. Aman Cabang
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 break-words whitespace-normal">
                          {branchMin.toFixed(1)} {b.satuan}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                          Status Ketersediaan
                        </span>
                        <span className={`text-xs sm:text-sm font-bold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
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
        <div className="bg-white dark:bg-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Status Permintaan Barang ke DC Pusat
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              *Stok belum bertambah saat status Menunggu/Dikirim. Stok bertambah saat Anda klik Terima Barang.
            </span>
          </div>

          {myRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Belum ada permintaan barang yang diajukan ke DC.
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.slice().reverse().map((req) => (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 bg-white dark:bg-slate-800/50 rounded-[16px] border border-slate-200 dark:border-slate-700 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="font-black text-slate-800 dark:text-slate-100 text-sm break-words tabular-nums">
                        {req.noPermintaan}
                      </span>
                      <span className="text-slate-400 tabular-nums">• {req.tanggal} {req.jam}</span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full font-extrabold text-[10px] self-start sm:self-auto ${
                        req.status === 'Selesai'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : req.status === 'Dikirim'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      Status: {req.status}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 tabular-nums">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Daftar Bahan Baku Diminta:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(req.items || []).map((item, idx) => (
                        <span
                          key={idx}
                          className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg font-semibold text-slate-700 dark:text-slate-200 text-[11px] border border-slate-200 dark:border-slate-700 shadow-2xs break-words"
                        >
                          {item.namaBahan}: <strong className="text-orange-600 dark:text-orange-400">{Number(item.qtyMinta) || 0} {item.satuan}</strong>
                        </span>
                      ))}
                    </div>
                    {req.catatan && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-700 break-words whitespace-normal">
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                  Form Permintaan Bahan ke DC Pusat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalMinta(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPermintaan} className="space-y-4 text-xs">
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] text-orange-900 dark:text-orange-200 font-semibold">
                    Cabang Pemohon: <strong>{activeBranch}</strong>
                  </p>
                  <span className="text-[10px] text-orange-700 dark:text-orange-300 bg-orange-100/80 dark:bg-orange-900/60 px-2 py-0.5 rounded-md font-bold">
                    Oleh: {currentUser.nama} ({currentUser.jabatan})
                  </span>
                </div>
                {isRoving && (
                  <div className="pt-1">
                    <BottomSheetPickerTrigger
                      label="Ubah Cabang Pemohon"
                      valueTitle={activeBranch}
                      onClick={() => setShowPickerBranch(true)}
                      size="sm"
                    />
                  </div>
                )}
                <p className="text-[10px] text-orange-700 dark:text-orange-300 pt-0.5">
                  Permintaan langsung diteruskan ke DC Pusat. Petugas DC akan menyiapkan bahan baku dan menerbitkan Surat Jalan resmi.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Bahan Baku yang Diminta:
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-orange-600 dark:text-orange-400 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Tambah Baris Bahan
                  </button>
                </div>

                {itemsMinta.map((row, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const selBhn = bahanBakuList.find((b) => b.id === row.bahanId);
                        return (
                          <BottomSheetPickerTrigger
                            valueTitle={selBhn ? `${selBhn.nama} (${selBhn.satuan})` : ''}
                            placeholder="Pilih Bahan..."
                            onClick={() => setPickerItemRowIndex(index)}
                            size="sm"
                          />
                        );
                      })()}
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
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs text-center font-bold tabular-nums"
                      />
                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold w-8">
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

                {pickerItemRowIndex !== null && (
                  <BottomSheetPicker
                    isOpen={pickerItemRowIndex !== null}
                    onClose={() => setPickerItemRowIndex(null)}
                    title={`Pilih Bahan Baku Permintaan (Baris ${pickerItemRowIndex + 1})`}
                    selectedId={itemsMinta[pickerItemRowIndex]?.bahanId}
                    onSelect={(opt) => {
                      updateItemRow(
                        pickerItemRowIndex,
                        String(opt.id),
                        itemsMinta[pickerItemRowIndex]?.qtyMinta || 1
                      );
                      setPickerItemRowIndex(null);
                    }}
                    options={bahanBakuList.map((b) => ({
                      id: b.id,
                      title: b.nama,
                      subtitle: `Stok DC: ${Number(b.stokDC) || 0} ${b.satuan} • Kategori: ${b.kategori || 'Bahan'}`,
                      category: b.kategori,
                    }))}
                  />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Catatan Keperluan / Pesan untuk DC
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Stok telur dan bakso segera habis menjelang malam minggu..."
                  value={catatanMinta}
                  onChange={(e) => setCatatanMinta(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModalMinta(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
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
