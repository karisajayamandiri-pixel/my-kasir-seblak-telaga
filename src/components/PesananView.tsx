import React, { useState, useMemo } from 'react';
import {
  Clock,
  ChefHat,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  UtensilsCrossed,
  Truck,
  Search,
  Printer,
  User,
  Phone,
  MapPin,
  Flame,
  ArrowRight,
  Store,
  Check,
  Timer,
  Navigation,
  Wallet,
  X,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  Ban,
  AlertTriangle,
  Lock,
  ShieldCheck,
  Edit3,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  HelpCircle,
  Tag,
} from 'lucide-react';
import {
  Karyawan,
  Transaksi,
  StatusPesanan,
  TipePesanan,
  DataCabang,
  KatalogMenu,
  BahanBaku,
  StokCabangMap,
  TransaksiItem,
  LEVEL_PEDAS_OPTIONS,
  LevelPedas,
} from '../types';
import { formatRupiah } from '../utils/storage';
import { getBranchName, getStoreBranches } from '../utils/branchHelper';
import { PrintDocumentType } from './PrintModal';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface PesananViewProps {
  currentUser: Karyawan;
  transaksiList: Transaksi[];
  katalogList?: KatalogMenu[];
  bahanBakuList?: BahanBaku[];
  stokCabang?: StokCabangMap;
  onUpdateStatusPesanan: (
    trxId: string,
    status: StatusPesanan,
    paymentMeta?: { bayar?: number; kembali?: number; metodeBayar?: 'Cash' | 'QRIS' }
  ) => Transaksi | null | void;
  onBatalkanPesanan?: (trxId: string, alasan: string) => void;
  onEditPesananBelumBayar?: (
    trxId: string,
    updatedData: {
      items: TransaksiItem[];
      nomorMeja?: string;
      pelangganNama?: string;
      pelangganTelepon?: string;
      pelangganAlamat?: string;
      tipePesanan?: TipePesanan;
      ongkir?: number;
      jarakKm?: number;
    }
  ) => void;
  onVoidPesananLunas?: (
    oldTrxId: string,
    payload: {
      newItems: TransaksiItem[];
      nomorMeja?: string;
      pelangganNama?: string;
      pelangganTelepon?: string;
      pelangganAlamat?: string;
      alasanVoid: string;
      metodeBayarTambahan?: 'Cash' | 'QRIS';
      bayarTambahan?: number;
    }
  ) => { oldTrx: Transaksi; newTrx: Transaksi; selisih: number } | null | void;
  dataCabangList?: DataCabang[];
  onOpenPrintModal: (type: PrintDocumentType, data: any) => void;
  onNavigateToPos?: () => void;
}

// Normalisasi status pesanan agar kompatibel dengan data lama & alur 5-status final + DIVOID
export function normalizeStatusPesanan(
  status?: string,
  trxStatus?: string
): 'MENUNGGU' | 'DIPROSES' | 'SIAP ANTAR' | 'BELUM BAYAR' | 'LUNAS' | 'DIBATALKAN' | 'DIVOID' {
  const normStatus = (status || '').toUpperCase().trim();
  const cleanStatus = normStatus.replace(/[\s_-]+/g, '');
  const normTrx = (trxStatus || '').toUpperCase().trim();
  const cleanTrx = normTrx.replace(/[\s_-]+/g, '');

  if (cleanStatus === 'DIVOID' || cleanStatus === 'VOID' || cleanTrx === 'DIVOID') return 'DIVOID';
  if ((cleanTrx === 'RETUR' || cleanStatus === 'RETUR') && cleanStatus !== 'DIVOID') return 'DIBATALKAN';
  if (!normStatus) return 'MENUNGGU';

  if (cleanStatus === 'DIBATALKAN' || cleanStatus === 'BATAL' || cleanStatus === 'CANCEL' || cleanStatus === 'CANCELLED') return 'DIBATALKAN';
  if (cleanStatus === 'MENUNGGU' || cleanStatus === 'PENDING' || cleanStatus === 'ANTRI') return 'MENUNGGU';
  if (
    cleanStatus === 'DIPROSES' ||
    cleanStatus === 'DIPROSESDAPUR' ||
    cleanStatus === 'SEDANGDIBUAT' ||
    cleanStatus === 'COOKING' ||
    cleanStatus === 'PROSES' ||
    cleanStatus === 'MASAK'
  ) {
    return 'DIPROSES';
  }
  if (cleanStatus === 'SIAPANTAR' || cleanStatus === 'SIAP' || cleanStatus === 'READY' || cleanStatus === 'SIAPSAJI') {
    return 'SIAP ANTAR';
  }
  if (cleanStatus === 'BELUMBAYAR' || cleanStatus === 'UNPAID') return 'BELUM BAYAR';
  if (cleanStatus === 'LUNAS' || cleanStatus === 'SELESAI' || cleanStatus === 'PAID') return 'LUNAS';

  return 'MENUNGGU';
}

export function getStatusRank(status?: string): number {
  const norm = normalizeStatusPesanan(status);
  switch (norm) {
    case 'MENUNGGU': return 1;
    case 'DIPROSES': return 2;
    case 'SIAP ANTAR': return 3;
    case 'BELUM BAYAR': return 4;
    case 'LUNAS': return 5;
    default: return 0;
  }
}

export const PesananView: React.FC<PesananViewProps> = ({
  currentUser,
  transaksiList,
  katalogList = [],
  bahanBakuList = [],
  stokCabang = {},
  onUpdateStatusPesanan,
  onBatalkanPesanan,
  onEditPesananBelumBayar,
  onVoidPesananLunas,
  dataCabangList = [],
  onOpenPrintModal,
  onNavigateToPos,
}) => {
  const isDcPusatOrOwner =
    currentUser.cabang === 'DC PUSAT' || currentUser.jabatan === 'Owner';
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);

  const isOwnerOrAdminPusat =
    currentUser.jabatan === 'Owner' ||
    currentUser.cabang === 'DC PUSAT' ||
    currentUser.jabatan === 'Admin DC Pusat';

  const availableBranches = getStoreBranches(dataCabangList);

  // Filter States
  const [selectedCabang, setSelectedCabang] = useState<string>(
    isDcPusatOrOwner ? 'Semua' : currentBranchName || currentUser.cabang
  );
  const [showPickerCabang, setShowPickerCabang] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    'Semua' | 'MENUNGGU' | 'DIPROSES' | 'SIAP ANTAR' | 'BELUM BAYAR' | 'LUNAS' | 'DIBATALKAN' | 'DIVOID'
  >('Semua');
  const [filterTipe, setFilterTipe] = useState<TipePesanan | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment Modal State for "Bayar" (Take Away/Delivery) or "Bayar & Cetak Struk" (Dine In)
  const [paymentOrder, setPaymentOrder] = useState<Transaksi | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS'>('Cash');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashInputText, setCashInputText] = useState<string>('');

  // Cancellation Modal State (hanya untuk pesanan belum bayar)
  const [cancelTarget, setCancelTarget] = useState<Transaksi | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Modal State: Edit Pesanan Belum Bayar
  const [editTarget, setEditTarget] = useState<Transaksi | null>(null);
  const [editItems, setEditItems] = useState<TransaksiItem[]>([]);
  const [editNomorMeja, setEditNomorMeja] = useState<string>('');
  const [editPelangganNama, setEditPelangganNama] = useState<string>('');
  const [editPelangganTelepon, setEditPelangganTelepon] = useState<string>('');
  const [editPelangganAlamat, setEditPelangganAlamat] = useState<string>('');
  const [selectedKatalogToAdd, setSelectedKatalogToAdd] = useState<string>('');
  const [editMenuSearch, setEditMenuSearch] = useState<string>('');
  const [editMenuKategori, setEditMenuKategori] = useState<string>('Semua');
  const [editingEditPriceIdx, setEditingEditPriceIdx] = useState<number | null>(null);
  const [customEditPriceInput, setCustomEditPriceInput] = useState<string>('');

  // Modal State: Void & Ganti Pesanan Lunas
  const [voidTarget, setVoidTarget] = useState<Transaksi | null>(null);
  const [voidItems, setVoidItems] = useState<TransaksiItem[]>([]);
  const [voidNomorMeja, setVoidNomorMeja] = useState<string>('');
  const [voidPelangganNama, setVoidPelangganNama] = useState<string>('');
  const [voidPelangganTelepon, setVoidPelangganTelepon] = useState<string>('');
  const [voidPelangganAlamat, setVoidPelangganAlamat] = useState<string>('');
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidPaymentMethod, setVoidPaymentMethod] = useState<'Cash' | 'QRIS'>('Cash');
  const [voidCashInput, setVoidCashInput] = useState<string>('');
  const [voidCashAmount, setVoidCashAmount] = useState<number>(0);
  const [selectedKatalogToVoid, setSelectedKatalogToVoid] = useState<string>('');
  const [voidMenuSearch, setVoidMenuSearch] = useState<string>('');
  const [voidMenuKategori, setVoidMenuKategori] = useState<string>('Semua');
  const [editingVoidPriceIdx, setEditingVoidPriceIdx] = useState<number | null>(null);
  const [customVoidPriceInput, setCustomVoidPriceInput] = useState<string>('');

  // Orders for branch
  const branchFilteredList = useMemo(() => {
    return transaksiList.filter((t) => {
      if (selectedCabang !== 'Semua') {
        const tBranchName = getBranchName(t.cabang, dataCabangList);
        return tBranchName === selectedCabang || t.cabang === selectedCabang;
      }
      return true;
    });
  }, [transaksiList, selectedCabang, dataCabangList]);

  // Counts for each of the statuses
  const countMenunggu = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) === 'MENUNGGU').length,
    [branchFilteredList]
  );
  const countDiproses = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) === 'DIPROSES').length,
    [branchFilteredList]
  );
  const countSiapAntar = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) === 'SIAP ANTAR').length,
    [branchFilteredList]
  );
  const countBelumBayar = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) === 'BELUM BAYAR').length,
    [branchFilteredList]
  );
  const countLunas = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) === 'LUNAS').length,
    [branchFilteredList]
  );
  const countDibatalkan = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) === 'DIBATALKAN').length,
    [branchFilteredList]
  );
  const countDivoid = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) === 'DIVOID').length,
    [branchFilteredList]
  );

  // Active orders (non-dibatalkan & non-divoid) for total count in Semua tab
  const countAktif = useMemo(
    () =>
      branchFilteredList.filter((t) => {
        const s = normalizeStatusPesanan(t.statusPesanan, t.status);
        return s !== 'DIBATALKAN' && s !== 'DIVOID';
      }).length,
    [branchFilteredList]
  );

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return branchFilteredList.filter((t) => {
      const normStatus = normalizeStatusPesanan(t.statusPesanan, t.status);

      if (filterStatus === 'Semua') {
        if (normStatus === 'DIBATALKAN' || normStatus === 'DIVOID') return false;
      } else if (normStatus !== filterStatus) {
        return false;
      }

      const currentTipe = t.tipePesanan || 'Dine In';
      if (filterTipe !== 'Semua' && currentTipe !== filterTipe) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = t.invoiceNo.toLowerCase().includes(q);
        const matchPelanggan = t.pelangganNama?.toLowerCase().includes(q) || false;
        const matchTakeAwayId = t.takeAwayId?.toLowerCase().includes(q) || false;
        const matchMeja = t.nomorMeja?.toLowerCase().includes(q) || false;
        const matchNomorPesanan = t.nomorPesanan?.toLowerCase().includes(q) || false;
        const matchItem = t.items.some((i) => i.nama.toLowerCase().includes(q));

        if (
          !matchInvoice &&
          !matchPelanggan &&
          !matchTakeAwayId &&
          !matchMeja &&
          !matchNomorPesanan &&
          !matchItem
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(`${a.tanggal || ''}T${a.jam || '00:00:00'}`).getTime() || 0;
      const timeB = new Date(`${b.tanggal || ''}T${b.jam || '00:00:00'}`).getTime() || 0;
      return timeB - timeA;
    });
  }, [branchFilteredList, filterStatus, filterTipe, searchQuery]);

  // Kategori menu untuk picker menu pengganti
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    katalogList.forEach((k) => {
      if (k.kategori && k.kategori.trim()) {
        cats.add(k.kategori.trim());
      }
    });
    return ['Semua', ...Array.from(cats)];
  }, [katalogList]);

  // Filter katalog menu untuk modal Void
  const filteredVoidKatalog = useMemo(() => {
    return katalogList.filter((k) => {
      if (voidMenuKategori !== 'Semua' && k.kategori !== voidMenuKategori) {
        return false;
      }
      if (voidMenuSearch.trim()) {
        const q = voidMenuSearch.toLowerCase();
        const matchNama = k.nama.toLowerCase().includes(q);
        const matchKode = k.kode?.toLowerCase().includes(q) || false;
        const matchKategori = k.kategori?.toLowerCase().includes(q) || false;
        if (!matchNama && !matchKode && !matchKategori) return false;
      }
      return true;
    });
  }, [katalogList, voidMenuKategori, voidMenuSearch]);

  // Filter katalog menu untuk modal Edit (Pesanan Belum Bayar)
  const filteredEditKatalog = useMemo(() => {
    return katalogList.filter((k) => {
      if (editMenuKategori !== 'Semua' && k.kategori !== editMenuKategori) {
        return false;
      }
      if (editMenuSearch.trim()) {
        const q = editMenuSearch.toLowerCase();
        const matchNama = k.nama.toLowerCase().includes(q);
        const matchKode = k.kode?.toLowerCase().includes(q) || false;
        const matchKategori = k.kategori?.toLowerCase().includes(q) || false;
        if (!matchNama && !matchKode && !matchKategori) return false;
      }
      return true;
    });
  }, [katalogList, editMenuKategori, editMenuSearch]);

  // Elapsed time helper
  const getElapsedMinutes = (jam: string, tanggal: string): string => {
    try {
      const orderDate = new Date(`${tanggal}T${jam}`);
      const now = new Date();
      const diffMs = now.getTime() - orderDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      const hours = Math.floor(diffMins / 60);
      return `${hours} jam lalu`;
    } catch {
      return jam;
    }
  };

  // STEP 1 -> 2: Saat klik "Cetak Tiket"
  const handleCetakTiketDapur = (order: Transaksi) => {
    onOpenPrintModal('tiketDapur', order);
    onUpdateStatusPesanan(order.id, 'DIPROSES');
  };

  // STEP 2 -> 3: Saat dapur selesai, klik "Pesanan Siap"
  const handlePesananSiap = (order: Transaksi) => {
    onUpdateStatusPesanan(order.id, 'SIAP ANTAR');
  };

  // STEP 3 -> 4 (Dine In): Saat status SIAP ANTAR dan Dine In
  const handleAntarKeMeja = (order: Transaksi) => {
    onUpdateStatusPesanan(order.id, 'BELUM BAYAR');
  };

  // STEP 3/4 -> 5: Buka Modal Pembayaran Kasir
  const handleOpenPaymentModal = (order: Transaksi) => {
    setPaymentOrder(order);
    setPaymentMethod('Cash');
    setCashAmount(order.total);
    setCashInputText(order.total.toString());
  };

  // Quick cash setters
  const handleSetQuickCash = (amt: number) => {
    setCashAmount(amt);
    setCashInputText(amt.toString());
  };

  // Submit Payment in Modal
  const handleConfirmPayment = () => {
    if (!paymentOrder) return;

    const total = paymentOrder.total;
    let effectiveBayar = total;
    let kembalian = 0;

    if (paymentMethod === 'Cash') {
      if (cashAmount < total) {
        alert(
          `Nominal pembayaran kurang! Total tagihan adalah ${formatRupiah(total)}, tetapi uang diterima hanya ${formatRupiah(cashAmount)}.`
        );
        return;
      }
      effectiveBayar = cashAmount;
      kembalian = Math.max(0, cashAmount - total);
    }

    const updatedTrx = onUpdateStatusPesanan(paymentOrder.id, 'LUNAS', {
      metodeBayar: paymentMethod,
      bayar: effectiveBayar,
      kembali: kembalian,
    });

    const finalTrx: Transaksi =
      (updatedTrx as Transaksi) || {
        ...paymentOrder,
        statusPesanan: 'LUNAS',
        statusPembayaran: 'LUNAS',
        metodeBayar: paymentMethod,
        bayar: effectiveBayar,
        kembali: kembalian,
      };

    setPaymentOrder(null);
    onOpenPrintModal('struk', finalTrx);
  };

  // Trigger Cancel: Pesanan belum bayar bisa dibatalkan kasir. Pesanan lunas hanya bisa dibatalkan oleh Owner / Admin DC Pusat (atau gunakan Void & Ganti).
  const handleTriggerCancel = (order: Transaksi) => {
    const isPaid = order.statusPembayaran === 'LUNAS' || normalizeStatusPesanan(order.statusPesanan) === 'LUNAS';

    if (isPaid && !isOwnerOrAdminPusat) {
      alert(
        '⛔ Pesanan yang SUDAH LUNAS tidak bisa dibatalkan atau diedit oleh Crew Store!\nSesuai SOP, pesanan yang sudah lunas hanya bisa dibatalkan dengan otorisasi Owner atau Admin DC Pusat. Untuk menukar/mengganti pesanan pelanggan, silakan gunakan tombol "Void & Ganti".'
      );
      return;
    }

    setCancelTarget(order);
    setCancelReason(isPaid ? 'Pembatalan Pesanan Lunas (Otorisasi Khusus Owner / Admin DC Pusat)' : '');
  };

  // Konfirmasi Batalkan Pesanan
  const handleConfirmBatalPesanan = () => {
    if (!cancelTarget) return;
    const alasan = cancelReason.trim() || 'Dibatalkan oleh kasir';

    if (onBatalkanPesanan) {
      onBatalkanPesanan(cancelTarget.id, alasan);
    } else {
      onUpdateStatusPesanan(cancelTarget.id, 'DIBATALKAN');
    }

    setCancelTarget(null);
    setCancelReason('');
  };

  // --- HANDLER UBAH PESANAN BELUM BAYAR ---
  const handleOpenEditModal = (order: Transaksi) => {
    const isPaid = order.statusPembayaran === 'LUNAS' || normalizeStatusPesanan(order.statusPesanan) === 'LUNAS';
    if (isPaid) {
      alert('⛔ Pesanan yang sudah lunas TIDAK BISA diedit langsung!\nSilakan gunakan tombol "Void & Ganti" untuk memproses perubahan pesanan lunas.');
      return;
    }
    setEditTarget(order);
    setEditItems(order.items.map((i) => ({ ...i })));
    setEditNomorMeja(order.nomorMeja || '');
    setEditPelangganNama(order.pelangganNama || '');
    setEditPelangganTelepon(order.pelangganTelepon || '');
    setEditPelangganAlamat(order.pelangganAlamat || '');
    setSelectedKatalogToAdd('');
    setEditMenuSearch('');
    setEditMenuKategori('Semua');
    setEditingEditPriceIdx(null);
    setCustomEditPriceInput('');
  };

  const handleAddItemToEdit = (menuId: string, customPrice?: number) => {
    const menu = katalogList.find((k) => k.id === menuId);
    if (!menu) return;
    const itemPrice = customPrice !== undefined ? customPrice : menu.hargaJual;
    setEditItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.katalogId === menu.id && (!i.levelPedas || i.levelPedas === 'Original') && i.harga === itemPrice
      );
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.harga }
            : item
        );
      }
      return [
        ...prev,
        {
          katalogId: menu.id,
          kode: menu.kode,
          nama: menu.nama,
          harga: itemPrice,
          hargaModal: menu.hargaModal || 0,
          qty: 1,
          subtotal: itemPrice,
          levelPedas: 'Original',
          resep: menu.resep || [],
        },
      ];
    });
    setSelectedKatalogToAdd('');
  };

  const handleUpdateEditItemQty = (idx: number, delta: number) => {
    setEditItems((prev) =>
      prev
        .map((item, i) => {
          if (i !== idx) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null as any;
          return {
            ...item,
            qty: newQty,
            subtotal: newQty * item.harga,
          };
        })
        .filter(Boolean)
    );
  };

  const handleUpdateEditItemPrice = (idx: number, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setEditItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          harga: newPrice,
          subtotal: item.qty * newPrice,
        };
      })
    );
    setEditingEditPriceIdx(null);
  };

  const handleResetEditItemPrice = (idx: number) => {
    const item = editItems[idx];
    if (!item) return;
    const menu = katalogList.find((k) => k.id === item.katalogId);
    const normalPrice = menu ? menu.hargaJual : item.harga;
    handleUpdateEditItemPrice(idx, normalPrice);
  };

  const handleRemoveEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingEditPriceIdx === idx) {
      setEditingEditPriceIdx(null);
    }
  };

  const handleUpdateEditItemLevel = (idx: number, level: string) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, levelPedas: level } : item))
    );
  };

  const handleUpdateEditItemCatatan = (idx: number, note: string) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, catatan: note } : item))
    );
  };

  const handleConfirmEditOrder = () => {
    if (!editTarget || !onEditPesananBelumBayar) return;
    if (editItems.length === 0) {
      alert('Pesanan harus memiliki minimal 1 item menu!');
      return;
    }
    onEditPesananBelumBayar(editTarget.id, {
      items: editItems,
      nomorMeja: editNomorMeja.trim() || undefined,
      pelangganNama: editPelangganNama.trim() || undefined,
      pelangganTelepon: editPelangganTelepon.trim() || undefined,
      pelangganAlamat: editPelangganAlamat.trim() || undefined,
    });
    setEditTarget(null);
  };

  // --- HANDLER VOID & GANTI PESANAN LUNAS ---
  const handleOpenVoidModal = (order: Transaksi) => {
    const isPaid = order.statusPembayaran === 'LUNAS' || normalizeStatusPesanan(order.statusPesanan) === 'LUNAS';
    if (!isPaid) {
      alert('Pesanan belum lunas dapat langsung diedit atau dibatalkan tanpa proses void.');
      return;
    }
    setVoidTarget(order);
    setVoidItems(order.items.map((i) => ({ ...i })));
    setVoidNomorMeja(order.nomorMeja || '');
    setVoidPelangganNama(order.pelangganNama || '');
    setVoidPelangganTelepon(order.pelangganTelepon || '');
    setVoidPelangganAlamat(order.pelangganAlamat || '');
    setVoidReason('Pelanggan ganti varian menu');
    setVoidPaymentMethod('Cash');
    setVoidCashInput('');
    setVoidCashAmount(0);
    setSelectedKatalogToVoid('');
    setVoidMenuSearch('');
    setVoidMenuKategori('Semua');
    setEditingVoidPriceIdx(null);
    setCustomVoidPriceInput('');
  };

  const handleAddItemToVoid = (menuId: string, customPrice?: number) => {
    const menu = katalogList.find((k) => k.id === menuId);
    if (!menu) return;
    const itemPrice = customPrice !== undefined ? customPrice : menu.hargaJual;
    setVoidItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.katalogId === menu.id && (!i.levelPedas || i.levelPedas === 'Original') && i.harga === itemPrice
      );
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.harga }
            : item
        );
      }
      return [
        ...prev,
        {
          katalogId: menu.id,
          kode: menu.kode,
          nama: menu.nama,
          harga: itemPrice,
          hargaModal: menu.hargaModal || 0,
          qty: 1,
          subtotal: itemPrice,
          levelPedas: 'Original',
          resep: menu.resep || [],
        },
      ];
    });
    setSelectedKatalogToVoid('');
  };

  const handleUpdateVoidItemQty = (idx: number, delta: number) => {
    setVoidItems((prev) =>
      prev
        .map((item, i) => {
          if (i !== idx) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null as any;
          return {
            ...item,
            qty: newQty,
            subtotal: newQty * item.harga,
          };
        })
        .filter(Boolean)
    );
  };

  const handleUpdateVoidItemPrice = (idx: number, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setVoidItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return {
          ...item,
          harga: newPrice,
          subtotal: item.qty * newPrice,
        };
      })
    );
    setEditingVoidPriceIdx(null);
  };

  const handleResetVoidItemPrice = (idx: number) => {
    const item = voidItems[idx];
    if (!item) return;
    const menu = katalogList.find((k) => k.id === item.katalogId);
    const normalPrice = menu ? menu.hargaJual : item.harga;
    handleUpdateVoidItemPrice(idx, normalPrice);
  };

  const handleRemoveVoidItem = (idx: number) => {
    setVoidItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingVoidPriceIdx === idx) {
      setEditingVoidPriceIdx(null);
    }
  };

  const handleUpdateVoidItemLevel = (idx: number, level: string) => {
    setVoidItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, levelPedas: level } : item))
    );
  };

  const handleUpdateVoidItemCatatan = (idx: number, note: string) => {
    setVoidItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, catatan: note } : item))
    );
  };

  const handleConfirmVoidOrder = () => {
    if (!voidTarget || !onVoidPesananLunas) return;
    if (voidItems.length === 0) {
      alert('Pesanan baru harus memiliki minimal 1 menu!');
      return;
    }
    if (!voidReason.trim()) {
      alert('Harap isi alasan void pesanan!');
      return;
    }

    const oldTotal = voidTarget.total;
    const newSubtotal = voidItems.reduce((acc, i) => acc + i.subtotal, 0);
    const newOngkir = voidTarget.ongkir || 0;
    const newTotal = newSubtotal + newOngkir;
    const selisih = newTotal - oldTotal;

    const effectiveCash =
      voidPaymentMethod === 'Cash'
        ? (voidCashAmount > 0 ? voidCashAmount : (selisih > 0 ? selisih : 0))
        : selisih;

    if (selisih > 0 && voidPaymentMethod === 'Cash' && effectiveCash < selisih) {
      alert(
        `Nominal tagihan tambahan kurang! Kekurangan biaya adalah ${formatRupiah(selisih)}, sedangkan uang diterima ${formatRupiah(effectiveCash)}.`
      );
      return;
    }

    const result = onVoidPesananLunas(voidTarget.id, {
      newItems: voidItems,
      nomorMeja: voidNomorMeja.trim() || undefined,
      pelangganNama: voidPelangganNama.trim() || undefined,
      pelangganTelepon: voidPelangganTelepon.trim() || undefined,
      pelangganAlamat: voidPelangganAlamat.trim() || undefined,
      alasanVoid: voidReason.trim(),
      metodeBayarTambahan: voidPaymentMethod,
      bayarTambahan: selisih > 0 ? effectiveCash : 0,
    });

    setVoidTarget(null);

    if (result && result.newTrx) {
      onOpenPrintModal('tiketDapur', result.newTrx);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                Menu Pesanan
              </h2>
              <p className="text-xs text-slate-500">
                Alur 5 Status: MENUNGGU ➔ DIPROSES ➔ SIAP ANTAR ➔ BELUM BAYAR (Dine In) ➔ LUNAS
              </p>
            </div>
          </div>
        </div>

        {/* Action: Open POS */}
        <div className="flex items-center gap-2">
          {onNavigateToPos && (
            <button
              type="button"
              onClick={onNavigateToPos}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Input Pesanan Baru (POS)</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {/* SEMUA AKTIF */}
        <button
          type="button"
          onClick={() => setFilterStatus('Semua')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'Semua'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">Semua</span>
            <UtensilsCrossed className="w-3.5 h-3.5 opacity-70" />
          </div>
          <div className="text-xl font-black mt-1.5">{countAktif}</div>
          <span className="text-[10px] opacity-70 block truncate">Pesanan Aktif</span>
        </button>

        {/* 1. MENUNGGU (Abu-abu) */}
        <button
          type="button"
          onClick={() => setFilterStatus('MENUNGGU')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'MENUNGGU'
              ? 'bg-slate-700 text-white border-slate-700 shadow-sm ring-2 ring-slate-600/30'
              : 'bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">1. Menunggu</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-black mt-1.5">{countMenunggu}</div>
          <span className="text-[10px] text-slate-500 block truncate">Cetak Tiket</span>
        </button>

        {/* 2. DIPROSES (Kuning) */}
        <button
          type="button"
          onClick={() => setFilterStatus('DIPROSES')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'DIPROSES'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-400/30'
              : 'bg-amber-50 border-amber-300 hover:border-amber-400 text-amber-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">2. Diproses</span>
            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black mt-1.5 text-amber-900">{countDiproses}</div>
          <span className="text-[10px] text-amber-700 block truncate">Masak Dapur</span>
        </button>

        {/* 3. SIAP ANTAR (Hijau) */}
        <button
          type="button"
          onClick={() => setFilterStatus('SIAP ANTAR')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'SIAP ANTAR'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30'
              : 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 text-emerald-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">3. Siap Antar</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black mt-1.5 text-emerald-900">{countSiapAntar}</div>
          <span className="text-[10px] text-emerald-700 block truncate">Antar / Serah</span>
        </button>

        {/* 4. BELUM BAYAR (Merah) */}
        <button
          type="button"
          onClick={() => setFilterStatus('BELUM BAYAR')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'BELUM BAYAR'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/30'
              : 'bg-rose-50 border-rose-300 hover:border-rose-400 text-rose-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">4. Belum Bayar</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black mt-1.5 text-rose-900">{countBelumBayar}</div>
          <span className="text-[10px] text-rose-700 block truncate">Dine In Meja</span>
        </button>

        {/* 5. LUNAS (Biru) */}
        <button
          type="button"
          onClick={() => setFilterStatus('LUNAS')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'LUNAS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30'
              : 'bg-blue-50 border-blue-300 hover:border-blue-400 text-blue-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">5. Lunas</span>
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black mt-1.5 text-blue-900">{countLunas}</div>
          <span className="text-[10px] text-blue-700 block truncate">Selesai & Struk</span>
        </button>

        {/* Tab DIVOID (Ungu) */}
        <button
          type="button"
          onClick={() => setFilterStatus('DIVOID')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'DIVOID'
              ? 'bg-purple-900 text-white border-purple-900 shadow-sm ring-2 ring-purple-700/30'
              : 'bg-purple-50/70 border-purple-200 hover:border-purple-300 text-purple-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">Divoid</span>
            <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black mt-1.5 text-purple-900">{countDivoid}</div>
          <span className="text-[10px] text-purple-700 block truncate">Diganti Baru</span>
        </button>

        {/* Tab Dibatalkan */}
        <button
          type="button"
          onClick={() => setFilterStatus('DIBATALKAN')}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
            filterStatus === 'DIBATALKAN'
              ? 'bg-rose-950 text-white border-rose-950 shadow-sm ring-2 ring-rose-800/30'
              : 'bg-rose-50/50 border-rose-200 hover:border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dibatalkan</span>
            <Ban className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black mt-1.5 text-rose-900">{countDibatalkan}</div>
          <span className="text-[10px] text-rose-600 block truncate">Stok Kembali</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari No. Meja, Nama, Invoice, Menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Branch selector for Owner / DC via BottomSheetPicker */}
            {isDcPusatOrOwner ? (
              <div className="w-auto">
                <BottomSheetPickerTrigger
                  valueTitle={selectedCabang === 'Semua' ? 'Semua Cabang' : selectedCabang}
                  onClick={() => setShowPickerCabang(true)}
                  size="sm"
                  icon={<Store className="w-3.5 h-3.5 text-orange-600" />}
                  className="min-w-[130px]"
                />
                <BottomSheetPicker
                  isOpen={showPickerCabang}
                  onClose={() => setShowPickerCabang(false)}
                  title="Pilih Cabang Pesanan"
                  selectedId={selectedCabang}
                  onSelect={(opt) => setSelectedCabang(String(opt.id))}
                  options={[
                    { id: 'Semua', title: 'Semua Cabang', subtitle: 'Tampilkan pesanan seluruh cabang', badge: 'Semua' },
                    ...availableBranches.map((b) => ({
                      id: b.nama,
                      title: b.nama,
                      subtitle: b.alamat || 'Cabang Toko Resmi',
                    })),
                  ]}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-800 rounded-xl text-xs font-bold border border-orange-200">
                <Store className="w-3.5 h-3.5 text-orange-600" />
                <span>Cabang: {currentBranchName}</span>
              </div>
            )}

            {/* Filter Tipe Pesanan */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['Semua', 'Dine In', 'Take Away', 'Delivery Order'] as const).map(
                (tipe) => (
                  <button
                    key={tipe}
                    type="button"
                    onClick={() => setFilterTipe(tipe)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      filterTipe === tipe
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tipe === 'Semua' ? 'Semua Tipe' : tipe}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Orders List / Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full mx-auto flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h3 className="font-black text-slate-800 text-base">
            Tidak Ada Pesanan
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterStatus === 'DIBATALKAN'
              ? 'Belum ada pesanan yang dibatalkan pada cabang ini.'
              : 'Belum ada antrean pesanan yang cocok dengan filter ini. Transaksi baru yang diinput kasir otomatis masuk ke antrean secara real-time.'}
          </p>
          {onNavigateToPos && (
            <button
              onClick={onNavigateToPos}
              className="mt-2 px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Input Pesanan Baru (POS)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const status = normalizeStatusPesanan(order.statusPesanan, order.status);
            const tipe = order.tipePesanan || 'Dine In';
            const elapsed = getElapsedMinutes(order.jam, order.tanggal);
            const isOrderPaid =
              order.statusPembayaran === 'LUNAS' || status === 'LUNAS';

            // Styling based on statuses
            const cardTheme = {
              MENUNGGU: {
                border: 'border-slate-300 ring-1 ring-slate-200',
                bar: 'bg-slate-400',
                badge: 'bg-slate-100 text-slate-800 border-slate-300',
                badgeText: 'MENUNGGU',
              },
              DIPROSES: {
                border: 'border-amber-300 ring-1 ring-amber-200',
                bar: 'bg-amber-400',
                badge: 'bg-amber-100 text-amber-900 border-amber-300',
                badgeText: 'DI PROSES',
              },
              'SIAP ANTAR': {
                border: 'border-emerald-300 ring-1 ring-emerald-200',
                bar: 'bg-emerald-500',
                badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                badgeText: 'SIAP ANTAR',
              },
              'BELUM BAYAR': {
                border: 'border-rose-300 ring-1 ring-rose-200',
                bar: 'bg-rose-500',
                badge: 'bg-rose-100 text-rose-900 border-rose-300',
                badgeText: 'BELUM BAYAR',
              },
              LUNAS: {
                border: 'border-blue-200',
                bar: 'bg-blue-500',
                badge: 'bg-blue-100 text-blue-900 border-blue-300',
                badgeText: 'LUNAS',
              },
              DIBATALKAN: {
                border: 'border-slate-200 bg-slate-50/50 opacity-80',
                bar: 'bg-rose-600',
                badge: 'bg-rose-100 text-rose-900 border-rose-300',
                badgeText: 'DIBATALKAN',
              },
              DIVOID: {
                border: 'border-purple-300 bg-purple-50/20 ring-1 ring-purple-200 opacity-90',
                bar: 'bg-purple-600',
                badge: 'bg-purple-100 text-purple-900 border-purple-300',
                badgeText: 'DIVOID',
              },
            }[status] || {
              border: 'border-slate-300',
              bar: 'bg-slate-400',
              badge: 'bg-slate-100 text-slate-800 border-slate-300',
              badgeText: status,
            };

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border flex flex-col justify-between shadow-xs hover:shadow-md transition overflow-hidden relative ${cardTheme.border}`}
              >
                {/* Status Bar Indicator */}
                <div className={`h-1.5 w-full ${cardTheme.bar}`} />

                <div className="p-4 space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      {/* Priority Tag for Order Number / Table / Take Away / Delivery */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {order.nomorPesanan && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white font-black text-xs shadow-xs">
                            {order.nomorPesanan}
                          </span>
                        )}

                        {order.voidDariInvoice && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px] border border-purple-200 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3 text-purple-600" />
                            <span>Ganti Void #{order.voidDariInvoice.slice(-6)}</span>
                          </span>
                        )}

                        {/* Dine In Table Number */}
                        {tipe === 'Dine In' && order.nomorMeja && (
                          <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-black text-xs border border-purple-200 flex items-center gap-1">
                            <span>Meja {order.nomorMeja}</span>
                          </span>
                        )}

                        {tipe === 'Dine In' && !order.nomorMeja && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1">
                            <UtensilsCrossed className="w-3 h-3 text-slate-600" />
                            <span>DINE IN</span>
                          </span>
                        )}

                        {tipe === 'Take Away' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[11px] flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3 text-amber-700" />
                            <span>{order.takeAwayId ? `ID: ${order.takeAwayId}` : 'TAKE AWAY'}</span>
                          </span>
                        )}

                        {tipe === 'Delivery Order' && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-black text-[11px] flex items-center gap-1">
                            <Truck className="w-3 h-3 text-blue-700" />
                            <span>DELIVERY{order.jarakKm !== undefined ? ` (${order.jarakKm} km)` : ''}</span>
                          </span>
                        )}

                        {/* Status Pembayaran Badge Prominent */}
                        {status === 'DIVOID' ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 font-black text-[10px] flex items-center gap-1 shadow-xs">
                            <RotateCcw className="w-3 h-3 text-purple-600" />
                            <span>DIVOID</span>
                          </span>
                        ) : isOrderPaid ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-[10px] flex items-center gap-1 shadow-xs">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>LUNAS ({order.metodeBayar || 'Kasir'})</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>BELUM BAYAR</span>
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          #{order.invoiceNo.slice(-6)}
                        </span>
                      </div>

                      {/* Customer Name prominent */}
                      <div className="flex items-center gap-1 font-black text-slate-800 text-sm">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.pelangganNama || 'Pelanggan Kasir'}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${cardTheme.badge}`}
                      >
                        {status === 'MENUNGGU' && <Clock className="w-3 h-3" />}
                        {status === 'DIPROSES' && <ChefHat className="w-3 h-3 animate-bounce" />}
                        {status === 'SIAP ANTAR' && <CheckCircle className="w-3 h-3" />}
                        {status === 'BELUM BAYAR' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                        {status === 'LUNAS' && <Check className="w-3 h-3 text-blue-600" />}
                        {status === 'DIBATALKAN' && <Ban className="w-3 h-3 text-rose-600" />}
                        {status === 'DIVOID' && <RotateCcw className="w-3 h-3 text-purple-600" />}
                        <span>{cardTheme.badgeText}</span>
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                        <Timer className="w-3 h-3" />
                        <span>{elapsed}</span>
                      </div>
                    </div>
                  </div>

                  {/* DIVOID Info Banner & Audit Menu Lama vs Menu Pengganti */}
                  {status === 'DIVOID' && (() => {
                    const replacementOrder = transaksiList.find(
                      (t) => t.invoiceNo === order.voidKeInvoice || t.voidDariInvoice === order.invoiceNo
                    );
                    const newItems = order.itemsPengganti || replacementOrder?.items || [];
                    const newTotal = order.totalPengganti || replacementOrder?.total;

                    return (
                      <div className="p-3 bg-purple-50/90 border border-purple-200 rounded-2xl space-y-2.5 text-xs text-purple-950">
                        <div className="flex items-center justify-between border-b border-purple-200/80 pb-1.5">
                          <div className="font-black flex items-center gap-1.5 text-purple-900">
                            <RotateCcw className="w-4 h-4 text-purple-600 shrink-0" />
                            <span>Audit Transaksi DIVOID</span>
                          </div>
                          {order.voidKeInvoice && (
                            <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md">
                              ➔ Baru #{order.voidKeInvoice.slice(-6)}
                            </span>
                          )}
                        </div>

                        {/* Status Selisih: Tagihan / Kembalian */}
                        {order.selisihVoid !== undefined && (
                          <div
                            className={`p-2 rounded-xl text-xs font-black flex items-center justify-between border ${
                              order.selisihVoid < 0
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                                : order.selisihVoid > 0
                                ? 'bg-amber-100 text-amber-950 border-amber-300'
                                : 'bg-blue-100 text-blue-950 border-blue-300'
                            }`}
                          >
                            <span>
                              {order.selisihVoid < 0
                                ? 'KEMBALIAN (Uang ke Pelanggan):'
                                : order.selisihVoid > 0
                                ? 'TAGIHAN (Kekurangan Dibayar):'
                                : 'SELISIH BIAYA:'}
                            </span>
                            <span className="text-sm">
                              {order.selisihVoid === 0
                                ? 'Rp 0 (Pas)'
                                : formatRupiah(Math.abs(order.selisihVoid))}
                            </span>
                          </div>
                        )}

                        {/* Perbandingan Menu Lama vs Menu Pengganti */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2 bg-white/80 rounded-xl border border-purple-200 space-y-1">
                            <span className="text-[10px] font-black uppercase text-slate-500 block">
                              Menu Lama ({order.items.reduce((acc, i) => acc + i.qty, 0)}):
                            </span>
                            <div className="space-y-0.5 text-[11px]">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-slate-700">
                                  <span className="truncate pr-1">{it.qty}x {it.nama}</span>
                                  <span className="font-bold shrink-0">{formatRupiah(it.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-1 border-t border-slate-200 flex justify-between font-black text-[11px] text-slate-800">
                              <span>Total Lama:</span>
                              <span>{formatRupiah(order.total)}</span>
                            </div>
                          </div>

                          <div className="p-2 bg-white/80 rounded-xl border border-purple-200 space-y-1">
                            <span className="text-[10px] font-black uppercase text-purple-700 block">
                              Menu Pengganti ({newItems.reduce((acc: number, i: any) => acc + i.qty, 0)}):
                            </span>
                            {newItems.length > 0 ? (
                              <>
                                <div className="space-y-0.5 text-[11px]">
                                  {newItems.map((it: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-purple-900">
                                      <span className="truncate pr-1">{it.qty}x {it.nama}</span>
                                      <span className="font-bold shrink-0">{formatRupiah(it.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-1 border-t border-purple-200 flex justify-between font-black text-[11px] text-purple-950">
                                  <span>Total Baru:</span>
                                  <span>{newTotal ? formatRupiah(newTotal) : '-'}</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">Lihat #{order.voidKeInvoice}</p>
                            )}
                          </div>
                        </div>

                        {order.keteranganVoid && (
                          <p className="text-[11px] text-purple-900 italic font-medium pt-1 border-t border-purple-200">
                            Alasan: "{order.keteranganVoid}"
                          </p>
                        )}
                        <p className="text-[10px] text-purple-700 font-medium">
                          *Pesanan lama dikunci dan tersimpan permanen di database untuk audit.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Canceled Info Banner */}
                  {status === 'DIBATALKAN' && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Pesanan Dibatalkan</span>
                      </div>
                      {order.alasanRetur && (
                        <p className="text-[11px] text-rose-800 italic">
                          Alasan: "{order.alasanRetur}"
                        </p>
                      )}
                      <p className="text-[10px] text-rose-700">
                        *Stok bahan & kemasan telah dikembalikan ke cabang.
                      </p>
                    </div>
                  )}

                  {/* Delivery Specific Meta */}
                  {tipe === 'Delivery Order' && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1 text-xs text-blue-900">
                      {order.jarakKm !== undefined && (
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-blue-600" />
                            <span>
                              Jarak:{' '}
                              {order.jarakKm < 1
                                ? `${order.jarakKm} km (${Math.round(order.jarakKm * 1000)} m)`
                                : `${order.jarakKm} km`}
                            </span>
                          </span>
                          <span className="text-blue-700 font-black">
                            Ongkir: {order.ongkir === 0 ? 'GRATIS' : formatRupiah(order.ongkir || 0)}
                          </span>
                        </div>
                      )}
                      {order.pelangganAlamat && (
                        <div className="flex items-start gap-1 text-[11px] leading-relaxed">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{order.pelangganAlamat}</span>
                        </div>
                      )}
                      {order.pelangganTelepon && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-800">
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span>{order.pelangganTelepon}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-1.5 py-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Rincian Menu ({order.items.reduce((acc, i) => acc + i.qty, 0)} item):
                    </span>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-800 flex items-center justify-center font-black text-[10px]">
                                {item.qty}x
                              </span>
                              <span>{item.nama}</span>
                            </div>

                            {item.levelPedas !== undefined && (
                              <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 pl-6">
                                <Flame className="w-3 h-3 fill-red-500" />
                                <span>Level: {item.levelPedas}</span>
                              </div>
                            )}

                            {item.catatan && (
                              <div className="text-[10px] text-amber-700 italic pl-6">
                                *{item.catatan}
                              </div>
                            )}
                          </div>

                          <div className="text-right text-[11px] font-bold text-slate-700 shrink-0">
                            {formatRupiah(item.subtotal)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Tagihan & Status Pembayaran Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Tagihan</span>
                      <span className="font-black text-slate-800 text-sm">
                        {formatRupiah(order.total)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Status Pembayaran</span>
                      <span
                        className={`font-black text-xs ${
                          status === 'DIVOID'
                            ? 'text-purple-700'
                            : status === 'DIBATALKAN'
                            ? 'text-rose-600'
                            : isOrderPaid
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {status === 'DIVOID'
                          ? 'DIVOID'
                          : status === 'DIBATALKAN'
                          ? 'DIBATALKAN'
                          : isOrderPaid
                          ? `LUNAS (${order.metodeBayar || 'Kasir'})`
                          : 'BELUM BAYAR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {/* Status DIVOID */}
                  {status === 'DIVOID' && (
                    <div className="flex-1 py-2 px-3 bg-purple-50 text-purple-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-purple-200">
                      <RotateCcw className="w-4 h-4 text-purple-600" />
                      <span>Di-VOID {order.voidKeInvoice ? `(Diganti #${order.voidKeInvoice})` : ''}</span>
                    </div>
                  )}

                  {/* Status DIBATALKAN */}
                  {status === 'DIBATALKAN' && (
                    <div className="flex-1 py-2 px-3 bg-rose-50 text-rose-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-rose-200">
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span>Pesanan Telah Dibatalkan</span>
                    </div>
                  )}

                  {/* Status AKTIF: 1. MENUNGGU -> Tombol "Cetak Tiket", Ubah & Batal (jika belum bayar), atau "Void & Ganti" (jika sudah lunas & belum divoid) */}
                  {status === 'MENUNGGU' && (
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleCetakTiketDapur(order)}
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                        title="Cetak Tiket Dapur & Masuk Status DI PROSES"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>Cetak Tiket</span>
                      </button>

                      {/* Jika BELUM BAYAR: Kasir bisa ubah menu atau batalkan */}
                      {!isOrderPaid && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(order)}
                            className="py-2.5 px-3 bg-white hover:bg-amber-50 text-amber-700 border border-slate-200 hover:border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                            title="Ubah Pesanan (Belum Bayar: Tambah/Kurang Menu)"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden sm:inline">Ubah</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTriggerCancel(order)}
                            className="p-2.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-xl transition cursor-pointer"
                            title="Batalkan Pesanan Belum Bayar (Kembalikan Stok Bahan)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Requirement 3 & 7: Jika SUDAH LUNAS di status MENUNGGU, bisa di-VOID jika belum pernah divoid (hanya 1x void) */}
                      {isOrderPaid && !order.voidDariInvoice && (
                        <button
                          type="button"
                          onClick={() => handleOpenVoidModal(order)}
                          className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                          title="Void & Ganti Pesanan (Pesanan Lunas di Status Menunggu: Hitung Selisih Kembalian/Tagihan)"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                          <span>Void & Ganti</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Status AKTIF: 2. DIPROSES -> Tombol "Pesanan Siap" + Cetak Ulang Tiket */}
                  {status === 'DIPROSES' && (
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handlePesananSiap(order)}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                        title="Klik jika dapur selesai memasak -> Masuk Status SIAP ANTAR"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Pesanan Siap</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPrintModal('tiketDapur', order)}
                        className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                        title="Cetak Ulang Tiket Dapur"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Status AKTIF: 3. SIAP ANTAR */}
                  {status === 'SIAP ANTAR' && (
                    <div className="flex items-center gap-1.5 w-full">
                      {isOrderPaid ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = onUpdateStatusPesanan(order.id, 'LUNAS');
                            onOpenPrintModal('struk', updated || { ...order, statusPesanan: 'LUNAS', statusPembayaran: 'LUNAS' });
                          }}
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{tipe === 'Dine In' ? 'Antar ke Meja (Lunas)' : 'Serahkan & Cetak Struk'}</span>
                        </button>
                      ) : (
                        tipe === 'Dine In' ? (
                          <button
                            type="button"
                            onClick={() => handleAntarKeMeja(order)}
                            className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                          >
                            <UtensilsCrossed className="w-4 h-4" />
                            <span>Antar ke Meja</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(order)}
                            className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                          >
                            <Wallet className="w-4 h-4" />
                            <span>Bayar</span>
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => onOpenPrintModal('tiketDapur', order)}
                        className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                        title="Cetak Ulang Tiket Dapur"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Status AKTIF: 4. BELUM BAYAR (Dine In) -> Tombol "Bayar & Cetak Struk" & Ubah/Batal */}
                  {status === 'BELUM BAYAR' && (
                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(order)}
                        className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95 animate-pulse"
                      >
                        <Receipt className="w-4 h-4" />
                        <span>Bayar & Cetak Struk</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(order)}
                        className="py-2.5 px-3 bg-white hover:bg-amber-50 text-amber-700 border border-slate-200 hover:border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
                        title="Ubah Pesanan (Belum Bayar: Tambah/Kurang Menu)"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden sm:inline">Ubah</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerCancel(order)}
                        className="p-2.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-xl transition cursor-pointer"
                        title="Batalkan Pesanan Belum Bayar"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Requirement 8: Status AKTIF 5. LUNAS (Tahap Akhir) -> HANYA Tombol CETAK STRUK. TIDAK ADA tombol DIVOID, CANCEL, atau HAPUS! */}
                  {status === 'LUNAS' && (
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 py-2.5 px-3 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-200">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Transaksi Lunas Selesai</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenPrintModal('struk', order)}
                        className="py-2.5 px-3 bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                        title="Cetak Struk Kasir untuk Pelanggan"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Struk</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK PAYMENT MODAL (Untuk Bayar & Cetak Struk) */}
      {paymentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-black text-sm">Pembayaran Kasir</h3>
                  <p className="text-[11px] text-slate-300">
                    #{paymentOrder.invoiceNo.slice(-8)} • {paymentOrder.pelangganNama || 'Pelanggan'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Order Info Banner */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block">
                    {paymentOrder.tipePesanan || 'Dine In'}{' '}
                    {paymentOrder.nomorMeja ? `• Meja ${paymentOrder.nomorMeja}` : ''}
                  </span>
                  <span className="text-xs font-black text-orange-900">
                    {paymentOrder.nomorPesanan ? `Antrean ${paymentOrder.nomorPesanan}` : paymentOrder.pelangganNama}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-orange-700 block">Total Tagihan</span>
                  <span className="text-lg font-black text-orange-950">
                    {formatRupiah(paymentOrder.total)}
                  </span>
                </div>
              </div>

              {/* Metode Pembayaran Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Cash');
                      setCashAmount(paymentOrder.total);
                      setCashInputText(paymentOrder.total.toString());
                    }}
                    className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                      paymentMethod === 'Cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Uang Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                      paymentMethod === 'QRIS'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>QRIS / Non-Tunai</span>
                  </button>
                </div>
              </div>

              {/* Cash Input */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Uang Diterima dari Pelanggan (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        min={paymentOrder.total}
                        value={cashInputText}
                        onChange={(e) => {
                          setCashInputText(e.target.value);
                          setCashAmount(Number(e.target.value) || 0);
                        }}
                        className="w-full pl-10 pr-4 py-2.5 text-sm font-black bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Contoh: 50000"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickCash(paymentOrder.total)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    >
                      Uang Pas ({formatRupiah(paymentOrder.total)})
                    </button>
                    {[20000, 50000, 100000].map((nominal) => {
                      if (nominal < paymentOrder.total) return null;
                      return (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => handleSetQuickCash(nominal)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          {formatRupiah(nominal)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Kembalian Calculation */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold">Kembalian:</span>
                    <span
                      className={`text-base font-black ${
                        cashAmount >= paymentOrder.total ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {cashAmount >= paymentOrder.total
                        ? formatRupiah(cashAmount - paymentOrder.total)
                        : `Kurang ${formatRupiah(paymentOrder.total - cashAmount)}`}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'QRIS' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Pembayaran QRIS Statis / Dinamis</span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Pastikan pembayaran senilai <strong>{formatRupiah(paymentOrder.total)}</strong> telah berhasil terverifikasi di aplikasi bank / e-wallet.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPaymentOrder(null)}
                className="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={paymentMethod === 'Cash' && cashAmount < paymentOrder.total}
                className="flex-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Konfirmasi Lunas & Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FITUR BATALKAN PESANAN MODAL */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-black text-sm">Batalkan Pesanan</h3>
                  <p className="text-[11px] text-rose-100">
                    #{cancelTarget.invoiceNo.slice(-8)} • {cancelTarget.pelangganNama || 'Pelanggan'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="w-8 h-8 rounded-full bg-rose-700 hover:bg-rose-800 flex items-center justify-center transition cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Special notice if order is already paid */}
              {(cancelTarget.statusPembayaran === 'LUNAS' || normalizeStatusPesanan(cancelTarget.statusPesanan) === 'LUNAS') && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    Otorisasi Terverifikasi: Pembatalan pesanan <strong>LUNAS</strong> oleh <strong>{currentUser.nama} ({currentUser.jabatan} - {currentUser.cabang})</strong>.
                  </span>
                </div>
              )}

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Peringatan Pembatalan Pesanan:</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Pesanan ini akan dibatalkan. Seluruh stok bahan baku dan kemasan (jika Take Away / Delivery) otomatis <strong>dikembalikan ke stok cabang {cancelTarget.cabang}</strong> secara real-time.
                </p>
              </div>

              {/* Order summary snippet */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">
                    {cancelTarget.nomorPesanan ? `Antrean ${cancelTarget.nomorPesanan}` : cancelTarget.invoiceNo}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {cancelTarget.tipePesanan || 'Dine In'}{' '}
                    {cancelTarget.nomorMeja ? `• Meja ${cancelTarget.nomorMeja}` : ''} •{' '}
                    {cancelTarget.items.reduce((acc, i) => acc + i.qty, 0)} item
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-black text-slate-900 text-sm">
                    {formatRupiah(cancelTarget.total)}
                  </span>
                </div>
              </div>

              {/* Reason Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Pilih atau Tulis Alasan Pembatalan:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    'Pelanggan membatalkan pesanan',
                    'Salah input menu kasir',
                    'Bahan habis di dapur',
                    'Antrean terlalu lama',
                    'Perubahan pesanan pelanggan',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancelReason(preset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        cancelReason === preset
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  placeholder="Tulis alasan pembatalan pesanan..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Kembali
              </button>

              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={handleConfirmBatalPesanan}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
              >
                <Ban className="w-4 h-4" />
                <span>Ya, Batalkan Pesanan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: UBAH PESANAN BELUM BAYAR */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                <div>
                  <h3 className="font-black text-sm">Ubah Pesanan (Belum Bayar)</h3>
                  <p className="text-[11px] text-amber-100">
                    #{editTarget.invoiceNo.slice(-8)} • {editTarget.nomorPesanan ? `Antrean ${editTarget.nomorPesanan}` : ''} ({editTarget.tipePesanan || 'Dine In'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="w-8 h-8 rounded-full bg-amber-600 hover:bg-amber-700 flex items-center justify-center transition cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Form Info Pelanggan & Meja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-xs">
                {editTarget.tipePesanan === 'Dine In' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nomor Meja:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 05"
                      value={editNomorMeja}
                      onChange={(e) => setEditNomorMeja(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Pelanggan:
                  </label>
                  <input
                    type="text"
                    placeholder="Nama pelanggan..."
                    value={editPelangganNama}
                    onChange={(e) => setEditPelangganNama(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {editTarget.tipePesanan === 'Delivery Order' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        No. Telepon / WhatsApp:
                      </label>
                      <input
                        type="text"
                        placeholder="08xxxxxxxxxx"
                        value={editPelangganTelepon}
                        onChange={(e) => setEditPelangganTelepon(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Alamat Pengantaran:
                      </label>
                      <input
                        type="text"
                        placeholder="Alamat lengkap..."
                        value={editPelangganAlamat}
                        onChange={(e) => setEditPelangganAlamat(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Tambah Menu Baru Interaktif & Responsif */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-amber-600" />
                      <span>Tambah Menu ke Pesanan:</span>
                    </label>
                    <p className="text-[10px] text-amber-700 font-medium">
                      Klik kartu menu atau tombol harga di bawah untuk langsung menambahkannya
                    </p>
                  </div>

                  {/* Pencarian Menu */}
                  <div className="relative w-full sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama / kode menu..."
                      value={editMenuSearch}
                      onChange={(e) => setEditMenuSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Kategori Tabs */}
                {availableCategories.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditMenuKategori(cat)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition cursor-pointer ${
                          editMenuKategori === cat
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-amber-100 hover:bg-amber-100/60'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid Menu Kartu Interaktif dengan Harga yang Bisa Diklik Langsung */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredEditKatalog.length === 0 ? (
                    <div className="col-span-full p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-amber-200">
                      Tidak ada menu yang cocok dengan kata kunci & kategori ini.
                    </div>
                  ) : (
                    filteredEditKatalog.map((k) => (
                      <div
                        key={k.id}
                        onClick={() => handleAddItemToEdit(k.id)}
                        className="p-2.5 bg-white hover:bg-amber-100/50 border border-amber-200 hover:border-amber-400 rounded-xl flex flex-col justify-between transition shadow-xs hover:shadow-sm cursor-pointer group text-left"
                        title={`Klik untuk menambahkan ${k.nama}`}
                      >
                        <div>
                          <span className="text-[9px] font-bold text-amber-600 block uppercase tracking-wider truncate">
                            {k.kategori || 'Menu'}
                          </span>
                          <span className="font-black text-xs text-slate-800 line-clamp-1 group-hover:text-amber-950">
                            {k.nama}
                          </span>
                        </div>

                        {/* Tombol Harga Menu yang Bisa Diklik Langsung */}
                        <div className="mt-2 pt-1 border-t border-amber-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddItemToEdit(k.id);
                            }}
                            className="w-full py-1 px-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs rounded-lg flex items-center justify-between transition cursor-pointer shadow-xs"
                            title={`Klik harga ${formatRupiah(k.hargaJual)} untuk menambahkan ${k.nama}`}
                          >
                            <span>{formatRupiah(k.hargaJual)}</span>
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Daftar Menu Saat Ini */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 block">
                    Daftar Item Menu ({editItems.reduce((acc, i) => acc + i.qty, 0)} item):
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold">
                    *Klik tombol harga untuk sesuaikan harga satuan
                  </span>
                </div>

                {editItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Belum ada menu di pesanan ini. Tambahkan menu di atas.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {editItems.map((item, idx) => {
                      const katalogItem = katalogList.find((k) => k.id === item.katalogId);
                      const normalPrice = katalogItem ? katalogItem.hargaJual : item.harga;
                      const isCustomPrice = item.harga !== normalPrice;

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-800 text-xs">{item.nama}</span>

                              {/* TOMBOL HARGA MENU YANG BISA DIKLIK & DIEDIT */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingEditPriceIdx === idx) {
                                    setEditingEditPriceIdx(null);
                                  } else {
                                    setEditingEditPriceIdx(idx);
                                    setCustomEditPriceInput(item.harga.toString());
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-lg border font-black text-xs flex items-center gap-1 transition cursor-pointer ${
                                  isCustomPrice
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                }`}
                                title="Klik harga untuk mengubah atau menyesuaikan harga menu ini"
                              >
                                <Tag className="w-3 h-3 text-amber-600" />
                                <span>@{formatRupiah(item.harga)}</span>
                                <Edit3 className="w-3 h-3 text-amber-500" />
                              </button>

                              {isCustomPrice && (
                                <button
                                  type="button"
                                  onClick={() => handleResetEditItemPrice(idx)}
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-0.5 cursor-pointer"
                                  title="Kembalikan ke harga normal katalog"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reset ({formatRupiah(normalPrice)})</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditItemQty(idx, -1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-7 text-center font-black text-xs">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditItemQty(idx, 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <span className="font-black text-slate-800 w-20 text-right">
                                {formatRupiah(item.subtotal)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveEditItem(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus Menu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* PANEL EDIT HARGA INLINE KETIKA DIKLIK */}
                          {editingEditPriceIdx === idx && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-100">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-amber-900 flex items-center gap-1">
                                  <Tag className="w-3.5 h-3.5 text-amber-600" /> Sesuaikan Harga Satuan:
                                </span>
                                {isCustomPrice && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetEditItemPrice(idx)}
                                    className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Reset Normal ({formatRupiah(normalPrice)})
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={customEditPriceInput}
                                    onChange={(e) => setCustomEditPriceInput(e.target.value)}
                                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    placeholder="Ketik harga..."
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = Number(customEditPriceInput);
                                    if (!isNaN(val) && val >= 0) {
                                      handleUpdateEditItemPrice(idx, val);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEditPriceIdx(null)}
                                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>

                              {/* Preset Tombol Cepat */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-500 font-bold">Preset:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomEditPriceInput(normalPrice.toString());
                                    handleUpdateEditItemPrice(idx, normalPrice);
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-white hover:bg-amber-100 border border-amber-200 text-amber-800 cursor-pointer"
                                >
                                  Normal ({formatRupiah(normalPrice)})
                                </button>
                                {[-1000, 1000, 2000, 5000].map((delta) => (
                                  <button
                                    key={delta}
                                    type="button"
                                    onClick={() => {
                                      const newP = Math.max(0, item.harga + delta);
                                      setCustomEditPriceInput(newP.toString());
                                      handleUpdateEditItemPrice(idx, newP);
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                                  >
                                    {delta > 0 ? `+${delta / 1000}rb` : `${delta / 1000}rb`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Level & Catatan */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500">Level:</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {LEVEL_PEDAS_OPTIONS.map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleUpdateEditItemLevel(idx, opt)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      (item.levelPedas || 'Original') === opt
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500">Catatan:</span>
                              <input
                                type="text"
                                placeholder="Misal: jangan pakai seledri..."
                                value={item.catatan || ''}
                                onChange={(e) => handleUpdateEditItemCatatan(idx, e.target.value)}
                                className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Tagihan Baru</span>
                  <span className="text-base font-black text-amber-400">
                    {formatRupiah(
                      editItems.reduce((acc, i) => acc + i.subtotal, 0) + (editTarget.ongkir || 0)
                    )}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span>Status: </span>
                  <span className="font-bold text-rose-400">BELUM BAYAR</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={editItems.length === 0}
                onClick={handleConfirmEditOrder}
                className="flex-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan Pesanan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VOID & GANTI PESANAN LUNAS DENGAN PERHITUNGAN SELISIH */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-black text-sm">Void & Ganti Pesanan Lunas</h3>
                  <p className="text-[11px] text-purple-200">
                    Invoice Lama: #{voidTarget.invoiceNo.slice(-8)} • Total Lama: {formatRupiah(voidTarget.total)} (LUNAS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="w-8 h-8 rounded-full bg-purple-800 hover:bg-purple-900 flex items-center justify-center transition cursor-pointer text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Penjelasan SOP Akuntansi */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-purple-800">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>SOP Void & Ganti Pesanan (Pesanan Lunas):</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Data pesanan lama <strong>TIDAK AKAN DIHAPUS</strong> di Firebase, melainkan diubah statusnya menjadi <strong>DIVOID</strong>. Sistem otomatis mengembalikan stok lama, membuatkan <strong>pesanan baru</strong> pengganti, dan menghitung secara akurat apakah terdapat <strong>uang kembalian</strong> atau <strong>tagihan tambahan</strong>.
                </p>
              </div>

              {/* Form Info Pelanggan & Meja Baru */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                {voidTarget.tipePesanan === 'Dine In' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nomor Meja:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 05"
                      value={voidNomorMeja}
                      onChange={(e) => setVoidNomorMeja(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Pelanggan:
                  </label>
                  <input
                    type="text"
                    placeholder="Nama pelanggan..."
                    value={voidPelangganNama}
                    onChange={(e) => setVoidPelangganNama(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Alasan Void Pesanan:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Pelanggan ganti varian menu',
                      'Salah input menu kasir',
                      'Porsi / Item diubah',
                      'Bahan habis, ganti menu',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setVoidReason(preset)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                          voidReason === preset
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Tulis alasan void..."
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Pemilihan Menu Pengganti Interaktif & Responsif */}
              <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span>Pilih Menu Baru Pengganti:</span>
                    </label>
                    <p className="text-[10px] text-purple-700 font-medium">
                      Klik kartu menu atau tombol harga di bawah untuk langsung menambahkannya
                    </p>
                  </div>

                  {/* Pencarian Menu */}
                  <div className="relative w-full sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari menu pengganti..."
                      value={voidMenuSearch}
                      onChange={(e) => setVoidMenuSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Kategori Tabs */}
                {availableCategories.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setVoidMenuKategori(cat)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg shrink-0 transition cursor-pointer ${
                          voidMenuKategori === cat
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-100/60'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid Menu Kartu Interaktif dengan Harga yang Bisa Diklik Langsung */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {filteredVoidKatalog.length === 0 ? (
                    <div className="col-span-full p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-purple-200">
                      Tidak ada menu yang cocok dengan kata kunci & kategori ini.
                    </div>
                  ) : (
                    filteredVoidKatalog.map((k) => (
                      <div
                        key={k.id}
                        onClick={() => handleAddItemToVoid(k.id)}
                        className="p-2.5 bg-white hover:bg-purple-100/50 border border-purple-200 hover:border-purple-400 rounded-xl flex flex-col justify-between transition shadow-xs hover:shadow-sm cursor-pointer group text-left"
                        title={`Klik untuk menambahkan ${k.nama}`}
                      >
                        <div>
                          <span className="text-[9px] font-bold text-purple-600 block uppercase tracking-wider truncate">
                            {k.kategori || 'Menu'}
                          </span>
                          <span className="font-black text-xs text-slate-800 line-clamp-1 group-hover:text-purple-900">
                            {k.nama}
                          </span>
                        </div>

                        {/* Tombol Harga Menu Pengganti yang Bisa Diklik Langsung */}
                        <div className="mt-2 pt-1 border-t border-purple-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddItemToVoid(k.id);
                            }}
                            className="w-full py-1 px-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black text-xs rounded-lg flex items-center justify-between transition cursor-pointer shadow-xs"
                            title={`Klik harga ${formatRupiah(k.hargaJual)} untuk menambahkan ${k.nama}`}
                          >
                            <span>{formatRupiah(k.hargaJual)}</span>
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Daftar Menu Pengganti */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 block">
                    Rincian Menu Pengganti ({voidItems.reduce((acc, i) => acc + i.qty, 0)} item):
                  </span>
                  <span className="text-[10px] text-purple-700 font-bold">
                    *Klik tombol harga untuk sesuaikan harga satuan
                  </span>
                </div>

                {voidItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-rose-500 bg-rose-50 rounded-2xl border border-dashed border-rose-200 font-bold">
                    Pesanan pengganti tidak boleh kosong! Tambahkan minimal 1 menu di atas.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {voidItems.map((item, idx) => {
                      const katalogItem = katalogList.find((k) => k.id === item.katalogId);
                      const normalPrice = katalogItem ? katalogItem.hargaJual : item.harga;
                      const isCustomPrice = item.harga !== normalPrice;

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-800 text-xs">{item.nama}</span>

                              {/* TOMBOL HARGA MENU PENGGANTI YANG BISA DIKLIK & DIEDIT */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingVoidPriceIdx === idx) {
                                    setEditingVoidPriceIdx(null);
                                  } else {
                                    setEditingVoidPriceIdx(idx);
                                    setCustomVoidPriceInput(item.harga.toString());
                                  }
                                }}
                                className={`px-2 py-0.5 rounded-lg border font-black text-xs flex items-center gap-1 transition cursor-pointer ${
                                  isCustomPrice
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                    : 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200'
                                }`}
                                title="Klik harga untuk mengubah atau menyesuaikan harga menu ini"
                              >
                                <Tag className="w-3 h-3 text-purple-600" />
                                <span>@{formatRupiah(item.harga)}</span>
                                <Edit3 className="w-3 h-3 text-purple-500" />
                              </button>

                              {isCustomPrice && (
                                <button
                                  type="button"
                                  onClick={() => handleResetVoidItemPrice(idx)}
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-0.5 cursor-pointer"
                                  title="Kembalikan ke harga normal katalog"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reset ({formatRupiah(normalPrice)})</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateVoidItemQty(idx, -1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-7 text-center font-black text-xs">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateVoidItemQty(idx, 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <span className="font-black text-slate-800 w-20 text-right">
                                {formatRupiah(item.subtotal)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveVoidItem(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus Menu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* PANEL EDIT HARGA INLINE KETIKA DIKLIK */}
                          {editingVoidPriceIdx === idx && (
                            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2 animate-in fade-in duration-100">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-purple-900 flex items-center gap-1">
                                  <Tag className="w-3.5 h-3.5 text-purple-600" /> Sesuaikan Harga Satuan:
                                </span>
                                {isCustomPrice && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetVoidItemPrice(idx)}
                                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Reset Normal ({formatRupiah(normalPrice)})
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={customVoidPriceInput}
                                    onChange={(e) => setCustomVoidPriceInput(e.target.value)}
                                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Ketik harga..."
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = Number(customVoidPriceInput);
                                    if (!isNaN(val) && val >= 0) {
                                      handleUpdateVoidItemPrice(idx, val);
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingVoidPriceIdx(null)}
                                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>

                              {/* Preset Tombol Cepat */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-500 font-bold">Preset:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomVoidPriceInput(normalPrice.toString());
                                    handleUpdateVoidItemPrice(idx, normalPrice);
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-white hover:bg-purple-100 border border-purple-200 text-purple-700 cursor-pointer"
                                >
                                  Normal ({formatRupiah(normalPrice)})
                                </button>
                                {[-1000, 1000, 2000, 5000].map((delta) => (
                                  <button
                                    key={delta}
                                    type="button"
                                    onClick={() => {
                                      const newP = Math.max(0, item.harga + delta);
                                      setCustomVoidPriceInput(newP.toString());
                                      handleUpdateVoidItemPrice(idx, newP);
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                                  >
                                    {delta > 0 ? `+${delta / 1000}rb` : `${delta / 1000}rb`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Level & Catatan */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500">Level:</span>
                              <div className="flex flex-wrap items-center gap-1">
                                {LEVEL_PEDAS_OPTIONS.map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleUpdateVoidItemLevel(idx, opt)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      (item.levelPedas || 'Original') === opt
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500">Catatan:</span>
                              <input
                                type="text"
                                placeholder="Misal: jangan pakai seledri..."
                                value={item.catatan || ''}
                                onChange={(e) => handleUpdateVoidItemCatatan(idx, e.target.value)}
                                className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PERHITUNGAN SELISIH BIAYA REAL-TIME (KEMBALIAN ATAU TAGIHAN TAMBAHAN) */}
              {(() => {
                const oldTotal = voidTarget.total;
                const newSubtotal = voidItems.reduce((acc, i) => acc + i.subtotal, 0);
                const newOngkir = voidTarget.ongkir || 0;
                const newTotal = newSubtotal + newOngkir;
                const selisih = newTotal - oldTotal;

                return (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    {/* Ringkasan Perbandingan */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Total Pesanan Lama</span>
                        <span className="font-black text-slate-700 text-xs">
                          {formatRupiah(oldTotal)}
                        </span>
                        <span className="text-[9px] text-emerald-600 font-bold block">✓ Sudah Lunas</span>
                      </div>
                      <div className="border-x border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 block">Total Pesanan Baru</span>
                        <span className="font-black text-slate-900 text-xs">
                          {formatRupiah(newTotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">Status Selisih</span>
                        <span
                          className={`font-black text-xs ${
                            selisih < 0
                              ? 'text-emerald-700'
                              : selisih > 0
                              ? 'text-amber-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {selisih < 0
                            ? `Kembalian ${formatRupiah(Math.abs(selisih))}`
                            : selisih > 0
                            ? `Kurang ${formatRupiah(selisih)}`
                            : 'Biaya Pas (Rp 0)'}
                        </span>
                      </div>
                    </div>

                    {/* KASUS 1: HARGA BARU LEBIH MURAH -> KEMBALIKAN UANG KE PELANGGAN */}
                    {selisih < 0 && (
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                              Uang Kembalian Kasir ke Pelanggan:
                            </span>
                            <span className="text-xl font-black text-emerald-900">
                              {formatRupiah(Math.abs(selisih))}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                          Harga pesanan baru lebih murah sebesar <strong>{formatRupiah(Math.abs(selisih))}</strong>. Kasir wajib mengembalikan uang selisih tersebut secara tunai kepada pelanggan. Pesanan baru pengganti otomatis berstatus <strong>LUNAS</strong>.
                        </p>
                      </div>
                    )}

                    {/* KASUS 2: HARGA BARU LEBIH MAHAL -> TAGIHAN TAMBAHAN */}
                    {selisih > 0 && (() => {
                      const effectiveCash =
                        voidCashAmount > 0
                          ? voidCashAmount
                          : (voidCashInput ? Number(voidCashInput) || 0 : selisih);

                      return (
                        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-amber-950 space-y-3 shadow-xs">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                                Tagihan Tambahan yang Harus Dibayar:
                              </span>
                              <span className="text-xl font-black text-amber-950">
                                {formatRupiah(selisih)}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                            Harga pesanan baru lebih mahal sebesar <strong>{formatRupiah(selisih)}</strong>. Pelanggan harus membayar kekurangan biaya ini.
                          </p>

                          {/* Metode Pembayaran Tambahan */}
                          <div className="space-y-2 pt-1 border-t border-amber-200">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setVoidPaymentMethod('Cash');
                                  setVoidCashAmount(selisih);
                                  setVoidCashInput(selisih.toString());
                                }}
                                className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                                  voidPaymentMethod === 'Cash'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <Banknote className="w-4 h-4" />
                                <span>Cash Tambahan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setVoidPaymentMethod('QRIS')}
                                className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                                  voidPaymentMethod === 'QRIS'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <CreditCard className="w-4 h-4" />
                                <span>QRIS Tambahan</span>
                              </button>
                            </div>

                            {voidPaymentMethod === 'Cash' && (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                    Uang Tambahan Diterima (Rp):
                                  </label>
                                  <input
                                    type="number"
                                    min={selisih}
                                    value={voidCashInput || (voidCashAmount > 0 ? voidCashAmount.toString() : selisih.toString())}
                                    onChange={(e) => {
                                      setVoidCashInput(e.target.value);
                                      setVoidCashAmount(Number(e.target.value) || 0);
                                    }}
                                    placeholder={`Minimal ${selisih}`}
                                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                </div>

                                <div className="flex gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoidCashAmount(selisih);
                                      setVoidCashInput(selisih.toString());
                                    }}
                                    className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-300 hover:bg-amber-400 text-amber-950 cursor-pointer shadow-xs"
                                  >
                                    Uang Pas ({formatRupiah(selisih)})
                                  </button>
                                  {[5000, 10000, 20000, 50000].map((addNominal) => (
                                    <button
                                      key={`add-${addNominal}`}
                                      type="button"
                                      onClick={() => {
                                        const nextAmt = effectiveCash + addNominal;
                                        setVoidCashAmount(nextAmt);
                                        setVoidCashInput(nextAmt.toString());
                                      }}
                                      className="px-2 py-1 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                                    >
                                      +{formatRupiah(addNominal)}
                                    </button>
                                  ))}
                                  {[10000, 20000, 50000, 100000].map((nominal) => {
                                    if (nominal <= selisih) return null;
                                    return (
                                      <button
                                        key={`nom-${nominal}`}
                                        type="button"
                                        onClick={() => {
                                          setVoidCashAmount(nominal);
                                          setVoidCashInput(nominal.toString());
                                        }}
                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                                      >
                                        {formatRupiah(nominal)}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="p-2.5 bg-white border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                                  <span className="text-slate-600 font-bold">Kembalian Uang Tambahan:</span>
                                  <span
                                    className={`font-black ${
                                      effectiveCash >= selisih ? 'text-emerald-600 text-sm' : 'text-rose-600'
                                    }`}
                                  >
                                    {effectiveCash >= selisih
                                      ? formatRupiah(effectiveCash - selisih)
                                      : `Kurang ${formatRupiah(selisih - effectiveCash)}`}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* KASUS 3: HARGA SAMA PAS */}
                    {selisih === 0 && (
                      <div className="p-3.5 bg-blue-50 border border-blue-300 rounded-2xl text-blue-950 flex items-center gap-2 text-xs">
                        <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold block">Biaya Sama Pas (Rp 0)</span>
                          <span className="text-[11px] text-blue-800">
                            Total harga menu pengganti persis sama dengan total pesanan lama. Tidak ada uang yang perlu dikembalikan atau ditagihkan. Pesanan baru otomatis berstatus <strong>LUNAS</strong>.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVoidTarget(null)}
                className="flex-1 py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>

              {(() => {
                const oldTotal = voidTarget.total;
                const newSubtotal = voidItems.reduce((acc, i) => acc + i.subtotal, 0);
                const newOngkir = voidTarget.ongkir || 0;
                const newTotal = newSubtotal + newOngkir;
                const selisih = newTotal - oldTotal;

                const effectiveCash =
                  voidCashAmount > 0
                    ? voidCashAmount
                    : (voidCashInput ? Number(voidCashInput) || 0 : (selisih > 0 ? selisih : 0));

                const isInvalidAmount =
                  selisih > 0 && voidPaymentMethod === 'Cash' && effectiveCash < selisih;

                return (
                  <button
                    type="button"
                    disabled={voidItems.length === 0 || !voidReason.trim() || isInvalidAmount}
                    onClick={handleConfirmVoidOrder}
                    className="flex-2 py-2.5 px-4 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Konfirmasi Void & Buat Pesanan Baru</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
