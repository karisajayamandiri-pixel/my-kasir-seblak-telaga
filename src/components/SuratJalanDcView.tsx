import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Printer,
  FileText,
  Clock,
  AlertTriangle,
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
import { getBranchName } from '../utils/branchHelper';
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
  const destinationBranches = (dataCabangList || []).filter(
    (c) => c.nama.trim().toUpperCase() !== 'DC PUSAT'
  );

  const defaultBranch = destinationBranches[0]?.nama || '';

  const [activeTab, setActiveTab] = useState<'permintaan' | 'riwayat'>('permintaan');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lowStockConfirm, setLowStockConfirm] = useState<{
    sj: SuratJalan;
    warnings: string[];
  } | null>(null);

  // Helper to resolve recipient name and title for destination branch
  const getBranchRecipient = (cabang: Cabang) => {
    const resolvedCabang = getBranchName(cabang, dataCabangList) || cabang;
    const staff = karyawanList.filter((k) => {
      const kBranch = getBranchName(k.cabang_id || k.cabang, dataCabangList);
      return (kBranch === resolvedCabang || k.cabang === cabang) && k.status === 'Aktif';
    });
    const kepalaToko = staff.find((k) => (k.jabatan || '').trim().toUpperCase() === 'KEPALA TOKO');
    if (kepalaToko) return { nama: kepalaToko.nama, jabatan: kepalaToko.jabatan };
    const kasir = staff.find((k) => ['CASHIER', 'KASIR'].includes((k.jabatan || '').trim().toUpperCase()));
    if (kasir) return { nama: kasir.nama, jabatan: kasir.jabatan };
    const crew = staff.find((k) => (k.jabatan || '').trim().toUpperCase() === 'CREW STORE');
    if (crew) return { nama: crew.nama, jabatan: crew.jabatan };
    const first = staff[0];
    if (first) return { nama: first.nama, jabatan: first.jabatan };
    return { nama: `Kepala Toko ${resolvedCabang}`, jabatan: 'Kepala Toko' };
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

  useEffect(() => {
    if (!targetCabang && defaultBranch) {
      setTargetCabang(defaultBranch);
    }
  }, [defaultBranch, targetCabang]);

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
    const resolvedBranch = getBranchName(req.cabang, dataCabangList) || req.cabang;
    setTargetCabang(resolvedBranch);
    const rec = getBranchRecipient(resolvedBranch);
    setPenerimaNama(rec.nama);
    setPenerimaJabatan(rec.jabatan);
    setPermintaanIdRef(req.id);
    setDriverName('Rudi Pratama (Driver DC)');
    setBiayaSolar(0);
    setSetoranUang(0);
    setCatatanSj(`Pengiriman untuk ${req.noPermintaan}. ${req.catatan || ''}`);

    const mappedItems: SuratJalanItem[] = (req.items || []).map((it) => ({
      bahanId: it.bahanId,
      namaBahan: it.namaBahan,
      satuan: it.satuan,
      qtyKirim: Number(it.qtyMinta) || 0,
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

  const finalizeKirimSuratJalan = (newSj: SuratJalan) => {
    onAddSuratJalan(newSj);
    if (permintaanIdRef) {
      onUpdatePermintaanStatus(permintaanIdRef, 'Dikirim', newSj.id);
    }
    setLowStockConfirm(null);
    setShowCreateModal(false);
    setActiveTab('riwayat');
  };

  const handleKirimSuratJalan = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsKirim.length === 0 || !targetCabang) return;

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

    const warnings: string[] = [];
    for (const item of itemsKirim) {
      const bhn = bahanBakuList.find((b) => b.id === item.bahanId);
      if (bhn && (Number(bhn.stokDC) || 0) < (Number(item.qtyKirim) || 0)) {
        warnings.push(
          `${bhn.nama}: stok DC ${Number(bhn.stokDC) || 0} ${bhn.satuan}, dikirim ${Number(item.qtyKirim) || 0} ${item.satuan}`
        );
      }
    }

    if (warnings.length > 0) {
      setLowStockConfirm({ sj: newSj, warnings });
      return;
    }

    finalizeKirimSuratJalan(newSj);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Surat Jalan & Distribusi Logistik DC Pusat
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Proses permintaan bahan dari cabang, buat surat jalan resmi, catat biaya solar (opsional), dan kirim barang (stok DC otomatis berkurang).
          </p>
        </div>

        <button
          onClick={openCreateManual}
          className="px-4 py-2 brand-gradient hover:brightness-110 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Surat Jalan Baru</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('permintaan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'permintaan'
              ? 'brand-tab-active'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Permintaan Cabang Menunggu ({pendingRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'riwayat'
              ? 'brand-tab-active'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Riwayat Surat Jalan ({suratJalanList.length})</span>
        </button>
      </div>

      {activeTab === 'permintaan' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Daftar Permintaan Bahan Masuk dari Seluruh Cabang
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
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
                  className="p-4 bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-orange-950 dark:text-orange-200 text-sm tabular-nums">
                        {req.noPermintaan}
                      </span>
                      <span className="bg-orange-600 text-white font-extrabold px-2 py-0.5 rounded text-[10px]">
                        {getBranchName(req.cabang, dataCabangList) || req.cabang}
                      </span>
                      <span className="text-slate-400 text-[11px] tabular-nums">
                        {req.tanggal} {req.jam}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 tabular-nums">
                      {(req.items || []).map((it, idx) => (
                        <span
                          key={idx}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-semibold text-slate-700 dark:text-slate-200 text-[11px]"
                        >
                          {it.namaBahan}: <strong>{Number(it.qtyMinta) || 0} {it.satuan}</strong>
                        </span>
                      ))}
                    </div>

                    {req.catatan && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Riwayat Surat Jalan Pengiriman DC
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Tersedia cetak dokumen resmi format A4 dengan 3 tanda tangan
            </span>
          </div>

          {suratJalanList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Belum ada arsip surat jalan pengiriman.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {suratJalanList.slice().reverse().map((sj) => {
                    const tujuanLabel = getBranchName(sj.cabangTujuan, dataCabangList) || sj.cabangTujuan;
                    const isDone = sj.status === 'Selesai' || sj.status === 'Diterima';
                    return (
                      <tr key={sj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                        <td className="py-3 px-3 font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                          {sj.noSuratJalan}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded text-[11px]">
                            {tujuanLabel}
                          </span>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Penerima: <strong className="text-slate-700 dark:text-slate-200">{sj.penerimaNama || getBranchRecipient(tujuanLabel).nama}</strong>
                            <span className="text-slate-400"> ({sj.penerimaJabatan || getBranchRecipient(tujuanLabel).jabatan})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                          <div className="font-semibold">{sj.tanggal} {sj.jam}</div>
                          <div className="text-[10px] text-slate-400">{sj.driver}</div>
                        </td>
                        <td className="py-3 px-3 max-w-xs tabular-nums">
                          <div className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                            {(sj.items || []).map((it, idx) => (
                              <div key={idx}>
                                • {it.namaBahan}: <strong>{Number(it.qtyKirim) || 0} {it.satuan}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap tabular-nums">
                          {(Number(sj.biayaSolar) || 0) > 0 ? formatRupiah(Number(sj.biayaSolar) || 0) : '-'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap tabular-nums">
                          {(Number(sj.setoran) || 0) > 0 ? formatRupiah(Number(sj.setoran) || 0) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                              isDone
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : sj.status === 'Terkirim'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {isDone ? 'Diterima Cabang' : sj.status === 'Terkirim' ? 'Terkirim' : 'Sedang Dikirim'}
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
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-xs"
                            title="Cetak Surat Jalan Format Resmi A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak A4</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Form Buat Surat Jalan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">
                  Buat Surat Jalan Pengiriman DC
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleKirimSuratJalan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <BottomSheetPickerTrigger
                    label="Cabang Tujuan *"
                    valueTitle={targetCabang ? `Cabang ${targetCabang}` : ''}
                    placeholder="Pilih cabang tujuan..."
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
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Nama Driver / Kurir <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                  />
                </div>
              </div>

              {/* Requirement 2: Recipient Name and Jabatan for Surat Jalan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    Nama Penerima di Cabang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={penerimaNama}
                    onChange={(e) => setPenerimaNama(e.target.value)}
                    placeholder="Nama penerima barang..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Otomatis dari Data Karyawan cabang tujuan
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Jabatan Penerima di Cabang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={penerimaJabatan}
                    onChange={(e) => setPenerimaJabatan(e.target.value)}
                    placeholder="Contoh: Kepala Toko / Cashier"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Terlampir otomatis pada cetakan Surat Jalan A4
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-200">
                    Bahan Baku yang Dikirim (Stok DC Otomatis Berkurang):
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-orange-600 dark:text-orange-400 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    + Tambah Baris Bahan
                  </button>
                </div>

                {itemsKirim.map((row, index) => {
                  const bhn = bahanBakuList.find((b) => b.id === row.bahanId);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex-1 min-w-0">
                        <BottomSheetPickerTrigger
                          valueTitle={bhn ? `${bhn.nama} (Stok: ${Number(bhn.stokDC) || 0} ${bhn.satuan})` : ''}
                          placeholder="Pilih Bahan Baku..."
                          onClick={() => setPickerKirimRowIndex(index)}
                          size="sm"
                        />
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
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs text-center font-bold tabular-nums"
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
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
                      subtitle: `Stok DC: ${Number(b.stokDC) || 0} ${b.satuan} • Kategori: ${b.kategori || 'Bahan'}`,
                      category: b.kategori,
                    }))}
                  />
                )}
              </div>

              {/* Solar & Setoran Opsional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Biaya Solar (OPSIONAL, boleh 0)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Contoh: 50000"
                    value={biayaSolar}
                    onChange={(e) => setBiayaSolar(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold tabular-nums"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Biaya bensin/solar operasional armada pengiriman
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Titipan Setoran Uang (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Contoh: 0"
                    value={setoranUang}
                    onChange={(e) => setSetoranUang(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold tabular-nums"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Uang kas kecil atau modal titipan jika ada
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Catatan Pengiriman
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Barang dalam coolbox, telur hati-hati pecah..."
                  value={catatanSj}
                  onChange={(e) => setCatatanSj(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
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

      {/* MODAL KONFIRMASI STOK DC MENIPIS */}
      {lowStockConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-amber-300 dark:border-amber-700 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  Stok Gudang DC Lebih Sedikit dari Jumlah Kirim
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bahan berikut memiliki sisa stok DC di bawah jumlah yang akan dikirim:
                </p>
              </div>
            </div>

            <ul className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 space-y-1 text-xs text-amber-900 dark:text-amber-200 tabular-nums">
              {lowStockConfirm.warnings.map((w, idx) => (
                <li key={idx}>• {w}</li>
              ))}
            </ul>

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setLowStockConfirm(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                onClick={() => finalizeKirimSuratJalan(lowStockConfirm.sj)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Tetap Lanjutkan Pengiriman
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
