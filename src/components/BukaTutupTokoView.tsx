import React, { useState } from 'react';
import {
  Store,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  Calendar,
  FileText,
  AlertTriangle,
  MessageCircle,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  X,
  Users,
  Printer,
} from 'lucide-react';
import {
  Karyawan,
  Transaksi,
  LaporanHarian,
  AllTokoState,
  Cabang,
  Absensi,
  AuditLog,
  PengeluaranToko,
  DataCabang,
} from '../types';
import {
  formatRupiah,
  getTodayStr,
  getNowShortTime,
  getNowTimeStr,
  formatWaPhone,
} from '../utils/storage';
import { getBranchName, getStoreBranchNames } from '../utils/branchHelper';

interface BukaTutupTokoViewProps {
  currentUser: Karyawan;
  transaksiList: Transaksi[];
  laporanHarianList: LaporanHarian[];
  tokoState: AllTokoState;
  onUpdateTokoState: (cabang: Exclude<Cabang, 'DC PUSAT'>, newState: any) => void;
  onAddLaporanHarian: (laporan: LaporanHarian) => void;
  absensiList: Absensi[];
  karyawanList?: Karyawan[];
  pengeluaranList: PengeluaranToko[];
  onAddAuditLog?: (
    log: Omit<AuditLog, 'id' | 'tanggal' | 'jam'> & { tanggal?: string; jam?: string }
  ) => void;
  onOpenPrintModal?: (type: any, data?: any) => void;
  ownerPhone?: string;
  dataCabangList?: DataCabang[];
}

export const BukaTutupTokoView: React.FC<BukaTutupTokoViewProps> = ({
  currentUser,
  transaksiList,
  laporanHarianList,
  tokoState,
  onUpdateTokoState,
  onAddLaporanHarian,
  absensiList,
  karyawanList = [],
  pengeluaranList,
  onAddAuditLog,
  onOpenPrintModal,
  ownerPhone = '081234567890',
  dataCabangList = [],
}) => {
  const isDcPusat = currentUser.cabang === 'DC PUSAT';
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);
  const currentCabang = (currentBranchName || currentUser.cabang) as Exclude<Cabang, 'DC PUSAT'>;
  const today = getTodayStr();

  // Check if clocked in today
  const isAbsenToday = absensiList.some(
    (a) => a.karyawanId === currentUser.id && a.tanggal === today
  );

  const myBranchState = !isDcPusat
    ? (tokoState[currentBranchName] || tokoState[currentUser.cabang as Exclude<Cabang, 'DC PUSAT'>])
    : null;

  // Rule: Cek apakah toko sudah pernah tutup hari ini (Maksimal buka toko 1x per hari)
  const isSudahTutupHariIni =
    myBranchState?.sudahTutupHariIni ||
    (myBranchState?.status === 'Tutup' && myBranchState?.terakhirTutupTanggal === today);

  // Open store modal & form
  const [showBukaModal, setShowBukaModal] = useState(false);
  const [modalAwalKas, setModalAwalKas] = useState<number>(150000);

  // Close store modal & form (Tanpa input foto)
  const [showTutupModal, setShowTutupModal] = useState(false);
  const [cashFisikLaci, setCashFisikLaci] = useState<number>(0);
  const [catatanTutup, setCatatanTutup] = useState<string>('Operasional hari ini lancar');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Post-closing WhatsApp & PDF Modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [submittedLaporan, setSubmittedLaporan] = useState<LaporanHarian | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Today's branch transactions
  const todayBranchTrx = transaksiList.filter(
    (t) => t.cabang === currentUser.cabang && t.tanggal === today && t.status === 'Sukses'
  );

  const totalOmzetToday = todayBranchTrx.reduce((acc, t) => acc + t.total, 0);
  const totalModalToday = todayBranchTrx.reduce((acc, t) => acc + t.totalModal, 0);
  const totalUntungToday = todayBranchTrx.reduce((acc, t) => acc + t.totalUntung, 0);
  const totalTrxCount = todayBranchTrx.length;

  const totalCashTrx = todayBranchTrx
    .filter((t) => t.metodeBayar === 'Cash')
    .reduce((acc, t) => acc + t.total, 0);

  const totalQrisTrx = todayBranchTrx
    .filter((t) => t.metodeBayar === 'QRIS')
    .reduce((acc, t) => acc + t.total, 0);

  // OTOMATIS: Ambil semua pengeluaran hari ini yang statusnya Disetujui di cabang tersebut
  const branchApprovedExpenses = pengeluaranList.filter(
    (p) => p.cabang === currentUser.cabang && p.tanggal === today && p.status === 'Disetujui'
  );
  const totalPengeluaranAcc = branchApprovedExpenses.reduce((sum, p) => sum + p.nominal, 0);

  // Setoran = Omzet - Total Pengeluaran Disetujui
  const setoranAkhirOtomatis = Math.max(0, totalOmzetToday - totalPengeluaranAcc);

  // Expected Cash calculation
  const modalAwal = myBranchState?.modalAwal || 0;
  const expectedCashLaci = modalAwal + totalCashTrx - totalPengeluaranAcc;
  const selisihCash = cashFisikLaci - expectedCashLaci;

  // Crew pulang / hadir hari ini (hanya yang hadir kerja, tidak sedang Izin atau Sakit)
  const branchCrewToday = absensiList.filter(
    (a) => a.cabang === currentUser.cabang && a.tanggal === today && a.status !== 'Izin' && a.status !== 'Sakit'
  );
  const crewPulangCount = branchCrewToday.length > 0 ? branchCrewToday.length : 1;
  const crewPulangNames =
    branchCrewToday.length > 0
      ? branchCrewToday.map((c) => `${c.nama} (${c.jabatan || 'CREW'})`)
      : [`${currentUser.nama} (${currentUser.jabatan})`];

  // Buka Toko (Hanya jika belum tutup hari ini)
  const handleBukaToko = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSudahTutupHariIni) {
      alert('Toko sudah ditutup untuk hari ini dan tidak dapat dibuka kembali. Harap tunggu hari esok!');
      return;
    }

    if (!isAbsenToday) {
      alert('Anda wajib melakukan Absen Masuk terlebih dahulu di menu Absensi!');
      return;
    }

    const nominalAwal = Number(modalAwalKas) || 0;

    onUpdateTokoState(currentCabang, {
      status: 'Buka',
      jamBuka: getNowShortTime(),
      kasirNama: currentUser.nama,
      modalAwal: nominalAwal,
      terakhirUpdate: `${today} ${getNowShortTime()}`,
      sudahTutupHariIni: false,
    });

    onAddAuditLog?.({
      siapa: `${currentUser.nama} (${currentUser.jabatan})`,
      cabang: currentUser.cabang,
      aksi: 'Buka Toko',
      nominal: nominalAwal,
      keterangan: `Membuka operasional cabang ${currentUser.cabang} dengan modal kas awal ${formatRupiah(nominalAwal)}`,
    });

    setShowBukaModal(false);
  };

  // Tutup Toko Handler (Tanpa Foto)
  const handleTutupToko = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const newLaporan: LaporanHarian = {
      id: 'lap-' + Date.now(),
      tanggal: today,
      cabang: currentUser.cabang,
      kasirId: currentUser.id,
      kasirNama: currentUser.nama,
      nama: currentUser.nama,
      jabatan: currentUser.jabatan,
      kasirBertugas: currentUser.nama,
      jamBuka: myBranchState?.jamBuka || '08:00',
      jamTutup: getNowShortTime(),
      modalAwal: modalAwal,
      totalOmzet: totalOmzetToday,
      totalTransaksi: totalTrxCount,
      totalModal: totalModalToday,
      totalUntung: totalUntungToday,
      pengeluaran: totalPengeluaranAcc,
      pengeluaranAcc: totalPengeluaranAcc,
      cashLaci: Number(cashFisikLaci) || 0,
      setoran: setoranAkhirOtomatis,
      selisihCash: selisihCash,
      statusToko: 'Tutup',
      catatan: catatanTutup.trim(),
      crewPulangCount: crewPulangCount,
      crewPulangNames: crewPulangNames,
    };

    onAddLaporanHarian(newLaporan);

    // Audit Log Tutup Toko
    onAddAuditLog?.({
      siapa: `${currentUser.nama} (${currentUser.jabatan})`,
      cabang: currentUser.cabang,
      aksi: 'Tutup Toko',
      nominal: setoranAkhirOtomatis,
      keterangan: `Tutup Toko ${currentUser.cabang}: Omzet ${formatRupiah(totalOmzetToday)}, Pengeluaran ACC ${formatRupiah(totalPengeluaranAcc)}, Setoran Akhir ${formatRupiah(setoranAkhirOtomatis)}, Crew Pulang ${crewPulangCount} orang`,
    });

    // Update state: tandai sudahTutupHariIni = true dan terakhirTutupTanggal = today
    onUpdateTokoState(currentCabang, {
      status: 'Tutup',
      jamTutup: getNowShortTime(),
      kasirNama: currentUser.nama,
      modalAwal: 0,
      terakhirUpdate: `${today} ${getNowShortTime()}`,
      terakhirTutupTanggal: today,
      sudahTutupHariIni: true,
    });

    setShowTutupModal(false);
    setSubmittedLaporan(newLaporan);
    setShowWaModal(true);
  };

  // Build WA Report format requested by User:
  // "LAPORAN TUTUP TOKO [CABANG] [TANGGAL] Omzet: Rp, Pengeluaran ACC: Rp, Setoran Akhir: Rp, Crew Pulang: orang."
  const buildLaporanTutupWa = (lap: LaporanHarian): string => {
    if (!lap) return '';
    const cabangName = (lap.cabang || '').toUpperCase();
    const omzetVal = formatRupiah(lap.totalOmzet || 0);
    const pengeluaranVal = formatRupiah(lap.pengeluaranAcc ?? lap.pengeluaran ?? 0);
    const setoranVal = formatRupiah(
      lap.setoran ?? ((lap.totalOmzet || 0) - (lap.pengeluaranAcc ?? lap.pengeluaran ?? 0))
    );
    const crewCount =
      lap.crewPulangCount ??
      (Array.isArray(lap.crewPulangNames) ? lap.crewPulangNames.length : (lap.crewHadir?.length || 1));
    const crewNamesStr =
      Array.isArray(lap.crewPulangNames) && lap.crewPulangNames.length > 0
        ? ` (${lap.crewPulangNames.join(', ')})`
        : Array.isArray(lap.crewHadir) && lap.crewHadir.length > 0
        ? ` (${lap.crewHadir.join(', ')})`
        : '';

    return `LAPORAN TUTUP TOKO ${cabangName} ${lap.tanggal}
Omzet: ${omzetVal}
Pengeluaran ACC: ${pengeluaranVal}
Setoran Akhir: ${setoranVal}
Crew Pulang: ${crewCount} orang${crewNamesStr}
Fisik Kas Laci: ${formatRupiah(lap.cashLaci || 0)}
Jam: ${lap.jamBuka || '-'} - ${lap.jamTutup || '-'}`;
  };

  const currentWaText = submittedLaporan ? buildLaporanTutupWa(submittedLaporan) : '';
  const currentWaUrl = `https://wa.me/${formatWaPhone(ownerPhone)}?text=${encodeURIComponent(currentWaText)}`;

  const handleCopyWaText = () => {
    if (!currentWaText) return;
    navigator.clipboard.writeText(currentWaText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const branches: string[] = getStoreBranchNames(dataCabangList);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Buka / Tutup Toko & Closing Kasir
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan jam operasional, verifikasi foto kas laci & foto absen pulang crew, serta perhitungan setoran otomatis dari pengeluaran yang telah di-ACC.
          </p>
        </div>
      </div>

      {/* CABANG VIEW */}
      {!isDcPusat && (
        <div className="space-y-4">
          {/* Notification if store already closed today */}
          {isSudahTutupHariIni && (
            <div className="p-4 bg-slate-900 border-2 border-slate-700 rounded-2xl text-white shadow-md flex items-center gap-3 text-xs">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-400">Toko Sudah Ditutup Hari Ini ({today}):</strong>
                <p className="text-slate-300 mt-0.5">
                  Sesuai aturan keamanan sistem, toko hanya dapat dibuka 1 kali per hari. Pembukaan toko baru dapat dilakukan besok hari.
                </p>
              </div>
            </div>
          )}

          {!isAbsenToday && !isSudahTutupHariIni && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>
                <strong>Perhatian:</strong> Anda belum melakukan <strong>Absen Masuk</strong> hari ini. Silakan absen terlebih dahulu sebelum membuka toko.
              </span>
            </div>
          )}

          {/* Current Branch Status Card */}
          <div className="bg-white rounded-2xl border-2 border-orange-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <span className="text-[10px] font-extrabold bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full uppercase">
                  {currentUser.cabang}
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1 flex items-center gap-2">
                  Status Operasional:{' '}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      myBranchState?.status === 'Buka'
                        ? 'bg-emerald-100 text-emerald-800'
                        : myBranchState?.status === 'Tutup'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {myBranchState?.status || 'Belum Buka'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Kasir: <strong>{currentUser.nama}</strong> ({currentUser.jabatan}) • Jam Buka: <strong>{myBranchState?.jamBuka || '-'}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {myBranchState?.status !== 'Buka' ? (
                  <button
                    type="button"
                    disabled={isSudahTutupHariIni}
                    onClick={() => {
                      setModalAwalKas(150000);
                      setValidationError(null);
                      setShowBukaModal(true);
                    }}
                    className={`px-4 py-2.5 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition ${
                      isSudahTutupHariIni
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer'
                    }`}
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isSudahTutupHariIni ? 'TUTUP S/D BESOK' : 'BUKA TOKO SEKARANG'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCashFisikLaci(expectedCashLaci);
                      setValidationError(null);
                      setShowTutupModal(true);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>TUTUP TOKO & CLOSING</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Financial Metrics Today */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Omzet Hari Ini</span>
                <span className="font-extrabold text-orange-600 text-sm">
                  {formatRupiah(totalOmzetToday)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {totalTrxCount} Transaksi
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Pengeluaran Disetujui (ACC)</span>
                <span className="font-extrabold text-red-600 text-sm">
                  {formatRupiah(totalPengeluaranAcc)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {branchApprovedExpenses.length} Nota di-ACC
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Setoran Otomatis</span>
                <span className="font-extrabold text-emerald-600 text-sm">
                  {formatRupiah(setoranAkhirOtomatis)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Omzet - Pengeluaran ACC
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Modal Awal Laci</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {formatRupiah(modalAwal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONITORING STATUS SELURUH CABANG */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Store className="w-4 h-4 text-orange-600" />
          Status Operasional Seluruh Cabang ({branches.length} Cabang)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => {
            const state = tokoState[b] || { status: 'Belum Buka' };
            const bTrx = transaksiList.filter(
              (t) => t.cabang === b && t.tanggal === today && t.status === 'Sukses'
            );
            const bOmzet = bTrx.reduce((acc, t) => acc + t.total, 0);
            const isOpened = state.status === 'Buka';

            return (
              <div
                key={b}
                className={`bg-white rounded-2xl border p-5 shadow-xs relative ${
                  isOpened
                    ? 'border-emerald-300 ring-2 ring-emerald-400/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-base">{b}</h4>
                    <p className="text-xs text-slate-500">
                      Kasir: <strong className="text-slate-700">{state.kasirNama || 'Belum Masuk'}</strong>
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      state.status === 'Buka'
                        ? 'bg-emerald-100 text-emerald-800'
                        : state.status === 'Tutup'
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {state.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jam Buka</span>
                    <span className="font-bold text-slate-700">{state.jamBuka || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Omzet Berjalan</span>
                    <span className="font-black text-orange-600">{formatRupiah(bOmzet)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ARSIP CLOSING TOKO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" />
            Riwayat Laporan Closing Toko
          </h3>
          <span className="text-xs text-slate-400">
            Total {laporanHarianList.length} Arsip Closing
          </span>
        </div>

        {laporanHarianList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada arsip closing laporan harian yang disimpan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Tanggal / Cabang</th>
                  <th className="py-3 px-3">Kasir</th>
                  <th className="py-3 px-3 text-right">Omzet</th>
                  <th className="py-3 px-3 text-right">Pengeluaran ACC</th>
                  <th className="py-3 px-3 text-right">Setoran Akhir</th>
                  <th className="py-3 px-3 text-center">Crew Pulang</th>
                  <th className="py-3 px-3 text-center">Aksi Laporan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {laporanHarianList
                  .slice()
                  .reverse()
                  .map((lap) => (
                    <tr key={lap.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <div>{lap.tanggal}</div>
                        <div className="text-orange-700 font-extrabold text-[11px]">
                          {lap.cabang}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                        <div>{lap.kasirNama}</div>
                        <div className="text-[10px] text-slate-400">{lap.jamBuka} - {lap.jamTutup}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-orange-600 whitespace-nowrap">
                        {formatRupiah(lap.totalOmzet)}
                      </td>
                      <td className="py-3 px-3 text-right text-red-600 font-bold whitespace-nowrap">
                        {formatRupiah(lap.pengeluaranAcc || lap.pengeluaran)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600 whitespace-nowrap">
                        {formatRupiah(lap.setoran)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-slate-700">
                        {lap.crewPulangCount || lap.crewHadir?.length || 1} org
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`https://wa.me/${formatWaPhone(ownerPhone)}?text=${encodeURIComponent(
                              buildLaporanTutupWa(lap)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 shadow-xs"
                            title="Kirim WA ke Owner"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WA</span>
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              onOpenPrintModal?.('closingReceipt', {
                                laporan: lap,
                              })
                            }
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Cetak PDF Laporan"
                          >
                            <Printer className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: BUKA TOKO */}
      {showBukaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Unlock className="w-5 h-5" />
              <h3 className="font-black text-slate-800 text-base">
                Buka Toko {currentUser.cabang}
              </h3>
            </div>

            <form onSubmit={handleBukaToko} className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Kasir <strong>{currentUser.nama}</strong> ({currentUser.jabatan}), masukkan uang modal awal laci kasir saat ini.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Modal Kas Awal Laci (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={modalAwalKas}
                  onChange={(e) => setModalAwalKas(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white text-sm font-bold text-slate-800"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowBukaModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Buka Toko Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TUTUP TOKO (TOTAL HAPUS INPUT PENGELUARAN!) */}
      {showTutupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border-2 border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <Lock className="w-5 h-5" />
                <h3 className="font-black text-slate-800 text-base">
                  Tutup Toko & Closing {currentUser.cabang}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTutupModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleTutupToko} className="space-y-4 text-xs">
              {/* Summary Otomatis */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-700 text-[11px] pb-1 border-b flex justify-between">
                  <span>Perhitungan Otomatis Closing Hari Ini:</span>
                  <span className="text-slate-500 font-semibold">{today}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Omzet Penjualan:</span>
                  <span className="font-black text-orange-600">
                    {formatRupiah(totalOmzetToday)} ({totalTrxCount} transaksi)
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pengeluaran Disetujui (ACC):</span>
                  <span className="font-black text-red-600">
                    - {formatRupiah(totalPengeluaranAcc)} ({branchApprovedExpenses.length} nota)
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 border-t pt-2 font-bold">
                  <span>Setoran Akhir Otomatis:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    {formatRupiah(setoranAkhirOtomatis)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Crew Pulang ({crewPulangCount} orang):</span>
                  <span className="font-semibold text-slate-700">
                    {crewPulangNames.join(', ')}
                  </span>
                </div>
              </div>

              {/* Input Hitungan Kas Fisik */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hitungan Uang Fisik di Laci (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={cashFisikLaci}
                  onChange={(e) => setCashFisikLaci(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-black text-sm text-slate-800 focus:bg-white"
                />
              </div>

              {/* Catatan Kasir */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Tambahan Kasir
                </label>
                <input
                  type="text"
                  placeholder="Catatan penutupan operasional..."
                  value={catatanTutup}
                  onChange={(e) => setCatatanTutup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowTutupModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Simpan Closing & Tutup Toko</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST-CLOSING MODAL: KIRIM WA & BAGIKAN FORMAT PDF */}
      {showWaModal && submittedLaporan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border-4 border-emerald-500 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-black text-xl text-slate-800">
                Toko Berhasil Ditutup!
              </h3>
              <p className="text-xs text-slate-500">
                Laporan closing cabang <strong>{submittedLaporan.cabang}</strong> telah berhasil disimpan ke sistem.
              </p>
            </div>

            {/* Recap Box Format Otomatis */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="font-mono text-[11px] bg-slate-900 text-emerald-400 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                {currentWaText}
              </div>
            </div>

            {/* 2 Tombol: Kirim Laporan Tutup Toko WA + Bagikan Format PDF */}
            <div className="space-y-2.5">
              <a
                href={currentWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Kirim Laporan Tutup Toko WA ke Owner</span>
                <ExternalLink className="w-4 h-4 ml-0.5" />
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenPrintModal?.('closingReceipt', {
                      laporan: submittedLaporan,
                    })
                  }
                  className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Bagikan Format PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWaText}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Format WA</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowWaModal(false);
                  setSubmittedLaporan(null);
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
              >
                Selesai & Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
