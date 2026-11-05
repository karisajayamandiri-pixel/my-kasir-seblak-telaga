export type Cabang = string;

export type Jabatan =
  | 'Owner'
  | 'Admin DC Pusat'
  | 'Supervisor Area'
  | 'Kepala Toko'
  | 'Cashier'
  | 'Crew Store'
  | 'Kitchen'
  | 'Driver'
  | 'KASIR'
  | 'KEPALA TOKO'
  | 'CREW STORE'
  | 'KITCHEN'
  | 'Admin';

export type UserStatus = 'Aktif' | 'Nonaktif';

export const OWNER_EMAIL = 'karisajayamandiri@gmail.com';

export interface Karyawan {
  id: string;
  nik?: string; // Nomor Induk Karyawan (diisi manual oleh Owner & Admin DC Pusat)
  nib?: string; // Nomor Induk Berusaha (khusus Owner)
  email?: string; // Email akun (Owner: karisajayamandiri@gmail.com)
  nama: string;
  hp: string;
  alamat: string;
  cabang: Cabang;
  branchId?: string; // ID dokumen cabang pada Firestore collection branches
  jabatan: Jabatan;
  username: string;
  password: string;
  status: UserStatus;
  createdAt?: string;
}

export type KategoriBahan = 'Bahan Makanan' | 'Bahan Minuman' | 'Kemasan';

export interface BahanBaku {
  id: string;
  nama: string;
  satuan: string; // 'kg' | 'gr' | 'butir' | 'bks' | 'ikat' | 'liter' | 'porsi' | 'botol'
  kategori: KategoriBahan; // 'Bahan Makanan' | 'Bahan Minuman' | 'Kemasan'
  hargaBeli: number;
  stokMinimum: number;
  stokDC: number;
  keterangan?: string;
}

export interface ResepItem {
  bahanId: string;
  qtyPakai: number; // jumlah satuan bahan yang dipakai per 1 porsi menu
}

export interface KatalogMenu {
  id: string;
  kode: string; // e.g. 'SB-001'
  nama: string;
  kategori: 'Seblak Kuah' | 'Seblak Kering' | 'Topping Tambahan' | 'Minuman Segar' | 'Paket Hemat';
  resep: ResepItem[];
  hargaModal: number; // HPP dihitung otomatis sum(qtyPakai * hargaBeli)
  hargaJual: number; // HARGA MENU
  keuntungan: number; // hargaJual - hargaModal
  deskripsi?: string;
}

export type LevelPedas =
  | 'Original'
  | 'Sedang'
  | 'Pedas'
  | 'Pedas Manis'
  | 'Pedas Asin';

export const LEVEL_PEDAS_OPTIONS: LevelPedas[] = [
  'Original',
  'Sedang',
  'Pedas',
  'Pedas Manis',
  'Pedas Asin',
];

export interface CartItem {
  katalogId: string;
  kode: string;
  nama: string;
  harga: number; // Harga Menu
  hargaModal: number;
  qty: number;
  levelPedas?: LevelPedas | string | number;
  catatan?: string;
  subtotal: number;
  resep: ResepItem[];
}

export interface TransaksiItem {
  katalogId: string;
  kode: string;
  nama: string;
  harga: number;
  hargaModal: number;
  qty: number;
  levelPedas?: LevelPedas | string | number;
  catatan?: string;
  subtotal: number;
  resep: ResepItem[];
}

export type TipePesanan = 'Dine In' | 'Take Away' | 'Delivery Order';
export type StatusPesanan =
  | 'MENUNGGU'
  | 'DIPROSES'
  | 'SIAP ANTAR'
  | 'BELUM BAYAR'
  | 'LUNAS'
  | 'DIBATALKAN'
  | 'DIVOID'
  | 'Menunggu'
  | 'Sedang Dibuat'
  | 'Selesai'
  | 'Dibatalkan';

export interface Transaksi {
  id: string;
  invoiceNo: string;
  cabang: Cabang;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  kasirId: string;
  kasirNama: string;
  kasirJabatan?: string;
  kasirBertugas?: string;
  items: TransaksiItem[];
  tipePesanan?: TipePesanan;
  subtotalPesanan?: number;
  ongkir?: number;
  jarakKm?: number; // Jarak delivery order (km)
  nomorMeja?: string; // Nomor Meja untuk Dine In
  pelangganNama?: string;
  pelangganTelepon?: string;
  pelangganAlamat?: string;
  takeAwayId?: string; // ID / Nomor Antrean Take Away agar tidak tertukar
  nomorPesanan?: string; // Nomor antrean/pesanan otomatis untuk dicetak di struk (e.g. #01, #02)
  statusPesanan?: StatusPesanan;
  statusPembayaran?: 'LUNAS' | 'BELUM BAYAR';
  waktuMulaiDibuat?: string; // Jam mulai dimasak
  waktuSelesai?: string; // Jam pesanan selesai/siap
  total: number;
  totalModal: number;
  totalUntung: number;
  metodeBayar: 'Cash' | 'QRIS';
  bayar: number;
  kembali: number;
  status: 'Sukses' | 'Retur';
  alasanRetur?: string;
  waktuRetur?: string;
  voidDariInvoice?: string;
  voidKeInvoice?: string;
  selisihVoid?: number; // Nilai selisih biaya void (+ tagihan tambahan, - kembalian)
  keteranganVoid?: string;
  itemsLama?: TransaksiItem[]; // Menu lama sebelum divoid (untuk laporan audit owner/admin)
  totalLama?: number;
  itemsPengganti?: TransaksiItem[]; // Menu pengganti setelah divoid (untuk laporan audit owner/admin)
  totalPengganti?: number;
}

// Stok Cabang: Record<cabang, Record<bahanId, number>>
export type StokCabangMap = Record<string, Record<string, number>>;

export interface PermintaanBarangItem {
  bahanId: string;
  namaBahan: string;
  satuan: string;
  qtyMinta: number;
}

export interface PermintaanBarang {
  id: string;
  noPermintaan: string;
  cabang: Cabang;
  tanggal: string;
  jam: string;
  items: PermintaanBarangItem[];
  catatan?: string;
  status: 'Menunggu' | 'Diproses' | 'Dikirim' | 'Selesai';
  suratJalanId?: string;
}

export interface SuratJalanItem {
  bahanId: string;
  namaBahan: string;
  satuan: string;
  qtyKirim: number;
  qtyTerima?: number;
}

export interface SuratJalan {
  id: string;
  noSuratJalan: string;
  permintaanId?: string;
  cabangTujuan: Cabang;
  tanggal: string;
  jam: string;
  items: SuratJalanItem[];
  biayaSolar: number; // OPSIONAL boleh 0
  setoran: number; // titipan setoran uang
  status: 'Dikirim' | 'Terkirim' | 'Diterima' | 'Selesai';
  driver: string;
  catatan?: string;
  tanggalTerima?: string;
  jamTerima?: string;
  penerimaNama?: string;
  penerimaJabatan?: string;
  catatanPenerima?: string;
}

export interface Absensi {
  id: string;
  tanggal: string; // YYYY-MM-DD
  cabang: Cabang | string;
  karyawanId: string;
  nama: string;
  jabatan?: string; // 'KEPALA TOKO' | 'KASIR' | 'CREW STORE'
  kasirBertugas?: string; // Nama kasir/petugas yang bertugas
  jamMasuk: string;
  jamPulang?: string;
  durasi?: string;
  status: 'Tepat Waktu' | 'Terlambat' | 'Izin' | 'Sakit' | 'Off' | 'Libur';
  keterangan?: string;
}

export type StatusPengeluaran = 'Menunggu ACC' | 'Disetujui' | 'Ditolak';

export interface PengeluaranToko {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  cabang: Cabang | string; // Otomatis dari akun kasir yang login
  kasirId: string;
  kasirNama: string;
  pengajuNama?: string;
  nominal: number; // Wajib > 0
  keterangan: string; // Wajib
  fotoStrukId?: string; // ID tersimpan di IndexedDB (opsional)
  fotoStrukUrl?: string; // Preview data URL (opsional)
  fotoStrukHash?: string; // Hash unik anti-duplikat (opsional)
  status: StatusPengeluaran; // 'Menunggu ACC' | 'Disetujui' | 'Ditolak'
  catatanOwner?: string;
  catatanAcc?: string;
  accOleh?: string;
  accWaktu?: string;
}

export interface LaporanHarian {
  id: string;
  tanggal: string; // YYYY-MM-DD
  cabang: Cabang | string;
  kasirId: string;
  kasirNama: string;
  nama?: string; // Nama penanggung jawab
  jabatan?: string; // 'KEPALA TOKO' | 'KASIR'
  kasirBertugas?: string; // Kasir yang bertugas
  jamBuka: string;
  jamTutup?: string;
  modalAwal: number;
  totalOmzet: number;
  totalTransaksi: number;
  totalModal: number;
  totalUntung: number;
  pengeluaran: number; // Total pengeluaran yang Disetujui
  pengeluaranAcc: number; // Total pengeluaran status Disetujui
  rincianPengeluaran?: string;
  cashLaci: number; // Fisik uang kas di laci
  setoran: number; // Setoran = Omzet - Total Pengeluaran Disetujui
  selisihCash: number;
  statusToko: 'Buka' | 'Tutup' | 'Libur';
  catatan?: string;
  fotoUangKasId?: string; // ID IndexedDB
  fotoUangKas?: string; // Foto uang kas di laci (wajib)
  fotoAbsenPulangId?: string; // ID IndexedDB
  fotoAbsenPulang?: string; // Foto absen pulang crew (wajib)
  fotoNota?: string; // Legacy/fallback
  fotoNotaHash?: string;
  crewHadir?: string[];
  crewPulangCount: number; // Jumlah crew yang pulang
  crewPulangNames: string[]; // Nama crew yang pulang
}

export interface AuditLog {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  siapa: string; // Nama (Jabatan)
  cabang: string; // Akun Cabang
  aksi: string; // Aksi operasional
  nominal?: number; // Nominal Rp
  keterangan?: string; // Keterangan tambahan
}

export interface TokoState {
  status: 'Buka' | 'Tutup' | 'Libur' | 'Belum Buka';
  jamBuka?: string;
  jamTutup?: string;
  kasirNama?: string;
  modalAwal?: number;
  terakhirUpdate?: string;
  terakhirTutupTanggal?: string; // YYYY-MM-DD tanggal penutupan toko
  sudahTutupHariIni?: boolean; // True jika sudah pernah tutup hari ini (tidak bisa buka lagi)
}

export type AllTokoState = Record<string, TokoState>;

export interface DataCabang {
  id: string; // branchId doc id
  branchId?: string; // alias branchId
  nama: string; // Dynamic branch name
  name?: string; // alias name
  kode?: string;
  alamat: string;
  noHp: string;
  status: 'Aktif' | 'Nonaktif';
  isPusat?: boolean;
  bankOrEwallet?: string; // e.g. 'BCA', 'Mandiri', 'BRI', 'BSI', 'GoPay', 'OVO', 'DANA'
  noRekening?: string; // Nomor Rekening Bank / No E-Wallet
  atasNama?: string; // Nama Pemilik Rekening / Akun
}

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'pesanan'
  | 'karyawan'
  | 'dataOwner'
  | 'dataCabang'
  | 'bahanBaku'
  | 'katalog'
  | 'stokCabang'
  | 'suratJalan'
  | 'terimaBarang'
  | 'pengirimanDriver'
  | 'absensi'
  | 'pengeluaran'
  | 'bukaTutup'
  | 'laporan'
  | 'pengaturan';

export interface FullResetOptions {
  pesananTransaksi: boolean; // orders, pesanan, transactions, sales, transaksi, pengeluaran
  menuKategori: boolean; // menus, products, categories, katalog
  pelanggan: boolean; // customers, pelanggan
  bahanBakuStok: boolean; // ingredients, stocks, bahan, bahanBaku, stokCabang
  laporanDivoid: boolean; // divoid, dibatalkan, logs, reports, laporanHarian, auditLog, absensi, suratJalan, permintaan
  karyawanTrial: boolean; // employees trial, karyawan (kecuali akun Owner)
}

export interface FullResetResult {
  success: boolean;
  totalDeleted: number;
  collectionCount: number;
  message: string;
  affectedCategories: string[];
}


