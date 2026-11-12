import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  CheckCircle,
  X,
} from 'lucide-react';
import { BahanBaku, KategoriBahan, AppSettings } from '../types';
import { formatRupiah } from '../utils/storage';
import { DEFAULT_BUSINESS_NAME } from '../utils/theme';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface BahanBakuViewProps {
  bahanBakuList: BahanBaku[];
  onAddBahanBaku: (bahan: BahanBaku) => void;
  onUpdateBahanBaku: (bahan: BahanBaku) => void;
  onDeleteBahanBaku: (id: string) => void;
  onRestockDc: (bahanId: string, qtyTambah: number, keterangan?: string) => void;
  onOpenPrintModal: (type: 'katalog' | 'suratJalan' | 'harian' | 'bulanan' | 'absen' | 'karyawan', data?: any) => void;
  appSettings?: AppSettings;
}

export const BahanBakuView: React.FC<BahanBakuViewProps> = ({
  bahanBakuList,
  onAddBahanBaku,
  onUpdateBahanBaku,
  onDeleteBahanBaku,
  onRestockDc,
  appSettings,
}) => {
  const brandName = appSettings?.namaUsaha || DEFAULT_BUSINESS_NAME;
  const [search, setSearch] = useState('');
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState<'Semua' | KategoriBahan>('Semua');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingBahan, setEditingBahan] = useState<BahanBaku | null>(null);

  // Form states for new/edit
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState<KategoriBahan>('Bahan Makanan');
  const [formSatuan, setFormSatuan] = useState('kg');
  const [formHargaBeli, setFormHargaBeli] = useState<number>(0);
  const [formStokMin, setFormStokMin] = useState<number>(10);
  const [formStokAwalDc, setFormStokAwalDc] = useState<number>(50);

  // Restock Form
  const [selectedRestockId, setSelectedRestockId] = useState('');
  const [restockQty, setRestockQty] = useState<number>(0);
  const [restockNote, setRestockNote] = useState('');

  // BottomSheetPicker & Delete Confirm states
  const [showPickerSatuan, setShowPickerSatuan] = useState<boolean>(false);
  const [showPickerRestockBahan, setShowPickerRestockBahan] = useState<boolean>(false);
  const [pendingDeleteBahan, setPendingDeleteBahan] = useState<BahanBaku | null>(null);

  const filteredList = bahanBakuList.filter((b) => {
    const matchSearch =
      b.nama.toLowerCase().includes(search.toLowerCase()) ||
      b.satuan.toLowerCase().includes(search.toLowerCase());
    const matchKategori =
      selectedKategoriFilter === 'Semua' || (b.kategori || 'Bahan Makanan') === selectedKategoriFilter;
    return matchSearch && matchKategori;
  });

  const totalItemGudang = bahanBakuList.length;
  const criticalCount = bahanBakuList.filter((b) => b.stokDC <= b.stokMinimum).length;
  const totalValuasiGudang = bahanBakuList.reduce(
    (acc, b) => acc + b.stokDC * b.hargaBeli,
    0
  );

  const openAdd = () => {
    setFormNama('');
    setFormKategori('Bahan Makanan');
    setFormSatuan('kg');
    setFormHargaBeli(0);
    setFormStokMin(10);
    setFormStokAwalDc(50);
    setEditingBahan(null);
    setShowAddModal(true);
  };

  const openEdit = (bahan: BahanBaku) => {
    setEditingBahan(bahan);
    setFormNama(bahan.nama);
    setFormKategori(bahan.kategori || 'Bahan Makanan');
    setFormSatuan(bahan.satuan);
    setFormHargaBeli(bahan.hargaBeli);
    setFormStokMin(bahan.stokMinimum);
    setFormStokAwalDc(bahan.stokDC);
    setShowAddModal(true);
  };

  const openRestock = (bahanId?: string) => {
    setSelectedRestockId(bahanId || (bahanBakuList[0]?.id || ''));
    setRestockQty(10);
    setRestockNote('Kulakan rutin supplier');
    setShowRestockModal(true);
  };

  const handleSaveBahan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;

    if (editingBahan) {
      onUpdateBahanBaku({
        ...editingBahan,
        nama: formNama.trim(),
        kategori: formKategori,
        satuan: formSatuan,
        hargaBeli: Number(formHargaBeli),
        stokMinimum: Number(formStokMin),
        stokDC: Number(formStokAwalDc),
      });
    } else {
      const newBahan: BahanBaku = {
        id: 'bhn-' + Date.now(),
        nama: formNama.trim(),
        kategori: formKategori,
        satuan: formSatuan,
        hargaBeli: Number(formHargaBeli),
        stokMinimum: Number(formStokMin),
        stokDC: Number(formStokAwalDc),
      };
      onAddBahanBaku(newBahan);
    }
    setShowAddModal(false);
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestockId || restockQty <= 0) return;
    onRestockDc(selectedRestockId, Number(restockQty), restockNote);
    setShowRestockModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Bahan Baku & Gudang DC Pusat
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Master tunggal bahan baku {brandName}, harga beli kulakan, dan stok inventaris DC Pusat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openRestock()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>+ Tambah Stok DC (Kulakan)</span>
          </button>

          <button
            onClick={openAdd}
            className="px-3.5 py-2 brand-gradient hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Bahan Baku Baru</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Total Jenis Bahan
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 block tabular-nums">
            {totalItemGudang} Bahan
          </span>
          <span className="text-[11px] text-slate-400">Master inventaris {brandName}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Stok DC Kritis / Menipis
          </span>
          <span
            className={`text-2xl font-black mt-1 block tabular-nums ${
              criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {criticalCount} Bahan
          </span>
          <span className="text-[11px] text-slate-400">Di bawah batas minimum</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Estimasi Nilai Stok DC
          </span>
          <span className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1 block tabular-nums">
            {formatRupiah(totalValuasiGudang)}
          </span>
          <span className="text-[11px] text-slate-400">Total valuasi harga modal beli</span>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Kategori Bahan:</span>
          {(['Semua', 'Bahan Makanan', 'Bahan Minuman', 'Kemasan'] as const).map((kat) => {
            const count = kat === 'Semua' 
              ? bahanBakuList.length 
              : bahanBakuList.filter((b) => (b.kategori || 'Bahan Makanan') === kat).length;
            const isSelected = selectedKategoriFilter === kat;
            return (
              <button
                key={kat}
                type="button"
                onClick={() => setSelectedKategoriFilter(kat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{kat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSelected ? 'bg-white text-orange-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari nama bahan baku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan {filteredList.length} dari {bahanBakuList.length} bahan
          </span>
        </div>
      </div>

      {/* Card List Vertikal Bahan Baku (1 Baris Data = 1 Card Putih rounded-16px) */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs shadow-xs">
            Tidak ada bahan baku yang sesuai pencarian atau filter kategori.
          </div>
        ) : (
          filteredList.map((item) => {
            const isCritical = item.stokDC <= item.stokMinimum;
            const kat = item.kategori || 'Bahan Makanan';
            const katBadgeClass =
              kat === 'Bahan Makanan'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                : kat === 'Bahan Minuman'
                ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-[16px] border p-4 sm:p-5 shadow-xs hover:shadow-sm transition space-y-3 ${
                  isCritical ? 'border-red-300 dark:border-red-700/70 ring-1 ring-red-200 dark:ring-red-900/50' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${katBadgeClass}`}>
                        {kat}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold">
                        Satuan: {item.satuan}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCritical
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {isCritical ? 'Menipis' : 'Aman'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 break-words whitespace-normal">
                      {item.nama}
                    </h3>
                    {item.keterangan && (
                      <p className="text-xs text-slate-400 break-words whitespace-normal leading-relaxed">
                        {item.keterangan}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => openRestock(item.id)}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs transition cursor-pointer"
                      title="Kulakan Restock Tambah Stok DC"
                    >
                      + Kulakan
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 text-slate-600 dark:text-slate-300 hover:text-orange-700 dark:hover:text-orange-300 rounded-xl transition cursor-pointer"
                      title="Edit Bahan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteBahan(item)}
                      className="p-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer"
                      title="Hapus Bahan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 dark:bg-slate-800/70 p-3 sm:p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 tabular-nums">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Harga Beli (Kulakan)
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 break-words whitespace-normal">
                      {formatRupiah(item.hargaBeli)}{' '}
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">/ {item.satuan}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Stok DC Saat Ini
                    </span>
                    <span className={`text-sm sm:text-base font-black break-words whitespace-normal ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {item.stokDC} {item.satuan}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Batas Min. Aman DC
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 break-words whitespace-normal">
                      {item.stokMinimum} {item.satuan}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Tambah / Edit Bahan Baku */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                {editingBahan ? 'Edit Bahan Baku Master' : 'Tambah Bahan Baku Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBahan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Nama Bahan Baku <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kerupuk Mawar Putih"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Kategori Bahan Baku <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Bahan Makanan', 'Bahan Minuman', 'Kemasan'] as const).map((kat) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => setFormKategori(kat)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                        formKategori === kat
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 ring-2 ring-orange-400/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Catatan: Transaksi Dine In hanya mengurangi stok Bahan Makanan & Minuman. Transaksi Take Away & Delivery Order mengurangi Bahan Makanan, Minuman, serta Kemasan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <BottomSheetPickerTrigger
                    label="Satuan Ukur *"
                    valueTitle={formSatuan}
                    onClick={() => setShowPickerSatuan(true)}
                  />
                  <BottomSheetPicker
                    isOpen={showPickerSatuan}
                    onClose={() => setShowPickerSatuan(false)}
                    title="Pilih Satuan Ukur Bahan"
                    selectedId={formSatuan}
                    onSelect={(opt) => setFormSatuan(String(opt.id))}
                    options={[
                      { id: 'kg', title: 'kg (Kilogram)', subtitle: 'Berat standar belanja' },
                      { id: 'gr', title: 'gr (Gram)', subtitle: 'Porsi bumbu / takaran halus' },
                      { id: 'butir', title: 'butir', subtitle: 'Telur, bakso, dll' },
                      { id: 'biji', title: 'biji / pcs', subtitle: 'Sosis, topping satuan' },
                      { id: 'bks', title: 'bks (Bungkus)', subtitle: 'Mie, kerupuk kemasan' },
                      { id: 'ikat', title: 'ikat', subtitle: 'Sayuran sawi / kangkung' },
                      { id: 'liter', title: 'liter', subtitle: 'Minyak goreng, saus cair' },
                      { id: 'botol', title: 'botol', subtitle: 'Kecap, saus botolan' },
                      { id: 'porsi', title: 'porsi', subtitle: 'Takaran langsung saji' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Harga Beli / Satuan (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formHargaBeli}
                    onChange={(e) => setFormHargaBeli(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Batas Stok Min. DC
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formStokMin}
                    onChange={(e) => setFormStokMin(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Stok DC {editingBahan ? 'Saat Ini' : 'Awal'}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formStokAwalDc}
                    onChange={(e) => setFormStokAwalDc(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 brand-gradient hover:opacity-95 text-white font-bold rounded-xl shadow-xs cursor-pointer transition"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Stok DC (Kulakan) */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                  Kulakan Masuk Stok DC
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-3.5 text-xs">
              <div>
                {(() => {
                  const selBahan = bahanBakuList.find((b) => b.id === selectedRestockId);
                  const selTitle = selBahan
                    ? `${selBahan.nama} (Stok: ${selBahan.stokDC} ${selBahan.satuan})`
                    : '';
                  return (
                    <>
                      <BottomSheetPickerTrigger
                        label="Pilih Bahan Baku *"
                        placeholder="Pilih bahan baku dari gudang..."
                        valueTitle={selTitle}
                        onClick={() => setShowPickerRestockBahan(true)}
                        icon={<Package size={16} />}
                        badge={selBahan?.kategori}
                      />
                      <BottomSheetPicker
                        isOpen={showPickerRestockBahan}
                        onClose={() => setShowPickerRestockBahan(false)}
                        title="Pilih Bahan Baku Kulakan"
                        selectedId={selectedRestockId}
                        onSelect={(opt) => setSelectedRestockId(String(opt.id))}
                        options={bahanBakuList.map((b) => ({
                          id: b.id,
                          title: b.nama,
                          subtitle: `Stok DC: ${b.stokDC} ${b.satuan} • Min: ${b.stokMinimum} ${b.satuan}`,
                          category: b.kategori,
                          price: b.hargaBeli,
                        }))}
                      />
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Jumlah Tambah Kulakan <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-black text-emerald-700 dark:text-emerald-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Stok DC akan OTOMATIS BERTAMBAH sejumlah input ini.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Keterangan Supplier / Nota Kulakan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pembelian Supplier Pasar Induk Nota #1029"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Tambah Stok DC Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Bahan Baku */}
      {pendingDeleteBahan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  Hapus Bahan Baku?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Hapus <strong>{pendingDeleteBahan.nama}</strong>? Pastikan bahan ini tidak sedang dipakai dalam resep katalog menu aktif.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingDeleteBahan(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBahanBaku(pendingDeleteBahan.id);
                  setPendingDeleteBahan(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Ya, Hapus Bahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
