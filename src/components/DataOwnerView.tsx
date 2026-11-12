import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Phone,
  MapPin,
  FileText,
  Save,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Building,
  X,
  RefreshCw,
} from 'lucide-react';
import { Karyawan } from '../types';

interface DataOwnerViewProps {
  currentUser: Karyawan;
  onUpdateOwner: (updatedOwner: Karyawan) => Promise<void> | void;
}

export const DataOwnerView: React.FC<DataOwnerViewProps> = ({
  currentUser,
  onUpdateOwner,
}) => {
  const [nama, setNama] = useState(currentUser.nama);
  const [nib, setNib] = useState(currentUser.nib || '1902240012345');
  const [email, setEmail] = useState(currentUser.email || 'karisajayamandiri@gmail.com');
  const [hp, setHp] = useState(currentUser.hp);
  const [alamat, setAlamat] = useState(currentUser.alamat);
  const [username, setUsername] = useState(currentUser.username);
  const [password, setPassword] = useState(currentUser.password);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setNama(currentUser.nama);
    setNib(currentUser.nib || '1902240012345');
    setEmail(currentUser.email || 'karisajayamandiri@gmail.com');
    setHp(currentUser.hp);
    setAlamat(currentUser.alamat);
    setUsername(currentUser.username);
    setPassword(currentUser.password);
  }, [currentUser]);

  // Only owner can view this page
  if ((currentUser.jabatan || '').trim().toLowerCase() !== 'owner') {
    return (
      <div className="bg-red-50 dark:bg-red-950/60 border-2 border-red-200 dark:border-red-800 rounded-3xl p-8 text-center text-red-800 dark:text-red-200 space-y-2">
        <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400 mx-auto" />
        <h3 className="font-black text-lg">Akses Ditolak</h3>
        <p className="text-xs">
          Menu ini bersifat rahasia dan hanya dapat diakses serta diedit langsung oleh Akun Owner.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(false);

    if (!nama.trim() || !nib.trim() || !username.trim() || !password.trim() || !email.trim()) {
      setErrorMsg('Nama, Email Owner, Nomor Induk Berusaha (NIB), Username, dan Password wajib diisi!');
      return;
    }

    const updated: Karyawan = {
      ...currentUser,
      nama: nama.trim(),
      nib: nib.trim(),
      email: email.trim(),
      hp: hp.trim(),
      alamat: alamat.trim(),
      username: username.trim(),
      password: password.trim(),
    };

    setIsSaving(true);
    try {
      await onUpdateOwner(updated);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan perubahan data Owner ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-4 h-4" />
                <span>HAK AKSES OWNER TERTINGGI</span>
              </span>
              <span className="bg-white/10 text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                100% Rahasia &amp; Terproteksi
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-wide text-white mt-2">
              Data Profil Owner &amp; Nomor Induk Berusaha (NIB)
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Data ini dipisahkan dari daftar karyawan biasa. Hanya dapat dilihat dan diedit oleh Owner sendiri. Nomor
              Induk Berusaha (NIB) menjadi kunci keamanan utama untuk pemulihan akun saat salah password 3 kali.
            </p>
          </div>
        </div>
      </div>

      {/* Top Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 dark:border-emerald-700 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Berhasil! Data Owner &amp; Nomor Induk Berusaha (NIB) telah diperbarui dan disimpan ke Cloud Firestore.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(false)}
            className="p-1 rounded-lg hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-800 rounded-2xl flex items-center justify-between gap-3 text-red-900 dark:text-red-200 text-xs font-bold shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 rounded-lg hover:bg-red-200/50 dark:hover:bg-red-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Profile Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="font-black text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Informasi Legalitas &amp; Kepemilikan Usaha</span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
            Pastikan NIB diisi sesuai dokumen OSS resmi usaha Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* NIB Field (Highlighted) */}
          <div className="md:col-span-2 p-4 bg-amber-50/70 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-2xl space-y-2">
            <label className="font-black text-amber-950 dark:text-amber-200 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>
                  Nomor Induk Berusaha (NIB) <span className="text-red-500">*WAJIB</span>
                </span>
              </span>
              <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-extrabold px-2 py-0.5 rounded-full">
                KUNCI RESET PASSWORD OWNER
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 1902240012345 (13 digit NIB)"
              value={nib}
              onChange={(e) => setNib(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-600 rounded-xl font-mono text-sm font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider shadow-inner"
            />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-amber-600 dark:text-amber-400" />
              <strong>Penting:</strong> Jika Anda salah memasukkan kata sandi akun Owner sebanyak 3 kali di layar
              login, sistem akan menanyakan Nomor Induk Berusaha (NIB) ini untuk verifikasi.
            </p>
          </div>

          {/* Nama Owner */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Nama Lengkap Pemilik (Owner) <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* No HP */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>
                No. Handphone / WhatsApp Owner <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Alamat Domisili */}
          <div className="md:col-span-2">
            <label className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Alamat Domisili / Kantor Pusat Usaha</span>
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Email Owner */}
          <div className="md:col-span-2">
            <label className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Email Owner (Otorisasi Firestore &amp; Reset Demo) <span className="text-red-500">*</span>
                </span>
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                OTORISASI UTAMA
              </span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
              placeholder="karisajayamandiri@gmail.com"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Fungsi reset demo data dan izin delete dokumen demo di Cloud Firestore hanya diizinkan untuk email:{' '}
              <strong>karisajayamandiri@gmail.com</strong>.
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Username Login Owner <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>

          {/* Password */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Password Login Owner <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Button & Inline Success Status */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex-1">
            {successMsg ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Data Owner berhasil disimpan!</span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 dark:text-slate-400">
                Perubahan data Owner akan langsung tersinkronisasi ke sistem &amp; otentikasi login.
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-60 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-xs"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Data Owner</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Pengaturan Sistem */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Pengaturan Database &amp; Data Demo</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Auto-seeding data demo dinonaktifkan secara permanen. Untuk memuat ulang data demo secara manual atau
            melihat status sinkronisasi Cloud Firestore, Anda dapat membuka halaman <strong>Pengaturan</strong>.
          </p>
        </div>
      </div>

      {/* Floating Success Toast Notification */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border-2 border-emerald-500 flex items-start gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 flex-1">
            <div className="font-extrabold text-white">Data Owner Tersimpan!</div>
            <div className="text-slate-300">
              Profil Owner, NIB, email otorisasi, dan kredensial login berhasil diperbarui.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(false)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
