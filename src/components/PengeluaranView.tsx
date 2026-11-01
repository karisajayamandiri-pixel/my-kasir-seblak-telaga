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
import { getBranchName, getStoreBranchNames } from '../utils/branchHelper';

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
  const isOwnerOrAdmin = currentUser.jabatan === 'Owner' || currentUser.cabang === 'DC PUSAT';
  const today = getTodayStr();
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);

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

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<PengeluaranToko | null>(null);
  const [alasanTolak, setAlasanTolak] = useState('');

  // Build WhatsApp Text Message
  const buildWaMessage = (item: {
    cabang: string;
    nominal: number;
    keterangan: string;
    tanggal: string;
  }) => {
    return `PENGAJUAN PENGELUARAN - ${item.cabang.toUpperCase()} - Rp ${item.nominal.toLocaleString('id-ID')} - ${item.keterangan} - ${item.tanggal}`;
  };

  // Submit Handler
  const handleSubmit = (sendToWa: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const numNominal = Number(nominal);
    if (!numNominal || numNominal <= 0) {
      setErrorMessage('Nominal pengeluaran wajib diisi dan harus lebih dari Rp 0!');
      return;
    }

    if (!keterangan.trim()) {
      setErrorMessage('Keterangan pengeluaran wajib diisi!');
      return;
    }

    const newPengeluaran: PengeluaranToko = {
      id: 'exp-' + Date.now(),
      tanggal: today,
      jam: getNowTimeStr(),
      cabang: currentBranchName || currentUser.cabang, // Otomatis dari akun yang login
      kasirId: currentUser.id,
      kasirNama: currentUser.nama,
      pengajuNama: currentUser.nama,
      nominal: numNominal,
      keterangan: keterangan.trim(),
      status: 'Menunggu ACC',
    };

    onAddPengeluaran(newPengeluaran);

    // Audit Log
    onAddAuditLog?.({
      siapa: `${currentUser.nama} (${currentUser.jabatan})`,
      cabang: currentBranchName || currentUser.cabang,
      aksi: 'Pengajuan Pengeluaran Toko',
      nominal: numNominal,
      keterangan: `${keterangan.trim()} (Menunggu ACC DC Pusat/Owner)`,
    });

    // Clear Form
    setNominal('');
    setKeterangan('');
    setSuccessMessage('Pengeluaran berhasil disimpan dan dikirim untuk ACC DC Pusat!');

    // If user clicked "Kirim ke DC Pusat untuk ACC"
    if (sendToWa) {
      const waText = buildWaMessage({
        cabang: currentUser.cabang,
        nominal: numNominal,
        keterangan: keterangan.trim(),
        tanggal: today,
      });
      const waClean = formatWaPhone(ownerPhone);
      const waUrl = `https://wa.me/${waClean}?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Filtered List
  const filteredList = pengeluaranList.filter((item) => {
    // If not Owner / DC Pusat, only see their branch's expenses
    const matchBranch = isOwnerOrAdmin
      ? filterCabang === 'Semua' || item.cabang === filterCabang
      : item.cabang === currentUser.cabang;

    const matchStatus =
      filterStatus === 'Semua' || item.status === filterStatus;

    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      !searchTerm.trim() ||
      item.keterangan.toLowerCase().includes(searchLower) ||
      item.kasirNama.toLowerCase().includes(searchLower) ||
      item.cabang.toLowerCase().includes(searchLower) ||
      (item.accOleh && item.accOleh.toLowerCase().includes(searchLower));

    return matchBranch && matchStatus && matchSearch;
  });

  // Totals for today
  const pendingCount = pengeluaranList.filter(
    (p) => p.status === 'Menunggu ACC' && (isOwnerOrAdmin || p.cabang === currentUser.cabang)
  ).length;

  const approvedToday = pengeluaranList
    .filter(
      (p) =>
        p.status === 'Disetujui' &&
        p.tanggal === today &&
        (isOwnerOrAdmin || p.cabang === currentUser.cabang)
    )
    .reduce((sum, p) => sum + p.nominal, 0);

  const pendingTodayNominal = pengeluaranList
    .filter(
      (p) =>
        p.status === 'Menunggu ACC' &&
        p.tanggal === today &&
        (isOwnerOrAdmin || p.cabang === currentUser.cabang)
    )
    .reduce((sum, p) => sum + p.nominal, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Pengeluaran Toko & ACC DC Pusat
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Input biaya operasional kasir cabang dan persetujuan 1-klik dari Owner / DC Pusat.
          </p>
        </div>

        {/* Cabang Auto-Detect Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-xl text-xs font-black border border-orange-200">
          <Building2 className="w-4 h-4 text-orange-600" />
          <span>Cabang Anda: {currentUser.cabang.toUpperCase()}</span>
        </div>
      </div>

      {/* Stats Summary for Owner / DC Pusat */}
      {isOwnerOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Menunggu ACC DC Pusat
              </span>
              <div className="text-xl font-black text-amber-600 mt-0.5">
                {pendingCount} Pengajuan
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Total: {formatRupiah(pendingTodayNominal)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Total Disetujui Hari Ini
              </span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                {formatRupiah(approvedToday)}
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Otomatis memotong omzet saat Tutup Toko
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* INPUT FORM: CABANG ONLY (Tanpa Foto Nota) */}
      {currentUser.cabang !== 'DC PUSAT' && (
        <div className="bg-white rounded-2xl border-2 border-orange-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Form Input Pengeluaran Cabang</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cabang otomatis terdeteksi: <strong>{currentUser.cabang}</strong> (Tidak ada pilihan cabang manual).
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full">
              {currentUser.nama} ({currentUser.jabatan})
            </span>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Input Nominal */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nominal Pengeluaran (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="Contoh: 50000"
                value={nominal}
                onChange={(e) => setNominal(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-base text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {nominal ? formatRupiah(Number(nominal)) : 'Rp 0'}
              </span>
            </div>

            {/* Input Keterangan */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Keterangan Keperluan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Beli es batu kristal 3 karung & isi galon"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Wajib diisi dengan jelas untuk verifikasi ACC DC Pusat.
              </span>
            </div>
          </div>

          {/* Action Buttons: 2 Tombol Sesuai Aturan */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar Pengajuan Pengeluaran Cabang
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isOwnerOrAdmin && (
              <select
                value={filterCabang}
                onChange={(e) => setFilterCabang(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
              >
                <option value="Semua">Semua Cabang</option>
                {activeBranchList.map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold"
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu ACC">Menunggu ACC</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari pengeluaran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada pengajuan pengeluaran yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Tanggal / Jam</th>
                  <th className="py-3 px-3">Cabang</th>
                  <th className="py-3 px-3">Pengaju (Kasir)</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-3 text-right">Nominal</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Aksi Persetujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList
                  .slice()
                  .reverse()
                  .map((item) => {
                    const statusBadge =
                      item.status === 'Disetujui'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : item.status === 'Ditolak'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          <div>{item.tanggal}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.jam}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 text-orange-800 border border-orange-200">
                            {item.cabang}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                          {item.kasirNama}
                        </td>
                        <td className="py-3 px-3 text-slate-800 max-w-xs font-semibold">
                          <div>{item.keterangan}</div>
                          {item.catatanOwner && (
                            <div className="text-[10px] text-red-600 italic mt-0.5">
                              Catatan: {item.catatanOwner}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-red-600 whitespace-nowrap text-sm">
                          {formatRupiah(item.nominal)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${statusBadge}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {/* Owner 1-Click Approve / Reject */}
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
                                      cabang: item.cabang,
                                      aksi: 'ACC Pengeluaran (Disetujui)',
                                      nominal: item.nominal,
                                      keterangan: `Menyetujui pengeluaran ${formatRupiah(item.nominal)}: ${item.keterangan}`,
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
                                  className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition"
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <h3 className="font-bold text-slate-800 text-sm">
                Tolak Pengeluaran {rejectingItem.cabang}
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Nominal: <strong>{formatRupiah(rejectingItem.nominal)}</strong> • Keperluan: {rejectingItem.keterangan}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Penolakan:
              </label>
              <textarea
                value={alasanTolak}
                onChange={(e) => setAlasanTolak(e.target.value)}
                rows={3}
                placeholder="Tuliskan alasan penolakan..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateStatusPengeluaran(rejectingItem.id, 'Ditolak', alasanTolak.trim());
                  onAddAuditLog?.({
                    siapa: `${currentUser.nama} (${currentUser.jabatan})`,
                    cabang: rejectingItem.cabang,
                    aksi: 'ACC Pengeluaran (Ditolak)',
                    nominal: rejectingItem.nominal,
                    keterangan: `Menolak pengeluaran ${formatRupiah(rejectingItem.nominal)}. Alasan: ${alasanTolak.trim()}`,
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
    </div>
  );
};
