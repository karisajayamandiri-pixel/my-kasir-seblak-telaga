/**
 * Web Bluetooth ESC/POS Thermal Receipt Printer Driver
 * Mendukung printer thermal kasir Bluetooth 58mm & 80mm
 * (Panda, GOOJPRT, RPP02N, Epson, MPT, Iware, Zywell, Paperang, dll.)
 */

import { Transaksi, DataCabang } from '../types';
import { formatRupiah } from './storage';

// Known Bluetooth Thermal Printer Service & Characteristic UUIDs
const KNOWN_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
];

export interface BluetoothPrinterState {
  isConnected: boolean;
  deviceName: string | null;
  error: string | null;
}

let activeDevice: any = null;
let activeCharacteristic: any = null;

export const isWebBluetoothSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

export const getConnectedDeviceName = (): string | null => {
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    return activeDevice.name || 'Printer Bluetooth';
  }
  return null;
};

export const isPrinterConnected = (): boolean => {
  return Boolean(activeDevice && activeDevice.gatt && activeDevice.gatt.connected && activeCharacteristic);
};

/**
 * Hubungkan ke printer Bluetooth via Web Bluetooth API
 */
export const connectBluetoothPrinter = async (): Promise<{ success: boolean; deviceName?: string; error?: string }> => {
  if (!isWebBluetoothSupported()) {
    return {
      success: false,
      error: 'Web Bluetooth tidak didukung oleh browser ini. Gunakan Google Chrome atau Edge pada Android/PC/Mac.',
    };
  }

  try {
    const navAny = navigator as any;
    const device = await navAny.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_SERVICES,
    });

    if (!device) {
      return { success: false, error: 'Pencarian printer dibatalkan.' };
    }

    const server = await device.gatt.connect();

    // Cari service dan characteristic yang dapat ditulisi (write / writeWithoutResponse)
    let foundChar: any = null;

    // 1. Coba cari di known services
    for (const serviceUuid of KNOWN_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            foundChar = char;
            break;
          }
        }
        if (foundChar) break;
      } catch {
        // service not on this device, lanjut
      }
    }

    // 2. Jika belum ketemu, coba getPrimaryServices
    if (!foundChar && server.getPrimaryServices) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                foundChar = char;
                break;
              }
            }
            if (foundChar) break;
          } catch {}
        }
      } catch {}
    }

    if (!foundChar) {
      device.gatt.disconnect();
      return {
        success: false,
        error: `Printer "${device.name || 'Bluetooth'}" berhasil terhubung, namun karakteristik cetak tidak ditemukan. Pastikan perangkat adalah Printer Thermal ESC/POS.`,
      };
    }

    activeDevice = device;
    activeCharacteristic = foundChar;

    // Listen disconnect
    device.addEventListener('gattserverdisconnected', () => {
      activeDevice = null;
      activeCharacteristic = null;
    });

    return { success: true, deviceName: device.name || 'Printer Bluetooth' };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: 'Pemilihan printer Bluetooth dibatalkan.' };
    }
    return { success: false, error: err.message || 'Gagal menyambungkan ke printer Bluetooth.' };
  }
};

/**
 * Putus koneksi printer Bluetooth
 */
export const disconnectBluetoothPrinter = async (): Promise<void> => {
  if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {
    try {
      await activeDevice.gatt.disconnect();
    } catch {}
  }
  activeDevice = null;
  activeCharacteristic = null;
};

/**
 * Kirim data biner (ArrayBuffer / Uint8Array) ke printer Bluetooth dengan chunking MTU
 */
export const sendBytesToPrinter = async (bytes: Uint8Array): Promise<void> => {
  if (!activeCharacteristic) {
    throw new Error('Printer Bluetooth belum terhubung. Sambungkan printer terlebih dahulu.');
  }

  // Kirim data dalam potongan chunk (512 bytes) agar tidak overflow Bluetooth MTU
  const CHUNK_SIZE = 512;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    if (activeCharacteristic.writeValueWithResponse) {
      await activeCharacteristic.writeValueWithResponse(chunk);
    } else if (activeCharacteristic.writeValueWithoutResponse) {
      await activeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await activeCharacteristic.writeValue(chunk);
    }
    // Delay kecil antar chunk
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

/**
 * ESC/POS Byte Builder Helper
 */
class EscPosBuilder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();

  // Reset / Inisialisasi printer
  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  // Align: 0=Left, 1=Center, 2=Right
  align(align: 'left' | 'center' | 'right'): this {
    const code = align === 'center' ? 1 : align === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, code); // ESC a n
    return this;
  }

  // Bold on/off
  bold(on: boolean): this {
    this.buffer.push(0x1b, 0x45, on ? 1 : 0); // ESC E n
    return this;
  }

  // Text size: 'normal' | 'double' | 'large'
  size(size: 'normal' | 'double' | 'large'): this {
    let code = 0x00;
    if (size === 'double') code = 0x11; // double width & double height
    if (size === 'large') code = 0x22;
    this.buffer.push(0x1d, 0x21, code); // GS ! n
    return this;
  }

  // Teks string biasa
  text(str: string): this {
    const encoded = this.encoder.encode(str);
    for (let i = 0; i < encoded.length; i++) {
      this.buffer.push(encoded[i]);
    }
    return this;
  }

  // Teks dengan newline
  line(str: string = ''): this {
    this.text(str + '\n');
    return this;
  }

  // Baris pembatas putus-putus 32 karakter (standar 58mm)
  divider(char: string = '-', width: number = 32): this {
    this.align('center');
    this.line(char.repeat(width));
    return this;
  }

  // Baris rata kiri & rata kanan (misal "Total:           Rp 50.000")
  twoColumn(left: string, right: string, width: number = 32): this {
    const spaceCount = Math.max(1, width - (left.length + right.length));
    const line = left + ' '.repeat(spaceCount) + right;
    this.align('left');
    this.line(line);
    return this;
  }

  // Line feeds (spasi kertas)
  feed(lines: number = 3): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  // Potong kertas (Cut paper)
  cut(): this {
    this.buffer.push(0x1d, 0x56, 0x41, 0x10); // GS V A 16
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Buat ESC/POS binary untuk Struk Transaksi Kasir Seblak Telaga
 */
export const buildReceiptEscPos = (trx: Transaksi, branchInfo?: DataCabang): Uint8Array => {
  const b = new EscPosBuilder();
  const branchNama = branchInfo?.nama || trx.cabang || 'TELAGA';
  const branchAlamat = branchInfo?.alamat || 'Gudang & Sentral Logistik Seblak Telaga';
  const branchHp = branchInfo?.noHp || '0857-1234-5678';

  b.init();

  // KOP TOKO (Center, Bold, Double Size)
  b.align('center');
  b.bold(true).size('double').line('SEBLAK TELAGA');
  b.bold(true).size('normal').line(`CABANG ${branchNama.toUpperCase()}`);
  b.bold(false).line(branchAlamat);
  b.line(`Telp/WA: ${branchHp}`);
  b.line('Pedas Gurih Bikin Nagih!');
  b.divider('=');

  // NOMOR PESANAN / ANTRIAN (Besar & Tebal agar mudah dibaca)
  const orderNumber = trx.nomorPesanan || (trx.takeAwayId ? trx.takeAwayId : '#01');
  b.align('center');
  b.bold(true).size('double').line(`PESANAN ${orderNumber}`);
  b.bold(false).size('normal');
  b.divider('-');

  // INFO TRANSAKSI
  b.align('left');
  b.twoColumn(`No: ${trx.invoiceNo}`, `Tgl: ${trx.tanggal}`);
  b.twoColumn(`Kasir: ${trx.kasirNama || 'Kasir'}`, `Jam: ${trx.jam}`);
  
  // Tipe Pesanan
  const tipePesanan = trx.tipePesanan || 'Dine In';
  b.bold(true).line(`TIPE PESANAN: [ ${tipePesanan.toUpperCase()} ]`);
  b.bold(false);

  // Jika Dine In dengan nama pelanggan/meja
  if (tipePesanan === 'Dine In' && trx.pelangganNama) {
    b.line(`Pelanggan/Meja: ${trx.pelangganNama}`);
  }
  // Jika Take Away, cetak ID & Nama Pelanggan
  else if (tipePesanan === 'Take Away') {
    if (trx.takeAwayId) {
      b.bold(true).line(`NO. TAKE AWAY : ${trx.takeAwayId}`);
      b.bold(false);
    }
    b.line(`Pelanggan     : ${trx.pelangganNama || '-'}`);
    if (trx.pelangganTelepon) {
      b.line(`Telepon       : ${trx.pelangganTelepon}`);
    }
  }
  // Jika Delivery Order, cetak rincian penerima & jarak
  else if (tipePesanan === 'Delivery Order') {
    b.line(`Penerima : ${trx.pelangganNama || '-'}`);
    b.line(`Telepon  : ${trx.pelangganTelepon || '-'}`);
    b.line(`Alamat   : ${trx.pelangganAlamat || '-'}`);
    if (trx.jarakKm !== undefined) {
      b.line(`Jarak    : ${trx.jarakKm} km`);
    }
  }
  b.divider('-');

  // DAFTAR ITEM TRANSAKSI
  b.bold(true).line('ITEM PESANAN:');
  b.bold(false);

  trx.items.forEach((item) => {
    // Baris 1: Nama menu
    const menuTitle = `${item.nama}${item.levelPedas !== undefined ? ` (${item.levelPedas})` : ''}`;
    b.line(menuTitle);

    // Baris 2: Qty x Harga   Subtotal
    const qtyPrice = ` ${item.qty} x ${formatRupiah(item.harga)}`;
    const subtotal = formatRupiah(item.subtotal);
    b.twoColumn(qtyPrice, subtotal);

    if (item.free_minuman) {
      b.line(`  [+ FREE ${item.free_minuman}]`);
    }

    if (item.catatan) {
      b.line(`  *Catatan: ${item.catatan}`);
    }
  });

  b.divider('-');

  // SUBTOTAL, ONGKIR, TOTAL & PEMBAYARAN
  if (tipePesanan === 'Delivery Order' && trx.ongkir !== undefined) {
    const subtotalBelanja = trx.subtotalPesanan || (trx.total - (trx.ongkir || 0));
    b.twoColumn('Subtotal Menu:', formatRupiah(subtotalBelanja));
    const ongkirTitle = trx.jarakKm !== undefined ? `Ongkir (${trx.jarakKm} km):` : 'Biaya Kirim (Ongkir):';
    const ongkirText = trx.ongkir === 0 ? 'GRATIS' : formatRupiah(trx.ongkir || 0);
    b.twoColumn(ongkirTitle, ongkirText);
  }

  b.bold(true).size('normal');
  b.twoColumn('TOTAL BAYAR:', formatRupiah(trx.total));
  b.bold(false);
  b.twoColumn(`METODE BAYAR:`, trx.metodeBayar.toUpperCase());
  b.twoColumn('JUMLAH BAYAR:', formatRupiah(trx.bayar));
  b.twoColumn('KEMBALIAN:', formatRupiah(trx.kembali));
  b.divider('=');

  // FOOTER UCAPAN
  b.align('center');
  if (tipePesanan === 'Delivery Order') {
    b.line('PENGIRIMAN DIJAMIN TEPAT WAKTU');
  }
  b.line('Terima Kasih Atas Kunjungan Anda!');
  b.line('Kritik & Saran: ' + branchHp);
  b.line('Follow IG: @seblaktelaga');
  b.feed(4);
  b.cut();

  return b.getBytes();
};

/**
 * Buat ESC/POS binary untuk Tiket Dapur (Tanpa Harga, hanya info masak)
 */
export const buildKitchenTicketEscPos = (trx: Transaksi, branchInfo?: DataCabang): Uint8Array => {
  const b = new EscPosBuilder();
  const branchNama = branchInfo?.nama || trx.cabang || 'TELAGA';

  b.init();

  // KOP TIKET DAPUR
  b.align('center');
  b.bold(true).size('double').line('TIKET DAPUR');
  b.bold(true).size('normal').line(`SEBLAK TELAGA - ${branchNama.toUpperCase()}`);
  b.divider('=');

  // NOMOR PESANAN / ANTRIAN (Besar & Tebal)
  const orderNumber = trx.nomorPesanan || (trx.takeAwayId ? trx.takeAwayId : '#01');
  b.align('center');
  b.bold(true).size('double').line(`NO: ${orderNumber}`);
  b.bold(false).size('normal');
  if (trx.voidDariInvoice) {
    b.bold(true).line(`[ MENU PENGGANTI - VOID #${trx.voidDariInvoice.slice(-6)} ]`);
    b.bold(false);
  }
  b.divider('-');

  // INFO PESANAN
  b.align('left');
  b.twoColumn(`Inv: #${trx.invoiceNo.slice(-6)}`, `Jam: ${trx.jam}`);
  b.twoColumn(`Tgl: ${trx.tanggal}`, `Kasir: ${trx.kasirNama || '-'}`);

  const tipePesanan = trx.tipePesanan || 'Dine In';
  b.bold(true).line(`LAYANAN: [ ${tipePesanan.toUpperCase()} ]`);
  b.bold(false);

  if (trx.nomorMeja) {
    b.bold(true).line(`NO. MEJA   : ${trx.nomorMeja}`);
    b.bold(false);
  }
  if (trx.pelangganNama) {
    b.line(`Pelanggan  : ${trx.pelangganNama}`);
  }
  if (tipePesanan === 'Take Away' && trx.takeAwayId) {
    b.bold(true).line(`ID BUNGKUS : ${trx.takeAwayId}`);
    b.bold(false);
  }
  if (tipePesanan === 'Delivery Order' && trx.pelangganAlamat) {
    b.line(`Alamat     : ${trx.pelangganAlamat}`);
  }
  b.divider('-');

  // DAFTAR MENU (TANPA HARGA SAMA SEKALI)
  b.bold(true).line('PESANAN MASAK (TANPA HARGA):');
  b.bold(false);

  trx.items.forEach((item) => {
    b.bold(true).line(`[ ${item.qty}x ] ${item.nama.toUpperCase()}`);
    b.bold(false);
    if (item.levelPedas !== undefined && item.levelPedas !== '') {
      b.line(`  * Level: ${item.levelPedas}`);
    }
    if (item.free_minuman) {
      b.line(`  * FREE: ${item.free_minuman}`);
    }
    if (item.catatan) {
      b.line(`  * Catatan: ${item.catatan}`);
    }
  });

  b.divider('=');
  b.align('center');
  const totalItemCount = trx.items.reduce((acc, i) => acc + i.qty, 0);
  b.bold(true).line(`TOTAL: ${totalItemCount} PORSI`);
  b.bold(false);
  b.line('*** HARAP DIPROSES SEGERA ***');
  b.line('Cocokkan fisik struk saat pesanan siap');
  b.feed(4);
  b.cut();

  return b.getBytes();
};

export const printKitchenTicketViaBluetooth = async (
  trx: Transaksi,
  branchInfo?: DataCabang
): Promise<{ success: boolean; error?: string }> => {
  if (!isPrinterConnected()) {
    const conn = await connectBluetoothPrinter();
    if (!conn.success) {
      return { success: false, error: conn.error };
    }
  }

  try {
    const bytes = buildKitchenTicketEscPos(trx, branchInfo);
    await sendBytesToPrinter(bytes);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengirim data tiket dapur ke printer Bluetooth.' };
  }
};

/**
 * Cetak struk langsung via Bluetooth
 */
export const printReceiptViaBluetooth = async (
  trx: Transaksi,
  branchInfo?: DataCabang
): Promise<{ success: boolean; error?: string }> => {
  // Jika belum terhubung, hubungkan dulu
  if (!isPrinterConnected()) {
    const conn = await connectBluetoothPrinter();
    if (!conn.success) {
      return { success: false, error: conn.error };
    }
  }

  try {
    const bytes = buildReceiptEscPos(trx, branchInfo);
    await sendBytesToPrinter(bytes);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengirim data struk ke printer Bluetooth.' };
  }
};

/**
 * Cetak Test Print ke printer Bluetooth
 */
export const printTestBluetooth = async (
  branchName: string = 'DC PUSAT'
): Promise<{ success: boolean; error?: string }> => {
  if (!isPrinterConnected()) {
    const conn = await connectBluetoothPrinter();
    if (!conn.success) {
      return { success: false, error: conn.error };
    }
  }

  try {
    const b = new EscPosBuilder();
    b.init();
    b.align('center');
    b.bold(true).size('double').line('SEBLAK TELAGA');
    b.size('normal').line(`TEST PRINT PRINTER BLUETOOTH`);
    b.line(`Cabang: ${branchName}`);
    b.divider('-');
    b.align('left');
    b.line('Koneksi: Web Bluetooth ESC/POS');
    b.line('Status: TERHUBUNG NORMAL (OK)');
    b.line(`Waktu: ${new Date().toLocaleString('id-ID')}`);
    b.divider('-');
    b.align('center');
    b.line('Printer Thermal Kasir Siap Pakai!');
    b.feed(4);
    b.cut();

    await sendBytesToPrinter(b.getBytes());
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal test print Bluetooth.' };
  }
};

/**
 * Buat RawBT Android Intent URL (Fallback cetak Bluetooth untuk Android jika Web Bluetooth tidak aktif)
 */
export const getRawBtReceiptUrl = (trx: Transaksi, branchInfo?: DataCabang): string => {
  const bytes = buildReceiptEscPos(trx, branchInfo);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `rawbt:data:application/octet-stream;base64,${base64}`;
};
