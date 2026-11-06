import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  Calculator,
  ChevronRight,
  Flame,
  Check,
  X,
  Lock,
  ShoppingCart,
  Store,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  KatalogMenu,
  BahanBaku,
  ResepItem,
  Karyawan,
  StokCabangMap,
  Cabang,
  AllTokoState,
  DataCabang,
} from '../types';
import { formatRupiah } from '../utils/storage';
import { getStoreBranches } from '../utils/branchHelper';

interface KatalogMenuViewProps {
  currentUser: Karyawan;
  katalogList: KatalogMenu[];
  bahanBakuList: BahanBaku[];
  stokCabang: StokCabangMap;
  tokoState?: AllTokoState;
  dataCabangList?: DataCabang[];
  onAddKatalog: (menu: KatalogMenu) => void;
  onUpdateKatalog: (menu: KatalogMenu) => void;
  onDeleteKatalog: (id: string) => void;
  onOpenPrintModal: (type: 'katalog', data?: any) => void;
  onNavigateToPos?: () => void;
}

export const KatalogMenuView: React.FC<KatalogMenuViewProps> = ({
  currentUser,
  katalogList,
  bahanBakuList,
  stokCabang,
  tokoState,
  dataCabangList = [],
  onAddKatalog,
  onUpdateKatalog,
  onDeleteKatalog,
  onOpenPrintModal,
  onNavigateToPos,
}) => {
  // Access control: Only OWNER and ADMIN DC PUSAT can see HPP, Profit, and manage menu (Add/Edit/Delete)
  const isPrivileged =
    currentUser.jabatan === 'Owner' ||
    currentUser.jabatan === 'Admin DC Pusat' ||
    currentUser.jabatan === 'Admin' ||
    currentUser.cabang === 'DC PUSAT';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<KatalogMenu | null>(null);

  // Form states for Admin/Owner
  const [kode, setKode] = useState('');
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<KatalogMenu['kategori']>('Seblak Kuah');
  const [deskripsi, setDeskripsi] = useState('');
  const [resepRows, setResepRows] = useState<ResepItem[]>([]);
  const [hargaJual, setHargaJual] = useState<number>(15000);
  const [hargaPromo, setHargaPromo] = useState<string>('');
  const [freeMinuman, setFreeMinuman] = useState<string>('');
  const [freeMinumanId, setFreeMinumanId] = useState<string>('');
  const [searchMinuman, setSearchMinuman] = useState<string>('');
  const [isMinumanDropdownOpen, setIsMinumanDropdownOpen] = useState<boolean>(false);
  const [promoCabangIds, setPromoCabangIds] = useState<string[]>([]); // Multi-select target cabang promo

  // Active store branches for promo multi-select (excluding DC Pusat)
  const availableStoreBranches = getStoreBranches(dataCabangList);

  // Filter katalog for beverage category (Minuman Segar or containing 'minuman')
  const beverageOptions = katalogList.filter(
    (item) => item.kategori === 'Minuman Segar' || item.kategori.toLowerCase().includes('minuman')
  );

  const filteredBeverageOptions = beverageOptions.filter((item) => {
    const q = searchMinuman.toLowerCase().trim();
    if (!q) return true;
    return item.nama.toLowerCase().includes(q) || item.kode.toLowerCase().includes(q);
  });

  const categories = [
    'Semua',
    'Seblak Kuah',
    'Seblak Kering',
    'Topping Tambahan',
    'Minuman Segar',
    'Paket Hemat',
  ];

  // Calculate HPP dynamically from current recipe rows and master bahan prices
  const calculateHPP = (rows: ResepItem[]): number => {
    return rows.reduce((total, row) => {
      const bhn = bahanBakuList.find((b) => b.id === row.bahanId);
      if (!bhn) return total;
      return total + row.qtyPakai * bhn.hargaBeli;
    }, 0);
  };

  const calculatedHpp = calculateHPP(resepRows);
  const calculatedKeuntungan = hargaJual - calculatedHpp;
  const marginPercentage =
    hargaJual > 0 ? ((calculatedKeuntungan / hargaJual) * 100).toFixed(1) : '0';

  // Calculate available portions in current duty branch
  const getPortionsAvailable = (menu: KatalogMenu): number => {
    if (currentUser.cabang === 'DC PUSAT') {
      let minPortions = Infinity;
      for (const r of menu.resep) {
        const bhn = bahanBakuList.find((b) => b.id === r.bahanId);
        if (!bhn || r.qtyPakai <= 0) continue;
        const portions = Math.floor(bhn.stokDC / r.qtyPakai);
        if (portions < minPortions) minPortions = portions;
      }
      return minPortions === Infinity ? 0 : minPortions;
    } else {
      const branchStock =
        stokCabang[currentUser.cabang as Exclude<Cabang, 'DC PUSAT'>] || {};
      let minPortions = Infinity;
      for (const r of menu.resep) {
        if (r.qtyPakai <= 0) continue;
        const currentQty = branchStock[r.bahanId] || 0;
        const portions = Math.floor(currentQty / r.qtyPakai);
        if (portions < minPortions) minPortions = portions;
      }
      return minPortions === Infinity ? 0 : minPortions;
    }
  };

  const openAdd = () => {
    if (!isPrivileged) return;
    const nextNum = katalogList.length + 1;
    setKode(`SB-${String(nextNum).padStart(3, '0')}`);
    setNama('');
    setKategori('Seblak Kuah');
    setDeskripsi('');
    setResepRows([
      { bahanId: bahanBakuList[0]?.id || '', qtyPakai: 0.05 },
      { bahanId: bahanBakuList[6]?.id || bahanBakuList[1]?.id || '', qtyPakai: 1 },
    ]);
    setHargaJual(15000);
    setHargaPromo('');
    setFreeMinuman('');
    setFreeMinumanId('');
    setSearchMinuman('');
    setIsMinumanDropdownOpen(false);
    setPromoCabangIds([]);
    setEditingMenu(null);
    setShowModal(true);
  };

  const openEdit = (menu: KatalogMenu) => {
    if (!isPrivileged) return;
    setEditingMenu(menu);
    setKode(menu.kode);
    setNama(menu.nama);
    setKategori(menu.kategori);
    setDeskripsi(menu.deskripsi || '');
    setResepRows(menu.resep.length > 0 ? [...menu.resep] : []);
    setHargaJual(menu.hargaJual);
    setHargaPromo(menu.harga_promo !== undefined && menu.harga_promo !== null ? String(menu.harga_promo) : '');
    setFreeMinuman(menu.free_minuman || '');
    // If free_minuman_id exists use it, or fallback to lookup by name
    const foundDrink = menu.free_minuman_id
      ? beverageOptions.find((b) => b.id === menu.free_minuman_id)
      : menu.free_minuman
      ? beverageOptions.find((b) => b.nama.toLowerCase() === menu.free_minuman?.toLowerCase())
      : undefined;
    setFreeMinumanId(foundDrink ? foundDrink.id : (menu.free_minuman_id || ''));
    setSearchMinuman('');
    setIsMinumanDropdownOpen(false);
    setPromoCabangIds(Array.isArray(menu.promo_cabang_ids) ? [...menu.promo_cabang_ids] : []);
    setShowModal(true);
  };

  // Recipe row operations
  const addResepRow = () => {
    if (bahanBakuList.length === 0) return;
    setResepRows((prev) => [
      ...prev,
      { bahanId: bahanBakuList[0].id, qtyPakai: 1 },
    ]);
  };

  const updateResepRow = (index: number, field: 'bahanId' | 'qtyPakai', value: any) => {
    setResepRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeResepRow = (index: number) => {
    setResepRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPrivileged || !nama.trim() || !kode.trim()) return;

    const finalHpp = Math.round(calculatedHpp);
    const finalKeuntungan = Math.round(hargaJual - finalHpp);
    const parsedPromo = hargaPromo.trim() !== '' && !isNaN(Number(hargaPromo)) ? Number(hargaPromo) : undefined;
    
    // Resolve free beverage name and ID
    const selectedDrink = freeMinumanId ? beverageOptions.find((b) => b.id === freeMinumanId) : null;
    const finalFreeMinumanId = selectedDrink ? selectedDrink.id : undefined;
    const finalFreeMinumanName = selectedDrink ? selectedDrink.nama : (freeMinuman.trim() || undefined);
    const finalPromoCabangIds = promoCabangIds.length > 0 ? promoCabangIds : [];

    if (editingMenu) {
      onUpdateKatalog({
        ...editingMenu,
        kode: kode.trim().toUpperCase(),
        nama: nama.trim(),
        kategori,
        deskripsi: deskripsi.trim(),
        resep: resepRows,
        hargaModal: finalHpp,
        hargaJual: Number(hargaJual),
        keuntungan: finalKeuntungan,
        harga_promo: parsedPromo,
        free_minuman: finalFreeMinumanName,
        free_minuman_id: finalFreeMinumanId,
        promo_cabang_ids: finalPromoCabangIds,
      });
    } else {
      const newMenu: KatalogMenu = {
        id: 'ktl-' + Date.now(),
        kode: kode.trim().toUpperCase(),
        nama: nama.trim(),
        kategori,
        deskripsi: deskripsi.trim(),
        resep: resepRows,
        hargaModal: finalHpp,
        hargaJual: Number(hargaJual),
        keuntungan: finalKeuntungan,
        harga_promo: parsedPromo,
        free_minuman: finalFreeMinumanName,
        free_minuman_id: finalFreeMinumanId,
        promo_cabang_ids: finalPromoCabangIds,
      };
      onAddKatalog(newMenu);
    }
    setShowModal(false);
  };

  const filteredKatalog = katalogList.filter((item) => {
    const matchCat =
      selectedCategory === 'Semua' || item.kategori === selectedCategory;
    const matchSearch =
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.kode.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const currentBranchState =
    tokoState && currentUser.cabang !== 'DC PUSAT'
      ? tokoState[currentUser.cabang as Exclude<Cabang, 'DC PUSAT'>]
      : null;
  const isTokoBuka = currentUser.cabang === 'DC PUSAT' || currentBranchState?.status === 'Buka';

  return (
    <div className="space-y-5">
      {/* Warning if branch store closed */}
      {!isTokoBuka && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-3 text-xs shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong className="text-amber-900 block font-black">
              Akses Transaksi Terkunci - Toko {currentUser.cabang} Sedang {currentBranchState?.status === 'Tutup' ? 'TUTUP' : 'BELUM BUKA'}
            </strong>
            <span className="text-amber-800">
              Sesuai aturan sistem, katalog menu tidak dapat digunakan untuk melayani transaksi. Harap Buka Toko terlebih dahulu di menu Buka / Tutup Toko.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              {isPrivileged
                ? 'Katalog Menu & Resep HPP (Master DC)'
                : `Katalog Menu Jual (${currentUser.cabang})`}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isPrivileged
              ? 'Pengaturan Master Menu Seblak Telaga. HPP otomatis dihitung dari resep bahan baku, harga jual seragam untuk semua cabang.'
              : 'Daftar menu resmi Seblak Telaga, harga jual konsumen, dan ketersediaan stok porsi di cabang Anda.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Badge for Kasir view indicator */}
          {!isPrivileged && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Mode Kasir (Harga Jual & Stok)</span>
            </div>
          )}

          <button
            onClick={() => onOpenPrintModal('katalog', { isPrivileged })}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Katalog A4</span>
          </button>

          {/* HANYA ROLE OWNER & ADMIN PUSAT YANG BISA MENAMBAH MENU */}
          {isPrivileged && (
            <button
              onClick={openAdd}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Menu Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari kode atau nama menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Catalog Card List (1 Baris = 1 Card Putih rounded-16px) */}
      <div className="space-y-3">
        {filteredKatalog.length === 0 ? (
          <div className="bg-white rounded-[16px] border border-slate-200 p-8 text-center text-slate-400 text-xs shadow-xs">
            Tidak ada menu yang sesuai pencarian atau kategori.
          </div>
        ) : (
          filteredKatalog.map((menu) => {
            const margin =
              menu.hargaJual > 0
                ? ((menu.keuntungan / menu.hargaJual) * 100).toFixed(0)
                : 0;

            const portions = getPortionsAvailable(menu);
            const hasPromoPrice =
              typeof menu.harga_promo === 'number' &&
              menu.harga_promo > 0 &&
              menu.harga_promo < menu.hargaJual;
            const hasFreeMinuman = Boolean(menu.free_minuman && menu.free_minuman.trim() !== '');

            return (
              <div
                key={menu.id}
                className="bg-white rounded-[16px] border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-sm transition space-y-3.5"
              >
                {/* Header Card: Kode, Nama, Kategori, Actions/Stok */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 text-orange-800 font-black text-xs tracking-wider">
                        {menu.kode}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {menu.kategori}
                      </span>
                      {hasPromoPrice && (
                        <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <Flame className="w-3 h-3" />
                          PROMO
                        </span>
                      )}
                      {hasFreeMinuman && (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          FREE + {menu.free_minuman}
                        </span>
                      )}
                      {(hasPromoPrice || hasFreeMinuman) && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                          {menu.promo_cabang_ids && menu.promo_cabang_ids.length > 0
                            ? `📍 ${menu.promo_cabang_ids.length} Cabang Target`
                            : '🌐 Semua Cabang'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 break-words whitespace-normal">
                      {menu.nama}
                    </h3>
                    {menu.deskripsi && (
                      <p className="text-xs text-slate-500 break-words whitespace-normal leading-relaxed">
                        {menu.deskripsi}
                      </p>
                    )}
                  </div>

                  {/* Top Right: Actions for Admin or Stock & POS Button for Kasir */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {isPrivileged ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(menu)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Edit Resep & Harga Menu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus menu "${menu.nama}" dari katalog?`)) {
                              onDeleteKatalog(menu.id);
                            }
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                          title="Hapus Menu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                            portions > 10
                              ? 'bg-emerald-100 text-emerald-800'
                              : portions > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {portions > 0 ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{portions} Porsi Tersedia</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              <span>Stok Habis</span>
                            </>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateToPos && onNavigateToPos()}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="Buka Kasir POS untuk menjual menu ini"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Jual di POS</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Card: Price, HPP, Profit, and Recipe Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      Harga Menu
                    </span>
                    {hasPromoPrice ? (
                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-400 line-through block font-semibold">
                          {formatRupiah(menu.hargaJual)}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base sm:text-lg font-black text-red-600 break-words">
                            {formatRupiah(menu.harga_promo!)}
                          </span>
                          <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-200">
                            PROMO
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-black text-slate-900 break-words block">
                        {formatRupiah(menu.hargaJual)}
                      </span>
                    )}
                    {hasFreeMinuman && (
                      <div className="mt-1">
                        <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-300">
                          FREE + {menu.free_minuman}
                        </span>
                      </div>
                    )}
                  </div>

                  {isPrivileged && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        HPP (Modal)
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 break-words">
                        {formatRupiah(menu.hargaModal)}
                      </span>
                    </div>
                  )}

                  {isPrivileged && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        Keuntungan
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-600 break-words block">
                        {formatRupiah(menu.keuntungan)}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {margin}% margin
                      </span>
                    </div>
                  )}

                  {!isPrivileged && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        Status Cabang
                      </span>
                      <span className="text-xs font-bold text-slate-700 break-words">
                        {currentUser.cabang}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recipe section if Privileged */}
                {isPrivileged && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Komposisi Resep Bahan Baku:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {menu.resep && menu.resep.length > 0 ? (
                        menu.resep.map((r, i) => {
                          const bhn = bahanBakuList.find((b) => b.id === r.bahanId);
                          return (
                            <span
                              key={i}
                              className="bg-orange-50 border border-orange-200/80 text-orange-950 px-2.5 py-1 rounded-lg text-xs break-words whitespace-normal"
                            >
                              {r.qtyPakai} {bhn?.satuan || ''} <strong>{bhn?.nama || 'Bahan'}</strong>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-400 text-xs italic">
                          Belum ada bahan baku dalam resep
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Tambah / Edit Menu & Recipe Builder (HANYA OWNER / ADMIN PUSAT) */}
      {showModal && isPrivileged && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-800 text-base">
                {editingMenu ? `Edit Menu: ${editingMenu.nama}` : 'Tambah Menu Baru ke Katalog'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kode Menu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SB-007"
                    value={kode}
                    onChange={(e) => setKode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Menu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Seblak Seafood Spesial"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Menu
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Seblak Kuah">Seblak Kuah</option>
                    <option value="Seblak Kering">Seblak Kering</option>
                    <option value="Topping Tambahan">Topping Tambahan</option>
                    <option value="Minuman Segar">Minuman Segar</option>
                    <option value="Paket Hemat">Paket Hemat</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Deskripsi Menu
                  </label>
                  <input
                    type="text"
                    placeholder="Keterangan singkat rasa atau isian..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* RECIPE BUILDER (ONLY FOR OWNER & ADMIN DC) */}
              <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-orange-600" />
                      Komposisi Resep Bahan (Porsi 1 Menu)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pilih bahan baku dan porsi pakai. HPP modal terhitung otomatis.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addResepRow}
                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Bahan</span>
                  </button>
                </div>

                {resepRows.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    Belum ada bahan baku dalam resep menu ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resepRows.map((row, index) => {
                      const bhn = bahanBakuList.find((b) => b.id === row.bahanId);
                      const costThisRow = bhn ? row.qtyPakai * bhn.hargaBeli : 0;

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-orange-200/80"
                        >
                          <div className="flex-1">
                            <select
                              value={row.bahanId}
                              onChange={(e) =>
                                updateResepRow(index, 'bahanId', e.target.value)
                              }
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none"
                            >
                              {bahanBakuList.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.nama} [{b.kategori || 'Bahan Makanan'}] ({formatRupiah(b.hargaBeli)}/{b.satuan})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-28 flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min={0.001}
                              value={row.qtyPakai}
                              onChange={(e) =>
                                updateResepRow(
                                  index,
                                  'qtyPakai',
                                  Number(e.target.value)
                                )
                              }
                              className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-bold"
                            />
                            <span className="text-[11px] text-slate-500 font-semibold">
                              {bhn?.satuan || ''}
                            </span>
                          </div>

                          <div className="w-24 text-right font-extrabold text-slate-700 text-[11px]">
                            {formatRupiah(costThisRow)}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeResepRow(index)}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CALCULATION & PRICING */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Harga Modal (HPP Otomatis)
                    </label>
                    <div className="p-2.5 bg-slate-200/80 rounded-xl font-black text-slate-800 text-sm">
                      {formatRupiah(calculatedHpp)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      HARGA MENU / Jual (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={calculatedHpp}
                      value={hargaJual}
                      onChange={(e) => setHargaJual(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-black text-orange-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Keuntungan Bersih / Porsi
                    </label>
                    <div className="p-2.5 bg-emerald-100 rounded-xl font-black text-emerald-700 text-sm flex items-center justify-between">
                      <span>{formatRupiah(calculatedKeuntungan)}</span>
                      <span className="text-[10px] font-bold">({marginPercentage}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FITUR PROMO MENU (OPSIONAL) */}
              <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <h4 className="font-black text-slate-800 text-xs">
                    Fitur Promo Menu (Opsional)
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Bisa aktif salah satu atau dua-duanya
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      1. Harga Promo (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Misal: 7000, 8000 (Kosongkan jika normal)"
                      value={hargaPromo}
                      onChange={(e) => setHargaPromo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-700 placeholder:font-normal placeholder:text-slate-400 text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Jika diisi lebih murah dari harga normal, harga normal dicoret dan harga promo tampil merah besar + label PROMO.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      2. Free Minuman (Dropdown Searchable)
                    </label>

                    {/* Searchable Combobox */}
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-amber-500"
                        onClick={() => setIsMinumanDropdownOpen((prev) => !prev)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {freeMinumanId ? (
                            <>
                              <span className="font-bold text-amber-800 text-xs">
                                {beverageOptions.find((b) => b.id === freeMinumanId)?.nama || freeMinuman || 'Minuman Dipilih'}
                              </span>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">
                                {beverageOptions.find((b) => b.id === freeMinumanId)?.kode || ''}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs font-normal">
                              -- Pilih Free Minuman (Kosong) --
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {freeMinumanId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFreeMinumanId('');
                                setFreeMinuman('');
                                setSearchMinuman('');
                              }}
                              className="text-slate-400 hover:text-red-500 p-0.5"
                              title="Hapus Pilihan"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 transition-transform ${
                              isMinumanDropdownOpen ? 'rotate-90 text-amber-600' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Dropdown Menu Popup */}
                      {isMinumanDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl z-50 p-2 space-y-2 max-h-56 overflow-y-auto">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Cari minuman (Es Teh, Es Jeruk...)"
                              value={searchMinuman}
                              onChange={(e) => setSearchMinuman(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            {/* Option Tanpa Free Minuman */}
                            <div
                              onClick={() => {
                                setFreeMinumanId('');
                                setFreeMinuman('');
                                setIsMinumanDropdownOpen(false);
                              }}
                              className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between hover:bg-slate-100 ${
                                !freeMinumanId ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-600'
                              }`}
                            >
                              <span>🚫 Tanpa Free Minuman (Kosong)</span>
                              {!freeMinumanId && <Check className="w-3.5 h-3.5 text-amber-600" />}
                            </div>

                            {/* List Minuman dari Katalog */}
                            {filteredBeverageOptions.length > 0 ? (
                              filteredBeverageOptions.map((drink) => (
                                <div
                                  key={drink.id}
                                  onClick={() => {
                                    setFreeMinumanId(drink.id);
                                    setFreeMinuman(drink.nama);
                                    setIsMinumanDropdownOpen(false);
                                  }}
                                  className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between hover:bg-amber-50 ${
                                    freeMinumanId === drink.id
                                      ? 'bg-amber-100/70 font-bold text-amber-900'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold">{drink.nama}</div>
                                    <div className="text-[10px] text-slate-500">
                                      {drink.kode} • Normal {formatRupiah(drink.hargaJual)}
                                    </div>
                                  </div>
                                  {freeMinumanId === drink.id && (
                                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-center text-slate-400 text-xs italic">
                                Minuman tidak ditemukan di katalog
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1">
                      Data otomatis diambil dari kategori <strong>Minuman Segar</strong>. Disimpan sebagai <code>free_minuman_id</code> dan stok bahan baku minuman akan dipotong saat transaksi.
                    </p>
                  </div>
                </div>

                {/* 3. Multi-Select Target Cabang Promo (Firebase: promo_cabang_ids) */}
                <div className="pt-3 border-t border-rose-200/80 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800">
                        3. Target Cabang Promo (Multi-Select)
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {promoCabangIds.length === 0
                          ? '🌟 Berlaku untuk SEMUA CABANG (array kosong / default)'
                          : `🎯 Khusus ${promoCabangIds.length} cabang terpilih`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPromoCabangIds([])}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                          promoCabangIds.length === 0
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Semua Cabang
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const allBranchIds = availableStoreBranches.map((b) => b.branchId || b.id);
                          setPromoCabangIds(allBranchIds);
                        }}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg border bg-white text-slate-600 border-slate-300 hover:bg-slate-100 transition"
                      >
                        Pilih Semua Cabang
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {availableStoreBranches.map((branch) => {
                      const branchKey = branch.branchId || branch.id;
                      const isChecked = promoCabangIds.includes(branchKey);
                      return (
                        <label
                          key={branch.id}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-rose-100/70 border-rose-400 font-bold text-rose-950'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPromoCabangIds((prev) => [...prev, branchKey]);
                              } else {
                                setPromoCabangIds((prev) => prev.filter((id) => id !== branchKey));
                              }
                            }}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs truncate font-bold">{branch.nama}</div>
                            <div className="text-[10px] text-slate-500 truncate">
                              ID: {branchKey} {branch.kode ? `• ${branch.kode}` : ''}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-500 italic">
                    * Disimpan di Firestore <code>katalog_menu.promo_cabang_ids</code>. Jika kosong <code>[]</code>, promo otomatis tampil di semua cabang. Jika diisi, kasir POS hanya menampilkan harga promo/free minuman di cabang yang dicentang.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Menu Katalog</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
