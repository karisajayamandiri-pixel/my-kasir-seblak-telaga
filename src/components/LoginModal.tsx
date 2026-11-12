import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  Store,
  ArrowRight,
  MessageCircle,
  CheckCircle,
  X,
  ShieldAlert,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Karyawan, DataCabang, AppSettings } from '../types';
import { formatWaPhone } from '../utils/storage';
import { getBranchName } from '../utils/branchHelper';
import { DEFAULT_APP_SETTINGS, DEFAULT_LOGO_URL } from '../utils/theme';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface LoginModalProps {
  karyawanList: Karyawan[];
  dataCabangList: DataCabang[];
  appSettings?: AppSettings;
  onLoginSuccess: (user: Karyawan, selectedCabang: string) => void;
  onUpdateKaryawan?: (karyawan: Karyawan) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  karyawanList,
  dataCabangList,
  appSettings,
  onLoginSuccess,
  onUpdateKaryawan,
}) => {
  const brandName = (appSettings?.namaUsaha || DEFAULT_APP_SETTINGS.namaUsaha).trim() || DEFAULT_APP_SETTINGS.namaUsaha;
  const brandTagline = (appSettings?.tagline || '').trim();
  const brandLogoUrl = appSettings?.logoUrl || DEFAULT_LOGO_URL;
  // Filter active branches from dataCabang (with safe fallback for fresh empty DB)
  const activeCabangList = dataCabangList.filter((c) => c.status === 'Aktif');
  const effectiveCabangList =
    activeCabangList.length > 0
      ? activeCabangList
      : [
          {
            id: 'cb-dc',
            nama: 'DC PUSAT',
            alamat: 'Kantor Pusat Logistik',
            noHp: '081234567890',
            status: 'Aktif' as const,
            isPusat: true,
          },
        ];

  const [selectedCabang, setSelectedCabang] = useState<string>(() => {
    return effectiveCabangList[0]?.nama || 'DC PUSAT';
  });
  const [showPickerCabang, setShowPickerCabang] = useState<boolean>(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modalError, setModalError] = useState('');

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
  const isAdminRoleStr = (j?: string) => {
    const n = (j || '').trim().toLowerCase();
    return n === 'admin dc pusat' || n === 'admin';
  };
  const adminDcPusat =
    karyawanList.find((k) => isAdminRoleStr(k.jabatan) && k.status === 'Aktif') ||
    karyawanList.find((k) => isAdminRoleStr(k.jabatan));

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

    const effectiveKaryawanList: Karyawan[] =
      karyawanList.length > 0
        ? karyawanList
        : [
            {
              id: 'kry-owner-default',
              nama: 'Rizal Maulana',
              hp: '081234567890',
              alamat: 'Padaherang',
              cabang: 'DC PUSAT',
              jabatan: 'Owner',
              username: 'rizal',
              password: '990002',
              status: 'Aktif',
              nib: '1902240012345',
            },
          ];

    const found = effectiveKaryawanList.find(
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

      const foundRoleNorm = (found.jabatan || '').trim().toLowerCase();

      // REQUIREMENT 3: Owner wrong password 3x -> prompt NIB
      if (foundRoleNorm === 'owner') {
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
      if (isAdminRoleStr(found.jabatan)) {
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
    const foundRoleNorm = (found.jabatan || '').trim().toLowerCase();
    const isRovingRole =
      foundRoleNorm === 'owner' ||
      foundRoleNorm === 'admin dc pusat' ||
      foundRoleNorm === 'admin' ||
      foundRoleNorm === 'supervisor area' ||
      foundRoleNorm === 'driver';

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

    const foundRoleNorm = (found.jabatan || '').trim().toLowerCase();
    if (foundRoleNorm === 'owner') {
      setTargetOwner(found);
      setInputNib('');
      setNibVerified(false);
      setNewOwnerPassword('');
      setModalError('');
      setShowOwnerNibModal(true);
    } else if (isAdminRoleStr(found.jabatan)) {
      setTargetAdmin(found);
      setInputNik('');
      setNikVerified(false);
      setNewAdminPassword('');
      setModalError('');
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
    setModalError('');

    const expectedNib = (targetOwner.nib || '1902240012345').trim();
    if (inputNib.trim() !== expectedNib) {
      setModalError('Nomor Induk Berusaha (NIB) tidak sesuai dengan data terdaftar! Akses reset ditolak.');
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
    setModalError('');
    setShowOwnerNibModal(false);
    setSuccessMsg('Kata sandi Owner berhasil diperbarui! Silakan klik Masuk Aplikasi.');
  };

  // Submit NIK verification for Admin DC Pusat
  const handleVerifyAdminNik = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAdmin) return;
    setModalError('');

    const expectedNik = (targetAdmin.nik || 'NIK-DC-001').trim().toUpperCase();
    if (inputNik.trim().toUpperCase() !== expectedNik) {
      setModalError('Nomor Induk Karyawan (NIK) tidak sesuai! Akses reset ditolak.');
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
    setModalError('');
    setShowAdminNikModal(false);
    setSuccessMsg('Kata sandi Admin DC Pusat berhasil diperbarui! Silakan klik Masuk Aplikasi.');
  };

  const cleanUserKey = username.trim().toLowerCase();
  const currentAttempts = failedAttempts[cleanUserKey] || 0;
  const isTargetAdminFailed3x =
    targetAdmin &&
    isAdminRoleStr(targetAdmin.jabatan) &&
    currentAttempts >= 3;

  return (
    <div className="min-h-screen brand-login-backdrop flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-orange-100 dark:border-slate-800 overflow-hidden">
        {/* Brand Header */}
        <div className="brand-gradient text-white p-6 text-center">
          <div className="w-24 h-24 mx-auto flex items-center justify-center mb-2.5">
            <img
              src={brandLogoUrl}
              alt={`Logo ${brandName}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
            />
          </div>
          <h1 className="text-2xl font-black tracking-wide">{brandName}</h1>
          <p className="text-xs text-white/90 mt-1 font-medium">
            Sistem Kasir POS &amp; Manajemen Multi-Cabang {brandName}
            {brandTagline ? ` • ${brandTagline}` : ''}
          </p>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-7 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">Masuk Akun Karyawan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih Cabang Tugas, masukkan Username &amp; Password
            </p>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <span className="leading-relaxed font-semibold block flex-1">{successMsg}</span>
              <button
                type="button"
                onClick={() => setSuccessMsg('')}
                className="text-emerald-600 dark:text-emerald-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-200 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <span className="leading-relaxed font-semibold block">{error}</span>
              </div>
            </div>
          )}

          {/* REQUIREMENT 4: Admin DC Pusat apabila salah 3x muncul tombol lupa kata sandi */}
          {isTargetAdminFailed3x && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Pemulihan Akun Admin DC Pusat</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Verifikasi Nomor Induk Karyawan (NIK) Anda untuk mengatur ulang kata sandi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInputNik('');
                  setNikVerified(false);
                  setNewAdminPassword('');
                  setModalError('');
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
            {/* 1. Pilih Cabang Tugas via BottomSheetPicker */}
            <div>
              <BottomSheetPickerTrigger
                label="Pilih Cabang Tugas *"
                valueTitle={selectedCabang}
                placeholder="Pilih cabang tugas..."
                onClick={() => setShowPickerCabang(true)}
                icon={<Store className="w-4 h-4 text-[#FF6F00]" />}
              />
              <BottomSheetPicker
                isOpen={showPickerCabang}
                onClose={() => setShowPickerCabang(false)}
                title="Pilih Cabang Penugasan"
                selectedId={selectedCabang}
                onSelect={(opt) => {
                  setSelectedCabang(String(opt.id));
                  setError('');
                }}
                options={effectiveCabangList.map((c) => ({
                  id: c.nama,
                  title: c.nama,
                  subtitle: c.alamat || (c.isPusat ? 'Gudang & Manajemen Pusat' : 'Cabang Operasional'),
                  category: c.isPusat ? 'DC Pusat' : 'Outlet Cabang',
                  badge: c.isPusat ? 'Pusat' : undefined,
                }))}
              />
            </div>

            {/* 2. Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
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
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* 3. Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleLupaPasswordLink}
                  className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-800 hover:underline cursor-pointer"
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
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 brand-gradient hover:opacity-95 text-white font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-xs"
            >
              <span>MASUK APLIKASI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 dark:text-slate-400">
          My Kasir POS {brandName} • Multi-Role &amp; Multi-Cabang
        </div>
      </div>

      {/* MODAL 1: OWNER NIB RECOVERY (Salah password 3 kali) */}
      {showOwnerNibModal && targetOwner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-amber-300 dark:border-amber-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-2xl flex items-center justify-center font-black">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                    Verifikasi Keamanan Owner
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400">
                    Salah password 3x. Masukkan Nomor Induk Berusaha (NIB)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOwnerNibModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!nibVerified ? (
              <form onSubmit={handleVerifyOwnerNib} className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-[11px]">
                  Demi keamanan tertinggi, sistem meminta <strong>Nomor Induk Berusaha (NIB)</strong> terdaftar untuk memverifikasi identitas asli Owner.
                </div>

                {modalError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-200 font-semibold text-[11px]">
                    {modalError}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Nomor Induk Berusaha (NIB) Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1902240012345"
                    value={inputNib}
                    onChange={(e) => {
                      setInputNib(e.target.value);
                      setModalError('');
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOwnerNibModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl"
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
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-[11px] font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>NIB Terverifikasi Sah! Silakan masukkan kata sandi baru untuk akun Owner.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Kata Sandi Baru Owner <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password baru"
                    value={newOwnerPassword}
                    onChange={(e) => setNewOwnerPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-800 dark:text-slate-100"
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-red-300 dark:border-red-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-2xl flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!nikVerified ? (
              <form onSubmit={handleVerifyAdminNik} className="space-y-4 text-xs">
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-900 dark:text-red-200 text-[11px]">
                  Masukkan <strong>Nomor Induk Karyawan (NIK)</strong> Anda yang terdaftar di Data Karyawan oleh Owner untuk mereset kata sandi Admin DC Pusat.
                </div>

                {modalError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-200 font-semibold text-[11px]">
                    {modalError}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Nomor Induk Karyawan (NIK) Admin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: NIK-DC-001"
                    value={inputNik}
                    onChange={(e) => {
                      setInputNik(e.target.value);
                      setModalError('');
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminNikModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl"
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
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 text-[11px] font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>NIK Terverifikasi Sah! Silakan masukkan kata sandi baru untuk Admin DC Pusat.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Kata Sandi Baru Admin DC Pusat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password baru"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-800 dark:text-slate-100"
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-emerald-300 dark:border-emerald-700">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center justify-center font-black">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                    Lupa Kata Sandi Karyawan
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    {contactUser
                      ? `Akun: ${contactUser.nama} (${contactUser.jabatan} - ${contactUser.cabang})`
                      : 'Supervisor Area, Kepala Toko, Kasir, Crew Store, Driver'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmployeeContactModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                <strong>Kebijakan Keamanan Akun:</strong> Karyawan dengan jabatan <strong>Supervisor Area, Kepala Toko, Kasir, Crew Store, dan Driver</strong> yang lupa kata sandi wajib menghubungi <strong>Admin DC Pusat</strong> untuk verifikasi Nomor Induk Karyawan (NIK) dan reset kata sandi.
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Kontak Admin DC Pusat:
                </span>
                <div className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between">
                  <span>{adminNama}</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">{adminPhone}</span>
                </div>
              </div>

              {/* Tombol Hubungi Admin DC Pusat WA */}
              <a
                href={`https://wa.me/${formatWaPhone(adminPhone)}?text=${encodeURIComponent(
                  contactUser
                    ? `Halo ${adminNama} (Admin DC Pusat), saya ${contactUser.nama} (Jabatan: ${contactUser.jabatan}, Username: ${contactUser.username}, Cabang: ${contactUser.cabang}, NIK: ${contactUser.nik || '-'}) lupa kata sandi akun POS ${brandName}. Mohon bantuan untuk reset kata sandi saya.`
                    : `Halo ${adminNama} (Admin DC Pusat), saya karyawan ${brandName} lupa kata sandi akun POS. Mohon bantuan untuk verifikasi dan reset kata sandi saya.`
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
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
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
