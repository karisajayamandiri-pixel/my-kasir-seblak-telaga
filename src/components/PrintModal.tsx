import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Flame,
  Check,
  Bluetooth,
  FileText,
  Settings2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import {
  Transaksi,
  SuratJalan,
  KatalogMenu,
  BahanBaku,
  Absensi,
  Karyawan,
  DataCabang,
  AppSettings,
} from '../types';
import { formatRupiah } from '../utils/storage';
import {
  DEFAULT_BUSINESS_NAME,
  DEFAULT_TAGLINE,
  DEFAULT_LOGO_URL,
  getBusinessHandle,
} from '../utils/theme';
import { BottomSheetPicker, BottomSheetPickerTrigger } from './BottomSheetPicker';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  isPrinterConnected,
  getConnectedDeviceName,
  printReceiptViaBluetooth,
  printKitchenTicketViaBluetooth,
  printTestBluetooth,
  getRawBtReceiptUrl,
  isWebBluetoothSupported,
} from '../utils/bluetoothPrinter';

export type PrintDocumentType =
  | 'struk'
  | 'tiketDapur'
  | 'suratJalan'
  | 'harian'
  | 'bulanan'
  | 'katalog'
  | 'absen'
  | 'karyawan'
  | 'closingReceipt'
  | 'auditBulanan'
  | 'slipGaji';

interface PrintModalProps {
  type: PrintDocumentType | null;
  data: any;
  onClose: () => void;
  katalogList?: KatalogMenu[];
  bahanBakuList?: BahanBaku[];
  dataCabangList?: DataCabang[];
  karyawanList?: Karyawan[];
  appSettings?: AppSettings;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  type,
  data,
  onClose,
  katalogList = [],
  bahanBakuList = [],
  dataCabangList = [],
  karyawanList = [],
  appSettings,
}) => {
  if (!type) return null;

  const brandName = (appSettings?.namaUsaha || DEFAULT_BUSINESS_NAME).trim() || DEFAULT_BUSINESS_NAME;
  const brandTagline = (appSettings?.tagline !== undefined ? appSettings.tagline : DEFAULT_TAGLINE).trim();
  const brandLogoUrl = appSettings?.logoUrl || DEFAULT_LOGO_URL;
  const brandHandle = getBusinessHandle(brandName);

  // Universal Printer controls
  const [paperSize, setPaperSize] = useState<'A4' | 'F4' | 'Letter' | 'Auto'>('Auto');
  const [showPickerPaperSize, setShowPickerPaperSize] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Bluetooth printer controls
  const [isBtPrinting, setIsBtPrinting] = useState(false);
  const [btStatusMsg, setBtStatusMsg] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(getConnectedDeviceName());

  useEffect(() => {
    setConnectedDevice(getConnectedDeviceName());
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const isThermalTicketOrReceipt = type === 'struk' || type === 'tiketDapur';

  const handlePrintBluetooth = async () => {
    if (!isThermalTicketOrReceipt) return;
    setIsBtPrinting(true);
    setBtStatusMsg({ type: 'info', text: 'Menghubungkan ke printer Bluetooth...' });

    const branchInfo = dataCabangList.find(
      (c) => c.nama.trim().toUpperCase() === (data.cabang || '').trim().toUpperCase()
    );

    const result =
      type === 'tiketDapur'
        ? await printKitchenTicketViaBluetooth(data as Transaksi, branchInfo, { namaUsaha: brandName, tagline: brandTagline })
        : await printReceiptViaBluetooth(data as Transaksi, branchInfo, { namaUsaha: brandName, tagline: brandTagline });
    setIsBtPrinting(false);

    if (result.success) {
      setConnectedDevice(getConnectedDeviceName());
      setBtStatusMsg({
        type: 'success',
        text: type === 'tiketDapur' ? 'Tiket dapur berhasil dicetak via Bluetooth!' : 'Struk kasir berhasil dicetak via Bluetooth!',
      });
      setTimeout(() => setBtStatusMsg(null), 4000);
    } else {
      setBtStatusMsg({
        type: 'error',
        text: result.error || 'Gagal cetak Bluetooth. Periksa printer dan pasangkan kembali.',
      });
    }
  };

  const handleConnectBt = async () => {
    setIsBtPrinting(true);
    setBtStatusMsg({ type: 'info', text: 'Membuka dialog pencarian Bluetooth...' });
    const result = await connectBluetoothPrinter();
    setIsBtPrinting(false);

    if (result.success) {
      setConnectedDevice(result.deviceName || 'Printer Bluetooth');
      setBtStatusMsg({
        type: 'success',
        text: `Terhubung dengan ${result.deviceName || 'Printer Bluetooth'}! Siap cetak thermal.`,
      });
      setTimeout(() => setBtStatusMsg(null), 4000);
    } else {
      setBtStatusMsg({
        type: 'error',
        text: result.error || 'Koneksi printer dibatalkan.',
      });
    }
  };

  const handleDisconnectBt = async () => {
    await disconnectBluetoothPrinter();
    setConnectedDevice(null);
    setBtStatusMsg({ type: 'info', text: 'Printer Bluetooth telah diputuskan.' });
    setTimeout(() => setBtStatusMsg(null), 3000);
  };

  const handleTestPrintBt = async () => {
    setIsBtPrinting(true);
    setBtStatusMsg({ type: 'info', text: 'Mengirim perintah cetak uji coba...' });
    const result = await printTestBluetooth(data.cabang || 'DC PUSAT', {
      namaUsaha: brandName,
      tagline: brandTagline,
    });
    setIsBtPrinting(false);

    if (result.success) {
      setConnectedDevice(getConnectedDeviceName());
      setBtStatusMsg({ type: 'success', text: 'Uji coba cetak Bluetooth berhasil keluar di kertas!' });
      setTimeout(() => setBtStatusMsg(null), 4000);
    } else {
      setBtStatusMsg({
        type: 'error',
        text: result.error || 'Gagal uji coba cetak. Periksa printer Anda.',
      });
    }
  };

  const branchForRawBt = dataCabangList.find(
    (c) => c.nama.trim().toUpperCase() === (data?.cabang || '').trim().toUpperCase()
  );
  const rawBtUrl =
    type === 'struk'
      ? getRawBtReceiptUrl(data, branchForRawBt, { namaUsaha: brandName, tagline: brandTagline })
      : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Container - hide on print, only the printable body will show */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-4 shadow-2xl space-y-3 max-h-[95vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Modal Controls Bar (Never printed) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 no-print shrink-0 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                {isThermalTicketOrReceipt ? <Bluetooth className="w-4 h-4" /> : <Printer className="w-4 h-4" />}
              </div>
              <div>
                <span className="font-black text-slate-800 dark:text-slate-100 text-sm block">
                  {type === 'struk'
                    ? 'Cetak Struk Pembayaran Kasir (Dengan Rincian Harga)'
                    : type === 'tiketDapur'
                    ? 'Cetak Tiket Pesanan Dapur (Tanpa Harga)'
                    : type === 'suratJalan'
                    ? 'Cetak Dokumen Surat Jalan DC'
                    : type === 'harian'
                    ? 'Cetak Laporan Penjualan Harian'
                    : type === 'bulanan'
                    ? 'Cetak Laporan Penjualan Bulanan'
                    : type === 'katalog'
                    ? 'Cetak Katalog Menu Resmi'
                    : type === 'absen'
                    ? 'Cetak Rekapitulasi Absensi'
                    : type === 'karyawan'
                    ? 'Cetak Data Karyawan'
                    : type === 'closingReceipt'
                    ? 'Cetak Laporan Tutup Toko Kasir'
                    : type === 'slipGaji'
                    ? 'Cetak Slip Gaji Karyawan'
                    : 'Cetak Laporan Audit Bulanan Cabang'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isThermalTicketOrReceipt
                    ? 'Mendukung printer thermal Bluetooth 58mm/80mm & printer kabel USB'
                    : 'Kompatibel dengan semua jenis printer komputer: InkJet, LaserJet, Dot Matrix (Continuous Paper), dan Thermal'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isThermalTicketOrReceipt && (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 brand-gradient hover:opacity-95 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                  title="Cetak via driver printer komputer"
                >
                  <Printer className="w-4 h-4" />
                  <span>CETAK DOKUMEN (PRINT)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 1. KHUSUS STRUK & TIKET DAPUR: KONTROL CETAK BLUETOOTH */}
          {isThermalTicketOrReceipt && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <Bluetooth className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-blue-900 flex items-center gap-2">
                      <span>Printer Bluetooth {type === 'tiketDapur' ? 'Dapur' : 'Kasir'}:</span>
                      {connectedDevice ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          {connectedDevice}
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Belum Terhubung
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      ESC/POS 58mm/80mm (Panda, GOOJPRT, RPP02N, Epson, MPT, Iware, Paperang, dll.)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {connectedDevice ? (
                    <>
                      <button
                        type="button"
                        onClick={handleTestPrintBt}
                        disabled={isBtPrinting}
                        className="px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Test Print
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectBt}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Putus Koneksi
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectBt}
                      disabled={isBtPrinting}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span>Sambungkan Bluetooth</span>
                    </button>
                  )}

                  {/* Tombol Utama: Cetak Struk via Bluetooth */}
                  <button
                    type="button"
                    onClick={handlePrintBluetooth}
                    disabled={isBtPrinting}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                  >
                    <Bluetooth className="w-4 h-4" />
                    <span>{isBtPrinting ? 'Mencetak...' : 'CETAK VIA BLUETOOTH'}</span>
                  </button>

                  {/* Tombol Alternatif: Cetak USB / Driver Biasa */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Cetak melalui dialog printer komputer / USB driver"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak USB / Biasa</span>
                  </button>
                </div>
              </div>

              {/* Status Message Notification */}
              {btStatusMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                    btStatusMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : btStatusMsg.type === 'error'
                      ? 'bg-red-50 text-red-900 border border-red-300'
                      : 'bg-blue-50 text-blue-900 border border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {btStatusMsg.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    )}
                    <span>{btStatusMsg.text}</span>
                  </div>
                  {rawBtUrl && btStatusMsg.type === 'error' && (
                    <a
                      href={rawBtUrl}
                      className="text-xs underline text-blue-700 font-bold hover:text-blue-900 flex items-center gap-1"
                    >
                      <span>Coba via Aplikasi RawBT</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. KHUSUS LAPORAN: KONTROL PRINTER KOMPUTER UNIVERSAL */}
          {!isThermalTicketOrReceipt && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Ukuran Kertas:</span>
                  <BottomSheetPickerTrigger
                    valueTitle={paperSize === 'Auto' ? 'Otomatis' : paperSize}
                    onClick={() => setShowPickerPaperSize(true)}
                    size="sm"
                    className="w-auto min-w-[120px]"
                  />
                  <BottomSheetPicker
                    isOpen={showPickerPaperSize}
                    onClose={() => setShowPickerPaperSize(false)}
                    title="Pilih Ukuran Kertas Cetak"
                    selectedId={paperSize}
                    onSelect={(opt) => setPaperSize(opt.id as any)}
                    options={[
                      { id: 'Auto', title: 'Otomatis (Default Driver)', subtitle: 'Sesuai pengaturan printer standar' },
                      { id: 'A4', title: 'A4 (210 x 297 mm)', subtitle: 'Standar dokumen resmi / slip gaji / laporan' },
                      { id: 'F4', title: 'F4 / Folio (215 x 330 mm)', subtitle: 'Kertas panjang kantor' },
                      { id: 'Letter', title: 'Letter (8.5 x 11 in)', subtitle: 'Format surat' },
                    ]}
                  />
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Monokrom Kontras Tinggi (Rekomendasi Dot Matrix / Laserjet B&W)</span>
                </label>
              </div>

              <div className="text-[11px] text-slate-500 font-medium hidden md:block">
                Tersedia cetak dokumen ke PDF & fisik printer
              </div>
            </div>
          )}
        </div>

        {/* Paper Document Preview Area */}
        <div
          className={`flex-1 overflow-y-auto flex justify-center p-2 ${
            highContrast ? 'print-high-contrast' : ''
          }`}
        >
          {/* ==============================================================
              1. STRUK THERMAL 58MM
          ============================================================== */}
          {type === 'struk' && (() => {
            const branchInfo = dataCabangList.find(
              (c) => c.nama.trim().toUpperCase() === (data.cabang || '').trim().toUpperCase()
            );
            const branchNama = branchInfo?.nama || data.cabang || 'PADAHERANG 01';
            const branchAlamat = branchInfo?.alamat || 'Jl. Raya Padaherang No. 01';
            const branchNoHp = branchInfo?.noHp || '0857-1234-5678';

            return (
              <div className="receipt-58mm bg-white p-4 shadow-lg border border-slate-300 rounded-lg w-[280px] text-black font-mono text-[11px] leading-tight printable-area">
                <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
                  <img
                    src={brandLogoUrl}
                    alt={`Logo ${brandName}`}
                    className="w-10 h-10 object-contain mx-auto mb-1"
                  />
                  <div className="font-extrabold text-sm tracking-wider uppercase">
                    {brandName}
                  </div>
                  <div className="text-[11px] font-bold">
                    CABANG {branchNama.toUpperCase()}
                  </div>
                  <div className="text-[9px] text-slate-800 leading-tight">
                    {branchAlamat}
                  </div>
                  <div className="text-[9px] font-semibold text-slate-800">
                    Telp/WA: {branchNoHp}
                  </div>
                  {brandTagline && (
                    <div className="text-[9px] text-slate-600 italic pt-0.5">
                      {brandTagline}
                    </div>
                  )}
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
                  {/* Nomor Pesanan / Antrian Otomatis (Dine In, Take Away, Delivery) */}
                  <div className="flex justify-between items-center py-1 px-1.5 border border-dashed border-black bg-slate-50 rounded">
                    <span className="font-bold text-[10px]">NO. PESANAN:</span>
                    <span className="text-sm font-black tracking-wider">
                      {data.nomorPesanan || (data.takeAwayId ? data.takeAwayId : '#01')}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>No Inv: {data.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tgl: {data.tanggal}</span>
                    <span>Jam: {data.jam}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir: {data.kasirNama}</span>
                    <span>Bayar: {data.metodeBayar}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-0.5 border-t border-dashed border-slate-300">
                    <span>Layanan:</span>
                    <span className="uppercase">[{data.tipePesanan || 'Dine In'}]</span>
                  </div>
                  {data.nomorMeja && (
                    <div className="flex justify-between font-bold pt-0.5 border-t border-dashed border-slate-300">
                      <span>No. Meja:</span>
                      <span className="font-extrabold">{data.nomorMeja}</span>
                    </div>
                  )}
                  {data.tipePesanan === 'Dine In' && data.pelangganNama && (
                    <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-300">
                      <span>Pelanggan:</span>
                      <span className="font-bold">{data.pelangganNama}</span>
                    </div>
                  )}
                  {data.tipePesanan === 'Take Away' && (
                    <div className="mt-1 pt-1 border-t border-dashed border-slate-300 space-y-0.5 text-[10px]">
                      {data.takeAwayId && (
                        <div className="flex justify-between font-bold text-slate-900 border-b border-dashed border-slate-300 pb-0.5">
                          <span>ID TAKE AWAY:</span>
                          <span className="font-black">{data.takeAwayId}</span>
                        </div>
                      )}
                      <div><b>Pelanggan:</b> {data.pelangganNama || '-'}</div>
                      {data.pelangganTelepon && <div><b>Telepon:</b> {data.pelangganTelepon}</div>}
                    </div>
                  )}
                  {data.tipePesanan === 'Delivery Order' && (
                    <div className="mt-1 pt-1 border-t border-dashed border-slate-300 space-y-0.5 text-[9px]">
                      <div><b>Penerima:</b> {data.pelangganNama || '-'}</div>
                      {data.pelangganTelepon && <div><b>Telepon:</b> {data.pelangganTelepon}</div>}
                      {data.jarakKm !== undefined && (
                        <div>
                          <b>Jarak:</b>{' '}
                          {data.jarakKm < 1
                            ? `${data.jarakKm} km (${Math.round(data.jarakKm * 1000)} m)`
                            : `${data.jarakKm} km`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="py-2 border-b border-dashed border-black space-y-1.5 text-[11px]">
                  {data.items?.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold flex justify-between">
                        <span>{item.nama}</span>
                        <span>{formatRupiah(item.subtotal)}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 flex justify-between">
                        <span>
                          {item.qty} x {formatRupiah(item.harga)}
                          {item.levelPedas !== undefined && ` (${item.levelPedas})`}
                        </span>
                      </div>
                      {item.catatan && (
                        <div className="text-[9px] text-slate-500 italic">
                          *{item.catatan}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Payment Summary */}
                <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                  {data.tipePesanan === 'Delivery Order' && data.ongkir !== undefined && (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span>Subtotal Menu:</span>
                        <span>
                          {formatRupiah(data.subtotalPesanan || (data.total - (data.ongkir || 0)))}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Ongkir{data.jarakKm ? ` (${data.jarakKm} km)` : ''}:</span>
                        <span className="font-bold">
                          {data.ongkir === 0 ? 'GRATIS' : formatRupiah(data.ongkir || 0)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-0.5 border-t border-dashed border-black">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(data.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BAYAR ({data.metodeBayar}):</span>
                    <span>{formatRupiah(data.bayar)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>KEMBALIAN:</span>
                    <span>{formatRupiah(data.kembali)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 text-center text-[9px] space-y-1">
                  <div className="font-bold">*** TERIMA KASIH ***</div>
                  <div>Selamat Menikmati Hidangan {brandName}!</div>
                  <div>Layanan Konsumen ({branchNama}): {branchNoHp}</div>
                </div>
              </div>
            );
          })()}

          {/* ==============================================================
              1B. TIKET DAPUR THERMAL 58MM (TANPA HARGA)
          ============================================================== */}
          {type === 'tiketDapur' && (() => {
            const branchInfo = dataCabangList.find(
              (c) => c.nama.trim().toUpperCase() === (data.cabang || '').trim().toUpperCase()
            );
            const branchNama = branchInfo?.nama || data.cabang || 'PADAHERANG 01';
            const totalQty = data.items?.reduce((acc: number, item: any) => acc + item.qty, 0) || 0;

            return (
              <div className="receipt-58mm bg-white p-4 shadow-lg border border-slate-300 rounded-lg w-[280px] text-black font-mono text-[11px] leading-tight printable-area">
                <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-black">
                  <div className="font-black text-base tracking-wider">
                    TIKET PESANAN DAPUR
                  </div>
                  <div className="text-xs font-bold uppercase">
                    {brandName.toUpperCase()} - {branchNama}
                  </div>
                  <div className="text-[10px] text-slate-700">
                    Mohon segera dimasak sesuai antrean
                  </div>
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
                  {/* Nomor Pesanan / Antrian Otomatis */}
                  <div className="flex justify-between items-center py-1.5 px-2 border-2 border-dashed border-black bg-slate-50 rounded">
                    <span className="font-black text-xs">ANTREAN DAPUR:</span>
                    <span className="text-base font-black tracking-wider">
                      {data.nomorPesanan || (data.takeAwayId ? data.takeAwayId : '#01')}
                    </span>
                  </div>

                  {data.voidDariInvoice && (
                    <div className="py-1 px-1.5 bg-amber-50 border border-amber-400 text-amber-900 font-black text-center text-[10px] rounded">
                      ⚠️ TIKET MENU PENGGANTI (GANTI VOID #{data.voidDariInvoice?.slice(-6) || data.voidDariInvoice})
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>No Inv: #{data.invoiceNo?.slice(-6) || data.invoiceNo}</span>
                    <span>Jam: {data.jam}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tgl: {data.tanggal}</span>
                    <span>Kasir: {data.kasirNama || '-'}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-dashed border-slate-300">
                    <span>Layanan:</span>
                    <span className="uppercase text-xs font-black">[{data.tipePesanan || 'Dine In'}]</span>
                  </div>

                  {data.nomorMeja && (
                    <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-300 text-xs font-black text-blue-900">
                      <span>NO. MEJA:</span>
                      <span className="font-black text-sm">{data.nomorMeja}</span>
                    </div>
                  )}

                  {data.pelangganNama && (
                    <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-300">
                      <span className="font-bold">Pelanggan:</span>
                      <span className="font-extrabold">{data.pelangganNama}</span>
                    </div>
                  )}

                  {data.takeAwayId && (
                    <div className="flex justify-between pt-0.5 border-t border-dashed border-slate-300 font-bold">
                      <span>ID TAKE AWAY:</span>
                      <span className="font-black">{data.takeAwayId}</span>
                    </div>
                  )}

                  {data.pelangganAlamat && (
                    <div className="pt-0.5 border-t border-dashed border-slate-300 text-[10px]">
                      <span className="font-bold block">Alamat Kirim:</span>
                      <span className="leading-tight block">{data.pelangganAlamat}</span>
                    </div>
                  )}
                </div>

                {/* Items List - TANPA HARGA */}
                <div className="py-2 border-b-2 border-dashed border-black space-y-2 text-[11px]">
                  <div className="font-black text-[10px] uppercase tracking-wider text-slate-800 pb-1 border-b border-dashed border-slate-300">
                    Rincian Menu Masak (Tanpa Harga):
                  </div>

                  {data.items?.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-0.5 border-b border-dashed border-slate-200 pb-1.5 last:border-0">
                      <div className="font-black text-xs flex items-start justify-between">
                        <span className="text-sm font-black">{item.qty}x</span>
                        <span className="flex-1 pl-2 text-left">{item.nama}</span>
                      </div>
                      {item.levelPedas !== undefined && item.levelPedas !== '' && (
                        <div className="text-[10px] font-bold text-red-600 pl-6">
                          🌶️ Level Pedas: {item.levelPedas}
                        </div>
                      )}
                      {item.catatan && (
                        <div className="text-[10px] text-slate-700 italic font-semibold pl-6">
                          📝 Catatan: {item.catatan}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Tiket Dapur */}
                <div className="pt-2 text-center text-[10px] space-y-1">
                  <div className="font-black text-xs">
                    TOTAL PORSI: {totalQty} PORSI
                  </div>
                  <div className="font-bold text-slate-700">*** SEGERA MASAK DI DAPUR ***</div>
                  <div className="text-[9px] text-slate-500">
                    Cocokkan tiket ini dengan fisik pesanan sebelum diserahkan
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ==============================================================
              2. SURAT JALAN A4
          ============================================================== */}
          {type === 'suratJalan' && (() => {
            // Requirement 2: Resolve recipient name & jabatan automatically for target branch
            const branchRecipient =
              karyawanList?.find(
                (k) => k.cabang === data.cabangTujuan && k.jabatan === 'Kepala Toko' && k.status === 'Aktif'
              ) ||
              karyawanList?.find(
                (k) => k.cabang === data.cabangTujuan && (k.jabatan === 'Cashier' || (k.jabatan as string) === 'Kasir') && k.status === 'Aktif'
              ) ||
              karyawanList?.find(
                (k) => k.cabang === data.cabangTujuan && (k.jabatan === 'Crew Store' || (k.jabatan as string) === 'CREW STORE') && k.status === 'Aktif'
              ) ||
              karyawanList?.find(
                (k) => k.cabang === data.cabangTujuan && k.status === 'Aktif'
              );

            const displayPenerimaNama =
              data.penerimaNama || branchRecipient?.nama || `Kepala Toko ${data.cabangTujuan}`;
            const displayPenerimaJabatan =
              data.penerimaJabatan || branchRecipient?.jabatan || 'Kepala Toko';

            return (
              <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
                {/* Kop Surat Resmi */}
                <div className="border-b-2 border-black pb-3 flex justify-between items-end">
                  <div>
                    <h1 className="text-xl font-black tracking-wide text-slate-900">
                      {brandName.toUpperCase()} - DC PUSAT LOGISTIK
                    </h1>
                    <p className="text-[11px] text-slate-700">
                      Jl. Pemuda No. 12, Gudang Sentral Logistik {brandName}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Telp: (021) 8876-5432 • Email: logistik@{brandHandle}.com
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black border-2 border-black px-3 py-1 inline-block uppercase">
                      SURAT JALAN
                    </div>
                    <div className="text-[11px] font-bold mt-1">
                      No: {data.noSuratJalan}
                    </div>
                  </div>
                </div>

                {/* Header Info - Terlampir Nama & Jabatan Penerima */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 border border-slate-200 rounded">
                  <div>
                    <div>
                      <strong>Cabang Tujuan:</strong> {data.cabangTujuan}
                    </div>
                    <div>
                      <strong>Penerima di Cabang:</strong>{' '}
                      <span className="font-bold underline text-slate-900">{displayPenerimaNama}</span>{' '}
                      <span className="text-slate-600 font-semibold">({displayPenerimaJabatan})</span>
                    </div>
                    <div>
                      <strong>Tanggal Kirim:</strong> {data.tanggal} ({data.jam || 'Pagi'})
                    </div>
                    <div>
                      <strong>Driver / Kurir:</strong> {data.driver}
                    </div>
                  </div>
                  <div>
                    <div>
                      <strong>Biaya Solar (Opsional):</strong>{' '}
                      {data.biayaSolar > 0 ? formatRupiah(data.biayaSolar) : 'Rp 0'}
                    </div>
                    <div>
                      <strong>Titipan Setoran:</strong>{' '}
                      {data.setoran > 0 ? formatRupiah(data.setoran) : 'Rp 0'}
                    </div>
                    <div>
                      <strong>Catatan:</strong> {data.catatan || '-'}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black text-slate-900 font-bold uppercase text-[10px]">
                      <th className="border border-black p-2 text-center w-10">No</th>
                      <th className="border border-black p-2">Nama Bahan Baku</th>
                      <th className="border border-black p-2 text-center w-20">Satuan</th>
                      <th className="border border-black p-2 text-right w-24">Qty Dikirim</th>
                      <th className="border border-black p-2 text-right w-24">Qty Diterima</th>
                      <th className="border border-black p-2 text-center w-28">Kondisi Fisik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items?.map((it: any, i: number) => (
                      <tr key={i} className="border-b border-black">
                        <td className="border border-black p-2 text-center font-bold">
                          {i + 1}
                        </td>
                        <td className="border border-black p-2 font-semibold">
                          {it.namaBahan}
                        </td>
                        <td className="border border-black p-2 text-center">
                          {it.satuan}
                        </td>
                        <td className="border border-black p-2 text-right font-black">
                          {it.qtyKirim}
                        </td>
                        <td className="border border-black p-2 text-right font-bold text-slate-700">
                          {it.qtyTerima !== undefined ? it.qtyTerima : it.qtyKirim}
                        </td>
                        <td className="border border-black p-2 text-center text-[10px]">
                          Baik / Sesuai
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 3 Party Signatures - Nama & Jabatan Penerima Terlampir */}
                <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
                  <div className="space-y-16">
                    <div className="font-bold">Pengirim (Gudang DC)</div>
                    <div>
                      <div className="border-b border-black w-36 mx-auto"></div>
                      <div className="text-[10px] mt-1">( Petugas Logistik DC )</div>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <div className="font-bold">Driver / Ekspedisi</div>
                    <div>
                      <div className="border-b border-black w-36 mx-auto"></div>
                      <div className="text-[10px] mt-1">({data.driver})</div>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <div className="font-bold">Penerima ({data.cabangTujuan})</div>
                    <div>
                      <div className="border-b border-black w-44 mx-auto"></div>
                      <div className="text-[11px] font-black mt-1 text-slate-900 uppercase">
                        {displayPenerimaNama}
                      </div>
                      <div className="text-[10px] text-slate-600 font-bold">
                        Jabatan: {displayPenerimaJabatan}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ==============================================================
              3. LAPORAN HARIAN A4
          ============================================================== */}
          {type === 'harian' && (
            <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
              <div className="border-b-2 border-black pb-2 flex justify-between items-end">
                <div>
                  <h1 className="text-lg font-black tracking-wide">
                    {brandName.toUpperCase()} - LAPORAN PENJUALAN HARIAN
                  </h1>
                  <p className="text-[11px] text-slate-600">
                    Cabang: <strong>{data.cabang}</strong> • Tanggal: <strong>{data.tanggal}</strong>
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  Dicetak: {new Date().toLocaleString('id-ID')}
                </div>
              </div>

              {/* Financial Recap Box */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 border border-slate-300 rounded text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL OMZET:</span>
                  <span className="font-black text-sm text-slate-900">
                    {formatRupiah(data.omzet)}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {data.trxList?.length} Nota Transaksi
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL MODAL HPP:</span>
                  <span className="font-bold text-sm text-slate-700">
                    {formatRupiah(data.modal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">KEUNTUNGAN BERSIH:</span>
                  <span className="font-black text-sm text-emerald-800">
                    {formatRupiah(data.untung)}
                  </span>
                  <span className="block text-[10px] text-emerald-700 font-bold">
                    Margin: {data.omzet > 0 ? ((data.untung / data.omzet) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <table className="w-full text-left border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[10px]">
                    <th className="border border-black p-1.5 text-center">No</th>
                    <th className="border border-black p-1.5">Invoice</th>
                    <th className="border border-black p-1.5">Jam / Kasir</th>
                    <th className="border border-black p-1.5">Rincian Menu</th>
                    <th className="border border-black p-1.5 text-right">Modal</th>
                    <th className="border border-black p-1.5 text-right">Omzet</th>
                    <th className="border border-black p-1.5 text-right">Untung</th>
                    <th className="border border-black p-1.5 text-center">Bayar</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trxList?.map((t: any, i: number) => (
                    <tr key={i} className="border-b border-slate-300">
                      <td className="border border-black p-1.5 text-center">{i + 1}</td>
                      <td className="border border-black p-1.5 font-bold">{t.invoiceNo}</td>
                      <td className="border border-black p-1.5">
                        {t.jam} ({t.kasirNama})
                      </td>
                      <td className="border border-black p-1.5">
                        {t.items?.map((it: any, idx: number) => (
                          <div key={idx} className="text-[10px]">
                            {it.qty}x {it.nama}
                          </div>
                        ))}
                      </td>
                      <td className="border border-black p-1.5 text-right">
                        {formatRupiah(t.totalModal)}
                      </td>
                      <td className="border border-black p-1.5 text-right font-black">
                        {formatRupiah(t.total)}
                      </td>
                      <td className="border border-black p-1.5 text-right font-bold text-emerald-800">
                        {formatRupiah(t.totalUntung)}
                      </td>
                      <td className="border border-black p-1.5 text-center">{t.metodeBayar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs">
                <div className="space-y-12">
                  <div className="font-bold">Kasir Bertugas</div>
                  <div className="border-b border-black w-36 mx-auto"></div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold">Supervisor / Admin DC</div>
                  <div className="border-b border-black w-36 mx-auto"></div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              4. LAPORAN BULANAN A4
          ============================================================== */}
          {type === 'bulanan' && (
            <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
              <div className="border-b-2 border-black pb-2 flex justify-between items-end">
                <div>
                  <h1 className="text-lg font-black tracking-wide">
                    {brandName.toUpperCase()} - REKAPITULASI PENJUALAN BULANAN
                  </h1>
                  <p className="text-[11px] text-slate-600">
                    Periode Bulan: <strong>{data.bulan}</strong> • Cabang: <strong>{data.cabang}</strong>
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  Dicetak: {new Date().toLocaleString('id-ID')}
                </div>
              </div>

              {/* Total Monthly Summary */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 border border-slate-300 rounded text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL OMZET BULAN INI:</span>
                  <span className="font-black text-base text-slate-900">
                    {formatRupiah(data.totalOmzet)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL MODAL HPP:</span>
                  <span className="font-bold text-base text-slate-700">
                    {formatRupiah(data.totalModal)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL LABA BERSIH:</span>
                  <span className="font-black text-base text-emerald-800">
                    {formatRupiah(data.totalUntung)}
                  </span>
                  <span className="block text-[10px] text-emerald-700 font-bold">
                    Margin: {data.totalOmzet > 0 ? ((data.totalUntung / data.totalOmzet) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[10px]">
                    <th className="border border-black p-2 text-center w-10">No</th>
                    <th className="border border-black p-2">Tanggal</th>
                    <th className="border border-black p-2 text-center">Jumlah Transaksi</th>
                    <th className="border border-black p-2 text-right">Omzet Harian</th>
                    <th className="border border-black p-2 text-right">Modal HPP</th>
                    <th className="border border-black p-2 text-right">Untung Bersih</th>
                    <th className="border border-black p-2 text-center">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dates?.map((date: string, i: number) => {
                    const row = data.grouped?.[date] || { count: 0, omzet: 0, modal: 0, untung: 0 };
                    const margin = row.omzet > 0 ? ((row.untung / row.omzet) * 100).toFixed(1) : 0;
                    return (
                      <tr key={i} className="border-b border-slate-300">
                        <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                        <td className="border border-black p-2 font-bold">{date}</td>
                        <td className="border border-black p-2 text-center">{row.count} Nota</td>
                        <td className="border border-black p-2 text-right font-black">
                          {formatRupiah(row.omzet)}
                        </td>
                        <td className="border border-black p-2 text-right text-slate-700">
                          {formatRupiah(row.modal)}
                        </td>
                        <td className="border border-black p-2 text-right font-bold text-emerald-800">
                          {formatRupiah(row.untung)}
                        </td>
                        <td className="border border-black p-2 text-center">{margin}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pt-8 grid grid-cols-2 gap-4 text-center text-xs">
                <div className="space-y-14">
                  <div className="font-bold">Kepala Operasional Cabang</div>
                  <div className="border-b border-black w-40 mx-auto"></div>
                </div>
                <div className="space-y-14">
                  <div className="font-bold">Direktur / Manajemen Pusat</div>
                  <div className="border-b border-black w-40 mx-auto"></div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              5. KATALOG MENU A4
          ============================================================== */}
          {type === 'katalog' && (
            <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
              <div className="border-b-2 border-black pb-2 flex justify-between items-end">
                <div>
                  <h1 className="text-lg font-black tracking-wide">
                    {data?.isPrivileged === false
                      ? `KATALOG DAFTAR HARGA MENU ${brandName.toUpperCase()}`
                      : `KATALOG MENU RESMI ${brandName.toUpperCase()}`}
                  </h1>
                  <p className="text-[11px] text-slate-600">
                    {data?.isPrivileged === false
                      ? 'Daftar Menu Resmi & Harga Jual Konsumen'
                      : 'Daftar Menu, Resep Bahan Baku, Harga Pokok Penjualan (HPP), dan Harga Jual Kasir'}
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  Update: {new Date().toLocaleDateString('id-ID')}
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[10px]">
                    <th className="border border-black p-2 w-16">Kode</th>
                    <th className="border border-black p-2">Nama Menu & Kategori</th>
                    {data?.isPrivileged !== false && (
                      <th className="border border-black p-2">Komposisi Resep Bahan</th>
                    )}
                    {data?.isPrivileged !== false && (
                      <th className="border border-black p-2 text-right w-24">HPP Modal</th>
                    )}
                    <th className="border border-black p-2 text-right w-28">HARGA MENU</th>
                    {data?.isPrivileged !== false && (
                      <th className="border border-black p-2 text-right w-24">Keuntungan</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {katalogList.map((m) => {
                    const margin = m.hargaJual > 0 ? ((m.keuntungan / m.hargaJual) * 100).toFixed(0) : 0;
                    return (
                      <tr key={m.id} className="border-b border-slate-300">
                        <td className="border border-black p-2 font-bold">{m.kode}</td>
                        <td className="border border-black p-2">
                          <div className="font-bold">{m.nama}</div>
                          <div className="text-[10px] text-slate-500">{m.kategori}</div>
                        </td>
                        {data?.isPrivileged !== false && (
                          <td className="border border-black p-2 text-[10px]">
                            {m.resep?.map((r, i) => {
                              const bhn = bahanBakuList.find((b) => b.id === r.bahanId);
                              return (
                                <span key={i} className="inline-block mr-1">
                                  {r.qtyPakai} {bhn?.satuan} {bhn?.nama || 'Bahan'},
                                </span>
                              );
                            })}
                          </td>
                        )}
                        {data?.isPrivileged !== false && (
                          <td className="border border-black p-2 text-right text-slate-600">
                            {formatRupiah(m.hargaModal)}
                          </td>
                        )}
                        <td className="border border-black p-2 text-right font-black">
                          {formatRupiah(m.hargaJual)}
                        </td>
                        {data?.isPrivileged !== false && (
                          <td className="border border-black p-2 text-right font-bold text-emerald-800">
                            {formatRupiah(m.keuntungan)} ({margin}%)
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ==============================================================
              6. REKAP ABSENSI A4
          ============================================================== */}
          {type === 'absen' && (
            <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
              <div className="border-b-2 border-black pb-2 flex justify-between items-end">
                <div>
                  <h1 className="text-lg font-black tracking-wide">
                    REKAPITULASI ABSENSI KARYAWAN {brandName.toUpperCase()}
                  </h1>
                  <p className="text-[11px] text-slate-600">
                    Laporan Presensi Kehadiran & Kedisiplinan Jam Masuk (Batas Waktu: 08:00 WIB)
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  Dicetak: {new Date().toLocaleString('id-ID')}
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[10px]">
                    <th className="border border-black p-2 text-center w-8">No</th>
                    <th className="border border-black p-2">Tanggal</th>
                    <th className="border border-black p-2">Nama Karyawan</th>
                    <th className="border border-black p-2">Jabatan</th>
                    <th className="border border-black p-2">Cabang</th>
                    <th className="border border-black p-2">Kasir Bertugas</th>
                    <th className="border border-black p-2">Jam Masuk</th>
                    <th className="border border-black p-2">Jam Pulang</th>
                    <th className="border border-black p-2">Durasi</th>
                    <th className="border border-black p-2 text-center">Status</th>
                    <th className="border border-black p-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((a: Absensi, i: number) => {
                    const displayJabatan = a.jabatan || 'KASIR';
                    const displayKasir = a.kasirBertugas || a.nama;

                    return (
                      <tr key={i} className="border-b border-slate-300">
                        <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                        <td className="border border-black p-2 whitespace-nowrap">{a.tanggal}</td>
                        <td className="border border-black p-2 font-bold">{a.nama}</td>
                        <td className="border border-black p-2 font-semibold">{displayJabatan}</td>
                        <td className="border border-black p-2 font-bold">{a.cabang}</td>
                        <td className="border border-black p-2 font-medium">{displayKasir}</td>
                        <td className="border border-black p-2 whitespace-nowrap">{a.jamMasuk}</td>
                        <td className="border border-black p-2 whitespace-nowrap">{a.jamPulang || '-'}</td>
                        <td className="border border-black p-2 whitespace-nowrap">{a.durasi || '-'}</td>
                        <td className="border border-black p-2 text-center font-bold">
                          {a.status}
                        </td>
                        <td className="border border-black p-2 text-[10px] text-slate-600">
                          {a.keterangan || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pt-8 grid grid-cols-2 gap-4 text-center text-xs">
                <div className="space-y-12">
                  <div className="font-bold">HRD / Personalia</div>
                  <div className="border-b border-black w-36 mx-auto"></div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold">Manager Operasional DC</div>
                  <div className="border-b border-black w-36 mx-auto"></div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              7. DATA KARYAWAN A4
          ============================================================== */}
          {type === 'karyawan' && (
            <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
              <div className="border-b-2 border-black pb-2 flex justify-between items-end">
                <div>
                  <h1 className="text-lg font-black tracking-wide">
                    DAFTAR MASTER KARYAWAN {brandName.toUpperCase()}
                  </h1>
                  <p className="text-[11px] text-slate-600">
                    Penugasan Cabang, Jabatan, Kontak, dan Akun Akses Sistem
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  Total: {data?.length} Karyawan
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[10px]">
                    <th className="border border-black p-2 text-center w-8">No</th>
                    <th className="border border-black p-2">NIK</th>
                    <th className="border border-black p-2">Nama Lengkap</th>
                    <th className="border border-black p-2">No. HP</th>
                    <th className="border border-black p-2">Alamat</th>
                    <th className="border border-black p-2">Cabang Tugas</th>
                    <th className="border border-black p-2">Jabatan</th>
                    <th className="border border-black p-2">Username</th>
                    <th className="border border-black p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((k: Karyawan, i: number) => (
                    <tr key={i} className="border-b border-slate-300">
                      <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                      <td className="border border-black p-2 font-mono font-bold">{k.nik || '-'}</td>
                      <td className="border border-black p-2 font-bold">{k.nama}</td>
                      <td className="border border-black p-2">{k.hp}</td>
                      <td className="border border-black p-2 text-[10px]">{k.alamat}</td>
                      <td className="border border-black p-2 font-bold">{k.cabang}</td>
                      <td className="border border-black p-2">{k.jabatan}</td>
                      <td className="border border-black p-2 font-mono">@{k.username}</td>
                      <td className="border border-black p-2 text-center font-bold">{k.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 text-right text-xs">
                <div className="inline-block text-center space-y-12">
                  <div className="font-bold">Manajemen Pusat {brandName}</div>
                  <div className="border-b border-black w-44 mx-auto"></div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              8. LAPORAN CLOSING TUTUP TOKO (THERMAL / A4)
          ============================================================== */}
          {type === 'closingReceipt' && (
            <div className="document-thermal bg-white p-6 shadow-lg border border-slate-300 rounded-lg max-w-[420px] w-full text-black font-mono text-xs printable-area space-y-3">
              <div className="text-center border-b-2 border-black pb-3 space-y-1">
                <div className="flex items-center justify-center gap-2 text-base font-black">
                  <img src={brandLogoUrl} alt={`Logo ${brandName}`} className="w-6 h-6 object-contain" />
                  <span>{brandName.toUpperCase()}</span>
                </div>
                <div className="font-bold uppercase text-xs">
                  LAPORAN TUTUP TOKO & CLOSING KASIR
                </div>
                <div className="text-[11px]">
                  CABANG {data?.laporan?.cabang || data?.cabang}
                </div>
                <div className="text-[10px] text-slate-600">
                  Tanggal: {data?.laporan?.tanggal || data?.tanggal} | Jam: {data?.laporan?.jamTutup || '-'}
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>Kasir Closing:</span>
                  <span className="font-bold">{data?.laporan?.kasirNama}</span>
                </div>
                <div className="flex justify-between">
                  <span>Jam Operasional:</span>
                  <span>{data?.laporan?.jamBuka} - {data?.laporan?.jamTutup}</span>
                </div>
                <div className="flex justify-between">
                  <span>Modal Kas Awal:</span>
                  <span>{formatRupiah(data?.laporan?.modalAwal || 0)}</span>
                </div>
              </div>

              <div className="space-y-2 py-2 border-b-2 border-black text-xs">
                <div className="flex justify-between font-bold">
                  <span>TOTAL OMZET POS:</span>
                  <span>{formatRupiah(data?.laporan?.totalOmzet || 0)}</span>
                </div>
                <div className="flex justify-between text-red-600 font-bold">
                  <span>PENGELUARAN ACC:</span>
                  <span>- {formatRupiah(data?.laporan?.pengeluaranAcc || 0)}</span>
                </div>
                <div className="flex justify-between font-black text-sm bg-slate-100 p-2 rounded">
                  <span>SETORAN AKHIR:</span>
                  <span>{formatRupiah(data?.laporan?.setoran || 0)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Fisik Kas di Laci:</span>
                  <span className="font-bold">{formatRupiah(data?.laporan?.cashLaci || 0)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Crew Hadir & Pulang:</span>
                  <span className="font-bold">{data?.laporan?.crewPulangCount || 0} Orang</span>
                </div>
                {Array.isArray(data?.laporan?.crewPulangNames) && data.laporan.crewPulangNames.length > 0 && (
                  <div className="text-[10px] text-slate-600">
                    Crew: {data.laporan.crewPulangNames.join(', ')}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-center space-y-1 pt-2">
                <div>Status: Laporan Closing Operasional Terverifikasi Sistem</div>
                <div className="font-bold">*** DOKUMEN CLOSING RESMI OWNER {brandName.toUpperCase()} ***</div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4 text-center text-[10px]">
                <div className="space-y-8">
                  <div>Kasir Bertugas</div>
                  <div className="border-b border-black w-24 mx-auto"></div>
                  <div>({data?.laporan?.kasirNama || 'Kasir'})</div>
                </div>
                <div className="space-y-8">
                  <div>Owner / DC Pusat</div>
                  <div className="border-b border-black w-24 mx-auto"></div>
                  <div>(Manajemen)</div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              9. LAPORAN AUDIT BULANAN CABANG A4
          ============================================================== */}
          {type === 'auditBulanan' && (
            <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
              <div className="border-b-2 border-black pb-3 flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2">
                    <img src={brandLogoUrl} alt={`Logo ${brandName}`} className="w-6 h-6 object-contain" />
                    <h1 className="text-lg font-black tracking-wide">
                      AUDIT BULANAN OPERASIONAL & KEUANGAN CABANG
                    </h1>
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    {brandName.toUpperCase()} - CABANG {data?.cabang?.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Periode Audit: {data?.bulan} | Rekapitulasi Kasir, Pengeluaran Toko ACC & Setoran
                  </p>
                </div>
                <div className="text-right text-[10px]">
                  <div>Dicetak: {new Date().toLocaleDateString('id-ID')}</div>
                  <div className="font-mono text-emerald-800 font-bold">STATUS: TERVERIFIKASI</div>
                </div>
              </div>

              {/* Ringkasan Finansial A4 */}
              <div className="grid grid-cols-4 gap-2 border border-black p-3 bg-slate-50 text-xs">
                <div>
                  <div className="text-[10px] text-slate-600 uppercase font-bold">Total Omzet POS</div>
                  <div className="font-black text-sm">{formatRupiah(data?.omzet || 0)}</div>
                  <div className="text-[9px] text-slate-500">{data?.trxCount || 0} Transaksi</div>
                </div>
                <div>
                  <div className="text-[10px] text-red-700 uppercase font-bold">Pengeluaran ACC</div>
                  <div className="font-black text-sm text-red-700">{formatRupiah(data?.pengeluaranAcc || 0)}</div>
                  <div className="text-[9px] text-slate-500">Disetujui Owner</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-800 uppercase font-bold">Setoran Bersih</div>
                  <div className="font-black text-sm text-emerald-800">{formatRupiah(data?.setoran || 0)}</div>
                  <div className="text-[9px] text-slate-500">Omzet - Pengeluaran</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-700 uppercase font-bold">Pending ACC</div>
                  <div className="font-black text-sm text-amber-700">{formatRupiah(data?.pengeluaranPending || 0)}</div>
                  <div className="text-[9px] text-slate-500">Menunggu ACC</div>
                </div>
              </div>

              {/* Tabel Closing Harian */}
              <div className="space-y-1">
                <div className="font-black text-[11px] uppercase tracking-wide">
                  1. Rekapitulasi Tutup Toko Harian Cabang
                </div>
                <table className="w-full text-left border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black font-bold uppercase">
                      <th className="border border-black p-1 text-center w-8">No</th>
                      <th className="border border-black p-1">Tanggal</th>
                      <th className="border border-black p-1">Kasir Closing</th>
                      <th className="border border-black p-1 text-right">Omzet Harian</th>
                      <th className="border border-black p-1 text-right">Pengeluaran ACC</th>
                      <th className="border border-black p-1 text-right">Setoran Akhir</th>
                      <th className="border border-black p-1 text-right">Fisik Kas Laci</th>
                      <th className="border border-black p-1 text-center">Crew Pulang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data?.closings || data.closings.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="p-3 text-center text-slate-500 border border-black">
                          Tidak ada data closing di periode ini.
                        </td>
                      </tr>
                    ) : (
                      data.closings.map((c: any, i: number) => (
                        <tr key={i} className="border-b border-slate-300">
                          <td className="border border-black p-1 text-center">{i + 1}</td>
                          <td className="border border-black p-1 font-semibold">{c.tanggal}</td>
                          <td className="border border-black p-1">{c.kasirNama}</td>
                          <td className="border border-black p-1 text-right font-bold">{formatRupiah(c.totalOmzet)}</td>
                          <td className="border border-black p-1 text-right text-red-700 font-bold">{formatRupiah(c.pengeluaranAcc || 0)}</td>
                          <td className="border border-black p-1 text-right font-black text-emerald-800">{formatRupiah(c.setoran)}</td>
                          <td className="border border-black p-1 text-right">{formatRupiah(c.cashLaci)}</td>
                          <td className="border border-black p-1 text-center">{c.crewPulangCount || 0} org</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tabel Pengeluaran Toko */}
              <div className="space-y-1">
                <div className="font-black text-[11px] uppercase tracking-wide">
                  2. Rincian Pengeluaran Toko Yang Diajukan
                </div>
                <table className="w-full text-left border-collapse border border-black text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black font-bold uppercase">
                      <th className="border border-black p-1 text-center w-8">No</th>
                      <th className="border border-black p-1">Tanggal</th>
                      <th className="border border-black p-1">Pengaju</th>
                      <th className="border border-black p-1 text-right">Nominal</th>
                      <th className="border border-black p-1">Keterangan</th>
                      <th className="border border-black p-1 text-center">Status</th>
                      <th className="border border-black p-1">Verifikator ACC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!data?.expenses || data.expenses.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="p-3 text-center text-slate-500 border border-black">
                          Tidak ada catatan pengeluaran di periode ini.
                        </td>
                      </tr>
                    ) : (
                      data.expenses.map((e: any, i: number) => (
                        <tr key={i} className="border-b border-slate-300">
                          <td className="border border-black p-1 text-center">{i + 1}</td>
                          <td className="border border-black p-1">{e.tanggal} {e.jam}</td>
                          <td className="border border-black p-1">{e.pengajuNama}</td>
                          <td className="border border-black p-1 text-right font-bold">{formatRupiah(e.nominal)}</td>
                          <td className="border border-black p-1">{e.keterangan}</td>
                          <td className="border border-black p-1 text-center font-bold">{e.status}</td>
                          <td className="border border-black p-1">{e.accOleh || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-12">
                  <div className="font-bold">Kepala Cabang</div>
                  <div className="border-b border-black w-36 mx-auto"></div>
                  <div>(Cabang {data?.cabang})</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold">Internal Auditor DC</div>
                  <div className="border-b border-black w-36 mx-auto"></div>
                  <div>(Tim Audit)</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold">Owner / Direktur Utama</div>
                  <div className="border-b border-black w-36 mx-auto"></div>
                  <div>(DC Pusat)</div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              10. SLIP GAJI KARYAWAN A4 RESMI
          ============================================================== */}
          {type === 'slipGaji' && data && (
            <div className="document-a4 bg-white p-8 shadow-lg border border-slate-300 rounded-lg max-w-[210mm] w-full text-black font-sans text-xs printable-area space-y-4">
              {/* Header Slip Gaji */}
              <div className="border-b-2 border-black pb-3 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <img src={brandLogoUrl} alt={`Logo ${brandName}`} className="w-6 h-6 object-contain" />
                    <h1 className="text-xl font-black tracking-wide text-slate-900">
                      {brandName.toUpperCase()}
                    </h1>
                  </div>
                  <h2 className="text-xs font-black text-slate-800 mt-1 uppercase tracking-wider">
                    SLIP GAJI & REKAPITULASI PENGHASILAN KARYAWAN
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Sistem Manajemen Kehadiran & Penggajian Karyawan Resmi
                  </p>
                </div>
                <div className="text-right text-[10px] space-y-1">
                  <div className="bg-slate-100 px-3 py-1 rounded border border-slate-300 font-mono font-bold text-slate-800">
                    PERIODE: {data.bulanNama || data.bulan || '-'}
                  </div>
                  <div className="text-slate-500 text-[9px]">
                    Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Data Karyawan */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 border border-slate-300 rounded-lg text-xs">
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-semibold">Nama Karyawan:</span>
                    <span className="font-black text-slate-900">{data.nama}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-semibold">NIK:</span>
                    <span className="font-mono font-bold text-slate-800">{data.nik || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-semibold">Jabatan:</span>
                    <span className="font-bold text-slate-800">{data.jabatan}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-semibold">Cabang:</span>
                    <span className="font-bold text-slate-800">{data.cabang}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-semibold">No. WhatsApp/HP:</span>
                    <span className="font-mono text-slate-800">{data.hp || '-'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 text-slate-500 font-semibold">Status Slip:</span>
                    <span className="font-black text-emerald-800 uppercase">FINAL / SIAP CAIR</span>
                  </div>
                </div>
              </div>

              {/* Ringkasan Kehadiran */}
              <div className="space-y-1">
                <div className="font-black text-[11px] uppercase tracking-wide text-slate-800">
                  1. Rincian Kehadiran & Jadwal Kerja
                </div>
                <div className="grid grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 border border-slate-300 rounded bg-emerald-50">
                    <div className="text-[9px] text-slate-600 font-bold uppercase">Total Hadir</div>
                    <div className="text-sm font-black text-emerald-700">{data.hadirCount || 0} Hari</div>
                  </div>
                  <div className="p-2 border border-slate-300 rounded bg-white">
                    <div className="text-[9px] text-slate-600 font-bold uppercase">Tepat Waktu</div>
                    <div className="text-sm font-bold text-slate-800">{data.tepatWaktuCount || 0} Hari</div>
                  </div>
                  <div className="p-2 border border-slate-300 rounded bg-amber-50">
                    <div className="text-[9px] text-amber-700 font-bold uppercase">Terlambat</div>
                    <div className="text-sm font-black text-amber-700">{data.telatCount || 0} Kali</div>
                  </div>
                  <div className="p-2 border border-slate-300 rounded bg-purple-50">
                    <div className="text-[9px] text-purple-700 font-bold uppercase">Jadwal OFF</div>
                    <div className="text-sm font-black text-purple-700">{data.offCount || 0} Hari</div>
                  </div>
                  <div className="p-2 border border-slate-300 rounded bg-blue-50">
                    <div className="text-[9px] text-blue-700 font-bold uppercase">Izin</div>
                    <div className="text-sm font-bold text-blue-700">{data.izinCount || 0} Hari</div>
                  </div>
                  <div className="p-2 border border-slate-300 rounded bg-rose-50">
                    <div className="text-[9px] text-rose-700 font-bold uppercase">Sakit</div>
                    <div className="text-sm font-bold text-rose-700">{data.sakitCount || 0} Hari</div>
                  </div>
                </div>
              </div>

              {/* Tabel Rincian Penghasilan & Potongan */}
              <div className="space-y-1">
                <div className="font-black text-[11px] uppercase tracking-wide text-slate-800">
                  2. Rincian Penghasilan & Potongan Gaji
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Kolom Penghasilan */}
                  <div className="border border-black rounded p-3 bg-white space-y-2">
                    <div className="font-black text-[11px] text-emerald-900 border-b border-black pb-1 uppercase">
                      A. Komponen Penghasilan
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold">Gaji Pokok Harian</div>
                          <div className="text-[9px] text-slate-500">
                            {data.hadirCount} hari x {formatRupiah(data.gajiPokokHarian)}
                          </div>
                        </div>
                        <div className="font-black text-slate-900">
                          {formatRupiah(data.totalGajiPokok)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold">Uang Makan & Transport</div>
                          <div className="text-[9px] text-slate-500">
                            {data.hadirCount} hari x {formatRupiah(data.uangMakanHarian)}
                          </div>
                        </div>
                        <div className="font-black text-slate-900">
                          {formatRupiah(data.totalUangMakan)}
                        </div>
                      </div>
                      {(data.bonus || 0) > 0 && (
                        <div className="flex justify-between items-center text-emerald-800">
                          <div>
                            <div className="font-bold">Bonus / Insentif Tambahan</div>
                            <div className="text-[9px] text-slate-500">Apresiasi performa</div>
                          </div>
                          <div className="font-black">
                            {formatRupiah(data.bonus)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2 flex justify-between font-bold text-xs bg-emerald-50 p-1.5 rounded">
                      <span>Total Penghasilan Kotor:</span>
                      <span className="font-black text-emerald-900">
                        {formatRupiah(data.penghasilanKotor)}
                      </span>
                    </div>
                  </div>

                  {/* Kolom Potongan */}
                  <div className="border border-black rounded p-3 bg-white space-y-2">
                    <div className="font-black text-[11px] text-rose-900 border-b border-black pb-1 uppercase">
                      B. Komponen Potongan
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold">Denda Keterlambatan</div>
                          <div className="text-[9px] text-slate-500">
                            {data.telatCount}x telat (&gt;08:00) x {formatRupiah(data.dendaTelat)}
                          </div>
                        </div>
                        <div className="font-black text-rose-700">
                          {formatRupiah(data.potonganTelat)}
                        </div>
                      </div>
                      {(data.potonganLain || 0) > 0 && (
                        <div className="flex justify-between items-center text-rose-700">
                          <div>
                            <div className="font-bold">Potongan Lainnya</div>
                            <div className="text-[9px] text-slate-500">Administrasi / Lainnya</div>
                          </div>
                          <div className="font-black">
                            {formatRupiah(data.potonganLain)}
                          </div>
                        </div>
                      )}
                      {data.potonganTelat === 0 && (data.potonganLain || 0) === 0 && (
                        <div className="text-slate-400 text-[10px] italic py-1">
                          Tidak ada potongan keterlambatan. Disiplin hadir tepat waktu!
                        </div>
                      )}
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2 flex justify-between font-bold text-xs bg-rose-50 p-1.5 rounded">
                      <span>Total Potongan:</span>
                      <span className="font-black text-rose-800">
                        {formatRupiah(data.totalPotongan)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Bersih Diterima (Take Home Pay) */}
              <div className="p-3 bg-slate-100 border-2 border-emerald-700 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-950">
                    TOTAL GAJI BERSIH DITERIMA (TAKE HOME PAY)
                  </div>
                  <div className="text-[9px] text-slate-500">
                    * Rincian resmi hasil rekapitulasi kehadiran bulanan
                  </div>
                </div>
                <div className="text-xl font-black text-emerald-900 tracking-wide font-mono">
                  {formatRupiah(data.totalGajiBersih)}
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs">
                <div className="space-y-12">
                  <div className="font-bold text-slate-700">Karyawan Penerima</div>
                  <div className="border-b border-black w-32 mx-auto"></div>
                  <div className="font-bold">({data.nama})</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-slate-700">Kepala Toko / Cabang</div>
                  <div className="border-b border-black w-32 mx-auto"></div>
                  <div className="font-bold">({data.cabang})</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-slate-700">Owner / Direktur Utama</div>
                  <div className="border-b border-black w-32 mx-auto"></div>
                  <div className="font-bold">({brandName.toUpperCase()} PUSAT)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
