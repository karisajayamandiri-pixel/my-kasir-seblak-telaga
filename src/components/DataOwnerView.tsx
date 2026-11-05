import React, { useState } from 'react';
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
} from 'lucide-react';
import { Karyawan } from '../types';

interface DataOwnerViewProps {
  currentUser: Karyawan;
  onUpdateOwner: (updatedOwner: Karyawan) => void;
}

export const DataOwnerView: React.FC<DataOwnerViewProps> = ({
  currentUser,
  onUpdateOwner,
}) => {
  // Only owner can view this page
  if (currentUser.jabatan !== 'Owner') {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center text-red-800 space-y-2">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="font-black text-lg">Akses Ditolak</h3>
        <p className="text-xs">
          Menu ini bersifat rahasia dan hanya dapat diakses serta diedit langsung oleh Akun Owner.
        </p>
      </div>
    );
  }

  const [nama, setNama] = useState(currentUser.nama);
  const [nib, setNib] = useState(currentUser.nib || '1902240012345');
  const [email, setEmail] = useState(currentUser.email || 'karisajayamandiri@gmail.com');
  const [hp, setHp] = useState(currentUser.hp);
  const [alamat, setAlamat] = useState(currentUser.alamat);
  const [username, setUsername] = useState(currentUser.username);
  const [password, setPassword] = useState(currentUser.password);
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
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

    onUpdateOwner(updated);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
                100% Rahasia & Terproteksi
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-wide text-white mt-2">
              Data Profil Owner & Nomor Induk Berusaha (NIB)
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Data ini dipisahkan dari daftar karyawan biasa. Hanya dapat dilihat dan diedit oleh Owner sendiri. Nomor Induk Berusaha (NIB) menjadi kunci keamanan utama untuk pemulihan akun saat salah password 3 kali.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-bold shadow-xs animate-in fade-in duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Profil Owner dan Nomor Induk Berusaha (NIB) berhasil diperbarui dan disimpan secara permanen!</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-600" />
            <span>Informasi Legalitas & Kepemilikan Usaha</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pastikan NIB diisi sesuai dokumen OSS resmi usaha Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* NIB Field (Highlighted) */}
          <div className="md:col-span-2 p-4 bg-amber-50/70 border-2 border-amber-300 rounded-2xl space-y-2">
            <label className="block font-black text-amber-950 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Nomor Induk Berusaha (NIB) <span className="text-red-500">*WAJIB</span></span>
              </span>
              <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                KUNCI RESET PASSWORD OWNER
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 1902240012345 (13 digit NIB)"
              value={nib}
              onChange={(e) => setNib(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border-2 border-amber-400 rounded-xl font-mono text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 tracking-wider shadow-inner"
            />
            <p className="text-[11px] text-amber-800 font-medium">
              ⚠️ <strong>Penting:</strong> Jika Anda salah memasukkan kata sandi akun Owner sebanyak 3 kali di layar login, sistem akan menanyakan Nomor Induk Berusaha (NIB) ini untuk verifikasi.
            </p>
          </div>

          {/* Nama Owner */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Nama Lengkap Pemilik (Owner) <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white"
            />
          </div>

          {/* No HP */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>No. Handphone / WhatsApp Owner <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white"
            />
          </div>

          {/* Alamat Domisili */}
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Alamat Domisili / Kantor Pusat Usaha</span>
            </label>
            <input
              type="text"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white"
            />
          </div>

          {/* Email Owner (Otorisasi Security Firestore) */}
          <div className="md:col-span-2">
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Email Owner (Otorisasi Firestore & Reset Demo) <span className="text-red-500">*</span></span>
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                OTORISASI UTAMA
              </span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:bg-white"
              placeholder="karisajayamandiri@gmail.com"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Fungsi reset demo data dan izin delete dokumen demo di Cloud Firestore hanya diizinkan untuk email: <strong>karisajayamandiri@gmail.com</strong>.
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Username Login Owner <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:bg-white"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Password Login Owner <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:bg-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Perubahan data Owner akan langsung tersinkronisasi ke sistem & otentikasi login.
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Data Owner</span>
          </button>
        </div>
      </form>

      {/* Info Pengaturan Sistem */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-600" />
            <span>Pengaturan Database & Data Demo</span>
          </h4>
          <p className="text-xs text-slate-500 max-w-xl">
            Auto-seeding data demo dinonaktifkan secara permanen. Untuk memuat ulang data demo secara manual atau melihat status sinkronisasi Cloud Firestore, Anda dapat membuka halaman <strong>Pengaturan</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
