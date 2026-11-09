import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  Shield,
  User,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  X,
  Lock,
  Phone,
  MapPin,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { Karyawan, Cabang, Jabatan, UserStatus, DataCabang } from '../types';
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
  const branchList = (dataCabangList && dataCabangList.length > 0)
    ? dataCabangList.filter((c) => c.nama.trim().toUpperCase() !== 'DC PUSAT')
    : [
        { id: '1', nama: 'PADAHERANG 01', status: 'Aktif' },
        { id: '2', nama: 'BANJARSARI 02', status: 'Aktif' },
        { id: '3', nama: 'CIAWTALI 03', status: 'Aktif' },
      ];

  const defaultBranch = branchList[0]?.nama || 'PADAHERANG 01';

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

  // BottomSheetPicker states
  const [showPickerFilterCabang, setShowPickerFilterCabang] = useState(false);
  const [showPickerFormCabang, setShowPickerFormCabang] = useState(false);
  const [showPickerFormJabatan, setShowPickerFormJabatan] = useState(false);
  const [showPickerFormStatus, setShowPickerFormStatus] = useState(false);
  const [showPickerMutasiCabang, setShowPickerMutasiCabang] = useState(false);

  // REQUIREMENT 2: Exclude Owner from employee list (Owner data is in a separate menu and completely private)
  const nonOwnerList = karyawanList.filter((k) => k.jabatan !== 'Owner');

  const openAdd = () => {
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
    setEditingKaryawan(k);
    setNik(k.nik || '');
    setNama(k.nama);
    setHp(k.hp);
    setAlamat(k.alamat);
    setCabang(k.cabang);
    // Standardize jabatan
    if ((k.jabatan as string) === 'KASIR') {
      setJabatan('Cashier');
    } else if ((k.jabatan as string) === 'KEPALA TOKO') {
      setJabatan('Kepala Toko');
    } else if ((k.jabatan as string) === 'CREW STORE') {
      setJabatan('Crew Store');
    } else if ((k.jabatan as string) === 'Admin') {
      setJabatan('Admin DC Pusat');
    } else {
      setJabatan(k.jabatan);
    }
    setUsername(k.username);
    setPassword(k.password);
    setStatus(k.status);
    setShowModal(true);
  };

  const openPindahCabang = (k: Karyawan) => {
    setPindahTarget(k);
    const alternative = branchList.find((b) => b.nama !== k.cabang)?.nama || branchList[0]?.nama || 'BANJARSARI 02';
    setNewCabangTugas(alternative);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !nik.trim()) {
      alert('Nama Lengkap dan Nomor Induk Karyawan (NIK) wajib diisi!');
      return;
    }

    if (!username.trim() || !password.trim()) {
      alert('Username dan Password akun wajib diisi untuk absensi!');
      return;
    }

    // Check duplicate NIK (excluding current editing)
    const duplicateNik = nonOwnerList.find(
      (k) =>
        k.nik &&
        k.nik.trim().toUpperCase() === nik.trim().toUpperCase() &&
        k.id !== editingKaryawan?.id
    );
    if (duplicateNik) {
      alert(`Nomor Induk Karyawan (NIK) "${nik}" sudah digunakan oleh karyawan ${duplicateNik.nama}!`);
      return;
    }

    // Check duplicate Username (excluding current editing)
    const duplicateUsername = karyawanList.find(
      (k) =>
        k.username.trim().toLowerCase() === username.trim().toLowerCase() &&
        k.id !== editingKaryawan?.id
    );
    if (duplicateUsername) {
      alert(`Username "${username}" sudah digunakan! Silakan pilih username lain.`);
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
    }
    setShowModal(false);
  };

  const handleConfirmPindah = () => {
    if (!pindahTarget) return;
    onUpdateKaryawan({
      ...pindahTarget,
      cabang: newCabangTugas,
    });
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
    const matchCabang = filterCabang === 'Semua' || k.cabang === filterCabang;
    const matchSearch =
      k.nama.toLowerCase().includes(search.toLowerCase()) ||
      k.username.toLowerCase().includes(search.toLowerCase()) ||
      (k.nik && k.nik.toLowerCase().includes(search.toLowerCase())) ||
      k.hp.includes(search);
    return matchCabang && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Data Karyawan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan NIK manual, akun akses login mandiri, penugasan cabang, mutasi, dan jabatan seluruh staff. Data Owner telah dipisahkan ke menu khusus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenPrintModal('karyawan', filteredList)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
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

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari NIK, nama, username, atau HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
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
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-orange-700 whitespace-nowrap">
                    {k.nik || '-'}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-black flex items-center justify-center text-xs">
                        {k.nama.charAt(0)}
                      </div>
                      <span>{k.nama}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <div className="font-semibold">{k.hp || '-'}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {k.alamat || '-'}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-extrabold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                      {k.cabang}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        k.jabatan === 'Admin DC Pusat' || k.jabatan === 'Admin'
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : k.jabatan === 'Supervisor Area'
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                          : k.jabatan === 'Kepala Toko' || k.jabatan === 'KEPALA TOKO'
                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                          : k.jabatan === 'Cashier' || k.jabatan === 'KASIR'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : k.jabatan === 'Crew Store' || k.jabatan === 'CREW STORE'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : k.jabatan === 'Driver'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {k.jabatan}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
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
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
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
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                        title="Mutasi / Pindah Cabang Tugas"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Mutasi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEdit(k)}
                        className="p-1.5 bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-700 rounded-lg transition cursor-pointer"
                        title="Edit Data Karyawan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus karyawan "${k.nama}" (${k.nik})?`)) {
                            onDeleteKaryawan(k.id);
                          }
                        }}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                        title="Hapus Karyawan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Karyawan */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border-2 border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-800 text-base">
                {editingKaryawan ? `Edit Karyawan: ${editingKaryawan.nama}` : 'Tambah Karyawan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* NIK (Nomor Induk Karyawan - Diisi Manual oleh Owner & Admin DC Pusat) */}
              <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl space-y-1">
                <label className="block font-black text-orange-950 text-xs">
                  Nomor Induk Karyawan (NIK) <span className="text-red-500">*WAJIB (Diisi Manual)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: NIK-DC-001 / NIK-TLG1-002"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-orange-300 rounded-lg font-mono font-bold text-slate-800 tracking-wide focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-[10px] text-orange-800">
                  Digunakan untuk identifikasi unik karyawan dan verifikasi reset kata sandi Admin DC Pusat.
                </span>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap Karyawan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bambang Suryo"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* No HP */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                {/* Cabang Tugas via BottomSheetPicker */}
                <div>
                  <BottomSheetPickerTrigger
                    label="Cabang Tugas *"
                    valueTitle={cabang}
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
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Tempat Tinggal
                </label>
                <input
                  type="text"
                  placeholder="Jl. Raya No. 123..."
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              {/* JABATAN (Requirement: Admin DC Pusat, Supervisor Area, Kepala Toko, Cashier, Crew Store, Driver) */}
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
                  <p className="text-[10px] text-slate-500 mt-1">
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

              {/* USERNAME & PASSWORD (Wajib untuk semua jabatan karena absensi harus login akun sendiri) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block text-[11px]">
                  Kredensial Akun Login (Wajib untuk Absen Mandiri):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="username_login"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Mutasi Cabang: {pindahTarget.nama}
            </h3>
            <p className="text-xs text-slate-500">
              Cabang saat ini: <strong>{pindahTarget.cabang}</strong>
            </p>

            <div>
              <BottomSheetPickerTrigger
                label="Pindah ke Cabang:"
                valueTitle={newCabangTugas}
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

            <div className="flex gap-2 justify-end pt-2 border-t text-xs">
              <button
                type="button"
                onClick={() => setPindahTarget(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPindah}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Simpan Mutasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
