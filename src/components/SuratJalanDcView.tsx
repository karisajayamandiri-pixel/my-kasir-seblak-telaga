import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Printer,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  ArrowRight,
  Send,
  X,
  Fuel,
  Banknote,
  User,
} from 'lucide-react';
import {
  Karyawan,
  BahanBaku,
  PermintaanBarang,
  SuratJalan,
  Cabang,
  SuratJalanItem,
  DataCabang,
} from '../types';
import {
  formatRupiah,
  getTodayStr,
  getNowShortTime,
  generateSuratJalanNo,
} from '../utils/storage';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';

interface SuratJalanDcViewProps {
  currentUser: Karyawan;
  bahanBakuList: BahanBaku[];
  permintaanList: PermintaanBarang[];
  suratJalanList: SuratJalan[];
  karyawanList?: Karyawan[];
  dataCabangList?: DataCabang[];
  onAddSuratJalan: (sj: SuratJalan) => void;
  onUpdatePermintaanStatus: (permintaanId: string, status: PermintaanBarang['status'], sjId?: string) => void;
  onOpenPrintModal: (type: 'suratJalan', data: SuratJalan) => void;
}

export const SuratJalanDcView: React.FC<SuratJalanDcViewProps> = ({
  currentUser,
  bahanBakuList,
  permintaanList,
  suratJalanList,
  karyawanList = [],
  dataCabangList = [],
  onAddSuratJalan,
  onUpdatePermintaanStatus,
  onOpenPrintModal,
}) => {
  const destinationBranches = (dataCabangList && dataCabangList.length > 0)
    ? dataCabangList.filter((c) => c.nama.trim().toUpperCase() !== 'DC PUSAT')
    : [
        { id: '1', nama: 'PADAHERANG 01', status: 'Aktif' as const, alamat: 'Cabang Toko Resmi', noHp: '-' },
        { id: '2', nama: 'BANJARSARI 02', status: 'Aktif' as const, alamat: 'Cabang Toko Resmi', noHp: '-' },
        { id: '3', nama: 'CIAWTALI 03', status: 'Aktif' as const, alamat: 'Cabang Toko Resmi', noHp: '-' },
      ];

  const defaultBranch = destinationBranches[0]?.nama || 'PADAHERANG 01';

  const [activeTab, setActiveTab] = useState<'permintaan' | 'riwayat'>('permintaan');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Helper to resolve recipient name and title for destination branch
  const getBranchRecipient = (cabang: Cabang) => {
    const staff = karyawanList.filter((k) => k.cabang === cabang && k.status === 'Aktif');
    const kepalaToko = staff.find((k) => k.jabatan === 'Kepala Toko');
    if (kepalaToko) return { nama: kepalaToko.nama, jabatan: kepalaToko.jabatan };
    const kasir = staff.find((k) => k.jabatan === 'Cashier' || (k.jabatan as string) === 'Kasir');
    if (kasir) return { nama: kasir.nama, jabatan: kasir.jabatan };
    const crew = staff.find((k) => k.jabatan === 'Crew Store' || (k.jabatan as string) === 'CREW STORE');
    if (crew) return { nama: crew.nama, jabatan: crew.jabatan };
    const first = staff[0];
    if (first) return { nama: first.nama, jabatan: first.jabatan };
    return { nama: `Kepala Toko ${cabang}`, jabatan: 'Kepala Toko' };
  };

  // Form states
  const [targetCabang, setTargetCabang] = useState<Cabang>(defaultBranch);
  const [penerimaNama, setPenerimaNama] = useState('');
  const [penerimaJabatan, setPenerimaJabatan] = useState('');
  const [permintaanIdRef, setPermintaanIdRef] = useState<string | undefined>(undefined);
  const [driverName, setDriverName] = useState('Rudi Pratama (Driver DC)');
  const [biayaSolar, setBiayaSolar] = useState<number>(0); // OPSIONAL boleh 0
  const [setoranUang, setSetoranUang] = useState<number>(0);
  const [catatanSj, setCatatanSj] = useState('');
  const [itemsKirim, setItemsKirim] = useState<SuratJalanItem[]>([]);
  const [showPickerTargetCabang, setShowPickerTargetCabang] = useState(false);
  const [pickerKirimRowIndex, setPickerKirimRowIndex] = useState<number | null>(null);

  // Filter permintaan yang masih menunggu / diproses
  const pendingRequests = permintaanList.filter(
    (p) => p.status === 'Menunggu' || p.status === 'Diproses'
  );

  const handleTargetCabangSelect = (newCabang: Cabang) => {
    setTargetCabang(newCabang);
    const rec = getBranchRecipient(newCabang);
    setPenerimaNama(rec.nama);
    setPenerimaJabatan(rec.jabatan);
  };

  const openCreateFromPermintaan = (req: PermintaanBarang) => {
    setTargetCabang(req.cabang);
    const rec = getBranchRecipient(req.cabang);
    setPenerimaNama(rec.nama);
    setPenerimaJabatan(rec.jabatan);
    setPermintaanIdRef(req.id);
    setDriverName('Rudi Pratama (Driver DC)');
    setBiayaSolar(0);
    setSetoranUang(0);
    setCatatanSj(`Pengiriman untuk ${req.noPermintaan}. ${req.catatan || ''}`);

    const mappedItems: SuratJalanItem[] = req.items.map((it) => ({
      bahanId: it.bahanId,
      namaBahan: it.namaBahan,
      satuan: it.satuan,
      qtyKirim: it.qtyMinta,
    }));
    setItemsKirim(mappedItems);
    setShowCreateModal(true);
  };

  const openCreateManual = () => {
    setTargetCabang(defaultBranch);
    const rec = getBranchRecipient(defaultBranch);
    setPenerimaNama(rec.nama);
    setPenerimaJabatan(rec.jabatan);
    setPermintaanIdRef(undefined);
    setDriverName('Rudi Pratama (Driver DC)');
    setBiayaSolar(0);
    setSetoranUang(0);
    setCatatanSj('Pengiriman restock langsung dari DC Pusat');

    if (bahanBakuList.length > 0) {
      setItemsKirim([
        {
          bahanId: bahanBakuList[0].id,
          namaBahan: bahanBakuList[0].nama,
          satuan: bahanBakuList[0].satuan,
          qtyKirim: 10,
        },
      ]);
    } else {
      setItemsKirim([]);
    }
    setShowCreateModal(true);
  };

  const addItemRow = () => {
    if (bahanBakuList.length === 0) return;
    setItemsKirim((prev) => [
      ...prev,
      {
        bahanId: bahanBakuList[0].id,
        namaBahan: bahanBakuList[0].nama,
        satuan: bahanBakuList[0].satuan,
        qtyKirim: 10,
      },
    ]);
  };

  const updateItemRow = (index: number, bahanId: string, qtyKirim: number) => {
    const bhn = bahanBakuList.find((b) => b.id === bahanId);
    setItemsKirim((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              bahanId,
              namaBahan: bhn?.nama || '',
              satuan: bhn?.satuan || '',
              qtyKirim,
            }
          : item
      )
    );
  };

  const removeItemRow = (index: number) => {
    setItemsKirim((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKirimSuratJalan = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsKirim.length === 0) return;

    // Check if DC has enough stock
    for (const item of itemsKirim) {
      const bhn = bahanBakuList.find((b) => b.id === item.bahanId);
      if (bhn && bhn.stokDC < item.qtyKirim) {
        const proceed = confirm(
          `Peringatan: Stok DC untuk "${bhn.nama}" saat ini (${bhn.stokDC} ${bhn.satuan}) lebih sedikit dari jumlah kirim (${item.qtyKirim} ${item.satuan}). Tetap lanjutkan pengiriman?`
        );
        if (!proceed) return;
      }
    }

    const fallbackRec = getBranchRecipient(targetCabang);
    const newSj: SuratJalan = {
      id: 'sj-' + Date.now(),
      noSuratJalan: generateSuratJalanNo(),
      permintaanId: permintaanIdRef,
      cabangTujuan: targetCabang,
      penerimaNama: penerimaNama.trim() || fallbackRec.nama,
      penerimaJabatan: penerimaJabatan.trim() || fallbackRec.jabatan,
      tanggal: getTodayStr(),
      jam: getNowShortTime(),
      items: itemsKirim,
      biayaSolar: Number(biayaSolar) || 0,
      setoran: Number(setoranUang) || 0,
      status: 'Dikirim',
      driver: driverName.trim(),
      catatan: catatanSj.trim(),
    };

    onAddSuratJalan(newSj);

    if (permintaanIdRef) {
      onUpdatePermintaanStatus(permintaanIdRef, 'Dikirim', newSj.id);
    }

    setShowCreateModal(false);
    setActiveTab('riwayat');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Surat Jalan & Distribusi Logistik DC Pusat
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Proses permintaan bahan dari cabang, buat surat jalan resmi, catat biaya solar (opsional), dan kirim barang (stok DC otomatis berkurang).
          </p>
        </div>

        <button
          onClick={openCreateManual}
          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Surat Jalan Baru</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('permintaan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'permintaan'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Permintaan Cabang Menunggu ({pendingRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'riwayat'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Riwayat Surat Jalan ({suratJalanList.length})</span>
        </button>
      </div>

      {activeTab === 'permintaan' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar Permintaan Bahan Masuk dari Seluruh Cabang
            </h3>
            <span className="text-xs text-slate-500">
              Klik "Buat Surat Jalan" untuk memproses dan mengirim barang
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada permintaan cabang yang menunggu saat ini. Semua telah diproses!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-orange-50/40 border border-orange-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-orange-950 text-sm">
                        {req.noPermintaan}
                      </span>
                      <span className="bg-orange-600 text-white font-extrabold px-2 py-0.5 rounded text-[10px]">
                        {req.cabang}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {req.tanggal} {req.jam}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {req.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-slate-200 px-2 py-0.5 rounded font-semibold text-slate-700 text-[11px]"
                        >
                          {it.namaBahan}: <strong>{it.qtyMinta} {it.satuan}</strong>
                        </span>
                      ))}
                    </div>

                    {req.catatan && (
                      <p className="text-[11px] text-slate-500 italic">
                        Catatan: "{req.catatan}"
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openCreateFromPermintaan(req)}
                    className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                  >
                    <span>Proses & Buat Surat Jalan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB: Riwayat Surat Jalan */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Riwayat Surat Jalan Pengiriman DC
            </h3>
            <span className="text-xs text-slate-500">
              Tersedia cetak dokumen resmi format A4 dengan 3 tanda tangan
            </span>
          </div>

          {suratJalanList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada arsip surat jalan pengiriman.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">No. Surat Jalan</th>
                    <th className="py-3 px-3">Tujuan</th>
                    <th className="py-3 px-3">Tanggal / Driver</th>
                    <th className="py-3 px-3">Bahan Dikirim</th>
                    <th className="py-3 px-3 text-right">Biaya Solar</th>
                    <th className="py-3 px-3 text-right">Titipan Setoran</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Cetak A4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suratJalanList.slice().reverse().map((sj) => (
                    <tr key={sj.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-extrabold text-slate-800">
                        {sj.noSuratJalan}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-[11px]">
                          {sj.cabangTujuan}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Penerima: <strong className="text-slate-700">{sj.penerimaNama || getBranchRecipient(sj.cabangTujuan).nama}</strong>
                          <span className="text-slate-400"> ({sj.penerimaJabatan || getBranchRecipient(sj.cabangTujuan).jabatan})</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold">{sj.tanggal} {sj.jam}</div>
                        <div className="text-[10px] text-slate-400">{sj.driver}</div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="space-y-0.5 text-[11px] text-slate-700">
                          {sj.items.map((it, idx) => (
                            <div key={idx}>
                              • {it.namaBahan}: <strong>{it.qtyKirim} {it.satuan}</strong>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 font-semibold whitespace-nowrap">
                        {sj.biayaSolar > 0 ? formatRupiah(sj.biayaSolar) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 font-semibold whitespace-nowrap">
                        {sj.setoran > 0 ? formatRupiah(sj.setoran) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            sj.status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sj.status === 'Selesai' ? 'Diterima Cabang' : 'Sedang Dikirim'}
                        </span>
                        {sj.tanggalTerima && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {sj.tanggalTerima} oleh {sj.penerimaNama || 'Kasir'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenPrintModal('suratJalan', sj)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-black text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-xs"
                          title="Cetak Surat Jalan Format Resmi A4"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak A4</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Form Buat Surat Jalan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-slate-800 text-base">
                  Buat Surat Jalan Pengiriman DC
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleKirimSuratJalan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <BottomSheetPickerTrigger
                    label="Cabang Tujuan *"
                    valueTitle={`Cabang ${targetCabang}`}
                    onClick={() => setShowPickerTargetCabang(true)}
                  />
                  <BottomSheetPicker
                    isOpen={showPickerTargetCabang}
                    onClose={() => setShowPickerTargetCabang(false)}
                    title="Pilih Cabang Tujuan Surat Jalan"
                    selectedId={targetCabang}
                    onSelect={(opt) => handleTargetCabangSelect(opt.id as Cabang)}
                    options={destinationBranches.map((c) => ({
                      id: c.nama,
                      title: `Cabang ${c.nama}`,
                      subtitle: c.alamat || 'Cabang Toko Resmi',
                    }))}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Driver / Kurir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  />
                </div>
              </div>

              {/* Requirement 2: Recipient Name and Jabatan for Surat Jalan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-orange-50/60 border border-orange-200 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-600" />
                    Nama Penerima di Cabang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={penerimaNama}
                    onChange={(e) => setPenerimaNama(e.target.value)}
                    placeholder="Nama penerima barang..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Otomatis dari Data Karyawan cabang tujuan
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Jabatan Penerima di Cabang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={penerimaJabatan}
                    onChange={(e) => setPenerimaJabatan(e.target.value)}
                    placeholder="Contoh: Kepala Toko / Cashier"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Terlampir otomatis pada cetakan Surat Jalan A4
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Bahan Baku yang Dikirim (Stok DC Otomatis Berkurang):
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-orange-600 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Tambah Baris Bahan
                  </button>
                </div>

                {itemsKirim.map((row, index) => {
                  const bhn = bahanBakuList.find((b) => b.id === row.bahanId);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200"
                    >
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setPickerKirimRowIndex(index)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-orange-50/40 border border-slate-300 hover:border-orange-400 rounded-lg text-xs text-left flex items-center justify-between transition-colors"
                        >
                          <span className="font-semibold text-slate-800 line-clamp-1">
                            {bhn
                              ? `${bhn.nama} (Stok: ${bhn.stokDC} ${bhn.satuan})`
                              : 'Pilih Bahan Baku...'}
                          </span>
                          <ArrowRight size={14} className="text-slate-400 shrink-0" />
                        </button>
                      </div>

                      <div className="w-28 flex items-center gap-1">
                        <input
                          type="number"
                          required
                          min={0.1}
                          step="any"
                          value={row.qtyKirim}
                          onChange={(e) =>
                            updateItemRow(
                              index,
                              row.bahanId,
                              Number(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-center font-bold"
                        />
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {row.satuan}
                        </span>
                      </div>

                      {itemsKirim.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {pickerKirimRowIndex !== null && (
                  <BottomSheetPicker
                    isOpen={pickerKirimRowIndex !== null}
                    onClose={() => setPickerKirimRowIndex(null)}
                    title={`Pilih Bahan Baku Surat Jalan (Baris ${pickerKirimRowIndex + 1})`}
                    selectedId={itemsKirim[pickerKirimRowIndex]?.bahanId}
                    onSelect={(opt) => {
                      updateItemRow(
                        pickerKirimRowIndex,
                        String(opt.id),
                        itemsKirim[pickerKirimRowIndex]?.qtyKirim || 1
                      );
                      setPickerKirimRowIndex(null);
                    }}
                    options={bahanBakuList.map((b) => ({
                      id: b.id,
                      title: b.nama,
                      subtitle: `Stok DC: ${b.stokDC} ${b.satuan} • Kategori: ${b.kategori || 'Bahan'}`,
                      category: b.kategori,
                    }))}
                  />
                )}
              </div>

              {/* Solar & Setoran Opsional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-600" />
                    Biaya Solar (OPSIONAL, boleh 0)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Contoh: 50000"
                    value={biayaSolar}
                    onChange={(e) => setBiayaSolar(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Biaya bensin/solar operasional armada pengiriman
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    Titipan Setoran Uang (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Contoh: 0"
                    value={setoranUang}
                    onChange={(e) => setSetoranUang(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Uang kas kecil atau modal titipan jika ada
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Pengiriman
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Barang dalam coolbox, telur hati-hati pecah..."
                  value={catatanSj}
                  onChange={(e) => setCatatanSj(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Surat Jalan & Kurangi Stok DC</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
