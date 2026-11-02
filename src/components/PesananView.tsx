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
} from 'lucide-react';
import {
  Karyawan,
  Transaksi,
  StatusPesanan,
  TipePesanan,
  DataCabang,
} from '../types';
import { formatRupiah } from '../utils/storage';
import { getBranchName, getStoreBranches } from '../utils/branchHelper';
import { PrintDocumentType } from './PrintModal';

interface PesananViewProps {
  currentUser: Karyawan;
  transaksiList: Transaksi[];
  onUpdateStatusPesanan: (
    trxId: string,
    status: StatusPesanan,
    paymentMeta?: { bayar?: number; kembali?: number; metodeBayar?: 'Cash' | 'QRIS' }
  ) => Transaksi | null | void;
  onBatalkanPesanan?: (trxId: string, alasan: string) => void;
  dataCabangList?: DataCabang[];
  onOpenPrintModal: (type: PrintDocumentType, data: any) => void;
  onNavigateToPos?: () => void;
}

// Normalisasi status pesanan agar kompatibel dengan data lama & alur 5-status final
export function normalizeStatusPesanan(
  status?: string,
  trxStatus?: string
): 'MENUNGGU' | 'DIPROSES' | 'SIAP ANTAR' | 'BELUM BAYAR' | 'LUNAS' | 'DIBATALKAN' {
  if (trxStatus === 'Retur') return 'DIBATALKAN';
  if (!status) return 'MENUNGGU';
  const s = status.toUpperCase().trim();
  if (s === 'DIBATALKAN' || s === 'BATAL' || s === 'CANCELLED') return 'DIBATALKAN';
  if (s === 'MENUNGGU' || s === 'PENDING') return 'MENUNGGU';
  if (s === 'SEDANG DIBUAT' || s === 'DIPROSES' || s === 'DIPROSES_DAPUR' || s === 'COOKING') return 'DIPROSES';
  if (s === 'SIAP ANTAR' || s === 'SIAP_ANTAR' || s === 'READY') return 'SIAP ANTAR';
  if (s === 'BELUM BAYAR' || s === 'BELUM_BAYAR' || s === 'UNPAID') return 'BELUM BAYAR';
  if (s === 'SELESAI' || s === 'LUNAS' || s === 'PAID') return 'LUNAS';
  return 'MENUNGGU';
}

export const PesananView: React.FC<PesananViewProps> = ({
  currentUser,
  transaksiList,
  onUpdateStatusPesanan,
  onBatalkanPesanan,
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
  const [filterStatus, setFilterStatus] = useState<
    'Semua' | 'MENUNGGU' | 'DIPROSES' | 'SIAP ANTAR' | 'BELUM BAYAR' | 'LUNAS' | 'DIBATALKAN'
  >('Semua');
  const [filterTipe, setFilterTipe] = useState<TipePesanan | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment Modal State for "Bayar" (Take Away/Delivery) or "Bayar & Cetak Struk" (Dine In)
  const [paymentOrder, setPaymentOrder] = useState<Transaksi | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS'>('Cash');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashInputText, setCashInputText] = useState<string>('');

  // Cancellation Modal State
  const [cancelTarget, setCancelTarget] = useState<Transaksi | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

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

  // Active orders (non-dibatalkan) for total count in Semua tab
  const countAktif = useMemo(
    () => branchFilteredList.filter((t) => normalizeStatusPesanan(t.statusPesanan, t.status) !== 'DIBATALKAN').length,
    [branchFilteredList]
  );

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return branchFilteredList.filter((t) => {
      const normStatus = normalizeStatusPesanan(t.statusPesanan, t.status);

      if (filterStatus === 'Semua') {
        if (normStatus === 'DIBATALKAN') return false;
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
    });
  }, [branchFilteredList, filterStatus, filterTipe, searchQuery]);

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

  // Trigger Cancel with Role Protection for Paid Orders
  const handleTriggerCancel = (order: Transaksi) => {
    const isPaid = order.statusPembayaran === 'LUNAS' || normalizeStatusPesanan(order.statusPesanan) === 'LUNAS';

    // Business rule: Pesanan yang sudah lunas pembayaran tidak bisa di-cancel oleh kasir/crew, hanya Owner atau Admin Pusat yang bisa.
    if (isPaid && !isOwnerOrAdminPusat) {
      alert(
        '⛔ Akses Ditolak!\n\nPesanan ini berstatus LUNAS dan TIDAK BISA dibatalkan oleh Kasir atau Crew Store.\n\nHanya Owner atau Admin DC Pusat yang memiliki wewenang untuk membatalkan pesanan yang sudah lunas.'
      );
      return;
    }

    setCancelTarget(order);
    setCancelReason('');
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
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
            {/* Branch selector for Owner / DC */}
            {isDcPusatOrOwner ? (
              <div className="flex items-center gap-1.5 text-xs">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCabang}
                  onChange={(e) => setSelectedCabang(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Semua">Semua Cabang</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.nama}>
                      {b.nama}
                    </option>
                  ))}
                </select>
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

            // Styling based on 6 statuses
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
                badgeText: 'DIPROSES',
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
            }[status];

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
                        {isOrderPaid ? (
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
                        <span>{cardTheme.badgeText}</span>
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                        <Timer className="w-3 h-3" />
                        <span>{elapsed}</span>
                      </div>
                    </div>
                  </div>

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
                          status === 'DIBATALKAN'
                            ? 'text-rose-600'
                            : isOrderPaid
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {status === 'DIBATALKAN'
                          ? 'DIBATALKAN'
                          : isOrderPaid
                          ? `LUNAS (${order.metodeBayar || 'Kasir'})`
                          : 'BELUM BAYAR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer with 5-status lifecycle + FITUR BATALKAN PESANAN */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {/* 1. MENUNGGU -> Tombol "Cetak Tiket" (cetak tiket tanpa harga & ubah ke DIPROSES) */}
                  {status === 'MENUNGGU' && (
                    <button
                      type="button"
                      onClick={() => handleCetakTiketDapur(order)}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Cetak Tiket</span>
                    </button>
                  )}

                  {/* 2. DIPROSES -> Tombol "Pesanan Siap" (ubah ke SIAP ANTAR) + cetak ulang tiket */}
                  {status === 'DIPROSES' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePesananSiap(order)}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
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
                    </>
                  )}

                  {/* 3. SIAP ANTAR */}
                  {status === 'SIAP ANTAR' && (
                    <>
                      {isOrderPaid ? (
                        /* SUDAH LUNAS: Kasir tidak perlu menagih lagi, langsung serahkan / antar ke meja dan selesaikan */
                        <button
                          type="button"
                          onClick={() => onUpdateStatusPesanan(order.id, 'LUNAS')}
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{tipe === 'Dine In' ? 'Antar ke Meja (Lunas)' : 'Serahkan Pesanan (Lunas)'}</span>
                        </button>
                      ) : (
                        /* BELUM BAYAR: Ikuti alur pembayaran */
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
                    </>
                  )}

                  {/* 4. BELUM BAYAR (Dine In) -> Tombol "Bayar & Cetak Struk" */}
                  {status === 'BELUM BAYAR' && (
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(order)}
                      className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95 animate-pulse"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Bayar & Cetak Struk</span>
                    </button>
                  )}

                  {/* 5. LUNAS -> Info Lunas + Tombol Cetak Struk Bayar */}
                  {status === 'LUNAS' && (
                    <>
                      <div className="flex-1 py-2 px-3 bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-200">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Transaksi Lunas</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenPrintModal('struk', order)}
                        className="p-2.5 bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        title="Cetak Ulang Struk Kasir"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Struk</span>
                      </button>
                    </>
                  )}

                  {/* 6. DIBATALKAN -> Badge Khusus */}
                  {status === 'DIBATALKAN' && (
                    <div className="flex-1 py-2 px-3 bg-rose-50 text-rose-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-rose-200">
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span>Pesanan Telah Dibatalkan</span>
                    </div>
                  )}

                  {/* FITUR BATALKAN PESANAN DENGAN PROTEKSI OTORISASI OWNER/ADMIN PUSAT UNTUK STATUS LUNAS */}
                  {status !== 'DIBATALKAN' && (
                    <button
                      type="button"
                      onClick={() => handleTriggerCancel(order)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer ${
                        isOrderPaid && !isOwnerOrAdminPusat
                          ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                          : 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200 hover:border-rose-300'
                      }`}
                      title={
                        isOrderPaid && !isOwnerOrAdminPusat
                          ? 'Pesanan LUNAS: Hanya Owner atau Admin DC Pusat yang berhak membatalkan'
                          : 'Batalkan Pesanan (Kembalikan Stok Bahan)'
                      }
                    >
                      {isOrderPaid && !isOwnerOrAdminPusat ? (
                        <Lock className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                    </button>
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
    </div>
  );
};
