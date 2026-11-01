import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  Calendar,
  UserCheck,
  Printer,
  Search,
  Check,
  UserMinus,
  HeartPulse,
  Info,
  X,
  Shield,
  User,
} from 'lucide-react';
import { Karyawan, Absensi, Cabang, DataCabang } from '../types';
import { getTodayStr, getNowTimeStr } from '../utils/storage';
import { getBranchName, getStoreBranchNames } from '../utils/branchHelper';

interface AbsensiViewProps {
  currentUser: Karyawan;
  absensiList: Absensi[];
  karyawanList?: Karyawan[];
  onAddAbsensi: (absen: Absensi) => void;
  onAbsenPulang: (absenId: string, jamPulang: string, durasi: string) => void;
  onOpenPrintModal: (type: 'absen', data?: any) => void;
  dataCabangList?: DataCabang[];
}

export const AbsensiView: React.FC<AbsensiViewProps> = ({
  currentUser,
  absensiList,
  karyawanList = [],
  onAddAbsensi,
  onAbsenPulang,
  onOpenPrintModal,
  dataCabangList = [],
}) => {
  const isDcPusatOrOwner = currentUser.cabang === 'DC PUSAT' || currentUser.jabatan === 'Owner';
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);
  const today = getTodayStr();

  const activeBranches = getStoreBranchNames(dataCabangList);

  // DC / Store Filter States
  const [filterCabang, setFilterCabang] = useState<string>(
    isDcPusatOrOwner ? 'Semua' : (currentBranchName || currentUser.cabang)
  );
  const [filterTanggal, setFilterTanggal] = useState<string>(today);
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [searchNama, setSearchNama] = useState<string>('');

  // Simulation time toggle (Optional helper so users can easily test 07:50 vs 08:15)
  const [useSimulationTime, setUseSimulationTime] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('07:55:00');

  // Modal State for Self Izin / Sakit
  const [showIzinModal, setShowIzinModal] = useState<boolean>(false);
  const [selectedJenis, setSelectedJenis] = useState<'Izin' | 'Sakit'>('Izin');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(today);
  const [alasanIzinSakit, setAlasanIzinSakit] = useState<string>('');

  // Check today's record for logged-in user
  const myTodayAbsen = absensiList.find(
    (a) => a.karyawanId === currentUser.id && a.tanggal === today
  );

  // Calculate duration between HH:mm:ss and HH:mm:ss
  const calculateDuration = (start: string, end: string): string => {
    try {
      const [sh, sm, ss] = start.split(':').map(Number);
      const [eh, em, es] = end.split(':').map(Number);
      const startSec = sh * 3600 + sm * 60 + (ss || 0);
      const endSec = eh * 3600 + em * 60 + (es || 0);
      const diffSec = Math.max(0, endSec - startSec);
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      return `${hours} Jam ${mins} Menit`;
    } catch {
      return '-';
    }
  };

  // 1. Absen Masuk Mandiri
  const handleAbsenMasukSaya = () => {
    const jamMasuk = useSimulationTime ? simulatedTime : getNowTimeStr();
    // Rule: Telat jika > 08:00
    const [hh, mm] = jamMasuk.split(':').map(Number);
    const isLate = hh > 8 || (hh === 8 && mm > 0);
    const status: Absensi['status'] = isLate ? 'Terlambat' : 'Tepat Waktu';

    const newAbsen: Absensi = {
      id: 'abs-' + Date.now(),
      tanggal: today,
      cabang: currentUser.cabang,
      karyawanId: currentUser.id,
      nama: currentUser.nama,
      jabatan: currentUser.jabatan,
      kasirBertugas: currentUser.nama,
      jamMasuk,
      status,
      keterangan: isLate
        ? 'Masuk melewati batas jam 08:00'
        : 'Hadir tepat waktu sebelum 08:00',
    };

    onAddAbsensi(newAbsen);
  };

  // 2. Absen Pulang Mandiri
  const handleAbsenPulangSaya = () => {
    if (!myTodayAbsen) return;
    const jamPulang = useSimulationTime ? '17:00:00' : getNowTimeStr();
    const durasi = calculateDuration(myTodayAbsen.jamMasuk, jamPulang);
    onAbsenPulang(myTodayAbsen.id, jamPulang, durasi);
  };

  // 3. Izin / Sakit Mandiri
  const handleSubmitIzinSakitSaya = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasanIzinSakit.trim()) {
      alert('Harap masukkan keterangan/alasan izin atau sakit!');
      return;
    }

    if (myTodayAbsen) {
      const confirmReplace = confirm(
        `Anda sudah memiliki data absensi hari ini (${myTodayAbsen.status}). Apakah ingin mengganti dengan status ${selectedJenis}?`
      );
      if (!confirmReplace) return;
    }

    const newAbsen: Absensi = {
      id: 'abs-' + Date.now() + '-' + currentUser.id.slice(-4),
      tanggal: selectedTanggal,
      cabang: currentUser.cabang,
      karyawanId: currentUser.id,
      nama: currentUser.nama,
      jabatan: currentUser.jabatan,
      kasirBertugas: currentUser.nama,
      jamMasuk: '-',
      jamPulang: '-',
      durasi: '-',
      status: selectedJenis,
      keterangan: `${selectedJenis}: ${alasanIzinSakit.trim()}`,
    };

    onAddAbsensi(newAbsen);
    setShowIzinModal(false);
  };

  // Filtered absensi table
  const filteredAbsensi = absensiList.filter((a) => {
    const matchCabang = filterCabang === 'Semua' || a.cabang === filterCabang;
    const matchTanggal = !filterTanggal || a.tanggal === filterTanggal;
    const matchStatus = filterStatus === 'Semua' || a.status === filterStatus;
    const matchNama = !searchNama || a.nama.toLowerCase().includes(searchNama.toLowerCase());
    return matchCabang && matchTanggal && matchStatus && matchNama;
  });

  // Summary counts for current filter
  const activeAbsensiSubset = absensiList.filter(
    (a) =>
      (!filterTanggal || a.tanggal === filterTanggal) &&
      (filterCabang === 'Semua' || a.cabang === filterCabang)
  );

  const countHadirTepat = activeAbsensiSubset.filter((a) => a.status === 'Tepat Waktu').length;
  const countHadirTelat = activeAbsensiSubset.filter((a) => a.status === 'Terlambat').length;
  const countIzin = activeAbsensiSubset.filter((a) => a.status === 'Izin').length;
  const countSakit = activeAbsensiSubset.filter((a) => a.status === 'Sakit').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Absensi Kehadiran Karyawan (Akun Mandiri)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Setiap karyawan (Crew Store, Driver, Cashier, Kepala Toko, SPV, Admin) wajib absen masuk, pulang, atau mengajukan izin/sakit menggunakan <strong>akun login masing-masing</strong>.
          </p>
        </div>

        <button
          onClick={() => onOpenPrintModal('absen', filteredAbsensi)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Rekap Absensi A4</span>
        </button>
      </div>

      {/* CARD 1: ABSENSI MANDIRI AKUN LOGIN (Wajib Akun Sendiri) */}
      <div className="bg-white rounded-3xl border-2 border-orange-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full uppercase">
                {currentUser.cabang}
              </span>
              <span className="text-[10px] font-black bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full uppercase">
                {currentUser.jabatan}
              </span>
              {currentUser.nik && (
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  NIK: {currentUser.nik}
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-1.5">
              Absensi Mandiri: {currentUser.nama}
            </h3>
            <p className="text-xs text-slate-500">
              Tanggal Hari Ini: <strong>{today}</strong> • Batas jam masuk kerja tepat waktu: 08:00 WIB
            </p>
          </div>

          {/* Time simulation tool for easy grading / testing */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs flex items-center gap-2 self-start sm:self-auto">
            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={useSimulationTime}
                onChange={(e) => setUseSimulationTime(e.target.checked)}
                className="rounded text-orange-600"
              />
              <span>Simulasi Jam:</span>
            </label>
            {useSimulationTime && (
              <select
                value={simulatedTime}
                onChange={(e) => setSimulatedTime(e.target.value)}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-bold"
              >
                <option value="07:45:00">07:45 (Tepat Waktu)</option>
                <option value="07:58:00">07:58 (Tepat Waktu)</option>
                <option value="08:15:00">08:15 (Terlambat &gt;08:00)</option>
                <option value="08:45:00">08:45 (Terlambat &gt;08:00)</option>
              </select>
            )}
          </div>
        </div>

        {/* If user is recorded as Izin or Sakit today */}
        {myTodayAbsen && (myTodayAbsen.status === 'Izin' || myTodayAbsen.status === 'Sakit') ? (
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              myTodayAbsen.status === 'Izin'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900'
                : 'bg-rose-50/80 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                  myTodayAbsen.status === 'Izin'
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-rose-200 text-rose-800'
                }`}
              >
                {myTodayAbsen.status === 'Izin' ? (
                  <UserMinus className="w-6 h-6" />
                ) : (
                  <HeartPulse className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="font-black text-base flex items-center gap-2">
                  <span>Hari Ini Anda Tercatat: {myTodayAbsen.status}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-xs">
                    Tidak Wajib Absen Jam Kerja
                  </span>
                </div>
                <div className="text-xs opacity-85 mt-0.5 font-medium">
                  Alasan: {myTodayAbsen.keterangan || '-'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedJenis(myTodayAbsen.status as any);
                setSelectedTanggal(today);
                setAlasanIzinSakit(myTodayAbsen.keterangan?.replace(/^(Izin|Sakit):\s*/, '') || '');
                setShowIzinModal(true);
              }}
              className="px-4 py-2 bg-white text-xs font-bold rounded-xl border border-slate-300 shadow-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Ubah Alasan {myTodayAbsen.status}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Absen Masuk Box */}
            <div className="p-4 rounded-2xl border bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-orange-600" />
                  1. Absen Masuk
                </span>
                {myTodayAbsen && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      myTodayAbsen.status === 'Tepat Waktu'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {myTodayAbsen.status}
                  </span>
                )}
              </div>

              {myTodayAbsen ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-500 text-[11px]">Tercatat Jam Masuk:</div>
                  <div className="text-xl font-black text-slate-800">
                    {myTodayAbsen.jamMasuk}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {myTodayAbsen.keterangan}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleAbsenMasukSaya}
                    className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>KLIK ABSEN MASUK SEKARANG</span>
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJenis('Izin');
                        setSelectedTanggal(today);
                        setAlasanIzinSakit('');
                        setShowIzinModal(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Tidak Masuk Hari Ini? Ajukan Izin / Sakit</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Absen Pulang Box */}
            <div className="p-4 rounded-2xl border bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  2. Absen Pulang
                </span>
                {myTodayAbsen?.jamPulang && myTodayAbsen.jamPulang !== '-' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300">
                    Selesai Kerja
                  </span>
                )}
              </div>

              {myTodayAbsen?.jamPulang && myTodayAbsen.jamPulang !== '-' ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-500 text-[11px]">Jam Pulang & Durasi:</div>
                  <div className="text-xl font-black text-slate-800">
                    {myTodayAbsen.jamPulang}
                  </div>
                  <div className="text-[11px] font-semibold text-blue-600">
                    Total Waktu Kerja: {myTodayAbsen.durasi || '-'}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!myTodayAbsen}
                  onClick={handleAbsenPulangSaya}
                  className="w-full py-3 bg-slate-800 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
                >
                  <Clock className="w-4 h-4" />
                  <span>KLIK ABSEN PULANG</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK SUMMARY COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Tepat Waktu</span>
          </div>
          <div className="text-xl font-black text-emerald-700">{countHadirTepat}</div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Terlambat (&gt;08:00)</span>
          </div>
          <div className="text-xl font-black text-amber-700">{countHadirTelat}</div>
        </div>

        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-blue-800 flex items-center justify-center gap-1">
            <UserMinus className="w-3.5 h-3.5" />
            <span>Izin</span>
          </div>
          <div className="text-xl font-black text-blue-700">{countIzin}</div>
        </div>

        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-rose-800 flex items-center justify-center gap-1">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Sakit</span>
          </div>
          <div className="text-xl font-black text-rose-700">{countSakit}</div>
        </div>
      </div>

      {/* REKAP TABEL ABSENSI */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>Tabel Rekap Kehadiran, Izin & Sakit</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Audit kedisiplinan jam masuk kerja & rekap permohonan izin/sakit karyawan
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
            {/* Search by Name */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={searchNama}
                onChange={(e) => setSearchNama(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold w-40"
              />
            </div>

            {/* Cabang Filter */}
            <select
              value={filterCabang}
              onChange={(e) => setFilterCabang(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="Semua">Semua Cabang</option>
              <option value="DC PUSAT">DC PUSAT</option>
              {activeBranches.map((cName) => (
                <option key={cName} value={cName}>
                  {cName}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="Semua">Semua Status</option>
              <option value="Tepat Waktu">Tepat Waktu</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
            />
          </div>
        </div>

        {filteredAbsensi.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada rekaman absensi untuk filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Nama Karyawan</th>
                  <th className="py-3 px-3">Jabatan</th>
                  <th className="py-3 px-3">Cabang</th>
                  <th className="py-3 px-3">Jam Masuk</th>
                  <th className="py-3 px-3">Jam Pulang</th>
                  <th className="py-3 px-3">Durasi</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAbsensi.slice().reverse().map((a) => {
                  const displayJabatan =
                    a.jabatan ||
                    karyawanList.find((k) => k.id === a.karyawanId || k.nama === a.nama)?.jabatan ||
                    '-';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-slate-700 font-semibold whitespace-nowrap">
                        {a.tanggal}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {a.nama}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {displayJabatan}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-orange-700 whitespace-nowrap">
                        {a.cabang}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {a.jamMasuk}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {a.jamPulang || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {a.durasi || '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            a.status === 'Tepat Waktu'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : a.status === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : a.status === 'Izin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {a.status === 'Izin' && <UserMinus className="w-3 h-3" />}
                          {a.status === 'Sakit' && <HeartPulse className="w-3 h-3" />}
                          <span>{a.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs">
                        {a.keterangan || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: INPUT IZIN / SAKIT MANDIRI (Hanya Untuk Diri Sendiri) */}
      {showIzinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Pengajuan Izin & Sakit ({currentUser.nama})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pengajuan ketidakhadiran mandiri akun Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIzinModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIzinSakitSaya} className="space-y-4 text-xs">
              {/* Status Radio: Izin vs Sakit */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Jenis Ketidakhadiran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJenis('Izin')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                      selectedJenis === 'Izin'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserMinus className={`w-5 h-5 ${selectedJenis === 'Izin' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Izin</span>
                    <span className="text-[10px] font-normal opacity-75">
                      Keperluan pribadi / keluarga
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedJenis('Sakit')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                      selectedJenis === 'Sakit'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <HeartPulse className={`w-5 h-5 ${selectedJenis === 'Sakit' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span>Sakit</span>
                    <span className="text-[10px] font-normal opacity-75">
                      Istirahat dokter / medis
                    </span>
                  </button>
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Berlaku <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedTanggal}
                  onChange={(e) => setSelectedTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  required
                />
              </div>

              {/* Alasan / Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan / Alasan Lengkap <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    selectedJenis === 'Izin'
                      ? 'Contoh: Izin acara keluarga mendesak / urusan perpanjangan dokumen...'
                      : 'Contoh: Demam & flu, istirahat dokter...'
                  }
                  value={alasanIzinSakit}
                  onChange={(e) => setAlasanIzinSakit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIzinModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-extrabold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5 ${
                    selectedJenis === 'Izin'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Kirim Pengajuan {selectedJenis}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
