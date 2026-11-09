import React, { useState, useEffect } from 'react';
import {
  FileText,
  BarChart2,
  Calendar,
  Filter,
  Printer,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Store,
  PieChart,
  ShoppingBag,
  Package,
  Lock,
  ShieldCheck,
  Search,
  CheckCircle,
  Building2,
  RotateCcw,
} from 'lucide-react';
import {
  Transaksi,
  LaporanHarian,
  BahanBaku,
  StokCabangMap,
  KatalogMenu,
  Cabang,
  Karyawan,
  AuditLog,
  PengeluaranToko,
  DataCabang,
} from '../types';
import { formatRupiah, getTodayStr } from '../utils/storage';
import { getBranchName, getStoreBranchNames } from '../utils/branchHelper';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface LaporanViewProps {
  transaksiList: Transaksi[];
  laporanHarianList: LaporanHarian[];
  bahanBakuList: BahanBaku[];
  stokCabang: StokCabangMap;
  katalogList: KatalogMenu[];
  karyawanList?: Karyawan[];
  auditLogList?: AuditLog[];
  pengeluaranList?: PengeluaranToko[];
  dataCabangList?: DataCabang[];
  onOpenPrintModal: (type: any, data?: any) => void;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  transaksiList,
  laporanHarianList,
  bahanBakuList,
  stokCabang,
  katalogList,
  karyawanList = [],
  auditLogList = [],
  pengeluaranList = [],
  dataCabangList = [],
  onOpenPrintModal,
}) => {
  const today = getTodayStr();
  const currentMonth = today.slice(0, 7); // 'YYYY-MM'

  const storeBranchList = getStoreBranchNames(dataCabangList);

  // Sub-tabs: 'harian' | 'bulanan' | 'grafik' | 'stokMenipis' | 'auditLog' | 'auditBulanan' | 'divoid'
  const [activeSubTab, setActiveSubTab] = useState<'harian' | 'bulanan' | 'grafik' | 'stokMenipis' | 'auditLog' | 'auditBulanan' | 'divoid'>('harian');

  // Filters
  const [filterCabang, setFilterCabang] = useState<string>('Semua');
  const [filterTanggal, setFilterTanggal] = useState<string>(today);
  const [filterBulan, setFilterBulan] = useState<string>(currentMonth);
  const [auditSearchTerm, setAuditSearchTerm] = useState<string>('');
  const [auditFilterAksi, setAuditFilterAksi] = useState<string>('Semua');
  const [auditBulananCabang, setAuditBulananCabang] = useState<string>(storeBranchList[0] || '');
  const [auditBulananBulan, setAuditBulananBulan] = useState<string>(currentMonth);

  // BottomSheetPicker states
  const [showPickerFilterCabang, setShowPickerFilterCabang] = useState(false);
  const [showPickerAuditCabang, setShowPickerAuditCabang] = useState(false);
  const [showPickerAuditAksi, setShowPickerAuditAksi] = useState(false);

  // Filtered DIVOID Transactions (Requirement 6: Tampilkan menu lama & menu pengganti untuk audit owner/admin)
  const divoidTrxList = transaksiList.filter((t) => {
    const matchCabang = filterCabang === 'Semua' || t.cabang === filterCabang;
    const isDivoid =
      t.statusPesanan === 'DIVOID' ||
      (t.statusPesanan && t.statusPesanan.toUpperCase().includes('VOID')) ||
      Boolean(t.voidKeInvoice);
    return matchCabang && isDivoid;
  });

  useEffect(() => {
    if (!auditBulananCabang && storeBranchList.length > 0) {
      setAuditBulananCabang(storeBranchList[0]);
    }
  }, [storeBranchList, auditBulananCabang]);

  // 1. LAPORAN HARIAN CALCULATION
  const filteredDailyTrx = transaksiList.filter((t) => {
    const matchCabang = filterCabang === 'Semua' || t.cabang === filterCabang;
    const matchTanggal = t.tanggal === filterTanggal;
    return matchCabang && matchTanggal && t.status === 'Sukses';
  });

  const dailyOmzet = filteredDailyTrx.reduce((acc, t) => acc + t.total, 0);
  const dailyModal = filteredDailyTrx.reduce((acc, t) => acc + t.totalModal, 0);
  const dailyUntung = filteredDailyTrx.reduce((acc, t) => acc + t.totalUntung, 0);
  const dailyTrxCount = filteredDailyTrx.length;

  // 2. LAPORAN BULANAN CALCULATION (Grouped by Date)
  const monthlyTrx = transaksiList.filter((t) => {
    const matchCabang = filterCabang === 'Semua' || t.cabang === filterCabang;
    const matchMonth = t.tanggal.startsWith(filterBulan);
    return matchCabang && matchMonth && t.status === 'Sukses';
  });

  const monthlyGrouped: {
    [date: string]: { omzet: number; modal: number; untung: number; count: number };
  } = {};

  monthlyTrx.forEach((t) => {
    if (!monthlyGrouped[t.tanggal]) {
      monthlyGrouped[t.tanggal] = { omzet: 0, modal: 0, untung: 0, count: 0 };
    }
    monthlyGrouped[t.tanggal].omzet += t.total;
    monthlyGrouped[t.tanggal].modal += t.totalModal;
    monthlyGrouped[t.tanggal].untung += t.totalUntung;
    monthlyGrouped[t.tanggal].count += 1;
  });

  const monthlyDates = Object.keys(monthlyGrouped).sort();
  const totalMonthlyOmzet = monthlyTrx.reduce((acc, t) => acc + t.total, 0);
  const totalMonthlyModal = monthlyTrx.reduce((acc, t) => acc + t.totalModal, 0);
  const totalMonthlyUntung = monthlyTrx.reduce((acc, t) => acc + t.totalUntung, 0);

  // 3. GRAFIK: MENU TERLARIS (Top Selling Menu)
  const menuSalesMap: { [nama: string]: { qty: number; omzet: number } } = {};
  monthlyTrx.forEach((t) => {
    t.items.forEach((it) => {
      if (!menuSalesMap[it.nama]) {
        menuSalesMap[it.nama] = { qty: 0, omzet: 0 };
      }
      menuSalesMap[it.nama].qty += it.qty;
      menuSalesMap[it.nama].omzet += it.subtotal;
    });
  });

  const topSellingMenu = Object.entries(menuSalesMap)
    .map(([nama, data]) => ({ nama, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 7);

  const maxTopQty = Math.max(...topSellingMenu.map((m) => m.qty), 1);
  const maxDayOmzet = Math.max(...monthlyDates.map((d) => monthlyGrouped[d].omzet), 1);

  // 4. LAPORAN STOK MENIPIS (DC + CABANG)
  const lowStockList: {
    lokasi: string;
    bahan: BahanBaku;
    stokSaatIni: number;
    stokMin: number;
  }[] = [];

  // Check DC
  bahanBakuList.forEach((b) => {
    if (b.stokDC <= b.stokMinimum) {
      lowStockList.push({
        lokasi: 'DC PUSAT',
        bahan: b,
        stokSaatIni: b.stokDC,
        stokMin: b.stokMinimum,
      });
    }
  });

  // Check Cabang
  storeBranchList.forEach((cab) => {
    const cStock = stokCabang[cab] || {};
    bahanBakuList.forEach((b) => {
      const current = cStock[b.id] ?? 0;
      const branchMin = b.stokMinimum * 0.4;
      if (current <= branchMin) {
        lowStockList.push({
          lokasi: cab,
          bahan: b,
          stokSaatIni: Number(current.toFixed(1)),
          stokMin: Number(branchMin.toFixed(1)),
        });
      }
    });
  });

  // 5. AUDIT LOG CALCULATION (Permanent, immutable audit trail)
  const filteredAuditLogs = auditLogList.filter((log) => {
    const matchCabang = filterCabang === 'Semua' || log.cabang === filterCabang;
    const matchAksi = auditFilterAksi === 'Semua' || log.aksi === auditFilterAksi;
    const searchLower = auditSearchTerm.toLowerCase();
    const matchSearch =
      !auditSearchTerm.trim() ||
      log.siapa.toLowerCase().includes(searchLower) ||
      log.aksi.toLowerCase().includes(searchLower) ||
      (log.keterangan && log.keterangan.toLowerCase().includes(searchLower)) ||
      log.cabang.toLowerCase().includes(searchLower);
    return matchCabang && matchAksi && matchSearch;
  });
  const totalAuditNominal = filteredAuditLogs.reduce((acc, log) => acc + (log.nominal || 0), 0);

  // 6. AUDIT BULANAN SETIAP CABANG (Requirement: Buat Audit bulanan untuk setiap cabang)
  const auditMonthlyTrx = transaksiList.filter(
    (t) =>
      t.cabang === auditBulananCabang &&
      t.tanggal.startsWith(auditBulananBulan) &&
      t.status === 'Sukses'
  );
  const auditMonthlyOmzet = auditMonthlyTrx.reduce((acc, t) => acc + t.total, 0);

  const auditMonthlyExpenses = pengeluaranList.filter(
    (p) =>
      p.cabang === auditBulananCabang &&
      p.tanggal.startsWith(auditBulananBulan)
  );
  const auditMonthlyExpensesAcc = auditMonthlyExpenses
    .filter((p) => p.status === 'Disetujui')
    .reduce((acc, p) => acc + p.nominal, 0);

  const auditMonthlyExpensesPending = auditMonthlyExpenses
    .filter((p) => p.status === 'Menunggu ACC')
    .reduce((acc, p) => acc + p.nominal, 0);

  const auditMonthlySetoran = auditMonthlyOmzet - auditMonthlyExpensesAcc;

  const auditMonthlyClosings = laporanHarianList.filter(
    (l) =>
      l.cabang === auditBulananCabang &&
      l.tanggal.startsWith(auditBulananBulan)
  );

  const auditMonthlyLogs = auditLogList.filter(
    (log) =>
      log.cabang === auditBulananCabang &&
      log.tanggal.startsWith(auditBulananBulan)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Laporan Penjualan, Keuangan & Print
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekap omzet harian per cabang, laporan bulanan, grafik visual menu terlaris, audit bulanan per cabang, dan cetak dokumen format A4.
          </p>
        </div>

        {/* Global Print Quick Triggers */}
        <div className="flex flex-wrap gap-2">
          {activeSubTab === 'harian' && (
            <button
              onClick={() =>
                onOpenPrintModal('harian', {
                  tanggal: filterTanggal,
                  cabang: filterCabang,
                  trxList: filteredDailyTrx,
                  omzet: dailyOmzet,
                  modal: dailyModal,
                  untung: dailyUntung,
                })
              }
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan Harian A4</span>
            </button>
          )}

          {activeSubTab === 'bulanan' && (
            <button
              onClick={() =>
                onOpenPrintModal('bulanan', {
                  bulan: filterBulan,
                  cabang: filterCabang,
                  grouped: monthlyGrouped,
                  dates: monthlyDates,
                  totalOmzet: totalMonthlyOmzet,
                  totalModal: totalMonthlyModal,
                  totalUntung: totalMonthlyUntung,
                })
              }
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan Bulanan A4</span>
            </button>
          )}

          {activeSubTab === 'auditBulanan' && (
            <button
              onClick={() =>
                onOpenPrintModal('auditBulanan', {
                  cabang: auditBulananCabang,
                  bulan: auditBulananBulan,
                  omzet: auditMonthlyOmzet,
                  pengeluaranAcc: auditMonthlyExpensesAcc,
                  pengeluaranPending: auditMonthlyExpensesPending,
                  setoran: auditMonthlySetoran,
                  trxCount: auditMonthlyTrx.length,
                  closings: auditMonthlyClosings,
                  expenses: auditMonthlyExpenses,
                  logs: auditMonthlyLogs,
                })
              }
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Audit Bulanan Cabang A4</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('harian')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'harian'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Laporan Harian</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bulanan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'bulanan'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laporan Bulanan</span>
        </button>

        <button
          onClick={() => setActiveSubTab('grafik')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'grafik'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Grafik Omzet & Menu</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stokMenipis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'stokMenipis'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Stok Menipis ({lowStockList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('auditBulanan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'auditBulanan'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4 text-orange-500" />
          <span>Audit Bulanan Cabang</span>
        </button>

        <button
          onClick={() => setActiveSubTab('auditLog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'auditLog'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Audit Log Permanen ({auditLogList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('divoid')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'divoid'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Laporan DIVOID ({divoidTrxList.length})</span>
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {activeSubTab !== 'auditBulanan' && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Filter Cabang:</span>
              <div className="w-auto">
                <BottomSheetPickerTrigger
                  valueTitle={filterCabang === 'Semua' ? 'Semua Cabang Telaga' : filterCabang}
                  onClick={() => setShowPickerFilterCabang(true)}
                  size="sm"
                  className="min-w-[140px]"
                />
                <BottomSheetPicker
                  isOpen={showPickerFilterCabang}
                  onClose={() => setShowPickerFilterCabang(false)}
                  title="Pilih Cabang Laporan"
                  selectedId={filterCabang}
                  onSelect={(opt) => setFilterCabang(String(opt.id))}
                  options={[
                    { id: 'Semua', title: 'Semua Cabang Telaga', subtitle: 'Laporan gabungan seluruh cabang', badge: 'Semua' },
                    ...storeBranchList.map((cName) => ({
                      id: cName,
                      title: cName,
                      subtitle: 'Cabang Toko Resmi',
                    })),
                  ]}
                />
              </div>
            </div>
          )}

          {activeSubTab === 'auditBulanan' && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Pilih Cabang Audit:</span>
                <div className="w-auto">
                  <BottomSheetPickerTrigger
                    valueTitle={auditBulananCabang}
                    onClick={() => setShowPickerAuditCabang(true)}
                    size="sm"
                    className="min-w-[140px]"
                  />
                  <BottomSheetPicker
                    isOpen={showPickerAuditCabang}
                    onClose={() => setShowPickerAuditCabang(false)}
                    title="Pilih Cabang Audit Bulanan"
                    selectedId={auditBulananCabang}
                    onSelect={(opt) => setAuditBulananCabang(String(opt.id))}
                    options={storeBranchList.map((cName) => ({
                      id: cName,
                      title: cName,
                      subtitle: 'Cabang Toko Operasional',
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Pilih Periode Bulan:</span>
                <input
                  type="month"
                  value={auditBulananBulan}
                  onChange={(e) => setAuditBulananBulan(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
                />
              </div>
            </>
          )}

          {activeSubTab === 'harian' && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Pilih Tanggal:</span>
              <input
                type="date"
                value={filterTanggal}
                onChange={(e) => setFilterTanggal(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
          )}

          {(activeSubTab === 'bulanan' || activeSubTab === 'grafik') && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Pilih Bulan:</span>
              <input
                type="month"
                value={filterBulan}
                onChange={(e) => setFilterBulan(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
              />
            </div>
          )}

          {activeSubTab === 'auditLog' && (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">Filter Aksi:</span>
                <div className="w-auto">
                  <BottomSheetPickerTrigger
                    valueTitle={auditFilterAksi === 'Semua' ? 'Semua Aksi' : auditFilterAksi}
                    onClick={() => setShowPickerAuditAksi(true)}
                    size="sm"
                    className="min-w-[140px]"
                  />
                  <BottomSheetPicker
                    isOpen={showPickerAuditAksi}
                    onClose={() => setShowPickerAuditAksi(false)}
                    title="Pilih Filter Aksi Log Audit"
                    selectedId={auditFilterAksi}
                    onSelect={(opt) => setAuditFilterAksi(String(opt.id))}
                    options={[
                      { id: 'Semua', title: 'Semua Aksi', subtitle: 'Tampilkan seluruh log aktivitas' },
                      { id: 'Tutup Toko', title: 'Tutup Toko', subtitle: 'Rekap shift & closing kasir toko' },
                      { id: 'Buka Toko', title: 'Buka Toko', subtitle: 'Opening modal kasir pagi' },
                      { id: 'Pengeluaran Kas Laci', title: 'Pengeluaran Kas Laci', subtitle: 'Operasional uang keluar' },
                      { id: 'Transaksi Kasir', title: 'Transaksi Kasir', subtitle: 'Pesanan bayar sukses' },
                      { id: 'Retur Transaksi', title: 'Retur Transaksi', subtitle: 'Pembatalan & void nota' },
                      { id: 'Lapor Toko Libur', title: 'Lapor Toko Libur', subtitle: 'Hari libur toko/nasional' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative w-full max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari Siapa / Aksi / Catatan..."
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-xs focus:outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 1. VIEW LAPORAN HARIAN */}
      {activeSubTab === 'harian' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Omzet Harian
              </span>
              <span className="text-xl font-black text-orange-600 mt-1 block">
                {formatRupiah(dailyOmzet)}
              </span>
              <span className="text-[10px] text-slate-400">{dailyTrxCount} Transaksi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total HPP (Modal)
              </span>
              <span className="text-xl font-black text-slate-700 mt-1 block">
                {formatRupiah(dailyModal)}
              </span>
              <span className="text-[10px] text-slate-400">Biaya bahan terpakai</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Keuntungan Bersih
              </span>
              <span className="text-xl font-black text-emerald-600 mt-1 block">
                {formatRupiah(dailyUntung)}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">
                Margin {dailyOmzet > 0 ? ((dailyUntung / dailyOmzet) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Rata-rata per Nota
              </span>
              <span className="text-xl font-black text-blue-600 mt-1 block">
                {dailyTrxCount > 0 ? formatRupiah(dailyOmzet / dailyTrxCount) : 'Rp 0'}
              </span>
              <span className="text-[10px] text-slate-400">Basket size konsumen</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar Transaksi Tanggal {filterTanggal} ({filteredDailyTrx.length} Nota)
            </h3>

            {filteredDailyTrx.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada data transaksi penjualan pada tanggal dan cabang yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">No. Invoice</th>
                      <th className="py-2.5 px-2">Waktu</th>
                      <th className="py-2.5 px-3">Nama</th>
                      <th className="py-2.5 px-2">Jabatan</th>
                      <th className="py-2.5 px-2">Cabang</th>
                      <th className="py-2.5 px-3">Kasir Bertugas</th>
                      <th className="py-2.5 px-3">Rincian Menu</th>
                      <th className="py-2.5 px-3 text-right">Modal HPP</th>
                      <th className="py-2.5 px-3 text-right">Total Jual</th>
                      <th className="py-2.5 px-3 text-right">Untung</th>
                      <th className="py-2.5 px-2 text-center">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDailyTrx.map((t) => {
                      const emp = karyawanList.find(
                        (k) => k.id === t.kasirId || k.nama === t.kasirNama
                      );
                      const jabatan = t.kasirJabatan || emp?.jabatan || 'KASIR';
                      const kasirBertugas = t.kasirBertugas || t.kasirNama;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {t.invoiceNo}
                          </td>
                          <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                            {t.jam}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800">
                            {t.kasirNama}
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                jabatan === 'KEPALA TOKO'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : jabatan === 'CREW STORE'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}
                            >
                              {jabatan}
                            </span>
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap font-bold text-orange-700">
                            {t.cabang}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                            {kasirBertugas}
                          </td>
                          <td className="py-3 px-3 max-w-xs text-slate-700">
                            {t.items.map((it, idx) => (
                              <span key={idx} className="block text-[11px]">
                                {it.qty}x {it.nama}
                              </span>
                            ))}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatRupiah(t.totalModal)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900">
                            {formatRupiah(t.total)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600">
                            {formatRupiah(t.totalUntung)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {t.metodeBayar}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Rekap Penutupan Toko & Kasir Bertugas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
              <span>Rekap Penutupan Toko & Kasir Bertugas</span>
              <span className="text-xs text-slate-400 font-normal">
                Tersimpan di LocalStorage
              </span>
            </h3>

            {laporanHarianList.filter(
              (l) =>
                (filterCabang === 'Semua' || l.cabang === filterCabang) &&
                l.tanggal === filterTanggal
            ).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada rekapan penutupan toko pada tanggal {filterTanggal}. Laporan otomatis terbuat saat kasir klik "Tutup Toko" di menu Buka/Tutup Toko.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Nama</th>
                      <th className="py-2.5 px-3">Jabatan</th>
                      <th className="py-2.5 px-3">Cabang</th>
                      <th className="py-2.5 px-3">Kasir Bertugas</th>
                      <th className="py-2.5 px-3">Jam Kerja</th>
                      <th className="py-2.5 px-3 text-right">Modal Awal</th>
                      <th className="py-2.5 px-3 text-right">Total Omzet</th>
                      <th className="py-2.5 px-3 text-right">Pengeluaran</th>
                      <th className="py-2.5 px-3 text-right">Cash Laci</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {laporanHarianList
                      .filter(
                        (l) =>
                          (filterCabang === 'Semua' || l.cabang === filterCabang) &&
                          l.tanggal === filterTanggal
                      )
                      .map((lap) => {
                        const emp = karyawanList.find(
                          (k) => k.id === lap.kasirId || k.nama === lap.kasirNama
                        );
                        const nama = lap.nama || lap.kasirNama;
                        const jabatan = lap.jabatan || emp?.jabatan || 'KASIR';
                        const kasirBertugas = lap.kasirBertugas || lap.kasirNama;

                        return (
                          <tr key={lap.id} className="hover:bg-slate-50/80">
                            <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                              {lap.tanggal}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {nama}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  jabatan === 'KEPALA TOKO'
                                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                    : 'bg-blue-100 text-blue-900 border border-blue-200'
                                }`}
                              >
                                {jabatan}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-orange-700 whitespace-nowrap">
                              {lap.cabang}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              {kasirBertugas}
                            </td>
                            <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                              {lap.jamBuka} - {lap.jamTutup || 'Sekarang'}
                            </td>
                            <td className="py-3 px-3 text-right text-slate-600">
                              {formatRupiah(lap.modalAwal)}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-slate-900">
                              {formatRupiah(lap.totalOmzet)}
                            </td>
                            <td className="py-3 px-3 text-right text-red-600 font-semibold">
                              {formatRupiah(lap.pengeluaran)}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-600">
                              {formatRupiah(lap.cashLaci)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {lap.statusToko}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. VIEW LAPORAN BULANAN */}
      {activeSubTab === 'bulanan' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Omzet Bulan {filterBulan}
              </span>
              <span className="text-2xl font-black text-orange-600 mt-1 block">
                {formatRupiah(totalMonthlyOmzet)}
              </span>
              <span className="text-[10px] text-slate-400">{monthlyTrx.length} Total Transaksi</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Modal HPP
              </span>
              <span className="text-2xl font-black text-slate-700 mt-1 block">
                {formatRupiah(totalMonthlyModal)}
              </span>
              <span className="text-[10px] text-slate-400">Total belanja modal resep</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Keuntungan Bersih
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {formatRupiah(totalMonthlyUntung)}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold">
                Margin Bersih: {totalMonthlyOmzet > 0 ? ((totalMonthlyUntung / totalMonthlyOmzet) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Rekapitulasi Harian Bulan {filterBulan}
            </h3>

            {monthlyDates.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada data transaksi pada bulan ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Tanggal Transaksi</th>
                      <th className="py-3 px-3 text-center">Jumlah Transaksi</th>
                      <th className="py-3 px-3 text-right">Total Omzet</th>
                      <th className="py-3 px-3 text-right">Modal HPP</th>
                      <th className="py-3 px-3 text-right">Keuntungan Bersih</th>
                      <th className="py-3 px-3 text-center">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyDates.map((date) => {
                      const row = monthlyGrouped[date];
                      const margin = row.omzet > 0 ? ((row.untung / row.omzet) * 100).toFixed(1) : 0;
                      return (
                        <tr key={date} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {date}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-600">
                            {row.count} Nota
                          </td>
                          <td className="py-3 px-3 text-right font-black text-orange-600">
                            {formatRupiah(row.omzet)}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {formatRupiah(row.modal)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-600">
                            {formatRupiah(row.untung)}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">
                            {margin}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. VIEW GRAFIK BATANG OMZET & MENU TERLARIS */}
      {activeSubTab === 'grafik' && (
        <div className="space-y-6">
          {/* Grafik Batang Omzet Harian */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-orange-600" />
                  Grafik Batang Penjualan Omzet Harian ({filterBulan})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Perbandingan tren omzet penjualan setiap tanggal
                </p>
              </div>
            </div>

            {monthlyDates.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada data penjualan untuk menampilkan grafik bulan ini.
              </div>
            ) : (
              <div className="space-y-2 pt-4">
                <div className="flex items-end gap-3 h-48 border-b border-slate-200 pb-2 px-2 overflow-x-auto">
                  {monthlyDates.map((date) => {
                    const row = monthlyGrouped[date];
                    const heightPercent = Math.max(8, (row.omzet / maxDayOmzet) * 100);
                    return (
                      <div
                        key={date}
                        className="flex-1 min-w-[50px] flex flex-col items-center gap-1 group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-10">
                          {formatRupiah(row.omzet)} ({row.count} trx)
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[36px] bg-gradient-to-t from-orange-600 to-amber-500 rounded-t-lg transition-all duration-300 group-hover:from-orange-700 group-hover:to-amber-600"
                        />

                        {/* Date label */}
                        <span className="text-[10px] font-bold text-slate-500">
                          {date.slice(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  *Angka pada sumbu X adalah tanggal hari
                </div>
              </div>
            )}
          </div>

          {/* Grafik Batang Menu Terlaris */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-600" />
                Grafik Batang Menu Terlaris (Katalog TELAGA WARNA)
              </h3>
              <p className="text-[11px] text-slate-400">
                Peringkat menu favorit berdasarkan jumlah porsi terjual
              </p>
            </div>

            {topSellingMenu.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada data porsi menu yang terjual pada periode ini.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {topSellingMenu.map((m, idx) => {
                  const widthPercent = (m.qty / maxTopQty) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">
                          {idx + 1}. {m.nama}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-orange-600">
                            {m.qty} Porsi
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({formatRupiah(m.omzet)})
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          style={{ width: `${widthPercent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0
                              ? 'bg-gradient-to-r from-red-600 to-orange-500'
                              : idx === 1
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. VIEW LAPORAN STOK MENIPIS */}
      {activeSubTab === 'stokMenipis' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Peringatan Bahan Baku Menipis (DC & Seluruh Cabang)
              </h3>
              <p className="text-xs text-slate-500">
                Daftar bahan baku dengan sisa stok di bawah batas aman minimum operasional.
              </p>
            </div>
          </div>

          {lowStockList.length === 0 ? (
            <div className="py-12 text-center text-emerald-600 font-bold text-xs bg-emerald-50 rounded-xl">
              Semua stok di DC Pusat dan seluruh Cabang dalam kondisi aman!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Lokasi Gudang / Cabang</th>
                    <th className="py-3 px-3">Nama Bahan Baku</th>
                    <th className="py-3 px-3">Satuan</th>
                    <th className="py-3 px-3 text-right">Batas Minimum</th>
                    <th className="py-3 px-3 text-right">Sisa Stok Saat Ini</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-red-50/50 transition">
                      <td className="py-3 px-4 font-black text-slate-800">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.lokasi === 'DC PUSAT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {item.lokasi}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {item.bahan.nama}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.bahan.satuan}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500 font-semibold">
                        {item.stokMin} {item.bahan.satuan}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-red-600 text-sm">
                        {item.stokSaatIni} {item.bahan.satuan}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-extrabold text-[10px]">
                          Kritis (Restock Segera)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. VIEW AUDIT LOG PERMANEN (Tidak dapat dihapus) */}
      {activeSubTab === 'auditLog' && (
        <div className="space-y-4">
          {/* Integrity Notice Banner */}
          <div className="p-4 bg-slate-900 border-2 border-slate-700 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-400/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>Log Audit Sistem Permanen (Read-Only & Append-Only)</span>
                  <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Kepatuhan Anti-Fraud
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Catatan historis ini merekam otomatis: <strong>Siapa</strong>, <strong>Jam</strong>, <strong>Aksi</strong>, dan <strong>Nominal</strong> operasional laci kasir di seluruh cabang. Tidak ada tombol hapus untuk memastikan data akurat bagi Owner.
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                Total Arsip Log
              </span>
              <span className="text-xl font-black text-amber-400">
                {filteredAuditLogs.length} Entri
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Total Entri Ditampilkan
              </span>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">
                {filteredAuditLogs.length}
              </span>
              <span className="text-[10px] text-slate-400">Dari total {auditLogList.length} aktivitas</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Total Akumulasi Nominal
              </span>
              <span className="text-lg font-black text-orange-600 mt-0.5 block">
                {formatRupiah(totalAuditNominal)}
              </span>
              <span className="text-[10px] text-slate-400">Total volume uang tercatat</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Aktivitas Tutup Toko
              </span>
              <span className="text-lg font-black text-emerald-600 mt-0.5 block">
                {auditLogList.filter((l) => l.aksi === 'Tutup Toko').length} Kali
              </span>
              <span className="text-[10px] text-slate-400">Closing kas laci tersimpan</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Pengeluaran Kas Laci
              </span>
              <span className="text-lg font-black text-red-600 mt-0.5 block">
                {auditLogList.filter((l) => l.aksi === 'Pengeluaran Kas Laci').length} Kali
              </span>
              <span className="text-[10px] text-slate-400">Dengan nota terverifikasi</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredAuditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada riwayat log audit yang sesuai dengan filter pencarian.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-3">Waktu (Tgl & Jam)</th>
                      <th className="py-3 px-3">Siapa (Petugas)</th>
                      <th className="py-3 px-3">Cabang</th>
                      <th className="py-3 px-3">Aksi</th>
                      <th className="py-3 px-3 text-right">Nominal</th>
                      <th className="py-3 px-4">Keterangan Aktivitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs
                      .slice()
                      .reverse()
                      .map((log, idx) => {
                        const aksiColor =
                          log.aksi === 'Tutup Toko'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : log.aksi === 'Buka Toko'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : log.aksi === 'Pengeluaran Kas Laci'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : log.aksi === 'Transaksi Kasir'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : log.aksi === 'Retur Transaksi'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200';

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 text-center font-bold text-slate-400 text-[11px]">
                              {filteredAuditLogs.length - idx}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              <div>{log.tanggal}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {log.jam}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-bold">
                              {log.siapa}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 text-orange-800 border border-orange-200">
                                {log.cabang}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${aksiColor}`}
                              >
                                {log.aksi}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-black text-slate-800 whitespace-nowrap">
                              {log.nominal !== undefined ? (
                                <span
                                  className={
                                    log.aksi === 'Pengeluaran Kas Laci'
                                      ? 'text-red-600'
                                      : log.aksi === 'Tutup Toko'
                                      ? 'text-emerald-700 font-black'
                                      : 'text-slate-800'
                                  }
                                >
                                  {formatRupiah(log.nominal)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs break-words">
                              {log.keterangan || '-'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. VIEW AUDIT BULANAN SETIAP CABANG */}
      {activeSubTab === 'auditBulanan' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-xs rounded-lg text-[11px] font-black tracking-wider uppercase">
                  Audit Bulanan Resmi
                </span>
                <span className="text-orange-200 text-xs font-semibold">
                  Cabang {auditBulananCabang}
                </span>
              </div>
              <h3 className="text-xl font-black mt-1">
                Laporan & Rekapitulasi Audit Periode {auditBulananBulan}
              </h3>
              <p className="text-xs text-orange-100 mt-0.5">
                Pencocokan omzet POS kasir, pengeluaran toko yang telah disetujui (ACC) Owner, setoran akhir kas, dan log aktivitas operasional.
              </p>
            </div>

            <button
              onClick={() =>
                onOpenPrintModal('auditBulanan', {
                  cabang: auditBulananCabang,
                  bulan: auditBulananBulan,
                  omzet: auditMonthlyOmzet,
                  pengeluaranAcc: auditMonthlyExpensesAcc,
                  pengeluaranPending: auditMonthlyExpensesPending,
                  setoran: auditMonthlySetoran,
                  trxCount: auditMonthlyTrx.length,
                  closings: auditMonthlyClosings,
                  expenses: auditMonthlyExpenses,
                  logs: auditMonthlyLogs,
                })
              }
              className="px-4 py-2.5 bg-white text-orange-900 hover:bg-orange-50 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4 text-orange-600" />
              <span>Cetak / Simpan PDF Audit Cabang</span>
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Total Omzet POS
              </span>
              <span className="text-lg font-black text-slate-800 mt-1 block">
                {formatRupiah(auditMonthlyOmzet)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {auditMonthlyTrx.length} transaksi sukses
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Pengeluaran Toko (ACC)
              </span>
              <span className="text-lg font-black text-red-600 mt-1 block">
                {formatRupiah(auditMonthlyExpensesAcc)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Disetujui DC Pusat / Owner
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
              <span className="text-emerald-700 block text-[10px] uppercase font-black tracking-wider">
                Setoran Akhir Bersih
              </span>
              <span className="text-lg font-black text-emerald-700 mt-1 block">
                {formatRupiah(auditMonthlySetoran)}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">
                Omzet - Pengeluaran ACC
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Pengeluaran Menunggu ACC
              </span>
              <span className="text-lg font-black text-amber-600 mt-1 block">
                {formatRupiah(auditMonthlyExpensesPending)}
              </span>
              <span className="text-[10px] text-amber-700 font-medium">
                Belum dihitung ke setoran
              </span>
            </div>
          </div>

          {/* TABEL 1: REKAP CLOSING TUTUP TOKO CABANG */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-orange-600" />
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                  Riwayat Closing Tutup Toko ({auditMonthlyClosings.length} Hari)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Pencatatan kas laci & crew absen pulang
              </span>
            </div>

            {auditMonthlyClosings.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Belum ada data closing tutup toko untuk cabang <strong>{auditBulananCabang}</strong> di periode {auditBulananBulan}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Jam Operasional</th>
                      <th className="py-2.5 px-3">Kasir Closing</th>
                      <th className="py-2.5 px-3 text-right">Omzet Harian</th>
                      <th className="py-2.5 px-3 text-right">Pengeluaran ACC</th>
                      <th className="py-2.5 px-3 text-right">Setoran Akhir</th>
                      <th className="py-2.5 px-3 text-right">Fisik Kas Laci</th>
                      <th className="py-2.5 px-3 text-center">Crew Pulang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditMonthlyClosings
                      .slice()
                      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                      .map((lap, idx) => (
                        <tr key={lap.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {lap.tanggal}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                            {lap.jamBuka || '-'} s/d {lap.jamTutup || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                            {lap.kasirNama}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-800 whitespace-nowrap">
                            {formatRupiah(lap.totalOmzet)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-red-600 whitespace-nowrap">
                            {formatRupiah(lap.pengeluaranAcc || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                            {formatRupiah(lap.setoran)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                            {formatRupiah(lap.cashLaci)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {lap.crewPulangCount || 0} Orang
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TABEL 2: RINCIAN PENGELUARAN TOKO DI BULAN INI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                  Rincian Pengeluaran Toko ({auditMonthlyExpenses.length} Pengajuan)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Persetujuan 1-Klik Owner DC Pusat
              </span>
            </div>

            {auditMonthlyExpenses.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Tidak ada pengajuan pengeluaran toko untuk cabang <strong>{auditBulananCabang}</strong> di periode {auditBulananBulan}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Tanggal & Jam</th>
                      <th className="py-2.5 px-3">Pengaju (Kasir)</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-4">Keterangan Pengeluaran</th>
                      <th className="py-2.5 px-3 text-center">Status ACC</th>
                      <th className="py-2.5 px-3">Verifikator / Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditMonthlyExpenses
                      .slice()
                      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                      .map((p, idx) => {
                        const statusBadge =
                          p.status === 'Disetujui'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : p.status === 'Ditolak'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300';

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                              <div>{p.tanggal}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.jam}</div>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                              {p.pengajuNama || p.kasirNama}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                              {formatRupiah(p.nominal)}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 max-w-xs break-words">
                              {p.keterangan}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${statusBadge}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                              {p.accOleh ? (
                                <>
                                  <div className="font-semibold text-slate-800">{p.accOleh}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{p.accWaktu || '-'}</div>
                                </>
                              ) : (
                                <span className="text-slate-400 italic">Menunggu respon</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TABEL 3: LOG AUDIT PERMANEN CABANG DI BULAN INI */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                  Audit Trail Permanen Cabang ({auditMonthlyLogs.length} Catatan)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Data permanen tidak dapat diubah atau dihapus
              </span>
            </div>

            {auditMonthlyLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada log aktivitas audit di cabang {auditBulananCabang} pada bulan ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3 w-10 text-center">No</th>
                      <th className="py-2 px-3">Waktu</th>
                      <th className="py-2 px-3">Petugas</th>
                      <th className="py-2 px-3">Aksi</th>
                      <th className="py-2 px-3 text-right">Nominal</th>
                      <th className="py-2 px-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditMonthlyLogs
                      .slice()
                      .reverse()
                      .slice(0, 50)
                      .map((log, idx) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {log.tanggal} {log.jam}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {log.siapa}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {log.aksi}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                            {log.nominal ? formatRupiah(log.nominal) : '-'}
                          </td>
                          <td className="py-2 px-4 text-slate-600 text-[11px] max-w-sm truncate">
                            {log.keterangan || '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB: LAPORAN DIVOID (Requirement 6: Tampilkan Menu Lama dan Menu Pengganti untuk Audit Owner & Admin) */}
      {activeSubTab === 'divoid' && (
        <div className="space-y-4">
          {/* Ringkasan Akuntansi Void */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Total Transaksi Di-VOID
                </span>
                <span className="text-xl font-black text-purple-950">
                  {divoidTrxList.length} Transaksi
                </span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Total Uang Kembalian (Kasir ➔ Pelanggan)
                </span>
                <span className="text-xl font-black text-emerald-700">
                  {formatRupiah(
                    divoidTrxList
                      .filter((t) => (t.selisihVoid || 0) < 0)
                      .reduce((acc, t) => acc + Math.abs(t.selisihVoid || 0), 0)
                  )}
                </span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Total Tagihan Tambahan (Pelanggan ➔ Kasir)
                </span>
                <span className="text-xl font-black text-amber-700">
                  {formatRupiah(
                    divoidTrxList
                      .filter((t) => (t.selisihVoid || 0) > 0)
                      .reduce((acc, t) => acc + (t.selisihVoid || 0), 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Banner SOP Audit Void */}
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <span className="font-bold block">Audit Transparansi Pesanan DIVOID</span>
                <span className="text-[11px] text-purple-700">
                  Pesanan lama yang di-VOID dikunci dan tidak dihapus dari Firebase untuk rekam jejak akuntansi, selisih uang kas, dan pengembalian stok.
                </span>
              </div>
            </div>
          </div>

          {/* List Kartu Perbandingan Menu Lama vs Menu Pengganti */}
          {divoidTrxList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <RotateCcw className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-sm">Tidak ada transaksi DIVOID</p>
              <p className="text-xs">
                {filterCabang === 'Semua'
                  ? 'Belum ada transaksi yang di-VOID di seluruh cabang.'
                  : `Tidak ada transaksi yang di-VOID di cabang ${filterCabang}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {divoidTrxList
                .slice()
                .reverse()
                .map((trx) => {
                  const replacementTrx = transaksiList.find(
                    (t) => t.invoiceNo === trx.voidKeInvoice || t.voidDariInvoice === trx.invoiceNo
                  );
                  const oldItems = trx.items || [];
                  const newItems = trx.itemsPengganti || replacementTrx?.items || [];
                  const oldTotal = trx.total || 0;
                  const newTotal = trx.totalPengganti || replacementTrx?.total || (oldTotal + (trx.selisihVoid || 0));
                  const selisih = trx.selisihVoid !== undefined ? trx.selisihVoid : (newTotal - oldTotal);

                  return (
                    <div
                      key={trx.id}
                      className="bg-white rounded-2xl border border-purple-200 shadow-xs overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="p-3.5 bg-purple-50/70 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-black text-xs">
                            VOID #{trx.invoiceNo}
                          </span>
                          <span className="text-purple-400 font-bold">➔</span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-black text-xs">
                            PENGGANTI #{trx.voidKeInvoice || replacementTrx?.invoiceNo || '-'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                            {trx.cabang}
                          </span>
                        </div>

                        <div className="text-right text-[11px] text-slate-500 font-medium">
                          <span>{trx.tanggal} {trx.jam}</span> • <span className="font-bold text-slate-700">Kasir: {trx.kasirNama || '-'}</span>
                        </div>
                      </div>

                      {/* Card Body: Perbandingan Dua Kolom */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Kolom 1: Menu Lama */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                            <span className="font-black text-slate-700 uppercase tracking-wide text-[11px]">
                              1. Menu Lama yang Dibatalkan:
                            </span>
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                              Dibatalkan
                            </span>
                          </div>

                          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                            {oldItems.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-slate-700 text-[11px]">
                                <span className="truncate pr-2">
                                  <strong>{it.qty}x</strong> {it.nama}
                                </span>
                                <span className="font-bold text-slate-900 shrink-0">
                                  {formatRupiah(it.subtotal)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-black text-xs text-slate-800">
                            <span>Total Pesanan Lama:</span>
                            <span className="text-sm">{formatRupiah(oldTotal)}</span>
                          </div>
                        </div>

                        {/* Kolom 2: Menu Pengganti */}
                        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2">
                          <div className="flex items-center justify-between border-b border-purple-200 pb-1.5">
                            <span className="font-black text-purple-900 uppercase tracking-wide text-[11px]">
                              2. Menu Pengganti yang Dibuat:
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Aktif Baru
                            </span>
                          </div>

                          {newItems.length > 0 ? (
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                              {newItems.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-center text-purple-950 text-[11px]">
                                  <span className="truncate pr-2">
                                    <strong>{it.qty}x</strong> {it.nama}
                                  </span>
                                  <span className="font-bold text-purple-900 shrink-0">
                                    {formatRupiah(it.subtotal)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-[11px] py-4 text-center">
                              Rincian item ada di invoice #{trx.voidKeInvoice}
                            </p>
                          )}

                          <div className="pt-2 border-t border-purple-200 flex justify-between items-center font-black text-xs text-purple-950">
                            <span>Total Pesanan Baru:</span>
                            <span className="text-sm">{formatRupiah(newTotal)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Status Selisih (Kembalian atau Tagihan Tambahan) */}
                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">Alasan Void:</span>
                          <span className="font-semibold text-slate-800 italic">
                            "{trx.keteranganVoid || trx.alasanRetur || 'Perubahan menu pelanggan'}"
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {selisih < 0 ? (
                            <div className="px-3 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl font-black text-xs flex items-center gap-1.5">
                              <span>KEMBALIAN (Uang ke Pelanggan):</span>
                              <span className="text-sm font-black text-emerald-800">
                                {formatRupiah(Math.abs(selisih))}
                              </span>
                            </div>
                          ) : selisih > 0 ? (
                            <div className="px-3 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-xl font-black text-xs flex items-center gap-1.5">
                              <span>TAGIHAN (Kekurangan Dibayar):</span>
                              <span className="text-sm font-black text-amber-900">
                                {formatRupiah(selisih)}
                              </span>
                            </div>
                          ) : (
                            <div className="px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-xl font-black text-xs">
                              SELISIH: Rp 0 (Harga Sama Pas)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
