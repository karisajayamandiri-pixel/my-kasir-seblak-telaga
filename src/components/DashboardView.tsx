import React from 'react';
import {
  Store,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  Flame,
  UserCheck,
  ShoppingBag,
} from 'lucide-react';
import {
  Karyawan,
  BahanBaku,
  Transaksi,
  PermintaanBarang,
  SuratJalan,
  Absensi,
  AllTokoState,
  ActiveTab,
  Cabang,
  DataCabang,
} from '../types';
import { formatRupiah, getTodayStr } from '../utils/storage';
import { getBranchName, getStoreBranchNames } from '../utils/branchHelper';

interface DashboardViewProps {
  currentUser: Karyawan;
  setActiveTab: (tab: ActiveTab) => void;
  bahanBakuList: BahanBaku[];
  transaksiList: Transaksi[];
  permintaanList: PermintaanBarang[];
  suratJalanList: SuratJalan[];
  absensiList: Absensi[];
  tokoState: AllTokoState;
  dataCabangList?: DataCabang[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  setActiveTab,
  bahanBakuList,
  transaksiList,
  permintaanList,
  suratJalanList,
  absensiList,
  tokoState,
  dataCabangList = [],
}) => {
  const isDcPusat = currentUser.cabang === 'DC PUSAT';
  const today = getTodayStr();

  // Transactions today
  const todayTransactions = transaksiList.filter(
    (t) => t.tanggal === today && t.status === 'Sukses'
  );

  // If Cabang, filter for this branch
  const branchTransactions = isDcPusat
    ? todayTransactions
    : todayTransactions.filter((t) => t.cabang === currentUser.cabang);

  const totalOmzet = branchTransactions.reduce((acc, t) => acc + t.total, 0);
  const totalModal = branchTransactions.reduce((acc, t) => acc + t.totalModal, 0);
  const totalUntung = branchTransactions.reduce((acc, t) => acc + t.totalUntung, 0);
  const totalTrxCount = branchTransactions.length;

  // DC Pusat Low Stock Alert
  const lowStockDc = bahanBakuList.filter((b) => b.stokDC <= b.stokMinimum);

  // DC Pending requests
  const pendingRequests = permintaanList.filter((p) => p.status === 'Menunggu');

  // Cabang incoming shipments
  const incomingShipments = suratJalanList.filter(
    (sj) => sj.cabangTujuan === currentUser.cabang && sj.status === 'Dikirim'
  );

  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);

  // Current branch status
  const currentBranchState = !isDcPusat
    ? tokoState[currentBranchName] || tokoState[currentUser.cabang as Exclude<Cabang, 'DC PUSAT'>]
    : null;

  // Kasir today attendance
  const userTodayAbsen = absensiList.find(
    (a) => a.karyawanId === currentUser.id && a.tanggal === today
  );

  const branchKeys: string[] = getStoreBranchNames(dataCabangList);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Flame className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Store className="w-3.5 h-3.5" />
            <span>Cabang Aktif: {currentBranchName}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Selamat Datang, {currentUser.nama}!
          </h1>
          <p className="text-orange-100 text-xs sm:text-sm mt-1">
            {isDcPusat
              ? 'Pusat Logistik & Manajemen Multi-Cabang Seblak. Pantau operasional seluruh cabang, master resep HPP, dan pengiriman surat jalan.'
              : `Operasional POS Kasir ${currentBranchName}. Lakukan absensi, buka toko, layani transaksi seblak nikmat, dan pantau stok cabang.`}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {!isDcPusat ? (
              <>
                <button
                  onClick={() => setActiveTab('pos')}
                  className="bg-white text-orange-700 hover:bg-orange-50 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow transition cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Buka POS Kasir
                </button>
                <button
                  onClick={() => setActiveTab('absensi')}
                  className="bg-orange-950/40 hover:bg-orange-950/60 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Clock className="w-4 h-4" />
                  Absensi Kasir
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('suratJalan')}
                  className="bg-white text-orange-700 hover:bg-orange-50 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow transition cursor-pointer active:scale-95"
                >
                  <Truck className="w-4 h-4" />
                  Surat Jalan DC
                  {pendingRequests.length > 0 && (
                    <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('katalog')}
                  className="bg-orange-950/40 hover:bg-orange-950/60 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <Package className="w-4 h-4" />
                  Katalog & HPP Menu
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Incoming Delivery Alert for Branch */}
      {!isDcPusat && incomingShipments.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-red-900 text-sm">
                Ada {incomingShipments.length} Surat Jalan Dikirim dari DC!
              </h4>
              <p className="text-xs text-red-700">
                Bahan baku sedang dalam perjalanan menuju {currentUser.cabang}. Harap verifikasi dan terima barang.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('terimaBarang')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Terima Barang Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isDcPusat ? 'Omzet Semua Cabang' : 'Omzet Hari Ini'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800">
            {formatRupiah(totalOmzet)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {today} • Realtime Penjualan
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Transaksi Selesai
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-800">
            {totalTrxCount} Pesanan
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total porsi dan menu terjual
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Keuntungan Bersih
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600">
            {formatRupiah(totalUntung)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Margin: {totalOmzet > 0 ? ((totalUntung / totalOmzet) * 100).toFixed(1) : 0}% dari Omzet
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isDcPusat ? 'Stok DC Menipis' : 'Status Toko'}
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDcPusat
                  ? lowStockDc.length > 0
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                  : currentBranchState?.status === 'Buka'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {isDcPusat ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Store className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="text-xl font-black text-slate-800">
            {isDcPusat
              ? `${lowStockDc.length} Bahan Baku`
              : currentBranchState?.status || 'Belum Buka'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isDcPusat
              ? 'Perlu segera kulakan ke supplier'
              : `Buka: ${currentBranchState?.jamBuka || '-'}`}
          </p>
        </div>
      </div>

      {/* DC PUSAT: Branch Status Grid */}
      {isDcPusat && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-orange-600" />
              Monitoring Real-Time Status {branchKeys.length} Cabang Operasional
            </h3>
            <span className="text-xs text-slate-500">
              Data Sinkronisasi Otomatis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchKeys.map((cabang) => {
              const state = tokoState[cabang] || { status: 'Belum Buka' };
              const branchTrx = todayTransactions.filter((t) => t.cabang === cabang);
              const branchOmzetToday = branchTrx.reduce((acc, t) => acc + t.total, 0);

              const badgeColor =
                state.status === 'Buka'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : state.status === 'Tutup'
                  ? 'bg-slate-100 text-slate-800 border-slate-200'
                  : state.status === 'Libur'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200';

              return (
                <div
                  key={cabang}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-slate-800 text-base flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-orange-600" />
                        {cabang}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Kasir: <span className="font-semibold">{state.kasirNama || 'Belum Ditugaskan'}</span>
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}`}
                    >
                      {state.status}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Jam Buka</span>
                      <span className="font-bold text-slate-700">
                        {state.jamBuka || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Omzet Hari Ini</span>
                      <span className="font-extrabold text-orange-600">
                        {formatRupiah(branchOmzetToday)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kas Laci Awal</span>
                      <span className="font-bold text-slate-700">
                        {formatRupiah(state.modalAwal || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Transaksi</span>
                      <span className="font-bold text-slate-700">
                        {branchTrx.length} Nota
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alert Tables in Dashboard */}
      {isDcPusat ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Permintaan Cabang Menunggu */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-600" />
                Permintaan Barang Masuk ({pendingRequests.length})
              </h4>
              <button
                onClick={() => setActiveTab('suratJalan')}
                className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Kelola Surat Jalan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Tidak ada permintaan barang baru yang menunggu persetujuan.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingRequests.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-orange-50/50 border border-orange-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {p.noPermintaan} • <span className="text-orange-700">{p.cabang}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {p.items.length} macam bahan baku diminta
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                      Menunggu
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stok DC Menipis */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Peringatan Stok DC Menipis ({lowStockDc.length})
              </h4>
              <button
                onClick={() => setActiveTab('bahanBaku')}
                className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Kulakan Stok DC</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {lowStockDc.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Semua stok bahan baku di Gudang DC berada di atas batas minimum. Aman!
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockDc.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-red-50/50 border border-red-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{b.nama}</div>
                      <div className="text-[11px] text-slate-500">
                        Batas Minimum: {b.stokMinimum} {b.satuan}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-red-700 font-extrabold text-sm">
                        {b.stokDC} {b.satuan}
                      </span>
                      <span className="block text-[10px] text-red-600 font-semibold">
                        Kritis
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CABANG Specific Overview Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              Status Absensi & Buka Toko Hari Ini
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">Absensi Masuk Kasir</span>
                  <span className="text-slate-500 text-[11px]">
                    {userTodayAbsen
                      ? `Tercatat Jam: ${userTodayAbsen.jamMasuk}`
                      : 'Belum melakukan absensi masuk'}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                    userTodayAbsen
                      ? userTodayAbsen.status === 'Tepat Waktu'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {userTodayAbsen ? userTodayAbsen.status : 'Belum Absen'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 block">Operasional Toko</span>
                  <span className="text-slate-500 text-[11px]">
                    {currentBranchState?.status === 'Buka'
                      ? `Buka sejak ${currentBranchState.jamBuka} (Modal: ${formatRupiah(currentBranchState.modalAwal)})`
                      : 'Toko belum dibuka atau sedang tutup'}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                    currentBranchState?.status === 'Buka'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {currentBranchState?.status || 'Belum Buka'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setActiveTab('absensi')}
                className="flex-1 py-2 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl text-xs transition text-center cursor-pointer"
              >
                Menu Absensi
              </button>
              <button
                onClick={() => setActiveTab('bukaTutup')}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center cursor-pointer"
              >
                Buka / Tutup Toko
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-600" />
              Transaksi Terakhir di {currentUser.cabang}
            </h4>

            {branchTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                Belum ada transaksi di cabang ini hari ini.
              </div>
            ) : (
              <div className="space-y-2">
                {branchTransactions.slice(-3).reverse().map((trx) => (
                  <div
                    key={trx.id}
                    className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{trx.invoiceNo}</div>
                      <div className="text-[11px] text-slate-500">
                        {trx.jam} • {trx.metodeBayar} • {trx.items.length} item
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-orange-600">
                        {formatRupiah(trx.total)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        Untung {formatRupiah(trx.totalUntung)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveTab('pos')}
              className="mt-4 w-full py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Buka Menu Kasir POS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
