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
  MenuCabang,
  AppSettings,
} from '../types';
import { formatRupiah } from '../utils/storage';
import { getStoreBranches } from '../utils/branchHelper';
import { DEFAULT_BUSINESS_NAME } from '../utils/theme';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface KatalogMenuViewProps {
  currentUser: Karyawan;
  katalogList: KatalogMenu[];
  bahanBakuList: BahanBaku[];
  stokCabang: StokCabangMap;
  tokoState?: AllTokoState;
  dataCabangList?: DataCabang[];
  menuCabangList?: MenuCabang[];
  onToggleMenuCabang?: (menuId: string, cabangId: string, currentStatus: boolean) => void;
  onAddKatalog: (menu: KatalogMenu) => void;
  onUpdateKatalog: (menu: KatalogMenu) => void;
  onDeleteKatalog: (id: string) => void;
  onOpenPrintModal: (type: 'katalog', data?: any) => void;
  onNavigateToPos?: () => void;
  appSettings?: AppSettings;
}

export const KatalogMenuView: React.FC<KatalogMenuViewProps> = ({
  currentUser,
  katalogList,
  bahanBakuList,
  stokCabang,
  tokoState,
  dataCabangList = [],
  menuCabangList = [],
  onToggleMenuCabang,
  onAddKatalog,
  onUpdateKatalog,
  onDeleteKatalog,
  onOpenPrintModal,
  onNavigateToPos,
  appSettings,
}) => {
  const brandName = appSettings?.namaUsaha || DEFAULT_BUSINESS_NAME;
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
  const [selectedMenuCabangIds, setSelectedMenuCabangIds] = useState<string[]>([]); // Multi-select ketersediaan menu per cabang (menu_cabang)

  // BottomSheetPicker states
  const [showPickerKategori, setShowPickerKategori] = useState<boolean>(false);
  const [resepPickerRowIndex, setResepPickerRowIndex] = useState<number | null>(null);

  // Active store branches for promo multi-select (excluding DC Pusat)
  const availableStoreBranches = getStoreBranches(dataCabangList);

  // Helper untuk mengecek status tampil menu di cabang (dari menu_cabang atau cabang_ids)
  const getMenuBranchStatus = (menuId: string, menuCabangIds?: string[]) => {
    const records = (menuCabangList || []).filter((mc) => mc.menu_id === menuId);
    if (records.length > 0) {
      const activeRecords = records.filter((r) => r.is_tampil);
      return {
        isAll: activeRecords.length === dataCabangList.length && dataCabangList.length > 0,
        activeCount: activeRecords.length,
        isActiveForBranch: (cabangId: string, cabangNama: string) => {
          const rec = records.find((r) => r.cabang_id === cabangId || r.cabang_id === cabangNama);
          return rec ? rec.is_tampil : false;
        },
      };
    }
    const isAll = !menuCabangIds || menuCabangIds.length === 0 || menuCabangIds.includes('ALL');
    return {
      isAll,
      activeCount: isAll ? dataCabangList.length : (menuCabangIds?.length || 0),
      isActiveForBranch: (cabangId: string, cabangNama: string) => {
        if (isAll) return true;
        return (menuCabangIds || []).includes(cabangId) || (menuCabangIds || []).includes(cabangNama);
      },
    };
  };

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
    setSelectedMenuCabangIds([]); // Kosong = Tampil di Semua Cabang
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

    // Set ketersediaan cabang
    if (menu.cabang_ids && menu.cabang_ids.length > 0) {
      setSelectedMenuCabangIds([...menu.cabang_ids]);
    } else {
      const activeRecords = (menuCabangList || []).filter((mc) => mc.menu_id === menu.id && mc.is_tampil);
      if (activeRecords.length > 0) {
        setSelectedMenuCabangIds(activeRecords.map((r) => r.cabang_id));
      } else {
        setSelectedMenuCabangIds([]); // Kosong = Tampil di Semua Cabang
      }
    }
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
    
    // Resolving cabang_ids: jika Semua Cabang dipilih atau kosong, set []
    const isAllBranches = selectedMenuCabangIds.length === 0 || selectedMenuCabangIds.includes('ALL');
    const finalCabangIds = isAllBranches ? [] : selectedMenuCabangIds;

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
        cabang_ids: finalCabangIds,
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
        cabang_ids: finalCabangIds,
      };
      onAddKatalog(newMenu);
    }
    setShowModal(false);
  };

  const filteredKatalog = katalogList.filter((item) => {
    // Jika mode Kasir Cabang (bukan DC Pusat / Owner), filter hanya menu yang aktif di cabang kasir
    if (!isPrivileged) {
      const branchStatus = getMenuBranchStatus(item.id, item.cabang_ids);
      const activeBranchKey = currentUser.branchId || currentUser.cabang;
      const isVisibleHere = branchStatus.isActiveForBranch(activeBranchKey, currentUser.cabang);
      if (!isVisibleHere) return false;
    }

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
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl flex items-center gap-3 text-xs shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <strong className="text-amber-900 dark:text-amber-200 block font-black">
              Akses Transaksi Terkunci - Toko {currentUser.cabang} Sedang {currentBranchState?.status === 'Tutup' ? 'TUTUP' : 'BELUM BUKA'}
            </strong>
            <span className="text-amber-800 dark:text-amber-300">
              Sesuai aturan sistem, katalog menu tidak dapat digunakan untuk melayani transaksi. Harap Buka Toko terlebih dahulu di menu Buka / Tutup Toko.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              {isPrivileged
                ? 'Katalog Menu & Resep HPP (Master DC)'
                : `Katalog Menu Jual (${currentUser.cabang})`}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isPrivileged
              ? `Pengaturan Master Menu ${brandName}. HPP otomatis dihitung dari resep bahan baku, harga jual seragam untuk semua cabang.`
              : `Daftar menu resmi ${brandName}, harga jual konsumen, dan ketersediaan stok porsi di cabang Anda.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Badge for Kasir view indicator */}
          {!isPrivileged && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Mode Kasir (Harga Jual & Stok)</span>
            </div>
          )}

          <button
            onClick={() => onOpenPrintModal('katalog', { isPrivileged })}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Katalog A4</span>
          </button>

          {/* HANYA ROLE OWNER & ADMIN PUSAT YANG BISA MENAMBAH MENU */}
          {isPrivileged && (
            <button
              onClick={openAdd}
              className="px-3.5 py-2 brand-gradient hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Menu Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari kode atau nama menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-orange-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
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
          <div className="bg-white dark:bg-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500 text-xs shadow-xs">
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
                className="bg-white dark:bg-slate-900 rounded-[16px] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-sm transition space-y-3.5"
              >
                {/* Header Card: Kode, Nama, Kategori, Actions/Stok */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-black text-xs tracking-wider">
                        {menu.kode}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
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
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-bold">
                          {menu.promo_cabang_ids && menu.promo_cabang_ids.length > 0
                            ? `📍 ${menu.promo_cabang_ids.length} Cabang Target`
                            : '🌐 Semua Cabang'}
                        </span>
                      )}
                      {(() => {
                        const branchStatus = getMenuBranchStatus(menu.id, menu.cabang_ids);
                        if (branchStatus.isAll) {
                          return (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold">
                              🌐 Tampil di Semua Cabang
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[10px] font-bold">
                            📍 Tampil di {branchStatus.activeCount} cabang
                          </span>
                        );
                      })()}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 break-words whitespace-normal">
                      {menu.nama}
                    </h3>
                    {menu.deskripsi && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 break-words whitespace-normal leading-relaxed">
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
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 text-slate-700 dark:text-slate-200 hover:text-orange-700 dark:hover:text-orange-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
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
                          className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl transition cursor-pointer"
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
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : portions > 0
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {portions > 0 ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{portions} Porsi Tersedia</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50/80 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
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
                          <span className="text-base sm:text-lg font-black text-red-600 dark:text-red-400 break-words">
                            {formatRupiah(menu.harga_promo!)}
                          </span>
                          <span className="bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/60">
                            PROMO
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 break-words block">
                        {formatRupiah(menu.hargaJual)}
                      </span>
                    )}
                    {hasFreeMinuman && (
                      <div className="mt-1">
                        <span className="inline-block bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700/60">
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
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 break-words">
                        {formatRupiah(menu.hargaModal)}
                      </span>
                    </div>
                  )}

                  {isPrivileged && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        Keuntungan
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 break-words block">
                        {formatRupiah(menu.keuntungan)}
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                        {margin}% margin
                      </span>
                    </div>
                  )}

                  {!isPrivileged && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        Status Cabang
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 break-words">
                        {currentUser.cabang}
                      </span>
                    </div>
                  )}
                </div>

                {/* Recipe section if Privileged */}
                {isPrivileged && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Komposisi Resep Bahan Baku:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {menu.resep && menu.resep.length > 0 ? (
                        menu.resep.map((r, i) => {
                          const bhn = bahanBakuList.find((b) => b.id === r.bahanId);
                          return (
                            <span
                              key={i}
                              className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/60 text-orange-950 dark:text-orange-200 px-2.5 py-1 rounded-lg text-xs break-words whitespace-normal"
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

                {/* Toggle Cepat Per Cabang (Admin / Owner DC Pusat) */}
                {isPrivileged && dataCabangList.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Toggle Cepat Ketersediaan Cabang:
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Klik cabang untuk langsung aktif / nonaktifkan di POS
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {dataCabangList.map((branch) => {
                        const branchKey = branch.branchId || branch.id;
                        const branchStatus = getMenuBranchStatus(menu.id, menu.cabang_ids);
                        const isTampil = branchStatus.isActiveForBranch(branchKey, branch.nama);
                        return (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => {
                              if (onToggleMenuCabang) {
                                onToggleMenuCabang(menu.id, branchKey, !isTampil);
                              }
                            }}
                            title={`Klik untuk ${isTampil ? 'sembunyikan' : 'tampilkan'} di ${branch.nama}`}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                              isTampil
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isTampil ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{branch.nama}</span>
                            <span className="text-[9px] font-semibold opacity-75">
                              {isTampil ? '(Aktif)' : '(Nonaktif)'}
                            </span>
                          </button>
                        );
                      })}
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
          <div className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                {editingMenu ? `Edit Menu: ${editingMenu.nama}` : 'Tambah Menu Baru ke Katalog'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Kode Menu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SB-007"
                    value={kode}
                    onChange={(e) => setKode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Nama Menu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={`Contoh: Menu Spesial ${brandName}`}
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <BottomSheetPickerTrigger
                    label="Kategori Menu"
                    valueTitle={kategori}
                    onClick={() => setShowPickerKategori(true)}
                  />
                  <BottomSheetPicker
                    isOpen={showPickerKategori}
                    onClose={() => setShowPickerKategori(false)}
                    title="Pilih Kategori Menu"
                    selectedId={kategori}
                    onSelect={(opt) => setKategori(opt.id as any)}
                    options={[
                      { id: 'Seblak Kuah', title: 'Seblak Kuah', subtitle: 'Menu kuah gurih & pedas nampol' },
                      { id: 'Seblak Kering', title: 'Seblak Kering', subtitle: 'Menu seblak goreng rempah renyah' },
                      { id: 'Topping Tambahan', title: 'Topping Tambahan', subtitle: 'Pilihan aneka isian dan topping' },
                      { id: 'Minuman Segar', title: 'Minuman Segar', subtitle: 'Es teh, jus, dan pelepas dahaga' },
                      { id: 'Paket Hemat', title: 'Paket Hemat', subtitle: 'Bundling makan + minum hemat' },
                    ]}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Deskripsi Menu
                  </label>
                  <input
                    type="text"
                    placeholder="Keterangan singkat rasa atau isian..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* RECIPE BUILDER (ONLY FOR OWNER & ADMIN DC) */}
              <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      Komposisi Resep Bahan (Porsi 1 Menu)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                          className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-orange-200/80 dark:border-slate-700"
                        >
                          <div className="flex-1">
                            <button
                              type="button"
                              onClick={() => setResepPickerRowIndex(index)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50/50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-orange-400 rounded-lg text-xs text-left flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <span className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                                {bhn
                                  ? `${bhn.nama} (${formatRupiah(bhn.hargaBeli)}/${bhn.satuan})`
                                  : 'Pilih Bahan Baku...'}
                              </span>
                              <ChevronRight size={14} className="text-slate-400 shrink-0" />
                            </button>
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
                              className="w-16 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg text-xs text-center font-bold"
                            />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                              {bhn?.satuan || ''}
                            </span>
                          </div>

                          <div className="w-24 text-right font-extrabold text-slate-700 dark:text-slate-200 text-[11px]">
                            {formatRupiah(costThisRow)}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeResepRow(index)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BottomSheetPicker for selecting ingredient in recipe */}
                {resepPickerRowIndex !== null && (
                  <BottomSheetPicker
                    isOpen={resepPickerRowIndex !== null}
                    onClose={() => setResepPickerRowIndex(null)}
                    title={`Pilih Bahan Baku (Baris ${resepPickerRowIndex + 1})`}
                    selectedId={resepRows[resepPickerRowIndex]?.bahanId}
                    onSelect={(opt) => {
                      updateResepRow(resepPickerRowIndex, 'bahanId', String(opt.id));
                      setResepPickerRowIndex(null);
                    }}
                    options={bahanBakuList.map((b) => ({
                      id: b.id,
                      title: b.nama,
                      subtitle: `Stok DC: ${b.stokDC} ${b.satuan} • HPP: ${formatRupiah(b.hargaBeli)}/${b.satuan}`,
                      category: b.kategori || 'Bahan Makanan',
                      price: b.hargaBeli,
                    }))}
                  />
                )}
              </div>

              {/* CALCULATION & PRICING */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Harga Modal (HPP Otomatis)
                    </label>
                    <div className="p-2.5 bg-slate-200/80 dark:bg-slate-800 rounded-xl font-black text-slate-800 dark:text-slate-100 text-sm">
                      {formatRupiah(calculatedHpp)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      HARGA MENU / Jual (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={calculatedHpp}
                      value={hargaJual}
                      onChange={(e) => setHargaJual(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-black text-orange-600 dark:text-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Keuntungan Bersih / Porsi
                    </label>
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl font-black text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
                      <span>{formatRupiah(calculatedKeuntungan)}</span>
                      <span className="text-[10px] font-bold">({marginPercentage}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FITUR PROMO MENU (OPSIONAL) */}
              <div className="bg-rose-50/70 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">
                    Fitur Promo Menu (Opsional)
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Bisa aktif salah satu atau dua-duanya
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      1. Harga Promo (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Misal: 7000, 8000 (Kosongkan jika normal)"
                      value={hargaPromo}
                      onChange={(e) => setHargaPromo(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-700 dark:text-rose-300 placeholder:font-normal placeholder:text-slate-400 text-xs"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Jika diisi lebih murah dari harga normal, harga normal dicoret dan harga promo tampil merah besar + label PROMO.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      2. Free Minuman (Dropdown Searchable)
                    </label>

                    {/* Searchable Combobox */}
                    <div className="relative">
                      <div
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-amber-500"
                        onClick={() => setIsMinumanDropdownOpen((prev) => !prev)}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {freeMinumanId ? (
                            <>
                              <span className="font-bold text-amber-800 dark:text-amber-300 text-xs">
                                {beverageOptions.find((b) => b.id === freeMinumanId)?.nama || freeMinuman || 'Minuman Dipilih'}
                              </span>
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-extrabold px-1.5 py-0.5 rounded">
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
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-2 max-h-56 overflow-y-auto">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Cari minuman (Es Teh, Es Jeruk...)"
                              value={searchMinuman}
                              onChange={(e) => setSearchMinuman(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                              className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                !freeMinumanId ? 'bg-amber-50 dark:bg-amber-950/50 font-bold text-amber-900 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
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
                                  className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between hover:bg-amber-50 dark:hover:bg-slate-800 ${
                                    freeMinumanId === drink.id
                                      ? 'bg-amber-100/70 dark:bg-amber-950/50 font-bold text-amber-900 dark:text-amber-300'
                                      : 'text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  <div>
                                    <div className="font-semibold">{drink.nama}</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
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

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      Data otomatis diambil dari kategori <strong>Minuman Segar</strong>. Disimpan sebagai <code>free_minuman_id</code> dan stok bahan baku minuman akan dipotong saat transaksi.
                    </p>
                  </div>
                </div>

                {/* 3. Multi-Select Target Cabang Promo (Firebase: promo_cabang_ids) */}
                <div className="pt-3 border-t border-rose-200/80 dark:border-rose-900/50 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-100">
                        3. Target Cabang Promo (Multi-Select)
                      </label>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {promoCabangIds.length === 0
                          ? '🌟 Berlaku untuk SEMUA CABANG (array kosong / default)'
                          : `🎯 Khusus ${promoCabangIds.length} cabang terpilih`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPromoCabangIds([])}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                          promoCabangIds.length === 0
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                        className="px-2 py-1 text-[10px] font-bold rounded-lg border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
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
                              ? 'bg-rose-100/70 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 font-bold text-rose-950 dark:text-rose-200'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              ID: {branchKey} {branch.kode ? `• ${branch.kode}` : ''}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    * Disimpan di Firestore <code>katalog_menu.promo_cabang_ids</code>. Jika kosong <code>[]</code>, promo otomatis tampil di semua cabang. Jika diisi, kasir POS hanya menampilkan harga promo/free minuman di cabang yang dicentang.
                  </p>
                </div>
              </div>

              {/* 4. Multi-Select Cabang Ketersediaan Menu (Tabel: menu_cabang) */}
              <div className="p-4 bg-blue-50/80 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block text-xs font-black text-blue-950 dark:text-blue-200">
                      Ketersediaan Menu Per Cabang (Multi-Select Cabang)
                    </label>
                    <span className="text-[11px] text-blue-800 dark:text-blue-300">
                      {selectedMenuCabangIds.length === 0 || selectedMenuCabangIds.includes('ALL')
                        ? '🌐 [✓ Semua Cabang] — Menu tampil dan bisa dipesan di semua cabang'
                        : `📍 Khusus tampil di ${selectedMenuCabangIds.length} cabang terpilih`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMenuCabangIds([])}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        selectedMenuCabangIds.length === 0 || selectedMenuCabangIds.includes('ALL')
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      [✓ Semua Cabang]
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const allBranchKeys = dataCabangList.map((b) => b.branchId || b.id);
                        setSelectedMenuCabangIds(allBranchKeys);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      Pilih Semua Cabang
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {dataCabangList.map((branch) => {
                    const branchKey = branch.branchId || branch.id;
                    const isAll = selectedMenuCabangIds.length === 0 || selectedMenuCabangIds.includes('ALL');
                    const isChecked = isAll || selectedMenuCabangIds.includes(branchKey) || selectedMenuCabangIds.includes(branch.nama);
                    return (
                      <label
                        key={branch.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-blue-100/80 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 font-bold text-blue-950 dark:text-blue-200'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (isAll) {
                              // Transisi dari Semua Cabang ke cabang spesifik
                              const allKeys = dataCabangList.map((b) => b.branchId || b.id);
                              if (!e.target.checked) {
                                setSelectedMenuCabangIds(allKeys.filter((k) => k !== branchKey && k !== branch.nama));
                              }
                            } else {
                              if (e.target.checked) {
                                setSelectedMenuCabangIds((prev) => [...prev, branchKey]);
                              } else {
                                setSelectedMenuCabangIds((prev) =>
                                  prev.filter((id) => id !== branchKey && id !== branch.nama)
                                );
                              }
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs truncate font-bold">{branch.nama}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {branch.kode ? `Kode: ${branch.kode}` : `ID: ${branchKey}`}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <p className="text-[10px] text-blue-700 dark:text-blue-300 italic">
                  * Disimpan ke tabel <code>menu_cabang (menu_id, cabang_id, is_tampil)</code>. Saat user/kasir membuka POS di cabang tertentu, sistem memfilter menu: <code>WHERE cabang_id = cabang_aktif AND is_tampil = true</code>.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 brand-gradient hover:opacity-95 text-white font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
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
