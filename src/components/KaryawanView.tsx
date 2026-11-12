import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  ArrowRightLeft,
  X,
  MapPin,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Karyawan, Cabang, Jabatan, UserStatus, DataCabang } from '../types';
import { getBranchName } from '../utils/branchHelper';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface KaryawanViewProps {
  karyawanList: Karyawan[];
  dataCabangList?: DataCabang[];
  onAddKaryawan: (karyawan: Karyawan) => void;
  onUpdateKaryawan: (karyawan: Karyawan) => void;
  onDeleteKaryawan: (id: string) => void;
  onOpenPrintModal: (type: 'karyawan', data: Karyawan[]) => void;
}

export const KaryawanView: React.FC<KaryawanViewProps> = ({
  karyawanList,
  dataCabangList = [],
  onAddKaryawan,
  onUpdateKaryawan,
  onDeleteKaryawan,
  onOpenPrintModal,
}) => {
  const branchList = (dataCabangList || []).filter(
    (c) => (c.nama || '').trim().toUpperCase() !== 'DC PUSAT'
  );

  const defaultBranch = branchList[0]?.nama || '';
  const resolveBranch = (raw?: string) => getBranchName(raw, dataCabangList) || raw || '';

  const [search, setSearch] = useState('');
  const [filterCabang, setFilterCabang] = useState('Semua');
  const [showModal, setShowModal] = useState(false);
  const [editingKaryawan, setEditingKaryawan] = useState<Karyawan | null>(null);

  // Form states
  const [nik, setNik] = useState('');
  const [nama, setNama] = useState('');
  const [hp, setHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [cabang, setCabang] = useState<Cabang>(defaultBranch);
  const [jabatan, setJabatan] = useState<Jabatan>('Cashier');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<UserStatus>('Aktif');

  // Pindah Cabang modal state
  const [pindahTarget, setPindahTarget] = useState<Karyawan | null>(null);
  const [newCabangTugas, setNewCabangTugas] = useState<Cabang>(defaultBranch);

  // Inline feedback & confirmation modal states
  const [formError, setFormError] = useState<string | null>(null);
  const [karyawanNotice, setKaryawanNotice] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Karyawan | null>(null);

  // BottomSheetPicker states
  const [showPickerFilterCabang, setShowPickerFilterCabang] = useState(false);
  const [showPickerFormCabang, setShowPickerFormCabang] = useState(false);
  const [showPickerFormJabatan, setShowPickerFormJabatan] = useState(false);
  const [showPickerFormStatus, setShowPickerFormStatus] = useState(false);
  const [showPickerMutasiCabang, setShowPickerMutasiCabang] = useState(false);

  // REQUIREMENT 2: Exclude Owner from employee list (Owner data is in a separate menu and completely private)
  const nonOwnerList = karyawanList.filter(
    (k) => (k.jabatan || '').trim().toUpperCase() !== 'OWNER'
  );

  const openAdd = () => {
    setFormError(null);
    setEditingKaryawan(null);
    setNik(`NIK-${Date.now().toString().slice(-4)}`);
    setNama('');
    setHp('');
    setAlamat('');
    setCabang(defaultBranch);
    setJabatan('Cashier');
    setUsername('');
    setPassword('123');
    setStatus('Aktif');
    setShowModal(true);
  };

  const openEdit = (k: Karyawan) => {
    setFormError(null);
    setEditingKaryawan(k);
    setNik(k.nik || '');
    setNama(k.nama || '');
    setHp(k.hp || '');
    setAlamat(k.alamat || '');
    setCabang(resolveBranch(k.cabang_id || k.cabang));
    const jUp = (k.jabatan || '').trim().toUpperCase();
    if (jUp === 'KASIR' || jUp === 'CASHIER') {
      setJabatan('Cashier');
    } else if (jUp === 'KEPALA TOKO') {
      setJabatan('Kepala Toko');
    } else if (jUp === 'CREW STORE') {
      setJabatan('Crew Store');
    } else if (jUp === 'ADMIN' || jUp === 'ADMIN DC PUSAT') {
      setJabatan('Admin DC Pusat');
    } else if (jUp === 'SUPERVISOR AREA') {
      setJabatan('Supervisor Area');
    } else if (jUp === 'KITCHEN') {
      setJabatan('Kitchen');
    } else if (jUp === 'DRIVER') {
      setJabatan('Driver');
    } else {
      setJabatan(k.jabatan);
    }
    setUsername(k.username || '');
    setPassword(k.password || '');
    setStatus(k.status);
    setShowModal(true);
  };

  const openPindahCabang = (k: Karyawan) => {
    setPindahTarget(k);
    const currentResolved = resolveBranch(k.cabang_id || k.cabang);
    const alternative =
      branchList.find((b) => b.nama !== currentResolved)?.nama ||
      branchList[0]?.nama ||
      '';
    setNewCabangTugas(alternative);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nama.trim() || !nik.trim()) {
      setFormError('Nama Lengkap dan Nomor Induk Karyawan (NIK) wajib diisi.');
      return;
    }

    if (!cabang.trim()) {
      setFormError('Cabang penempatan karyawan wajib dipilih.');
      return;
    }

    if (!username.trim() || !password.trim()) {
      setFormError('Username dan Password akun wajib diisi untuk absensi.');
      return;
    }

    const duplicateNik = nonOwnerList.find(
      (k) =>
        (k.nik || '').trim().toUpperCase() === nik.trim().toUpperCase() &&
        k.id !== editingKaryawan?.id
    );
    if (duplicateNik) {
      setFormError(`Nomor Induk Karyawan (NIK) "${nik}" sudah digunakan oleh karyawan ${duplicateNik.nama}.`);
      return;
    }

    const duplicateUsername = karyawanList.find(
      (k) =>
        (k.username || '').trim().toLowerCase() === username.trim().toLowerCase() &&
        k.id !== editingKaryawan?.id
    );
    if (duplicateUsername) {
      setFormError(`Username "${username}" sudah digunakan. Silakan pilih username lain.`);
      return;
    }

    if (editingKaryawan) {
      onUpdateKaryawan({
        ...editingKaryawan,
        nik: nik.trim(),
        nama: nama.trim(),
        hp: hp.trim(),
        alamat: alamat.trim(),
        cabang,
        jabatan,
        username: username.trim().toLowerCase(),
        password: password.trim(),
        status,
      });
      setKaryawanNotice(`Data karyawan ${nama.trim()} berhasil diperbarui.`);
    } else {
      const newK: Karyawan = {
        id: 'usr-' + Date.now(),
        nik: nik.trim(),
        nama: nama.trim(),
        hp: hp.trim(),
        alamat: alamat.trim(),
        cabang,
        jabatan,
        username: username.trim().toLowerCase(),
        password: password.trim(),
        status,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAddKaryawan(newK);
      setKaryawanNotice(`Karyawan baru ${nama.trim()} berhasil ditambahkan.`);
    }
    setShowModal(false);
  };

  const handleConfirmPindah = () => {
    if (!pindahTarget || !newCabangTugas.trim()) return;
    onUpdateKaryawan({
      ...pindahTarget,
      cabang: newCabangTugas,
    });
    setKaryawanNotice(`${pindahTarget.nama} berhasil dimutasi ke cabang ${newCabangTugas}.`);
    setPindahTarget(null);
  };

  const toggleStatus = (k: Karyawan) => {
    const nextStatus: UserStatus = k.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    onUpdateKaryawan({
      ...k,
      status: nextStatus,
    });
  };

  const filteredList = nonOwnerList.filter((k) => {
    const resolvedCabang = resolveBranch(k.cabang_id || k.cabang);
    const matchCabang = filterCabang === 'Semua' || resolvedCabang === filterCabang;
    const q = search.toLowerCase();
    const matchSearch =
      (k.nama || '').toLowerCase().includes(q) ||
      (k.username || '').toLowerCase().includes(q) ||
      (k.nik || '').toLowerCase().includes(q) ||
      (k.hp || '').includes(search);
    return matchCabang && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Data Karyawan
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pengelolaan NIK manual, akun akses login mandiri, penugasan cabang, mutasi, dan jabatan seluruh staff. Data Owner telah dipisahkan ke menu khusus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenPrintModal('karyawan', filteredList)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Data Karyawan A4</span>
          </button>

          <button
            onClick={openAdd}
            className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {karyawanNotice && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200 font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{karyawanNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setKaryawanNotice(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari NIK, nama, username, atau HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <BottomSheetPickerTrigger
              valueTitle={filterCabang === 'Semua' ? 'Semua Cabang' : filterCabang}
              onClick={() => setShowPickerFilterCabang(true)}
              size="sm"
              icon={<MapPin size={13} />}
              className="min-w-[130px]"
            />
            <BottomSheetPicker
              isOpen={showPickerFilterCabang}
              onClose={() => setShowPickerFilterCabang(false)}
              title="Pilih Cabang Karyawan"
              selectedId={filterCabang}
              onSelect={(opt) => setFilterCabang(String(opt.id))}
              options={[
                { id: 'Semua', title: 'Semua Cabang', subtitle: 'Tampilkan karyawan semua cabang', badge: 'Semua' },
                { id: 'DC PUSAT', title: 'DC PUSAT', subtitle: 'Pusat Distribusi' },
                ...branchList.map((c) => ({
                  id: c.nama,
                  title: c.nama,
                  subtitle: 'Cabang Toko Operasional',
                })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">NIK</th>
                <th className="py-3 px-3">Nama Karyawan</th>
                <th className="py-3 px-3">Kontak & Alamat</th>
                <th className="py-3 px-3">Cabang Tugas</th>
                <th className="py-3 px-3">Jabatan</th>
                <th className="py-3 px-3">Username & Password</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.map((k) => {
                const resolvedCabang = resolveBranch(k.cabang_id || k.cabang);
                const jUp = (k.jabatan || '').trim().toUpperCase();
                return (
                <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono tabular-nums font-bold text-orange-700 dark:text-orange-400 whitespace-nowrap">
                    {k.nik || '-'}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-black flex items-center justify-center text-xs">
                        {(k.nama || '?').charAt(0)}
                      </div>
                      <span>{k.nama}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    <div className="font-semibold tabular-nums">{k.hp || '-'}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {k.alamat || '-'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-extrabold text-orange-800 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                      {resolvedCabang || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        jUp === 'ADMIN DC PUSAT' || jUp === 'ADMIN'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300 border border-red-200 dark:border-red-800'
                          : jUp === 'SUPERVISOR AREA'
                          ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : jUp === 'KEPALA TOKO'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : jUp === 'CASHIER' || jUp === 'KASIR'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : jUp === 'CREW STORE'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : jUp === 'DRIVER'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {k.jabatan}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <div className="font-bold">@{k.username}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Pass: {k.password}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleStatus(k)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                        k.status === 'Aktif'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                      title="Klik untuk ubah status aktif/nonaktif"
                    >
                      {k.status}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openPindahCabang(k)}
                        className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                        title="Mutasi / Pindah Cabang Tugas"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Mutasi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(k)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 text-slate-600 dark:text-slate-300 hover:text-orange-700 rounded-lg transition cursor-pointer"
                        title="Edit Data Karyawan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTarget(k)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Karyawan */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border-2 border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                {editingKaryawan ? `Edit Karyawan: ${editingKaryawan.nama}` : 'Tambah Karyawan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* NIK (Nomor Induk Karyawan - Diisi Manual oleh Owner & Admin DC Pusat) */}
              <div className="p-3 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl space-y-1">
                <label className="block font-black text-orange-950 dark:text-orange-200 text-xs">
                  Nomor Induk Karyawan (NIK) <span className="text-red-500">*WAJIB (Diisi Manual)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: NIK-DC-001 / NIK-TLG1-002"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100 tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-[10px] text-orange-800 dark:text-orange-300">
                  Digunakan untuk identifikasi unik karyawan dan verifikasi reset kata sandi Admin DC Pusat.
                </span>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Karyawan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bambang Suryo"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* No HP */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Cabang Tugas via BottomSheetPicker */}
                <div>
                  <BottomSheetPickerTrigger
                    label="Cabang Tugas *"
                    valueTitle={cabang}
                    placeholder="Pilih cabang..."
                    onClick={() => setShowPickerFormCabang(true)}
                  />
                  <BottomSheetPicker
                    isOpen={showPickerFormCabang}
                    onClose={() => setShowPickerFormCabang(false)}
                    title="Pilih Cabang Penempatan"
                    selectedId={cabang}
                    onSelect={(opt) => setCabang(opt.id as Cabang)}
                    options={[
                      { id: 'DC PUSAT', title: 'DC PUSAT', subtitle: 'Pusat Logistik & Gudang' },
                      ...branchList.map((c) => ({
                        id: c.nama,
                        title: c.nama,
                        subtitle: 'Cabang Toko Operasional',
                      })),
                    ]}
                  />
                </div>
              </div>

              {/* Alamat */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Tempat Tinggal
                </label>
                <input
                  type="text"
                  placeholder="Jl. Raya No. 123..."
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <BottomSheetPickerTrigger
                    label="Jabatan Karyawan *"
                    valueTitle={jabatan}
                    onClick={() => setShowPickerFormJabatan(true)}
                  />
                  <BottomSheetPicker
                    isOpen={showPickerFormJabatan}
                    onClose={() => setShowPickerFormJabatan(false)}
                    title="Pilih Jabatan Karyawan"
                    selectedId={jabatan}
                    onSelect={(opt) => setJabatan(opt.id as Jabatan)}
                    options={[
                      { id: 'Admin DC Pusat', title: 'Admin DC Pusat', subtitle: 'Logistik DC, inventori, dan master data' },
                      { id: 'Supervisor Area', title: 'Supervisor Area', subtitle: 'Monitoring operasional seluruh cabang' },
                      { id: 'Kepala Toko', title: 'Kepala Toko', subtitle: 'Operasional penuh toko cabang' },
                      { id: 'Cashier', title: 'Cashier', subtitle: 'POS Kasir, pesanan, rekap shift, absensi' },
                      { id: 'Crew Store', title: 'Crew Store', subtitle: 'Operasional pelayanan dan pesanan' },
                      { id: 'Kitchen', title: 'Kitchen', subtitle: 'Produksi dapur dan racik bumbu' },
                      { id: 'Driver', title: 'Driver', subtitle: 'Distribusi logistik dan pengiriman' },
                    ]}
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {jabatan === 'Kitchen' && 'Hak Akses: Absensi & Menu Pesanan'}
                    {jabatan === 'Crew Store' && 'Hak Akses: Absensi & Menu Pesanan'}
                    {jabatan === 'Cashier' && 'Hak Akses: POS Kasir, Menu Pesanan, Laporan, Absensi'}
                    {jabatan === 'Driver' && 'Hak Akses: Absensi & Pengiriman Barang'}
                    {jabatan === 'Kepala Toko' && 'Hak Akses: Operasional Penuh Cabang'}
                    {jabatan === 'Supervisor Area' && 'Hak Akses: Monitoring Seluruh Cabang'}
                    {jabatan === 'Admin DC Pusat' && 'Hak Akses: Logistik DC, Inventori, Master Data'}
                  </p>
                </div>

                <div>
                  <BottomSheetPickerTrigger
                    label="Status Akun"
                    valueTitle={status}
                    onClick={() => setShowPickerFormStatus(true)}
                  />
                  <BottomSheetPicker
                    isOpen={showPickerFormStatus}
                    onClose={() => setShowPickerFormStatus(false)}
                    title="Pilih Status Akun"
                    selectedId={status}
                    onSelect={(opt) => setStatus(opt.id as UserStatus)}
                    options={[
                      { id: 'Aktif', title: 'Aktif', subtitle: 'Karyawan aktif bertugas & dapat absen' },
                      { id: 'Nonaktif', title: 'Nonaktif', subtitle: 'Akun dinonaktifkan sementara' },
                    ]}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 block text-[11px]">
                  Kredensial Akun Login (Wajib untuk Absen Mandiri):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="username_login"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer transition"
                >
                  Simpan Data Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Pindah Cabang */}
      {pindahTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Mutasi Cabang: {pindahTarget.nama}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cabang saat ini: <strong>{resolveBranch(pindahTarget.cabang_id || pindahTarget.cabang)}</strong>
            </p>

            <div>
              <BottomSheetPickerTrigger
                label="Pindah ke Cabang:"
                valueTitle={newCabangTugas}
                placeholder="Pilih cabang tujuan..."
                onClick={() => setShowPickerMutasiCabang(true)}
              />
              <BottomSheetPicker
                isOpen={showPickerMutasiCabang}
                onClose={() => setShowPickerMutasiCabang(false)}
                title="Pilih Cabang Mutasi Karyawan"
                selectedId={newCabangTugas}
                onSelect={(opt) => setNewCabangTugas(opt.id as Cabang)}
                options={[
                  { id: 'DC PUSAT', title: 'DC PUSAT', subtitle: 'Pusat Distribusi' },
                  ...branchList.map((c) => ({
                    id: c.nama,
                    title: c.nama,
                    subtitle: 'Cabang Toko Operasional',
                  })),
                ]}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPindahTarget(null)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPindah}
                disabled={!newCabangTugas.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-lg cursor-pointer"
              >
                Simpan Mutasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Karyawan */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Hapus Data Karyawan?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus karyawan{' '}
              <strong className="text-slate-900 dark:text-white">{deleteConfirmTarget.nama}</strong>{' '}
              ({deleteConfirmTarget.nik || '-'}) dari sistem?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const deletedName = deleteConfirmTarget.nama;
                  onDeleteKaryawan(deleteConfirmTarget.id);
                  setDeleteConfirmTarget(null);
                  setKaryawanNotice(`Karyawan ${deletedName} berhasil dihapus.`);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
