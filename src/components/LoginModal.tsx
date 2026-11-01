import React, { useState, useEffect } from 'react';
import {
  Flame,
  Lock,
  User,
  AlertCircle,
  Store,
  ArrowRight,
  ChevronDown,
  MessageCircle,
  HelpCircle,
  FileText,
  CheckCircle,
  X,
  ShieldAlert,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Karyawan, DataCabang } from '../types';
import { formatWaPhone } from '../utils/storage';
import { getBranchName } from '../utils/branchHelper';

interface LoginModalProps {
  karyawanList: Karyawan[];
  dataCabangList: DataCabang[];
  onLoginSuccess: (user: Karyawan, selectedCabang: string) => void;
  onUpdateKaryawan?: (karyawan: Karyawan) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  karyawanList,
  dataCabangList,
  onLoginSuccess,
  onUpdateKaryawan,
}) => {
  // Filter active branches from dataCabang
  const activeCabangList = dataCabangList.filter((c) => c.status === 'Aktif');

  const [selectedCabang, setSelectedCabang] = useState<string>(() => {
    return activeCabangList[0]?.nama || 'PADAHERANG 01';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Failed password attempts per username
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});

  // Recovery Modal States
  // 1. Owner NIB recovery
  const [showOwnerNibModal, setShowOwnerNibModal] = useState(false);
  const [targetOwner, setTargetOwner] = useState<Karyawan | null>(null);
  const [inputNib, setInputNib] = useState('');
  const [nibVerified, setNibVerified] = useState(false);
  const [newOwnerPassword, setNewOwnerPassword] = useState('');

  // 2. Admin DC Pusat NIK recovery
  const [showAdminNikModal, setShowAdminNikModal] = useState(false);
  const [targetAdmin, setTargetAdmin] = useState<Karyawan | null>(null);
  const [inputNik, setInputNik] = useState('');
  const [nikVerified, setNikVerified] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // 3. Employee Contact Admin WhatsApp
  const [showEmployeeContactModal, setShowEmployeeContactModal] = useState(false);
  const [contactUser, setContactUser] = useState<Karyawan | null>(null);

  // Find Admin DC Pusat phone number from karyawanList
  const adminDcPusat =
    karyawanList.find(
      (k) => (k.jabatan === 'Admin DC Pusat' || k.jabatan === 'Admin') && k.status === 'Aktif'
    ) ||
    karyawanList.find((k) => k.jabatan === 'Admin DC Pusat' || k.jabatan === 'Admin');

  const adminPhone = adminDcPusat?.hp || '081234567890';
  const adminNama = adminDcPusat?.nama || 'Admin DC Pusat';

  // Enforce /login route in browser history
  useEffect(() => {
    try {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    } catch {}
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCabang) {
      setError('Silakan pilih cabang tugas terlebih dahulu!');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const resolvedUsername =
      cleanUsername === 'telaga1' ? 'padaherang01' :
      cleanUsername === 'telaga2' ? 'banjarsari02' :
      cleanUsername === 'telaga3' ? 'ciawtali03' : cleanUsername;

    const found = karyawanList.find(
      (k) => k.username.trim().toLowerCase() === resolvedUsername || k.username.trim().toLowerCase() === cleanUsername
    );

    if (!found) {
      setError('Username tidak terdaftar! Periksa kembali username Anda.');
      return;
    }

    // Check Password
    if (found.password !== password) {
      const currentCount = (failedAttempts[cleanUsername] || 0) + 1;
      setFailedAttempts((prev) => ({ ...prev, [cleanUsername]: currentCount }));

      // REQUIREMENT 3: Owner wrong password 3x -> prompt NIB
      if (found.jabatan === 'Owner') {
        if (currentCount >= 3) {
          setError('Password salah 3 kali! Silakan verifikasi Nomor Induk Berusaha (NIB) Anda.');
          setTargetOwner(found);
          setInputNib('');
          setNibVerified(false);
          setNewOwnerPassword('');
          setShowOwnerNibModal(true);
          return;
        } else {
          setError(`Password salah! Percobaan ${currentCount} dari 3.`);
          return;
        }
      }

      // REQUIREMENT 4: Admin DC Pusat wrong password 3x -> show button lupa kata sandi & prompt NIK
      if (found.jabatan === 'Admin DC Pusat' || found.jabatan === 'Admin') {
        if (currentCount >= 3) {
          setError('Password salah 3 kali! Akun Admin DC Pusat terkunci. Klik tombol Lupa Kata Sandi di bawah.');
          setTargetAdmin(found);
          return;
        } else {
          setError(`Password salah! Percobaan ${currentCount} dari 3.`);
          return;
        }
      }

      // REQUIREMENT 4b: Other employees wrong password 3x -> show contact Admin DC Pusat
      if (currentCount >= 3) {
        setError('Password salah 3 kali! Silakan hubungi Admin DC Pusat untuk reset kata sandi Anda.');
        setContactUser(found);
        setShowEmployeeContactModal(true);
        return;
      } else {
        setError(`Password salah! Percobaan ${currentCount} dari 3.`);
        return;
      }
    }

    // Password is correct
    if (found.status === 'Nonaktif') {
      setError('Akun ini sedang berstatus NONAKTIF. Hubungi Admin DC Pusat.');
      return;
    }

    // Cabang Validation:
    // Roles with roving/enterprise duty: Owner, Admin DC Pusat, Supervisor Area, Driver
    const isRovingRole =
      found.jabatan === 'Owner' ||
      found.jabatan === 'Admin DC Pusat' ||
      found.jabatan === 'Admin' ||
      found.jabatan === 'Supervisor Area' ||
      found.jabatan === 'Driver';

    const normSelected = getBranchName(selectedCabang, dataCabangList).trim().toUpperCase();
    const normAssigned = getBranchName(found.cabang, dataCabangList).trim().toUpperCase();

    if (!isRovingRole && normSelected !== normAssigned) {
      const assignedDisplayName = getBranchName(found.cabang, dataCabangList);
      setError(
        `Akses Ditolak! Akun "${found.nama}" bertugas di cabang ${assignedDisplayName}, bukan ${selectedCabang}. Harap pilih cabang ${assignedDisplayName}.`
      );
      return;
    }

    // Reset failed counter
    setFailedAttempts((prev) => ({ ...prev, [cleanUsername]: 0 }));
    onLoginSuccess(found, selectedCabang);
  };

  // Triggered when user clicks "Lupa Kata Sandi?"
  const handleLupaPasswordLink = () => {
    setError('');
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setContactUser(null);
      setShowEmployeeContactModal(true);
      return;
    }

    const found = karyawanList.find(
      (k) => k.username.trim().toLowerCase() === cleanUsername
    );

    if (!found) {
      setError(`Username "${username}" tidak terdaftar. Silakan hubungi Admin DC Pusat untuk reset.`);
      setContactUser(null);
      setShowEmployeeContactModal(true);
      return;
    }

    if (found.jabatan === 'Owner') {
      setTargetOwner(found);
      setInputNib('');
      setNibVerified(false);
      setNewOwnerPassword('');
      setShowOwnerNibModal(true);
    } else if (found.jabatan === 'Admin DC Pusat' || found.jabatan === 'Admin') {
      setTargetAdmin(found);
      setInputNik('');
      setNikVerified(false);
      setNewAdminPassword('');
      setShowAdminNikModal(true);
    } else {
      // Supervisor Area, Kepala Toko, Cashier, Crew Store, Driver
      setContactUser(found);
      setShowEmployeeContactModal(true);
    }
  };

  // Submit NIB verification for Owner
  const handleVerifyOwnerNib = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOwner) return;

    const expectedNib = (targetOwner.nib || '1902240012345').trim();
    if (inputNib.trim() !== expectedNib) {
      alert('Nomor Induk Berusaha (NIB) tidak sesuai dengan data terdaftar! Akses reset ditolak.');
      return;
    }

    setNibVerified(true);
  };

  // Save new Owner password
  const handleSaveOwnerPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOwner || !newOwnerPassword.trim()) return;

    const updated: Karyawan = {
      ...targetOwner,
      password: newOwnerPassword.trim(),
    };

    onUpdateKaryawan?.(updated);
    setPassword(newOwnerPassword.trim());
    setFailedAttempts((prev) => ({ ...prev, [targetOwner.username.toLowerCase()]: 0 }));
    setShowOwnerNibModal(false);
    alert('Kata sandi Owner berhasil diperbarui! Silakan klik Masuk Aplikasi.');
  };

  // Submit NIK verification for Admin DC Pusat
  const handleVerifyAdminNik = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAdmin) return;

    const expectedNik = (targetAdmin.nik || 'NIK-DC-001').trim().toUpperCase();
    if (inputNik.trim().toUpperCase() !== expectedNik) {
      alert('Nomor Induk Karyawan (NIK) tidak sesuai! Akses reset ditolak.');
      return;
    }

    setNikVerified(true);
  };

  // Save new Admin password
  const handleSaveAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAdmin || !newAdminPassword.trim()) return;

    const updated: Karyawan = {
      ...targetAdmin,
      password: newAdminPassword.trim(),
    };

    onUpdateKaryawan?.(updated);
    setPassword(newAdminPassword.trim());
    setFailedAttempts((prev) => ({ ...prev, [targetAdmin.username.toLowerCase()]: 0 }));
    setShowAdminNikModal(false);
    alert('Kata sandi Admin DC Pusat berhasil diperbarui! Silakan klik Masuk Aplikasi.');
  };

  const cleanUserKey = username.trim().toLowerCase();
  const currentAttempts = failedAttempts[cleanUserKey] || 0;
  const isTargetAdminFailed3x =
    targetAdmin &&
    (targetAdmin.jabatan === 'Admin DC Pusat' || targetAdmin.jabatan === 'Admin') &&
    currentAttempts >= 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xs rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Flame className="w-10 h-10 text-amber-200 fill-amber-300" />
          </div>
          <h1 className="text-2xl font-black tracking-wide">SEBLAK TELAGA</h1>
          <p className="text-xs text-orange-100 mt-1 font-medium">
            Sistem Kasir POS & Manajemen Multi-Cabang Telaga
          </p>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-black text-slate-800">Masuk Akun Karyawan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih Cabang Tugas, masukkan Username & Password
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <span className="leading-relaxed font-semibold block">{error}</span>
              </div>
            </div>
          )}

          {/* REQUIREMENT 4: Admin DC Pusat apabila salah 3x muncul tombol lupa kata sandi */}
          {isTargetAdminFailed3x && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Pemulihan Akun Admin DC Pusat</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Verifikasi Nomor Induk Karyawan (NIK) Anda untuk mengatur ulang kata sandi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInputNik('');
                  setNikVerified(false);
                  setNewAdminPassword('');
                  setShowAdminNikModal(true);
                }}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Lupa Kata Sandi (Verifikasi NIK Admin)</span>
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* 1. Dropdown Cabang */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Cabang Tugas <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-orange-600 absolute left-3 top-3.5" />
                <select
                  required
                  value={selectedCabang}
                  onChange={(e) => {
                    setSelectedCabang(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-9 pr-8 py-2.5 text-xs font-bold bg-orange-50/50 border border-orange-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 cursor-pointer appearance-none"
                >
                  {activeCabangList.map((c) => (
                    <option key={c.id} value={c.nama}>
                      {c.nama} {c.isPusat ? '(Gudang & Manajemen Pusat)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username Karyawan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan username akun"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* 3. Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleLupaPasswordLink}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-800 hover:underline cursor-pointer"
                >
                  Lupa Kata Sandi?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
            >
              <span>MASUK APLIKASI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
          My Kasir POS Seblak Telaga • Multi-Role & Multi-Cabang
        </div>
      </div>

      {/* MODAL 1: OWNER NIB RECOVERY (Salah password 3 kali) */}
      {showOwnerNibModal && targetOwner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-amber-300">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-black">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Verifikasi Keamanan Owner
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Salah password 3x. Masukkan Nomor Induk Berusaha (NIB)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOwnerNibModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!nibVerified ? (
              <form onSubmit={handleVerifyOwnerNib} className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                  Demi keamanan tertinggi, sistem meminta <strong>Nomor Induk Berusaha (NIB)</strong> terdaftar untuk memverifikasi identitas asli Owner.
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Induk Berusaha (NIB) Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1902240012345"
                    value={inputNib}
                    onChange={(e) => setInputNib(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOwnerNibModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-xs transition"
                  >
                    Verifikasi NIB
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveOwnerPassword} className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-[11px] font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>NIB Terverifikasi Sah! Silakan masukkan kata sandi baru untuk akun Owner.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kata Sandi Baru Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password baru"
                    value={newOwnerPassword}
                    onChange={(e) => setNewOwnerPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition"
                  >
                    Simpan Kata Sandi Baru & Buka Kunci
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ADMIN DC PUSAT NIK RECOVERY (Salah password 3 kali) */}
      {showAdminNikModal && targetAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-red-300">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Verifikasi NIK Admin DC Pusat
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Masukkan Nomor Induk Karyawan (NIK) terdaftar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminNikModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!nikVerified ? (
              <form onSubmit={handleVerifyAdminNik} className="space-y-4 text-xs">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-[11px]">
                  Masukkan <strong>Nomor Induk Karyawan (NIK)</strong> Anda yang terdaftar di Data Karyawan oleh Owner untuk mereset kata sandi Admin DC Pusat.
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Induk Karyawan (NIK) Admin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NIK-DC-001"
                    value={inputNik}
                    onChange={(e) => setInputNik(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-800 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminNikModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow-xs transition"
                  >
                    Verifikasi NIK
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveAdminPassword} className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-[11px] font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>NIK Terverifikasi Sah! Silakan masukkan kata sandi baru untuk Admin DC Pusat.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kata Sandi Baru Admin DC Pusat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password baru"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition"
                  >
                    Simpan Kata Sandi Baru Admin
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: EMPLOYEE CONTACT ADMIN DC PUSAT (WhatsApp Button) */}
      {showEmployeeContactModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-emerald-300">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-black">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Lupa Kata Sandi Karyawan
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {contactUser
                      ? `Akun: ${contactUser.nama} (${contactUser.jabatan} - ${contactUser.cabang})`
                      : 'Supervisor Area, Kepala Toko, Kasir, Crew Store, Driver'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmployeeContactModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Kebijakan Keamanan Akun:</strong> Karyawan dengan jabatan <strong>Supervisor Area, Kepala Toko, Kasir, Crew Store, dan Driver</strong> yang lupa kata sandi wajib menghubungi <strong>Admin DC Pusat</strong> untuk verifikasi Nomor Induk Karyawan (NIK) dan reset kata sandi.
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Kontak Admin DC Pusat:
                </span>
                <div className="font-black text-slate-800 text-sm flex items-center justify-between">
                  <span>{adminNama}</span>
                  <span className="font-mono text-emerald-700">{adminPhone}</span>
                </div>
              </div>

              {/* Tombol Hubungi Admin DC Pusat WA */}
              <a
                href={`https://wa.me/${formatWaPhone(adminPhone)}?text=${encodeURIComponent(
                  contactUser
                    ? `Halo ${adminNama} (Admin DC Pusat), saya ${contactUser.nama} (Jabatan: ${contactUser.jabatan}, Username: ${contactUser.username}, Cabang: ${contactUser.cabang}, NIK: ${contactUser.nik || '-'}) lupa kata sandi akun POS Seblak Telaga. Mohon bantuan untuk reset kata sandi saya.`
                    : `Halo ${adminNama} (Admin DC Pusat), saya karyawan Seblak Telaga lupa kata sandi akun POS. Mohon bantuan untuk verifikasi dan reset kata sandi saya.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi Admin DC Pusat via WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>

              <button
                type="button"
                onClick={() => setShowEmployeeContactModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
