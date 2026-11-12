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
  cabang_id?: string; // ID dokumen cabang pada Firestore data_cabang
  branchId?: string; // Alias ID dokumen cabang pada Firestore collection branches
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
  harga_promo?: number; // Promo potongan harga (misal 7000, 8000, jika < hargaJual coret harga asli)
  free_minuman?: string; // Promo gratis minuman (misal Es Teh, Es Jeruk)
  free_minuman_id?: string; // ID menu minuman dari katalog_menu kategori Minuman Segar
  promo_cabang_ids?: string[]; // Array branch ID / cabang target promo. Kosong [] = semua cabang, jika diisi hanya aktif di cabang terpilih
  cabang_ids?: string[]; // Array branch ID / cabang di mana menu ini aktif ditampilkan
}

export interface MenuCabang {
  id: string; // `${menu_id}_${cabang_id}`
  menu_id: string;
  cabang_id: string;
  is_tampil: boolean;
  updatedAt?: string;
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
  harga: number; // Harga Menu (atau harga_promo jika aktif)
  hargaModal: number;
  qty: number;
  levelPedas?: LevelPedas | string | number;
  catatan?: string;
  subtotal: number;
  resep: ResepItem[];
  hargaAsli?: number;
  harga_promo?: number;
  free_minuman?: string;
  free_minuman_id?: string;
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
  hargaAsli?: number;
  harga_promo?: number;
  free_minuman?: string;
  free_minuman_id?: string;
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
  cabang_id?: string; // ID Dokumen Cabang (dinamis dari data_cabang)
  karyawanId: string;
  karyawan_id?: string; // Alias karyawan_id
  nama: string;
  nik?: string; // NIK Karyawan
  jabatan?: string; // 'KEPALA TOKO' | 'KASIR' | 'CREW STORE'
  kasirBertugas?: string; // Nama kasir/petugas yang bertugas
  jamMasuk: string;
  jamPulang?: string;
  durasi?: string;
  status: 'Tepat Waktu' | 'Terlambat' | 'Izin' | 'Sakit' | 'Off' | 'Libur';
  keterangan?: string;
}

export interface PengaturanOff {
  id: string; // format: 'poff-' + cabangId
  cabangId: string;
  cabangNama: string;
  // Kuota maks karyawan yang boleh OFF per hari: 0 = Full Team ("Tidak ada OFF"), 1-5+
  senin: number;
  selasa: number;
  rabu: number;
  kamis: number;
  jumat: number;
  sabtu: number;
  minggu: number;
  updatedAt?: string;
  updatedBy?: string;
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
  pesanan: boolean; // 1. Pesanan (transaksi, orders, pesanan, sales)
  pengeluaran: boolean; // 2. Pengeluaran Toko (pengeluaran)
  permintaanStokCabang: boolean; // 3. Permintaan & Stock Cabang (permintaan, stokCabang)
  suratJalan: boolean; // 4. Surat Jalan DC (suratJalan)
  absensi: boolean; // 5. Absensi (absensi)
  bukaTutupToko: boolean; // 6. Buka/Tutup Toko (statusToko)
  laporan: boolean; // 7. Laporan (laporanHarian, auditLog, divoid)
  bahanBakuDc: boolean; // 8. Bahan Baku & DC (bahanBaku, ingredients)
  katalogMenu: boolean; // 9. Katalog Menu (katalog, menus, products)
  dataCabang: boolean; // 10. Data Cabang (branches, dataCabang)
  dataKaryawan: boolean; // 11. Data Karyawan (jangan hapus Owner) (karyawan, employees - kecuali Owner)
}

export interface FullResetResult {
  success: boolean;
  totalDeleted: number;
  collectionCount: number;
  message: string;
  affectedCategories: string[];
}

export interface GajiKaryawanSetting {
  karyawanId: string;
  gajiPokokHarian: number; // default: 100000
  uangMakanHarian: number; // default: 20000
  dendaTelat: number; // default: 10000
  bonus?: number;
  keterangan?: string;
  updatedAt?: string;
}

export interface SlipGajiData {
  karyawanId: string;
  nama: string;
  nik?: string;
  jabatan: string;
  cabang: string;
  hp?: string;
  bulan: string; // 'YYYY-MM'
  bulanNama: string; // e.g. 'November 2026'
  hadirCount: number;
  tepatWaktuCount: number;
  telatCount: number;
  offCount: number;
  izinCount: number;
  sakitCount: number;
  liburCount: number;
  gajiPokokHarian: number;
  uangMakanHarian: number;
  dendaTelat: number;
  totalGajiPokok: number;
  totalUangMakan: number;
  bonus: number;
  potonganTelat: number;
  potonganLain: number;
  penghasilanKotor: number;
  totalPotongan: number;
  totalGajiBersih: number;
  keterangan?: string;
}

export type ThemeColorId =
  | 'sunset'
  | 'ocean'
  | 'emerald'
  | 'royal'
  | 'amber'
  | 'slate';

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  id: string;
  namaUsaha: string;
  tagline?: string;
  logoUrl: string;
  temaWarna: ThemeColorId;
  modeTampilan: ThemeMode;
  tarifDelivery1Km?: number; // Biaya pengiriman dasar (default: 2500 atau 3000)
  tarifDeliveryPer500m?: number; // Tambahan biaya per 0.5 km (default: 500)
  updatedAt?: string;
  updatedBy?: string;
}

