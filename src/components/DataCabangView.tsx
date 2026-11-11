import React, { useState } from 'react';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  Search,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  X,
  AlertTriangle,
  Building2,
  ShieldCheck,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { DataCabang, AppSettings } from '../types';
import { DEFAULT_BUSINESS_NAME } from '../utils/theme';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface DataCabangViewProps {
  dataCabangList: DataCabang[];
  appSettings?: AppSettings;
  onAddCabang: (cabang: DataCabang) => void;
  onUpdateCabang: (cabang: DataCabang) => void;
  onDeleteCabang: (id: string) => void;
}

export const DataCabangView: React.FC<DataCabangViewProps> = ({
  dataCabangList,
  appSettings,
  onAddCabang,
  onUpdateCabang,
  onDeleteCabang,
}) => {
  const brandName = appSettings?.namaUsaha || DEFAULT_BUSINESS_NAME;
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCabang, setEditingCabang] = useState<DataCabang | null>(null);

  // Form states
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHp, setNoHp] = useState('');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [bankOrEwallet, setBankOrEwallet] = useState('');
  const [noRekening, setNoRekening] = useState('');
  const [atasNama, setAtasNama] = useState('');
  const [showPickerStatus, setShowPickerStatus] = useState<boolean>(false);

  const openAdd = () => {
    setEditingCabang(null);
    setNama('');
    setAlamat('');
    setNoHp('');
    setStatus('Aktif');
    setBankOrEwallet('BCA');
    setNoRekening('');
    setAtasNama('');
    setShowModal(true);
  };

  const openEdit = (cbg: DataCabang) => {
    setEditingCabang(cbg);
    setNama(cbg.nama);
    setAlamat(cbg.alamat);
    setNoHp(cbg.noHp);
    setStatus(cbg.status);
    setBankOrEwallet(cbg.bankOrEwallet || 'BCA');
    setNoRekening(cbg.noRekening || '');
    setAtasNama(cbg.atasNama || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    if (editingCabang) {
      const branchId = editingCabang.branchId || editingCabang.id;
      onUpdateCabang({
        ...editingCabang,
        id: branchId,
        branchId,
        nama: nama.trim().toUpperCase(),
        name: nama.trim().toUpperCase(),
        alamat: alamat.trim(),
        noHp: noHp.trim(),
        status,
        bankOrEwallet: bankOrEwallet.trim(),
        noRekening: noRekening.trim(),
        atasNama: atasNama.trim(),
      });
    } else {
      const branchId = 'cbg-' + Date.now();
      const newCabang: DataCabang = {
        id: branchId,
        branchId,
        nama: nama.trim().toUpperCase(),
        name: nama.trim().toUpperCase(),
        alamat: alamat.trim(),
        noHp: noHp.trim(),
        status,
        bankOrEwallet: bankOrEwallet.trim(),
        noRekening: noRekening.trim(),
        atasNama: atasNama.trim(),
      };
      onAddCabang(newCabang);
    }
    setShowModal(false);
  };

  const toggleStatus = (cbg: DataCabang) => {
    onUpdateCabang({
      ...cbg,
      status: cbg.status === 'Aktif' ? 'Nonaktif' : 'Aktif',
    });
  };

  const filteredCabang = dataCabangList.filter(
    (c) =>
      c.nama.toLowerCase().includes(search.toLowerCase()) ||
      c.alamat.toLowerCase().includes(search.toLowerCase()) ||
      c.noHp.includes(search) ||
      (c.bankOrEwallet && c.bankOrEwallet.toLowerCase().includes(search.toLowerCase())) ||
      (c.noRekening && c.noRekening.includes(search))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Manajemen Data Cabang &amp; Rekening Bank
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola master cabang {brandName}, alamat cetak struk, no. telepon, status, serta nomor rekening bank &amp; E-Wallet untuk setoran kas.
          </p>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2 brand-gradient hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Cabang Baru</span>
        </button>
      </div>

      {/* Search and Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama cabang, rekening, no hp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-700 dark:text-slate-200">Total:</span>
          <span>{dataCabangList.length} Cabang Terdaftar</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {dataCabangList.filter((c) => c.status === 'Aktif').length} Aktif
          </span>
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCabang.map((cbg) => {
          const isAktif = cbg.status === 'Aktif';

          return (
            <div
              key={cbg.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs space-y-3 relative transition hover:shadow-md ${
                isAktif
                  ? 'border-slate-200/90 dark:border-slate-800'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                      {cbg.nama}
                      {cbg.isPusat && (
                        <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                          Pusat
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ID: {cbg.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleStatus(cbg)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer transition ${
                    isAktif
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                  title="Klik untuk ubah status aktif/nonaktif"
                >
                  {cbg.status}
                </button>
              </div>

              {/* Details */}
              <div className="space-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed line-clamp-2">
                    {cbg.alamat || 'Alamat belum diisi'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {cbg.noHp || '-'}
                  </span>
                </div>

                {/* Requirement 8: No Rekening & Bank / E-Wallet */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 text-[11px]">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Rekening Setoran: {cbg.bankOrEwallet || 'Belum diatur'}</span>
                  </div>
                  <div className="font-mono text-xs font-black text-slate-800 dark:text-slate-100 pl-5">
                    {cbg.noRekening || '-'}
                  </div>
                  {cbg.atasNama && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                      a.n. <strong>{cbg.atasNama}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 italic">
                  *Header Struk &amp; Setoran
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(cbg)}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 text-slate-600 dark:text-slate-300 hover:text-orange-700 dark:hover:text-orange-400 rounded-lg transition cursor-pointer"
                    title="Edit Cabang & Rekening"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!cbg.isPusat && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus cabang "${cbg.nama}"?`)) {
                          onDeleteCabang(cbg.id);
                        }
                      }}
                      className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer"
                      title="Hapus Cabang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Form Tambah / Edit Cabang */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                  {editingCabang ? `Edit Cabang: ${editingCabang.nama}` : 'Tambah Cabang Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Nama Cabang <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CABANG UTAMA / OUTLET 01"
                  value={nama}
                  onChange={(e) => setNama(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Alamat Lengkap Cabang <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Jl. Raya Utama No. 4..."
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    No. HP Cabang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0857-1234-5678"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <BottomSheetPickerTrigger
                    label="Status Cabang"
                    valueTitle={status}
                    onClick={() => setShowPickerStatus(true)}
                  />
                  <BottomSheetPicker
                    isOpen={showPickerStatus}
                    onClose={() => setShowPickerStatus(false)}
                    title="Pilih Status Cabang"
                    selectedId={status}
                    onSelect={(opt) => setStatus(opt.id as 'Aktif' | 'Nonaktif')}
                    options={[
                      { id: 'Aktif', title: 'Aktif', subtitle: 'Cabang aktif beroperasi & melayani order', badge: 'Aktif' },
                      { id: 'Nonaktif', title: 'Nonaktif', subtitle: 'Cabang sementara ditutup / nonaktif', badge: 'Tutup' },
                    ]}
                  />
                </div>
              </div>

              {/* Requirement 8: Bank atau E-Wallet & No Rekening */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2.5">
                <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 text-xs">
                  <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Data Rekening Bank / E-Wallet Cabang</span>
                </span>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Bank / E-Wallet
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: BCA, Mandiri, BRI, BSI, GoPay, OVO, DANA"
                    value={bankOrEwallet}
                    onChange={(e) => setBankOrEwallet(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      No. Rekening / No. E-Wallet
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 1780-554-121"
                      value={noRekening}
                      onChange={(e) => setNoRekening(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Atas Nama (a.n.)
                    </label>
                    <input
                      type="text"
                      placeholder={`Contoh: ${brandName} Cabang 01`}
                      value={atasNama}
                      onChange={(e) => setAtasNama(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl font-semibold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 brand-gradient hover:opacity-95 text-white font-bold rounded-xl shadow-xs cursor-pointer transition"
                >
                  Simpan Data Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
