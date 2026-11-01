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
  Filter,
  Printer,
  User,
  Phone,
  MapPin,
  Flame,
  ArrowRight,
  RotateCcw,
  Store,
  Check,
  Timer,
  Navigation,
} from 'lucide-react';
import {
  Karyawan,
  Transaksi,
  StatusPesanan,
  TipePesanan,
  DataCabang,
} from '../types';
import { formatRupiah, getTodayStr } from '../utils/storage';
import { getBranchName, getStoreBranches } from '../utils/branchHelper';

interface PesananViewProps {
  currentUser: Karyawan;
  transaksiList: Transaksi[];
  onUpdateStatusPesanan: (trxId: string, status: StatusPesanan) => void;
  dataCabangList?: DataCabang[];
  onOpenPrintModal: (type: 'struk', data: any) => void;
  onNavigateToPos?: () => void;
}

export const PesananView: React.FC<PesananViewProps> = ({
  currentUser,
  transaksiList,
  onUpdateStatusPesanan,
  dataCabangList = [],
  onOpenPrintModal,
  onNavigateToPos,
}) => {
  const isDcPusatOrOwner =
    currentUser.cabang === 'DC PUSAT' || currentUser.jabatan === 'Owner';
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);
  const today = getTodayStr();

  const availableBranches = getStoreBranches(dataCabangList);

  // Filter States
  const [selectedCabang, setSelectedCabang] = useState<string>(
    isDcPusatOrOwner ? 'Semua' : currentBranchName || currentUser.cabang
  );
  const [filterStatus, setFilterStatus] = useState<StatusPesanan | 'Semua'>('Semua');
  const [filterTipe, setFilterTipe] = useState<TipePesanan | 'Semua'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Orders for today
  const todayOrders = useMemo(() => {
    return transaksiList.filter((t) => {
      // Must be success transactions
      if (t.status === 'Retur') return false;

      // Filter by Branch
      if (selectedCabang !== 'Semua') {
        const tBranchName = getBranchName(t.cabang, dataCabangList);
        if (tBranchName !== selectedCabang && t.cabang !== selectedCabang) {
          return false;
        }
      }

      // Filter by Status
      const currentStatus = t.statusPesanan || 'Menunggu';
      if (filterStatus !== 'Semua' && currentStatus !== filterStatus) {
        return false;
      }

      // Filter by Order Type
      const currentTipe = t.tipePesanan || 'Dine In';
      if (filterTipe !== 'Semua' && currentTipe !== filterTipe) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = t.invoiceNo.toLowerCase().includes(q);
        const matchPelanggan = t.pelangganNama?.toLowerCase().includes(q) || false;
        const matchTakeAwayId = t.takeAwayId?.toLowerCase().includes(q) || false;
        const matchItem = t.items.some((i) => i.nama.toLowerCase().includes(q));
        if (!matchInvoice && !matchPelanggan && !matchTakeAwayId && !matchItem) {
          return false;
        }
      }

      return true;
    });
  }, [transaksiList, selectedCabang, filterStatus, filterTipe, searchQuery, dataCabangList]);

  // Counts for status tabs
  const branchFilteredList = useMemo(() => {
    return transaksiList.filter((t) => {
      if (t.status === 'Retur') return false;
      if (selectedCabang !== 'Semua') {
        const tBranchName = getBranchName(t.cabang, dataCabangList);
        return tBranchName === selectedCabang || t.cabang === selectedCabang;
      }
      return true;
    });
  }, [transaksiList, selectedCabang, dataCabangList]);

  const countMenunggu = branchFilteredList.filter(
    (t) => (t.statusPesanan || 'Menunggu') === 'Menunggu'
  ).length;

  const countSedangDibuat = branchFilteredList.filter(
    (t) => t.statusPesanan === 'Sedang Dibuat'
  ).length;

  const countSelesai = branchFilteredList.filter(
    (t) => t.statusPesanan === 'Selesai'
  ).length;

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                Antrean & Manajemen Pesanan Dapur
              </h2>
              <p className="text-xs text-slate-500">
                Pantau antrean pesanan masuk, proses masak dapur, dan serah terima pesanan secara real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Quick action: Navigate to POS if cashier */}
        <div className="flex items-center gap-2">
          {onNavigateToPos && (
            <button
              type="button"
              onClick={onNavigateToPos}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Input Pesanan Baru (POS)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('Semua')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'Semua'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-80">Total Pesanan</span>
            <UtensilsCrossed className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black mt-2">{branchFilteredList.length}</div>
          <span className="text-[10px] opacity-70">Semua pesanan masuk</span>
        </div>

        <div
          onClick={() => setFilterStatus('Menunggu')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'Menunggu'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-400/20'
              : 'bg-amber-50/60 border-amber-200 hover:border-amber-300 text-amber-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Menunggu</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black mt-2 text-amber-900">
            {countMenunggu}
          </div>
          <span className="text-[10px] text-amber-700">Antrean siap dimasak</span>
        </div>

        <div
          onClick={() => setFilterStatus('Sedang Dibuat')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'Sedang Dibuat'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-400/20'
              : 'bg-blue-50/60 border-blue-200 hover:border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Sedang Dibuat</span>
            <ChefHat className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black mt-2 text-blue-900">
            {countSedangDibuat}
          </div>
          <span className="text-[10px] text-blue-700">Proses di dapur/rebus</span>
        </div>

        <div
          onClick={() => setFilterStatus('Selesai')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filterStatus === 'Selesai'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/20'
              : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Selesai / Siap</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-900">
            {countSelesai}
          </div>
          <span className="text-[10px] text-emerald-700">Siap diambil / diantar</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari Invoice, ID Take Away, Nama, Menu..."
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
      {todayOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full mx-auto flex items-center justify-center">
            <ChefHat className="w-8 h-8" />
          </div>
          <h3 className="font-black text-slate-800 text-base">
            Tidak Ada Pesanan
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Belum ada antrean pesanan yang cocok dengan filter ini. Transaksi baru dari kasir otomatis masuk ke antrean ini secara real-time.
          </p>
          {onNavigateToPos && (
            <button
              onClick={onNavigateToPos}
              className="mt-2 px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Buka Menu POS Kasir</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todayOrders.map((order) => {
            const status = order.statusPesanan || 'Menunggu';
            const tipe = order.tipePesanan || 'Dine In';
            const elapsed = getElapsedMinutes(order.jam, order.tanggal);

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border flex flex-col justify-between shadow-xs hover:shadow-md transition overflow-hidden relative ${
                  status === 'Menunggu'
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : status === 'Sedang Dibuat'
                    ? 'border-blue-300 ring-1 ring-blue-200'
                    : 'border-emerald-300'
                }`}
              >
                {/* Status Bar Indicator */}
                <div
                  className={`h-1.5 w-full ${
                    status === 'Menunggu'
                      ? 'bg-amber-400'
                      : status === 'Sedang Dibuat'
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                />

                <div className="p-4 space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      {/* Priority Tag for Take Away or Delivery */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {order.nomorPesanan && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white font-black text-xs shadow-xs">
                            {order.nomorPesanan}
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

                        {tipe === 'Dine In' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-1">
                            <UtensilsCrossed className="w-3 h-3 text-slate-600" />
                            <span>DINE IN</span>
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          #{order.invoiceNo.slice(-6)}
                        </span>
                      </div>

                      {/* Customer Name prominent to avoid order mix-up */}
                      {order.pelangganNama ? (
                        <div className="flex items-center gap-1 font-black text-slate-800 text-sm">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.pelangganNama}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-600">
                          Pelanggan Kasir
                        </div>
                      )}
                    </div>

                    {/* Status Pill Badge */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          status === 'Menunggu'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : status === 'Sedang Dibuat'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {status === 'Menunggu' && <Clock className="w-3 h-3" />}
                        {status === 'Sedang Dibuat' && <ChefHat className="w-3 h-3" />}
                        {status === 'Selesai' && <CheckCircle className="w-3 h-3" />}
                        <span>{status}</span>
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                        <Timer className="w-3 h-3" />
                        <span>{elapsed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Specific Meta */}
                  {tipe === 'Delivery Order' && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1 text-xs text-blue-900">
                      {order.jarakKm !== undefined && (
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-blue-600" />
                            <span>Jarak: {order.jarakKm} km</span>
                          </span>
                          <span className="text-blue-700">
                            Ongkir: {formatRupiah(order.ongkir || 0)}
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
                  <div className="space-y-2 py-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Rincian Porsi ({order.items.reduce((acc, i) => acc + i.qty, 0)} item):
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

                  {/* Total & Payment Pill */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Transaksi</span>
                      <span className="font-black text-slate-800 text-sm">
                        {formatRupiah(order.total)}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600 text-[10px]">
                      {order.metodeBayar} ({order.status})
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {/* Status transitions */}
                  {status === 'Menunggu' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatusPesanan(order.id, 'Sedang Dibuat')}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>Mulai Masak / Buat</span>
                    </button>
                  )}

                  {status === 'Sedang Dibuat' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatusPesanan(order.id, 'Selesai')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Pesanan Jadi / Siap</span>
                    </button>
                  )}

                  {status === 'Selesai' && (
                    <div className="flex-1 py-2 px-3 bg-emerald-100 text-emerald-800 font-black rounded-xl text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Siap Diserahkan</span>
                    </div>
                  )}

                  {/* Print Button */}
                  <button
                    type="button"
                    onClick={() => onOpenPrintModal('struk', order)}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
                    title="Cetak Tiket / Struk Dapur"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
