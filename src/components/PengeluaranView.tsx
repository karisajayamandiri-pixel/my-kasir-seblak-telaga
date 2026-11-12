import React, { useState } from 'react';
import {
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  ExternalLink,
  Search,
  Building2,
  Check,
  Copy,
  X,
} from 'lucide-react';
import {
  Karyawan,
  PengeluaranToko,
  StatusPengeluaran,
  AuditLog,
  DataCabang,
} from '../types';
import {
  formatRupiah,
  getTodayStr,
  getNowTimeStr,
  formatWaPhone,
} from '../utils/storage';
import { getBranchName, getStoreBranchNames, isPusatBranch } from '../utils/branchHelper';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface PengeluaranViewProps {
  currentUser: Karyawan;
  pengeluaranList: PengeluaranToko[];
  onAddPengeluaran: (pengeluaran: PengeluaranToko) => void;
  onUpdateStatusPengeluaran: (
    id: string,
    status: StatusPengeluaran,
    catatan?: string
  ) => void;
  usedNotaHashes?: string[];
  onRegisterNotaHash?: (hash: string) => void;
  onAddAuditLog?: (
    log: Omit<AuditLog, 'id' | 'tanggal' | 'jam'> & { tanggal?: string; jam?: string }
  ) => void;
  ownerPhone?: string;
  dataCabangList?: DataCabang[];
}

export const PengeluaranView: React.FC<PengeluaranViewProps> = ({
  currentUser,
  pengeluaranList,
  onAddPengeluaran,
  onUpdateStatusPengeluaran,
  onAddAuditLog,
  ownerPhone = '081234567890',
  dataCabangList = [],
}) => {
  const isPusat = isPusatBranch(currentUser.cabang, dataCabangList);
  const isOwnerOrAdmin =
    ['OWNER', 'ADMIN DC PUSAT', 'ADMIN'].includes((currentUser.jabatan || '').trim().toUpperCase()) ||
    isPusat;
  const today = getTodayStr();
  const currentBranchName =
    getBranchName(currentUser.cabang_id || currentUser.cabang, dataCabangList) || currentUser.cabang;

  const activeBranchList = getStoreBranchNames(dataCabangList);

  // Form State (Tanpa Foto Nota)
  const [nominal, setNominal] = useState<number | ''>('');
  const [keterangan, setKeterangan] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter State
  const [filterCabang, setFilterCabang] = useState<string>('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPickerFilterCabang, setShowPickerFilterCabang] = useState(false);
  const [showPickerFilterStatus, setShowPickerFilterStatus] = useState(false);

  // Rejection modal & WA Dispatch modal
  const [rejectingItem, setRejectingItem] = useState<PengeluaranToko | null>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [waDispatchModal, setWaDispatchModal] = useState<{ url: string; text: string; phone: string } | null>(null);
  const [waCopied, setWaCopied] = useState(false);

  // Build WhatsApp Text Message
  const buildWaMessage = (item: {
    cabang: string;
    nominal: number;
    keterangan: string;
    tanggal: string;
  }) => {
    return `PENGAJUAN PENGELUARAN - ${(item.cabang || '').toUpperCase()} - Rp ${(Number(item.nominal) || 0).toLocaleString('id-ID')} - ${item.keterangan} - ${item.tanggal}`;
  };

  // Submit Handler
  const handleSubmit = (sendToWa: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const numNominal = Number(nominal);
    if (!numNominal || numNominal <= 0) {
      setErrorMessage('Nominal pengeluaran wajib diisi dan harus lebih dari Rp 0.');
      return;
    }

    if (!keterangan.trim()) {
      setErrorMessage('Keterangan pengeluaran wajib diisi.');
      return;
    }

    const newPengeluaran: PengeluaranToko = {
      id: 'exp-' + Date.now(),
      tanggal: today,
      jam: getNowTimeStr(),
      cabang: currentBranchName,
      kasirId: currentUser.id,
      kasirNama: currentUser.nama,
      pengajuNama: currentUser.nama,
      nominal: numNominal,
      keterangan: keterangan.trim(),
      status: 'Menunggu ACC',
    };

    onAddPengeluaran(newPengeluaran);

    onAddAuditLog?.({
      siapa: `${currentUser.nama} (${currentUser.jabatan})`,
      cabang: currentBranchName,
      aksi: 'Pengajuan Pengeluaran Toko',
      nominal: numNominal,
      keterangan: `${keterangan.trim()} (Menunggu ACC DC Pusat/Owner)`,
    });

    setNominal('');
    setKeterangan('');
    setSuccessMessage('Pengeluaran berhasil disimpan dan dikirim untuk ACC DC Pusat.');

    if (sendToWa) {
      const waText = buildWaMessage({
        cabang: currentBranchName,
        nominal: numNominal,
        keterangan: keterangan.trim(),
        tanggal: today,
      });
      const waClean = formatWaPhone(ownerPhone);
      const waUrl = `https://wa.me/${waClean}?text=${encodeURIComponent(waText)}`;
      setWaCopied(false);
      setWaDispatchModal({ url: waUrl, text: waText, phone: ownerPhone });
    }
  };

  // Filtered List
  const filteredList = pengeluaranList.filter((item) => {
    const resolvedItemCabang = getBranchName(item.cabang, dataCabangList) || item.cabang;
    const matchBranch = isOwnerOrAdmin
      ? filterCabang === 'Semua' || resolvedItemCabang === filterCabang
      : resolvedItemCabang === currentBranchName;

    const matchStatus =
      filterStatus === 'Semua' || item.status === filterStatus;

    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm.trim() ||
      (item.keterangan || '').toLowerCase().includes(searchLower) ||
      (item.kasirNama || '').toLowerCase().includes(searchLower) ||
      (resolvedItemCabang || '').toLowerCase().includes(searchLower) ||
      (item.accOleh || '').toLowerCase().includes(searchLower);

    return matchBranch && matchStatus && matchSearch;
  });

  // Totals for today
  const pendingCount = pengeluaranList.filter((p) => {
    const resolvedBranch = getBranchName(p.cabang, dataCabangList) || p.cabang;
    return p.status === 'Menunggu ACC' && (isOwnerOrAdmin || resolvedBranch === currentBranchName);
  }).length;

  const approvedToday = pengeluaranList
    .filter((p) => {
      const resolvedBranch = getBranchName(p.cabang, dataCabangList) || p.cabang;
      return (
        p.status === 'Disetujui' &&
        p.tanggal === today &&
        (isOwnerOrAdmin || resolvedBranch === currentBranchName)
      );
    })
    .reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);

  const pendingTodayNominal = pengeluaranList
    .filter((p) => {
      const resolvedBranch = getBranchName(p.cabang, dataCabangList) || p.cabang;
      return (
        p.status === 'Menunggu ACC' &&
        p.tanggal === today &&
        (isOwnerOrAdmin || resolvedBranch === currentBranchName)
      );
    })
    .reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Pengeluaran Toko & ACC DC Pusat
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Input biaya operasional kasir cabang dan persetujuan 1-klik dari Owner / DC Pusat.
          </p>
        </div>

        {/* Cabang Auto-Detect Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 rounded-xl text-xs font-black border border-orange-200 dark:border-orange-800">
          <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          <span>Cabang Anda: {(currentBranchName || '').toUpperCase()}</span>
        </div>
      </div>

      {/* Stats Summary for Owner / DC Pusat */}
      {isOwnerOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Menunggu ACC DC Pusat
              </span>
              <div className="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">
                {pendingCount} Pengajuan
              </div>
              <span className="text-[10px] text-slate-400 font-semibold tabular-nums">
                Total: {formatRupiah(pendingTodayNominal)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Total Disetujui Hari Ini
              </span>
              <div className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatRupiah(approvedToday)}
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Otomatis memotong omzet saat Tutup Toko
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* INPUT FORM: CABANG ONLY (Tanpa Foto Nota) */}
      {!isPusat && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-orange-200 dark:border-orange-800/70 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>Form Input Pengeluaran Cabang</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cabang otomatis terdeteksi: <strong>{currentBranchName}</strong> (Tidak ada pilihan cabang manual).
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 px-2.5 py-1 rounded-full">
              {currentUser.nama} ({currentUser.jabatan})
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nominal Pengeluaran (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="Contoh: 50000"
                value={nominal}
                onChange={(e) => setNominal(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-black tabular-nums text-base text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block tabular-nums">
                {nominal ? formatRupiah(Number(nominal)) : 'Rp 0'}
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Keterangan Keperluan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Beli es batu kristal 3 karung & isi galon"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Wajib diisi dengan jelas untuk verifikasi ACC DC Pusat.
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Pengeluaran</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kirim ke DC Pusat untuk ACC</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* TABLE / LIST OF PENGELUARAN */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Daftar Pengajuan Pengeluaran Cabang
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isOwnerOrAdmin && (
              <div className="w-auto">
                <BottomSheetPickerTrigger
                  valueTitle={filterCabang === 'Semua' ? 'Semua Cabang' : filterCabang}
                  onClick={() => setShowPickerFilterCabang(true)}
                  size="sm"
                  icon={<Building2 size={13} />}
                  className="min-w-[130px]"
                />
                <BottomSheetPicker
                  isOpen={showPickerFilterCabang}
                  onClose={() => setShowPickerFilterCabang(false)}
                  title="Pilih Cabang Pengeluaran"
                  selectedId={filterCabang}
                  onSelect={(opt) => setFilterCabang(String(opt.id))}
                  options={[
                    { id: 'Semua', title: 'Semua Cabang', subtitle: 'Tampilkan semua cabang', badge: 'Semua' },
                    ...activeBranchList.map((cName) => ({
                      id: cName,
                      title: cName,
                      subtitle: 'Cabang Toko Resmi',
                    })),
                  ]}
                />
              </div>
            )}

            <div className="w-auto">
              <BottomSheetPickerTrigger
                valueTitle={filterStatus === 'Semua' ? 'Semua Status' : filterStatus}
                onClick={() => setShowPickerFilterStatus(true)}
                size="sm"
                icon={<Check size={13} />}
                className="min-w-[130px]"
              />
              <BottomSheetPicker
                isOpen={showPickerFilterStatus}
                onClose={() => setShowPickerFilterStatus(false)}
                title="Pilih Status Pengajuan"
                selectedId={filterStatus}
                onSelect={(opt) => setFilterStatus(String(opt.id))}
                options={[
                  { id: 'Semua', title: 'Semua Status', subtitle: 'Tampilkan semua status' },
                  { id: 'Menunggu ACC', title: 'Menunggu ACC', subtitle: 'Menunggu persetujuan Owner', badge: 'Pending' },
                  { id: 'Disetujui', title: 'Disetujui', subtitle: 'Pengeluaran telah di-ACC', badge: 'ACC' },
                  { id: 'Ditolak', title: 'Ditolak', subtitle: 'Pengeluaran ditolak', badge: 'Tolak' },
                ]}
              />
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari pengeluaran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            Tidak ada pengajuan pengeluaran yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Tanggal / Jam</th>
                  <th className="py-3 px-3">Cabang</th>
                  <th className="py-3 px-3">Pengaju (Kasir)</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-3 text-right">Nominal</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi Persetujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList
                  .slice()
                  .reverse()
                  .map((item) => {
                    const resolvedItemCabang = getBranchName(item.cabang, dataCabangList) || item.cabang;
                    const accNote = item.catatanAcc || item.catatanOwner;
                    const statusBadge =
                      item.status === 'Disetujui'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : item.status === 'Ditolak'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap tabular-nums">
                          <div>{item.tanggal}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.jam}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                            {resolvedItemCabang}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                          {item.kasirNama || item.pengajuNama || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-800 dark:text-slate-100 max-w-xs font-semibold">
                          <div>{item.keterangan}</div>
                          {accNote && (
                            <div className="text-[10px] text-red-600 dark:text-red-400 italic mt-0.5">
                              Catatan: {accNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap text-sm">
                          {formatRupiah(Number(item.nominal) || 0)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusBadge}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isOwnerOrAdmin ? (
                            item.status === 'Menunggu ACC' ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateStatusPengeluaran(
                                      item.id,
                                      'Disetujui',
                                      'Disetujui oleh Owner'
                                    );
                                    onAddAuditLog?.({
                                      siapa: `${currentUser.nama} (${currentUser.jabatan})`,
                                      cabang: resolvedItemCabang,
                                      aksi: 'ACC Pengeluaran (Disetujui)',
                                      nominal: Number(item.nominal) || 0,
                                      keterangan: `Menyetujui pengeluaran ${formatRupiah(Number(item.nominal) || 0)}: ${item.keterangan}`,
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span>ACC</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingItem(item);
                                    setAlasanTolak('');
                                  }}
                                  className="px-2.5 py-1 bg-red-100 dark:bg-red-950/60 hover:bg-red-200 text-red-700 dark:text-red-300 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition"
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                {item.accOleh ? (
                                  <div>Oleh: {item.accOleh}</div>
                                ) : (
                                  <span>Sudah diproses</span>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              {item.status === 'Menunggu ACC'
                                ? 'Menunggu Review DC'
                                : 'Selesai'}
                            </span>
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

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Tolak Pengeluaran {getBranchName(rejectingItem.cabang, dataCabangList) || rejectingItem.cabang}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Nominal: <strong className="tabular-nums">{formatRupiah(Number(rejectingItem.nominal) || 0)}</strong> • Keperluan: {rejectingItem.keterangan}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alasan Penolakan:
              </label>
              <textarea
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
                rows={3}
                placeholder="Tuliskan alasan penolakan..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const resolvedBranch = getBranchName(rejectingItem.cabang, dataCabangList) || rejectingItem.cabang;
                  onUpdateStatusPengeluaran(rejectingItem.id, 'Ditolak', alasanTolak.trim());
                  onAddAuditLog?.({
                    siapa: `${currentUser.nama} (${currentUser.jabatan})`,
                    cabang: resolvedBranch,
                    aksi: 'ACC Pengeluaran (Ditolak)',
                    nominal: Number(rejectingItem.nominal) || 0,
                    keterangan: `Menolak pengeluaran ${formatRupiah(Number(rejectingItem.nominal) || 0)}. Alasan: ${alasanTolak.trim()}`,
                  });
                  setRejectingItem(null);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Dispatch Modal (Pengganti window.open) */}
      {waDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Send className="w-5 h-5" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Kirim Pengajuan ACC via WhatsApp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWaDispatchModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              {waDispatchModal.text}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(waDispatchModal.text);
                  setWaCopied(true);
                }}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {waCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{waCopied ? 'Teks Tersalin' : 'Salin Pesan'}</span>
              </button>

              <a
                href={waDispatchModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
