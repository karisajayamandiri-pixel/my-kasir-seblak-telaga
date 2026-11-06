import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  RotateCcw,
  Search,
  CheckCircle,
  AlertCircle,
  CreditCard,
  QrCode,
  Banknote,
  Flame,
  Check,
  ChevronRight,
  Clock,
  Store,
  Bike,
  MapPin,
  Phone,
  User,
  Truck,
  Bluetooth,
  UtensilsCrossed,
  ShoppingBag,
  Navigation,
  ChefHat,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import {
  Karyawan,
  KatalogMenu,
  CartItem,
  Transaksi,
  StokCabangMap,
  Cabang,
  BahanBaku,
  AllTokoState,
  Absensi,
  TipePesanan,
  DataCabang,
  LevelPedas,
  LEVEL_PEDAS_OPTIONS,
} from '../types';
import { PrintDocumentType } from './PrintModal';
import {
  formatRupiah,
  getTodayStr,
  getNowTimeStr,
  generateInvoiceNo,
} from '../utils/storage';
import { printReceiptViaBluetooth, isWebBluetoothSupported } from '../utils/bluetoothPrinter';
import { getBranchName, getBranchById } from '../utils/branchHelper';

interface PosViewProps {
  currentUser: Karyawan;
  katalogList: KatalogMenu[];
  bahanBakuList: BahanBaku[];
  stokCabang: StokCabangMap;
  onUpdateStokCabang: (newStok: StokCabangMap) => void;
  transaksiList: Transaksi[];
  onAddTransaksi: (trx: Transaksi) => void;
  onReturTransaksi: (trxId: string, alasan: string) => void;
  tokoState: AllTokoState;
  absensiList: Absensi[];
  onOpenPrintModal: (type: PrintDocumentType, data: any) => void;
  onNavigateToTab: (tab: any) => void;
  dataCabangList?: DataCabang[];
}

export const PosView: React.FC<PosViewProps> = ({
  currentUser,
  katalogList,
  bahanBakuList,
  stokCabang,
  onUpdateStokCabang,
  transaksiList,
  onAddTransaksi,
  onReturTransaksi,
  tokoState,
  absensiList,
  onOpenPrintModal,
  onNavigateToTab,
  dataCabangList = [],
}) => {
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);
  const currentBranch = getBranchById(currentUser.branchId || currentUser.cabang, dataCabangList);
  const currentCabang = (currentBranchName || currentUser.cabang) as Exclude<Cabang, 'DC PUSAT'>;
  const today = getTodayStr();

  // Verification checks
  const isAbsenToday = absensiList.some(
    (a) => a.karyawanId === currentUser.id && a.tanggal === today
  );
  const currentBranchState = tokoState[currentBranchName] || tokoState[currentUser.cabang as Exclude<Cabang, 'DC PUSAT'>];
  const isTokoBuka = currentBranchState?.status === 'Buka';

  // Sub-tabs: 'pos' or 'riwayat'
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'riwayat'>('pos');

  // Search & Category
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Order Type & Delivery Details
  const [tipePesanan, setTipePesanan] = useState<TipePesanan>('Dine In');
  const [nomorMeja, setNomorMeja] = useState<string>('');
  const [pelangganNama, setPelangganNama] = useState<string>('');
  const [pelangganTelepon, setPelangganTelepon] = useState<string>('');
  const [pelangganAlamat, setPelangganAlamat] = useState<string>('');
  const [jarakKm, setJarakKm] = useState<string>('');
  const [takeAwayId, setTakeAwayId] = useState<string>('');
  const [biayaPengiriman, setBiayaPengiriman] = useState<number>(0);
  const [inputOngkirText, setInputOngkirText] = useState<string>('');
  const [gabungPesananLain, setGabungPesananLain] = useState<boolean>(false);

  // Helper mengurai input jarak ke km (jika input > 20 diasumsikan user mengetik dalam meter, misal 200, 500, 1500)
  const parseDistanceKm = (val: string): number => {
    const raw = parseFloat(val);
    if (isNaN(raw) || raw < 0) return 0;
    if (raw > 20) {
      return raw / 1000;
    }
    return raw;
  };

  /**
   * Aturan Biaya Pengiriman Delivery Order (Update):
   * 1. Jarak ≤ 200 meter (<= 0.2 km): GRATIS (Rp 0)
   * 2. Jarak ≥ 200 meter dan max 500 meter (> 0.2 km - 0.5 km): Rp 2.000
   * 3. Jarak ≥ 500 meter max 1 km (> 0.5 km - 1.0 km): Rp 2.500
   * 4. Jarak ≥ 1 km max 1,5 km (> 1.0 km - 1.5 km): Rp 3.000
   * 5. Jarak ≥ 1,5 km s/d max 2 km: Rp 3.500 (per pelanggan jika ada pesanan pelanggan lain / gabung)
   * 6. Setiap jarak ≥ 2 km: tambah biaya Rp 500 per setiap 500 meter (0.5 km) seterusnya
   */
  const calculateDeliveryFee = (distanceKm: number): number => {
    if (distanceKm <= 0) return 0;
    // Jarak ≤ 200 meter: gratis
    if (distanceKm <= 0.2001) return 0;
    // Jarak 200m - 500m: Rp 2.000
    if (distanceKm <= 0.5001) return 2000;
    // Jarak 500m - 1km: Rp 2.500
    if (distanceKm <= 1.0001) return 2500;
    // Jarak 1km - 1.5km: Rp 3.000
    if (distanceKm <= 1.5001) return 3000;
    // Jarak 1.5km - 2km: Rp 3.500
    if (distanceKm <= 2.0001) return 3500;

    // Setiap jarak ≥ 2 km tambah biaya 500 rupiah per setiap 500 meter sampai seterusnya
    const extraKm = distanceKm - 2.0;
    const extra500m = Math.ceil(extraKm / 0.5);
    return 3500 + extra500m * 500;
  };

  const handleJarakChange = (val: string) => {
    setJarakKm(val);
    const num = parseDistanceKm(val);
    if (!isNaN(num) && num >= 0 && val !== '') {
      const calculated = calculateDeliveryFee(num);
      setBiayaPengiriman(calculated);
      setInputOngkirText(calculated.toString());
      if (metodeBayar === 'QRIS') {
        setNominalBayar(subtotalPesanan + calculated);
      }
    } else if (val === '') {
      setBiayaPengiriman(0);
      setInputOngkirText('');
      if (metodeBayar === 'QRIS') {
        setNominalBayar(subtotalPesanan);
      }
    }
  };

  // Nomor antrian / pesanan otomatis untuk semua tipe pesanan (Dine In, Take Away, Delivery)
  const generateNewOrderNumber = () => {
    const todayCount = transaksiList.filter(
      (t) => t.tanggal === today
    ).length;
    return `#${(todayCount + 1).toString().padStart(2, '0')}`;
  };

  const generateNewTakeAwayId = () => {
    const todayCount = transaksiList.filter(
      (t) => t.tanggal === today && t.tipePesanan === 'Take Away'
    ).length;
    return `TA-${(todayCount + 1).toString().padStart(2, '0')}`;
  };

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodeBayar, setMetodeBayar] = useState<'Cash' | 'QRIS'>('Cash');
  const [nominalBayar, setNominalBayar] = useState<number>(0);
  const [inputBayarText, setInputBayarText] = useState<string>('');
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState<Transaksi | null>(null);
  const [showQrisModal, setShowQrisModal] = useState<boolean>(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState<boolean>(false);

  // Retur Modal state
  const [returTarget, setReturTarget] = useState<Transaksi | null>(null);
  const [alasanRetur, setAlasanRetur] = useState<string>('');

  // Categories
  const categories = [
    'Semua',
    'Seblak Kuah',
    'Seblak Kering',
    'Topping Tambahan',
    'Minuman Segar',
    'Paket Hemat',
  ];

  // Filter katalog
  const filteredKatalog = katalogList.filter((item) => {
    const matchCategory =
      selectedCategory === 'Semua' || item.kategori === selectedCategory;
    const matchSearch =
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Check ingredient availability for a menu item in this branch
  const checkStockAvailability = (menu: KatalogMenu): { available: boolean; limitingBahan?: string } => {
    const branchStock = stokCabang[currentCabang] || {};
    for (const res of menu.resep) {
      const currentQty = branchStock[res.bahanId] || 0;
      if (currentQty < res.qtyPakai) {
        const bhn = bahanBakuList.find((b) => b.id === res.bahanId);
        return { available: false, limitingBahan: bhn?.nama || 'Bahan' };
      }
    }
    return { available: true };
  };

  // Cart calculations
  const totalItemCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const subtotalPesanan = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const ongkirVal = tipePesanan === 'Delivery Order' ? Number(biayaPengiriman) || 0 : 0;
  const totalTagihan = subtotalPesanan + ongkirVal;
  const totalModal = cart.reduce((acc, item) => acc + item.hargaModal * item.qty, 0);
  const totalUntung = totalTagihan - totalModal;

  const effectiveBayar = metodeBayar === 'QRIS' ? totalTagihan : nominalBayar;
  const kembalian = Math.max(0, effectiveBayar - totalTagihan);
  const isBayarCukup = effectiveBayar >= totalTagihan && totalTagihan > 0;

  // Pesanan delivery lain hari ini di cabang aktif yang masih berstatus menunggu atau dibuat
  const activeDeliveryOrdersToday = useMemo(() => {
    return transaksiList.filter(
      (t) =>
        t.cabang === (currentBranchName || currentUser.cabang) &&
        t.tanggal === today &&
        t.tipePesanan === 'Delivery Order' &&
        t.status === 'Sukses' &&
        (t.statusPesanan === 'Menunggu' || t.statusPesanan === 'Sedang Dibuat')
    );
  }, [transaksiList, currentBranchName, currentUser.cabang, today]);

  const hasOtherCustomerDeliveryOrder = activeDeliveryOrdersToday.length > 0 || gabungPesananLain;
  const parsedDistKm = parseDistanceKm(jarakKm);

  // Validasi belanja delivery jarak ≥ 1,5 km
  const isJarakDiatas15 = tipePesanan === 'Delivery Order' && parsedDistKm >= 1.499;
  const isBelanjaKurang10k = isJarakDiatas15 && subtotalPesanan < 10000 && cart.length > 0;
  const isBelanjaKurang20k = isJarakDiatas15 && subtotalPesanan < 20000 && subtotalPesanan >= 10000;

  const isSudahTutupHariIni =
    currentBranchState?.sudahTutupHariIni ||
    (currentBranchState?.status === 'Tutup' && currentBranchState?.terakhirTutupTanggal === today);

  // Cart operations
  const addToCart = (menu: KatalogMenu) => {
    if (!isTokoBuka) {
      if (isSudahTutupHariIni) {
        alert(
          `Toko ${currentUser.cabang} sudah DITUTUP untuk hari ini (${today}). Terminal POS terkunci dan tidak dapat melakukan transaksi hingga besok hari.`
        );
      } else {
        alert(
          `Toko ${currentUser.cabang} belum dibuka! Harap buka toko & input modal awal laci terlebih dahulu di menu Buka / Tutup Toko.`
        );
      }
      return;
    }

    const hasPromoPrice =
      typeof menu.harga_promo === 'number' &&
      menu.harga_promo > 0 &&
      menu.harga_promo < menu.hargaJual;
    const effectivePrice = hasPromoPrice ? menu.harga_promo! : menu.hargaJual;

    setCart((prev) => {
      const existing = prev.find((item) => item.katalogId === menu.id);
      if (existing) {
        return prev.map((item) =>
          item.katalogId === menu.id
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.harga }
            : item
        );
      }
      return [
        ...prev,
        {
          katalogId: menu.id,
          kode: menu.kode,
          nama: menu.nama,
          harga: effectivePrice,
          hargaModal: menu.hargaModal,
          qty: 1,
          levelPedas: menu.kategori.includes('Seblak') ? 'Sedang' : undefined,
          catatan: '',
          subtotal: effectivePrice,
          resep: menu.resep,
          hargaAsli: menu.hargaJual,
          harga_promo: hasPromoPrice ? menu.harga_promo : undefined,
          free_minuman: menu.free_minuman,
          free_minuman_id: menu.free_minuman_id,
        },
      ];
    });
  };

  const updateCartQty = (katalogId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.katalogId === katalogId) {
            const newQty = item.qty + delta;
            return newQty > 0
              ? { ...item, qty: newQty, subtotal: newQty * item.harga }
              : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateCartItemNotes = (katalogId: string, key: 'levelPedas' | 'catatan', value: any) => {
    setCart((prev) =>
      prev.map((item) =>
        item.katalogId === katalogId ? { ...item, [key]: value } : item
      )
    );
  };

  const removeFromCart = (katalogId: string) => {
    setCart((prev) => prev.filter((item) => item.katalogId !== katalogId));
  };

  const handleSetQuickCash = (amount: number) => {
    setNominalBayar(amount);
    setInputBayarText(amount.toString());
  };

  // Process Payment / Order
  const handleProcessPayment = (mode: 'BELUM_BAYAR' | 'LUNAS' = 'BELUM_BAYAR') => {
    if (!isTokoBuka) {
      alert(`Toko ${currentUser.cabang} sedang tidak buka. Transaksi tidak dapat diproses.`);
      return;
    }
    if (cart.length === 0) {
      alert('Keranjang pesanan masih kosong!');
      return;
    }

    // Jika mode LUNAS: Kasir WAJIB memasukkan nominal uang yang diterima (Cash atau QRIS)
    if (mode === 'LUNAS') {
      if (metodeBayar === 'Cash') {
        if (!nominalBayar || nominalBayar < totalTagihan) {
          alert(
            `Pelanggan ingin langsung bayar:\nKasir WAJIB memasukkan nominal uang tunai yang diterima minimal ${formatRupiah(
              totalTagihan
            )} pada kolom "Uang Tunai Diterima"!\n\n(Jika pelanggan belum bayar, silakan klik tombol "Buat Pesanan" di sampingnya).`
          );
          return;
        }
      }
    }

    // Validasi Take Away
    if (tipePesanan === 'Take Away') {
      if (!pelangganNama.trim()) {
        alert('Harap masukkan Nama Pelanggan untuk pesanan Take Away agar pesanan tidak tertukar!');
        return;
      }
    }

    // Validasi Delivery Order
    if (tipePesanan === 'Delivery Order') {
      if (!pelangganNama.trim()) {
        alert('Harap masukkan Nama Pelanggan untuk pesanan Delivery Order!');
        return;
      }
      if (!pelangganAlamat.trim()) {
        alert('Harap masukkan Alamat Pengiriman untuk pesanan Delivery Order!');
        return;
      }

      const distKm = parseDistanceKm(jarakKm);
      // Apabila jarak ≥ 1,5 km minimal harus belanja ≥ 10,000, jika kurang dari 10.000 maka DIBLOKIR
      if (distKm >= 1.499) {
        if (subtotalPesanan < 10000) {
          alert(
            `Pesanan Delivery DIBLOKIR!\n\nUntuk jarak pengiriman ≥ 1,5 km (${distKm} km), pelanggan WAJIB belanja minimal Rp 10.000.\n\nNama Pelanggan: ${pelangganNama}\nTotal Belanja Saat Ini: ${formatRupiah(subtotalPesanan)}\nKekurangan: ${formatRupiah(10000 - subtotalPesanan)}\n\nTransaksi diblokir dan tidak dapat diproses sampai minimal belanja terpenuhi.`
          );
          return;
        }

        // Apabila belanja < 20.000 kasih peringatan "Minimal biaya pesanan Rp 20,000"
        // Apabila pas Rp 20.000 atau lebih, transaksi otomatis BISA langsung dipesan
        if (subtotalPesanan < 20000) {
          if (!hasOtherCustomerDeliveryOrder) {
            const konfirmasiGabung = confirm(
              `Peringatan: Minimal biaya pesanan Rp 20,000\n\nPelanggan "${pelangganNama}" berbelanja ${formatRupiah(subtotalPesanan)} (kurang ${formatRupiah(20000 - subtotalPesanan)} untuk mencapai batas pas Rp 20.000).\n\nApakah ada pesanan pelanggan lain yang diantar bersamaan (ongkir per pelanggan Rp 3.500 s/d max 2 km)?\n\n- Klik [OK] jika ADA pesanan pelanggan lain (pesanan otomatis diproses).\n- Klik [Batal] jika ingin menambah belanja pelanggan hingga Rp 20.000 agar transaksi bisa langsung dipesan.`
            );
            if (!konfirmasiGabung) {
              return;
            }
            setGabungPesananLain(true);
          }
        }
      }
    }

    // 1. Calculate stock deductions based on Tipe Pesanan
    const currentBranchStock = { ...(stokCabang[currentCabang] || {}) };
    cart.forEach((cartItem) => {
      cartItem.resep.forEach((recipe) => {
        const bhn = bahanBakuList.find((b) => b.id === recipe.bahanId);
        const kat = bhn?.kategori || 'Bahan Makanan';

        // SYARAT MUTLAK:
        // - DINE IN: hanya kurangi stok bahan makanan dan minuman di cabang (JANGAN kurangi kemasan)
        if (tipePesanan === 'Dine In' && kat === 'Kemasan') {
          return; // Lewati pengurangan bahan kemasan
        }

        // - TAKE AWAY & DELIVERY ORDER: kurangi stok bahan makanan, minuman, dan kemasan
        const required = recipe.qtyPakai * cartItem.qty;
        const currentQty = currentBranchStock[recipe.bahanId] || 0;
        currentBranchStock[recipe.bahanId] = Math.max(0, currentQty - required);
      });

      // KURANGI BAHAN BAKU KEDUA MENU (Free Minuman jika ada promo free_minuman_id)
      if (cartItem.free_minuman_id) {
        const freeDrink = katalogList.find((k) => k.id === cartItem.free_minuman_id);
        if (freeDrink && freeDrink.resep && freeDrink.resep.length > 0) {
          freeDrink.resep.forEach((drinkRecipe) => {
            const drinkBhn = bahanBakuList.find((b) => b.id === drinkRecipe.bahanId);
            const drinkKat = drinkBhn?.kategori || 'Bahan Makanan';

            // Dine In tidak mengurangi kemasan
            if (tipePesanan === 'Dine In' && drinkKat === 'Kemasan') {
              return;
            }

            const requiredDrinkBahan = drinkRecipe.qtyPakai * cartItem.qty;
            const curDrinkQty = currentBranchStock[drinkRecipe.bahanId] || 0;
            currentBranchStock[drinkRecipe.bahanId] = Math.max(0, curDrinkQty - requiredDrinkBahan);
          });
        }
      }
    });

    // Jika Take Away atau Delivery Order, pastikan kemasan utama juga berkurang jika belum ada di resep menu
    if (tipePesanan !== 'Dine In') {
      const kemasanBowl = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('bowl')) || b.id === 'bhn-17'
      );
      const kemasanPlastik = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('plastik')) || b.id === 'bhn-18'
      );
      const kemasanCup = bahanBakuList.find(
        (b) => (b.kategori === 'Kemasan' && b.nama.toLowerCase().includes('cup')) || b.id === 'bhn-19'
      );

      cart.forEach((cartItem) => {
        const hasKemasanInResep = cartItem.resep.some((r) => {
          const b = bahanBakuList.find((bk) => bk.id === r.bahanId);
          return b?.kategori === 'Kemasan';
        });

        if (!hasKemasanInResep) {
          const isDrink =
            cartItem.nama.toLowerCase().includes('teh') ||
            cartItem.nama.toLowerCase().includes('jeruk') ||
            cartItem.kode.startsWith('MN');

          if (isDrink && kemasanCup) {
            const curC = currentBranchStock[kemasanCup.id] || 0;
            currentBranchStock[kemasanCup.id] = Math.max(0, curC - cartItem.qty);
          } else {
            if (kemasanBowl) {
              const curB = currentBranchStock[kemasanBowl.id] || 0;
              currentBranchStock[kemasanBowl.id] = Math.max(0, curB - cartItem.qty);
            }
            if (kemasanPlastik) {
              const curP = currentBranchStock[kemasanPlastik.id] || 0;
              currentBranchStock[kemasanPlastik.id] = Math.max(0, curP - 1);
            }
          }
        }
      });
    }

    // 2. Update branch stock
    const updatedStokMap: StokCabangMap = {
      ...stokCabang,
      [currentCabang]: currentBranchStock,
    };
    onUpdateStokCabang(updatedStokMap);

    // 3. Create Transaksi Record
    const assignedOrderNumber = generateNewOrderNumber();
    const assignedTakeAwayId =
      tipePesanan === 'Take Away' ? (takeAwayId.trim() || generateNewTakeAwayId()) : undefined;

    const newTrx: Transaksi = {
      id: 'trx-' + Date.now(),
      invoiceNo: generateInvoiceNo(currentBranchName || currentUser.cabang),
      cabang: currentBranchName || currentUser.cabang,
      tanggal: getTodayStr(),
      jam: getNowTimeStr(),
      kasirId: currentUser.id,
      kasirNama: currentUser.nama,
      kasirJabatan: currentUser.jabatan,
      kasirBertugas: currentUser.nama,
      items: [...cart],
      tipePesanan: tipePesanan,
      nomorPesanan: assignedOrderNumber,
      subtotalPesanan: subtotalPesanan,
      ongkir: ongkirVal,
      ...(nomorMeja.trim() ? { nomorMeja: nomorMeja.trim() } : {}),
      ...(pelangganNama.trim() ? { pelangganNama: pelangganNama.trim() } : {}),
      ...(pelangganTelepon.trim() ? { pelangganTelepon: pelangganTelepon.trim() } : {}),
      ...(tipePesanan === 'Delivery Order' && pelangganAlamat.trim()
        ? { pelangganAlamat: pelangganAlamat.trim() }
        : {}),
      ...(assignedTakeAwayId ? { takeAwayId: assignedTakeAwayId } : {}),
      ...(tipePesanan === 'Delivery Order' && jarakKm && parseDistanceKm(jarakKm) > 0
        ? { jarakKm: parseDistanceKm(jarakKm) }
        : {}),
      statusPesanan: 'MENUNGGU',
      statusPembayaran: mode === 'LUNAS' ? 'LUNAS' : 'BELUM BAYAR',
      total: totalTagihan,
      totalModal: totalModal,
      totalUntung: totalUntung,
      metodeBayar: metodeBayar,
      bayar: mode === 'LUNAS' ? effectiveBayar : 0,
      kembali: mode === 'LUNAS' ? kembalian : 0,
      status: 'Sukses',
    };

    onAddTransaksi(newTrx);

    // 4. Show success & clear cart & reset forms
    setShowPaymentSuccessModal(newTrx);
    setCart([]);
    setNominalBayar(0);
    setInputBayarText('');
    setNomorMeja('');
    setPelangganNama('');
    setPelangganTelepon('');
    setPelangganAlamat('');
    setTakeAwayId('');
    setJarakKm('');
    setBiayaPengiriman(0);
    setInputOngkirText('');
    setGabungPesananLain(false);
  };

  // Transaksi Riwayat for this branch dynamically resolved
  const riwayatList = transaksiList.filter((t) => {
    const tBranch = getBranchName(t.cabang, dataCabangList);
    return (
      tBranch === currentBranchName ||
      t.cabang === currentBranchName ||
      t.cabang === currentUser.cabang
    );
  });

  // Retur submit
  const handleConfirmRetur = () => {
    if (!returTarget || !alasanRetur.trim()) return;
    onReturTransaksi(returTarget.id, alasanRetur.trim());
    setReturTarget(null);
    setAlasanRetur('');
  };

  return (
    <div className="space-y-4">
      {/* Warning banner if not clocked in or store closed */}
      {(!isAbsenToday || !isTokoBuka) && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-900">
                Peringatan Operasional POS ({currentUser.cabang}):
              </p>
              <p className="text-amber-800">
                {!isAbsenToday && !isTokoBuka
                  ? 'Anda belum Absen Masuk dan Toko belum dibuka. Harap lakukan absensi terlebih dahulu.'
                  : !isAbsenToday
                  ? 'Anda belum melakukan Absen Masuk hari ini. Wajib absen tombol sebelum melayani.'
                  : 'Status Toko masih TUTUP. Harap buka toko & input modal awal laci terlebih dahulu.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isAbsenToday && (
              <button
                onClick={() => onNavigateToTab('absensi')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer transition"
              >
                Absen Masuk
              </button>
            )}
            {!isTokoBuka && (
              <button
                onClick={() => onNavigateToTab('bukaTutup')}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg cursor-pointer transition"
              >
                Buka Toko
              </button>
            )}
          </div>
        </div>
      )}

      {/* POS Sub Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('pos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'pos'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Terminal Kasir POS</span>
            {cart.length > 0 && (
              <span className="bg-white text-orange-600 font-extrabold px-1.5 py-0.2 rounded-full text-[10px]">
                {cart.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('riwayat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'riwayat'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Riwayat Transaksi & Retur</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({riwayatList.length})
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <Store className="w-3.5 h-3.5 text-orange-500" />
          <span>Kasir: <strong className="text-slate-800">{currentUser.nama}</strong></span>
        </div>
      </div>

      {activeSubTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: Menu Catalog Grid (Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search & Category Filter */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari menu seblak, topping, minuman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredKatalog.map((menu) => {
                const stockCheck = checkStockAvailability(menu);
                const inCart = cart.find((c) => c.katalogId === menu.id);

                return (
                  <div
                    key={menu.id}
                    onClick={() => addToCart(menu)}
                    className={`group bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-orange-500 hover:shadow-md transition cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.99] ${
                      !stockCheck.available ? 'opacity-70 bg-slate-50/80' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                            {menu.kode}
                          </span>
                          {menu.harga_promo && menu.harga_promo > 0 && menu.harga_promo < menu.hargaJual && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-600 text-white shadow-xs">
                              PROMO
                            </span>
                          )}
                          {menu.free_minuman && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-xs">
                              FREE + {menu.free_minuman}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {menu.kategori}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-orange-600 transition line-clamp-1">
                        {menu.nama}
                      </h4>
                      {menu.deskripsi && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {menu.deskripsi}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          HARGA MENU
                        </span>
                        {menu.harga_promo && menu.harga_promo > 0 && menu.harga_promo < menu.hargaJual ? (
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-400 line-through font-semibold">
                              {formatRupiah(menu.hargaJual)}
                            </span>
                            <span className="text-sm font-black text-red-600">
                              {formatRupiah(menu.harga_promo)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-black text-orange-600">
                            {formatRupiah(menu.hargaJual)}
                          </span>
                        )}
                        {menu.free_minuman && (
                          <span className="block text-[10px] font-bold text-amber-700">
                            + Free {menu.free_minuman}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!stockCheck.available ? (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                            Bahan Menipis
                          </span>
                        ) : inCart ? (
                          <span className="w-7 h-7 rounded-lg bg-orange-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            {inCart.qty}
                          </span>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-orange-100 group-hover:bg-orange-600 text-orange-700 group-hover:text-white flex items-center justify-center transition">
                            <Plus className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Cart & Checkout (Col 5) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Keranjang Pesanan ({totalItemCount})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* ORDER TYPE SELECTOR: DINE IN / TAKE AWAY / DELIVERY ORDER */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600">
                Tipe Layanan Pesanan:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTipePesanan('Dine In')}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition ${
                    tipePesanan === 'Dine In'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>DINE IN</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipePesanan('Take Away');
                    if (!takeAwayId) {
                      setTakeAwayId(generateNewTakeAwayId());
                    }
                  }}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition ${
                    tipePesanan === 'Take Away'
                      ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>TAKE AWAY</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipePesanan('Delivery Order');
                    if (metodeBayar === 'QRIS') {
                      setNominalBayar(subtotalPesanan + biayaPengiriman);
                    }
                  }}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition ${
                    tipePesanan === 'Delivery Order'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-400/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>DELIVERY</span>
                </button>
              </div>

              {/* Informative micro-badge on stock deduction rules */}
              <div className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                {tipePesanan === 'Dine In' && (
                  <span>🍽️ <b>Dine In:</b> Hanya memotong stok Bahan Makanan & Minuman (tanpa kemasan).</span>
                )}
                {tipePesanan === 'Take Away' && (
                  <span>🥡 <b>Take Away:</b> Memotong Bahan Makanan, Minuman, serta Kemasan (bowl/kantong).</span>
                )}
                {tipePesanan === 'Delivery Order' && (
                  <span>🛵 <b>Delivery:</b> Memotong Bahan Makanan, Minuman, Kemasan, plus ongkos kirim.</span>
                )}
              </div>
            </div>

            {/* DINE IN FORM FIELDS (NAMA PELANGGAN / MEJA MANUAL) */}
            {tipePesanan === 'Dine In' && (
              <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between font-black text-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <UtensilsCrossed className="w-4 h-4 text-orange-600" />
                    <span>Data Dine In (Makan di Tempat)</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    Input Manual
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      No. Meja
                    </label>
                    <input
                      type="text"
                      placeholder="Meja 01"
                      value={nomorMeja}
                      onChange={(e) => setNomorMeja(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 font-black text-center text-slate-800"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Nama Pelanggan (Opsional)
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Contoh: Kak Dinda"
                        value={pelangganNama}
                        onChange={(e) => setPelangganNama(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500">
                  *Nomor antrian pesanan otomatis dibuat & dicetak di struk kasir dan tiket dapur.
                </p>
              </div>
            )}

            {/* TAKE AWAY FORM FIELDS (ID TAKE AWAY & NAMA PELANGGAN AGAR TIDAK TERTUKAR) */}
            {tipePesanan === 'Take Away' && (
              <div className="p-3 bg-orange-50/90 border-2 border-orange-200 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between font-black text-orange-950 text-xs">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                    <span>Data Take Away (Bungkus)</span>
                  </div>
                  <span className="text-[10px] bg-orange-200/80 text-orange-900 px-2 py-0.5 rounded-full font-bold">
                    Cegah Tertukar
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      ID Take Away
                    </label>
                    <input
                      type="text"
                      value={takeAwayId}
                      onChange={(e) => setTakeAwayId(e.target.value.toUpperCase())}
                      placeholder="TA-01"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-orange-300 rounded-lg font-black text-orange-700 uppercase focus:outline-none focus:ring-1 focus:ring-orange-500 text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Nama Pelanggan (Input Manual) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Mas Andre / Kak Dinda"
                        value={pelangganNama}
                        onChange={(e) => setPelangganNama(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    No. WhatsApp / HP (Opsional)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="tel"
                      placeholder="Contoh: 0812-xxxx-xxxx"
                      value={pelangganTelepon}
                      onChange={(e) => setPelangganTelepon(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-orange-900 bg-orange-100/70 p-1.5 rounded-lg border border-orange-200/80">
                  💡 <b>Pemberitahuan:</b> ID Take Away & Nama Pelanggan wajib diisi agar pesanan tidak tertukar saat dimasak dan dipanggil.
                </p>
              </div>
            )}

            {/* DELIVERY ORDER FORM FIELDS (JARAK & BIAYA PENGIRIMAN OTOMATIS) */}
            {tipePesanan === 'Delivery Order' && (
              <div className="p-3 bg-blue-50/80 border-2 border-blue-200 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between font-black text-blue-900 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span>Informasi Pengiriman (Delivery Order)</span>
                  </div>
                  <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                    Hitung Otomatis
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Nama Pelanggan / Penerima (Input Manual) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ibu Rina / Pak Hendro"
                      value={pelangganNama}
                      onChange={(e) => setPelangganNama(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Nomor WhatsApp / Telepon <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="tel"
                      placeholder="Contoh: 0812-9876-5432"
                      value={pelangganTelepon}
                      onChange={(e) => setPelangganTelepon(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    Alamat Pengiriman Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <textarea
                      required
                      rows={2}
                      placeholder="Contoh: Perum Griya Asri Blok C2 No. 15, samping Masjid Al-Hidayah"
                      value={pelangganAlamat}
                      onChange={(e) => setPelangganAlamat(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* HITUNG ONGKIR OTOMATIS BERDASARKAN JARAK */}
                <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Jarak Pengiriman (km / meter)</span>
                    </label>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      ≤ 200m: Gratis | ≤ 500m: 2rb | ≤ 1km: 2,5rb | ≤ 1,5km: 3rb | ≤ 2km: 3,5rb (+500/500m)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-32">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Misal: 1.5"
                        value={jarakKm}
                        onChange={(e) => handleJarakChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-blue-50/60 border border-blue-300 rounded-lg font-black text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                      {parsedDistKm > 0 && parsedDistKm < 1 ? `KM (${Math.round(parsedDistKm * 1000)} m)` : 'KM'}
                    </span>

                    <div className="flex-1 flex gap-1 justify-end flex-wrap">
                      {[
                        { label: '≤ 200 m (Gratis)', val: '0.2' },
                        { label: '500 m (Rp 2rb)', val: '0.5' },
                        { label: '1 km (Rp 2,5rb)', val: '1' },
                        { label: '1.5 km (Rp 3rb)', val: '1.5' },
                        { label: '2 km (Rp 3,5rb)', val: '2' },
                        { label: '2.5 km (Rp 4rb)', val: '2.5' },
                        { label: '3 km (Rp 4,5rb)', val: '3' },
                        { label: '4 km (Rp 5,5rb)', val: '4' },
                      ].map((chip) => (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => handleJarakChange(chip.val)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                            jarakKm === chip.val
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ringkasan Tier Biaya Pengiriman */}
                  {parsedDistKm > 0 && (
                    <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-center justify-between">
                      <span className="font-semibold">
                        {parsedDistKm <= 0.2001 && 'Jarak ≤ 200 meter: Gratis Ongkir'}
                        {parsedDistKm > 0.2001 && parsedDistKm <= 0.5001 && 'Jarak 200 m s/d 500 m: Ongkir Rp 2.000'}
                        {parsedDistKm > 0.5001 && parsedDistKm <= 1.0001 && 'Jarak 500 m s/d 1 km: Ongkir Rp 2.500'}
                        {parsedDistKm > 1.0001 && parsedDistKm <= 1.5001 && 'Jarak 1 km s/d 1,5 km: Ongkir Rp 3.000'}
                        {parsedDistKm > 1.5001 && parsedDistKm <= 2.0001 && 'Jarak 1,5 km s/d 2 km: Ongkir Rp 3.500 (per pelanggan)'}
                        {parsedDistKm > 2.0001 && `Jarak ${parsedDistKm} km: Ongkir Rp 3.500 + ${Math.ceil((parsedDistKm - 2.0)/0.5) * 500} (+Rp 500/500m)`}
                      </span>
                      <span className="font-black text-blue-700">
                        {biayaPengiriman === 0 ? 'GRATIS' : formatRupiah(biayaPengiriman)}
                      </span>
                    </div>
                  )}

                  {/* Validasi & Peringatan Khusus Jarak ≥ 1,5 km */}
                  {isJarakDiatas15 && (
                    <div className="space-y-2 pt-1 border-t border-blue-100">
                      {/* Peringatan & Blokir jika belanja < 10.000 */}
                      {subtotalPesanan < 10000 && cart.length > 0 && (
                        <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-red-800 text-[11px] flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-black text-red-900">
                              ⛔ Transaksi Diblokir: Minimal Belanja Rp 10.000
                            </p>
                            <p className="text-[10px] text-red-700 leading-relaxed">
                              Untuk pengiriman jarak ≥ 1,5 km, pesanan kurang dari <b>Rp 10.000</b> diblokir. Belanja <b>{pelangganNama || 'Pelanggan'}</b> saat ini: <b>{formatRupiah(subtotalPesanan)}</b> (kurang {formatRupiah(10000 - subtotalPesanan)}). Harap tambahkan menu ke keranjang.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Peringatan jika belanja < 20.000 (10.000 s/d 19.999) */}
                      {subtotalPesanan >= 10000 && subtotalPesanan < 20000 && (
                        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[11px] space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-black text-amber-900 text-xs">
                                Peringatan: Minimal biaya pesanan Rp 20,000
                              </p>
                              <p className="text-[10px] text-amber-800">
                                Pelanggan <b>{pelangganNama || '-'}</b> berbelanja <b>{formatRupiah(subtotalPesanan)}</b> (kurang {formatRupiah(20000 - subtotalPesanan)} untuk mencapai pas Rp 20.000).
                              </p>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-amber-200 space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-[11px] text-amber-950">
                              <input
                                type="checkbox"
                                checked={gabungPesananLain || activeDeliveryOrdersToday.length > 0}
                                onChange={(e) => setGabungPesananLain(e.target.checked)}
                                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                              />
                              <span>Ada pesanan pelanggan lain (Antar bersamaan / searah)</span>
                            </label>

                            {hasOtherCustomerDeliveryOrder ? (
                              <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-lg text-[10px] text-emerald-900 font-semibold space-y-0.5">
                                <p className="font-bold flex items-center gap-1 text-emerald-800">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Otomatis BISA untuk transaksi!</span>
                                </p>
                                <p className="leading-relaxed">
                                  Karena ada pesanan pelanggan lain{activeDeliveryOrdersToday.length > 0 ? ` (${activeDeliveryOrdersToday.map(o => o.pelangganNama || o.nomorPesanan).join(', ')})` : ''}, pesanan belanja di bawah Rp 20.000 otomatis dapat diproses dengan biaya pengiriman per pelanggan <b>Rp 3.500</b> (jarak sampai max 2 km).
                                </p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-amber-700 italic">
                                *Jika belanja pas Rp 20.000, transaksi bisa langsung dipesan. Atau centang kotak di atas jika ada pesanan pelanggan lain untuk diantar bersamaan.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Info jika belanja pas Rp 20.000 atau lebih */}
                      {subtotalPesanan >= 20000 && (
                        <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-[11px] flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                            <span>Pesanan pas / lebih dari Rp 20.000: Transaksi BISA langsung dipesan!</span>
                          </span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                            {formatRupiah(subtotalPesanan)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        Biaya Pengiriman (Ongkir Otomatis)
                      </label>
                      <span className="text-[10px] text-slate-400 italic">Bisa diubah manual</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-blue-600">Rp</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        placeholder="0"
                        value={inputOngkirText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInputOngkirText(val);
                          const num = Number(val) || 0;
                          setBiayaPengiriman(num);
                          if (metodeBayar === 'QRIS') {
                            setNominalBayar(subtotalPesanan + num);
                          }
                        }}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-black text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Keranjang masih kosong.</p>
                <p className="text-[11px] text-slate-400">
                  Klik menu di sebelah kiri untuk menambahkan.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.katalogId}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span>{item.nama}</span>
                          {item.harga_promo && item.hargaAsli && item.harga_promo < item.hargaAsli && (
                            <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                              PROMO
                            </span>
                          )}
                          {item.free_minuman && (
                            <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-xs">
                              FREE + {item.free_minuman}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          {item.hargaAsli && item.harga_promo && item.harga_promo < item.hargaAsli && (
                            <span className="line-through text-slate-400 text-[10px]">
                              {formatRupiah(item.hargaAsli)}
                            </span>
                          )}
                          <span className={item.harga_promo && item.hargaAsli && item.harga_promo < item.hargaAsli ? "text-red-600 font-bold" : ""}>
                            {formatRupiah(item.harga)} / porsi
                          </span>
                        </div>
                      </div>
                      <span className="font-extrabold text-orange-700">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>

                    {/* Level Pedas selector if seblak */}
                    {item.levelPedas !== undefined && (
                      <div className="space-y-1">
                        <span className="text-slate-500 font-bold text-[10px] flex items-center gap-1">
                          <Flame className="w-3 h-3 text-red-500" />
                          Level Pedas:
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {LEVEL_PEDAS_OPTIONS.map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() =>
                                updateCartItemNotes(item.katalogId, 'levelPedas', lvl)
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                                item.levelPedas === lvl
                                  ? 'bg-red-600 text-white shadow-xs ring-1 ring-red-400'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity controls & item note */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <input
                        type="text"
                        placeholder="Catatan porsi (misal: tanpa sawi)..."
                        value={item.catatan || ''}
                        onChange={(e) =>
                          updateCartItemNotes(item.katalogId, 'catatan', e.target.value)
                        }
                        className="text-[11px] bg-white border border-slate-200 rounded px-2 py-0.5 w-3/5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.katalogId, -1)}
                          className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-extrabold w-5 text-center">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.katalogId, 1)}
                          className="w-6 h-6 rounded bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center font-bold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.katalogId)}
                          className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Summary */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Item Menu</span>
                <span className="font-bold text-slate-700">{totalItemCount} porsi</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Subtotal Menu</span>
                <span className="font-bold text-slate-700">{formatRupiah(subtotalPesanan)}</span>
              </div>
              {tipePesanan === 'Delivery Order' && (
                <div className="flex justify-between text-blue-700 font-bold bg-blue-50/50 px-2 py-1 rounded">
                  <span>Biaya Pengiriman (Ongkir)</span>
                  <span>{formatRupiah(ongkirVal)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black pt-1 border-t border-slate-100">
                <span className="text-slate-800">TOTAL BAYAR</span>
                <span className="text-xl text-orange-600">
                  {formatRupiah(totalTagihan)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMetodeBayar('Cash');
                      setNominalBayar(0);
                      setInputBayarText('');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      metodeBayar === 'Cash'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>TUNAI (CASH)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMetodeBayar('QRIS');
                      setNominalBayar(totalTagihan);
                      setInputBayarText(totalTagihan.toString());
                      setShowQrisModal(true);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      metodeBayar === 'QRIS'
                        ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-400/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRIS TELAGA</span>
                  </button>
                </div>

                {metodeBayar === 'Cash' && (
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Uang Tunai Diterima:
                      </label>
                      <input
                        type="number"
                        placeholder="Contoh: 50000"
                        value={inputBayarText}
                        onChange={(e) => {
                          setInputBayarText(e.target.value);
                          setNominalBayar(Number(e.target.value) || 0);
                        }}
                        className="w-full px-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* Quick nominal buttons */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetQuickCash(totalTagihan)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 cursor-pointer"
                      >
                        Uang Pas
                      </button>
                      {[20000, 50000, 100000, 200000].map((nom) => (
                        <button
                          key={nom}
                          type="button"
                          onClick={() => handleSetQuickCash(nom)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          {nom >= 1000 ? `${nom / 1000}k` : nom}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-600">Kembalian:</span>
                      <span
                        className={`text-sm font-extrabold ${
                          kembalian >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {formatRupiah(kembalian)}
                      </span>
                    </div>
                  </div>
                )}

                {metodeBayar === 'QRIS' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-900 block">
                        Pembayaran QRIS Telaga
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        Otomatis nominal pas: {formatRupiah(totalTagihan)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrisModal(true)}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Tampilkan QR
                    </button>
                  </div>
                )}

                {isBelanjaKurang10k && (
                  <div className="p-2.5 bg-red-100 border border-red-300 rounded-xl text-red-900 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>⛔ Pesanan Diblokir: Minimal belanja Rp 10.000 untuk jarak pengiriman ≥ 1,5 km (Belanja: {formatRupiah(subtotalPesanan)})</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* Tombol Buat Pesanan (Belum Bayar - tidak perlu input uang diterima) */}
                  <button
                    type="button"
                    disabled={isBelanjaKurang10k || cart.length === 0}
                    onClick={() => handleProcessPayment('BELUM_BAYAR')}
                    className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shadow-md ${
                      !isBelanjaKurang10k && cart.length > 0
                        ? 'bg-slate-800 hover:bg-slate-900 text-white active:scale-95 shadow-slate-900/20'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                    title="Buat pesanan tanpa input uang (pembayaran dilakukan nanti)"
                  >
                    <div className="flex items-center gap-1.5 font-black">
                      <UtensilsCrossed className="w-4 h-4 text-orange-400" />
                      <span>Buat Pesanan</span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-normal">
                      (Belum Bayar)
                    </span>
                  </button>

                  {/* Tombol Bayar (Langsung Lunas - kasir wajib input uang yang diterima) */}
                  <button
                    type="button"
                    disabled={isBelanjaKurang10k || cart.length === 0}
                    onClick={() => handleProcessPayment('LUNAS')}
                    className={`py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer transition shadow-md ${
                      !isBelanjaKurang10k && cart.length > 0
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                    title="Pelanggan langsung bayar sekarang (wajib isi nominal uang diterima)"
                  >
                    <div className="flex items-center gap-1.5 font-black">
                      <Wallet className="w-4 h-4 text-white" />
                      <span>Bayar</span>
                    </div>
                    <span className="text-[10px] text-emerald-100 font-normal">
                      (Langsung Lunas)
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB: RIWAYAT TRANSAKSI & RETUR */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-800 text-base">
                Riwayat Transaksi POS ({currentUser.cabang})
              </h3>
              <p className="text-xs text-slate-500">
                Daftar semua transaksi yang tercatat di cabang ini. Tersedia Cetak Ulang Struk dan Retur.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-600">
              Total {riwayatList.length} Transaksi
            </span>
          </div>

          {riwayatList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada riwayat transaksi pada cabang ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-3">No. Invoice</th>
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Kasir</th>
                    <th className="py-2.5 px-3">Rincian Menu</th>
                    <th className="py-2.5 px-3">Metode</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riwayatList.slice().reverse().map((trx) => (
                    <tr key={trx.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {trx.invoiceNo}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <div>{trx.tanggal}</div>
                        <div className="text-[10px] text-slate-400">{trx.jam}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">
                        {trx.kasirNama}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs">
                        <div className="space-y-0.5">
                          {trx.items.map((item, idx) => (
                            <div key={idx} className="text-[11px]">
                              {item.qty}x {item.nama}
                              {item.levelPedas !== undefined && (
                                <span className="text-red-600 ml-1 font-bold">
                                  ({item.levelPedas})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trx.metodeBayar === 'QRIS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {trx.metodeBayar}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-800">
                        {formatRupiah(trx.total)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            trx.status === 'Sukses'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {trx.status}
                        </span>
                        {trx.status === 'Retur' && trx.alasanRetur && (
                          <div className="text-[10px] text-rose-600 italic mt-0.5">
                            "{trx.alasanRetur}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenPrintModal('struk', trx)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-700 transition cursor-pointer"
                            title="Cetak Ulang Struk Kasir 58mm"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {trx.status === 'Sukses' && (
                            <button
                              type="button"
                              onClick={() => {
                                setReturTarget(trx);
                                setAlasanRetur('');
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                              title="Retur Transaksi (Kembalikan Stok Cabang)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Payment Success & Print Prompt */}
      {showPaymentSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-800">
                Pesanan Berhasil Dibuat!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {showPaymentSuccessModal.invoiceNo}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-left">
              <div className="flex justify-between text-slate-600 font-bold pb-1 border-b border-slate-200">
                <span>Tipe Layanan:</span>
                <span className="text-orange-600 uppercase font-black">
                  {showPaymentSuccessModal.tipePesanan || 'Dine In'}
                </span>
              </div>

              {/* Nomor Pesanan Otomatis (Masuk ke Struk & Tiket Dapur) */}
              <div className="p-2 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-300 rounded-lg flex items-center justify-between text-xs">
                <span className="text-orange-950 font-bold flex items-center gap-1">
                  <span>Nomor Antrian / Pesanan:</span>
                </span>
                <span className="bg-orange-600 text-white font-black text-sm px-2.5 py-0.5 rounded-lg shadow-xs">
                  {showPaymentSuccessModal.nomorPesanan || '-'}
                </span>
              </div>

              {/* Nama Pelanggan (Semua Tipe Layanan) */}
              {showPaymentSuccessModal.pelangganNama && showPaymentSuccessModal.tipePesanan === 'Dine In' && (
                <div className="flex justify-between text-slate-700 text-xs">
                  <span className="font-semibold">Nama / Meja:</span>
                  <span className="font-bold text-slate-900">{showPaymentSuccessModal.pelangganNama}</span>
                </div>
              )}

              {/* Status Pesanan Realtime */}
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-amber-800 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Status Pesanan:
                </span>
                <span className="bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                  ⏳ Menunggu (Antrian Dapur)
                </span>
              </div>

              {/* Status Pembayaran */}
              <div
                className={`p-2 rounded-lg flex items-center justify-between text-xs font-bold border ${
                  showPaymentSuccessModal.statusPembayaran === 'LUNAS'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Status Pembayaran:</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    showPaymentSuccessModal.statusPembayaran === 'LUNAS'
                      ? 'bg-emerald-200 text-emerald-950'
                      : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {showPaymentSuccessModal.statusPembayaran === 'LUNAS'
                    ? `LUNAS (${showPaymentSuccessModal.metodeBayar})`
                    : 'BELUM BAYAR (Bayar Nanti)'}
                </span>
              </div>

              {/* Take Away Details */}
              {showPaymentSuccessModal.tipePesanan === 'Take Away' && (
                <div className="p-2.5 bg-orange-50/90 border border-orange-200 rounded-lg space-y-1 text-[11px] text-orange-950">
                  <div className="font-extrabold flex items-center justify-between text-orange-900">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                      <span>ID Take Away:</span>
                    </span>
                    <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-black">
                      {showPaymentSuccessModal.takeAwayId || '-'}
                    </span>
                  </div>
                  <div><b>Nama Pelanggan:</b> {showPaymentSuccessModal.pelangganNama || '-'}</div>
                  {showPaymentSuccessModal.pelangganTelepon && (
                    <div><b>Telepon:</b> {showPaymentSuccessModal.pelangganTelepon}</div>
                  )}
                </div>
              )}

              {/* Delivery Order Details */}
              {showPaymentSuccessModal.tipePesanan === 'Delivery Order' && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1 text-[11px] text-blue-900">
                  <div className="font-extrabold flex items-center gap-1 text-blue-800">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Data Pengiriman:</span>
                  </div>
                  <div><b>Penerima:</b> {showPaymentSuccessModal.pelangganNama || '-'}</div>
                  {showPaymentSuccessModal.pelangganTelepon && (
                    <div><b>Telepon:</b> {showPaymentSuccessModal.pelangganTelepon}</div>
                  )}
                  <div><b>Alamat:</b> {showPaymentSuccessModal.pelangganAlamat || '-'}</div>
                  {showPaymentSuccessModal.jarakKm !== undefined && (
                    <div>
                      <b>Jarak:</b>{' '}
                      {showPaymentSuccessModal.jarakKm < 1
                        ? `${showPaymentSuccessModal.jarakKm} km (${Math.round(showPaymentSuccessModal.jarakKm * 1000)} m)`
                        : `${showPaymentSuccessModal.jarakKm} km`}
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-blue-200/60 font-semibold">
                    <span>Biaya Pengiriman (Ongkir):</span>
                    <span className="font-bold text-blue-700">
                      {showPaymentSuccessModal.ongkir === 0 ? 'GRATIS' : formatRupiah(showPaymentSuccessModal.ongkir || 0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>Subtotal Menu:</span>
                <span className="font-semibold text-slate-700">
                  {formatRupiah(
                    showPaymentSuccessModal.subtotalPesanan ||
                    (showPaymentSuccessModal.total - (showPaymentSuccessModal.ongkir || 0))
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-800 font-black text-sm pt-1 border-t border-slate-200">
                <span>TOTAL TRANSAKSI:</span>
                <span className="text-orange-600 font-extrabold">
                  {formatRupiah(showPaymentSuccessModal.total)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Metode Bayar:</span>
                <span className="font-bold text-slate-800">
                  {showPaymentSuccessModal.metodeBayar}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Uang Diterima:</span>
                <span className="font-bold text-slate-800">
                  {formatRupiah(showPaymentSuccessModal.bayar)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-xs">
                <span className="text-slate-800">Kembalian:</span>
                <span className="text-emerald-600 font-black">
                  {formatRupiah(showPaymentSuccessModal.kembali)}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              {showPaymentSuccessModal.tipePesanan === 'Dine In'
                ? '*Stok Bahan Makanan & Minuman cabang telah berkurang otomatis.'
                : '*Stok Bahan Makanan, Minuman, serta Kemasan cabang telah berkurang otomatis.'}
            </p>

            <div className="flex flex-col gap-2 pt-1">
              {/* Direct Bluetooth Receipt Print Button */}
              <button
                type="button"
                disabled={isBluetoothPrinting}
                onClick={async () => {
                  setIsBluetoothPrinting(true);
                  const branchInfo = dataCabangList.find(
                    (c) => c.nama.toLowerCase() === showPaymentSuccessModal.cabang.toLowerCase()
                  );
                  const res = await printReceiptViaBluetooth(showPaymentSuccessModal, branchInfo);
                  setIsBluetoothPrinting(false);
                  if (res.success) {
                    alert('Struk berhasil dicetak ke Printer Bluetooth!');
                  } else {
                    // Jika belum berhasil konek bluetooth atau user cancel, buka modal print
                    if (confirm(`Koneksi Bluetooth: ${res.error || 'Belum terhubung'}. Buka jendela opsi cetak struk lengkap?`)) {
                      const target = showPaymentSuccessModal;
                      setShowPaymentSuccessModal(null);
                      onOpenPrintModal('struk', target);
                    }
                  }
                }}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition disabled:opacity-50"
              >
                <Bluetooth className="w-4 h-4" />
                <span>{isBluetoothPrinting ? 'Mencetak ke Bluetooth...' : 'Cetak Struk via Bluetooth'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = showPaymentSuccessModal;
                    setShowPaymentSuccessModal(null);
                    onOpenPrintModal('tiketDapur', target);
                  }}
                  className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Tiket Dapur</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = showPaymentSuccessModal;
                    setShowPaymentSuccessModal(null);
                    onOpenPrintModal('struk', target);
                  }}
                  className="py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Struk Kasir</span>
                </button>
              </div>

              <div className="flex gap-2">
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentSuccessModal(null);
                      onNavigateToTab('pesanan');
                    }}
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                  >
                    <span>Buka Menu Pesanan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPaymentSuccessModal(null)}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition"
                >
                  Pesanan Baru
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QRIS Display */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-slate-800 text-sm">QRIS Seblak Telaga</h3>
              <button
                type="button"
                onClick={() => setShowQrisModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
              <div className="w-48 h-48 bg-white p-2 rounded-lg border-2 border-dashed border-orange-300 flex flex-col items-center justify-center">
                <QrCode className="w-36 h-36 text-slate-800" />
                <span className="text-[10px] font-bold text-slate-500 mt-1">
                  NMID: ID1029384758
                </span>
              </div>
              <div className="mt-3 text-xs">
                <span className="text-slate-500">Total Pembayaran:</span>
                <span className="font-black text-orange-600 text-base block">
                  {formatRupiah(totalTagihan)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowQrisModal(false);
                setNominalBayar(totalTagihan);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Konfirmasi Pelanggan Selesai Scan</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Retur Transaksi Confirmation */}
      {returTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-black text-slate-800 text-base">
                Retur Transaksi {returTarget.invoiceNo}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan membatalkan transaksi dan <strong>mengembalikan seluruh stok bahan baku</strong> cabang ini sesuai resep yang dibeli.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Retur / Pembatalan <span className="text-rose-500">*</span>:
              </label>
              <textarea
                required
                rows={3}
                placeholder="Contoh: Salah input pesanan / pelanggan membatalkan..."
                value={alasanRetur}
                onChange={(e) => setAlasanRetur(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setReturTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!alasanRetur.trim()}
                onClick={handleConfirmRetur}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs"
              >
                Konfirmasi Retur & Kembalikan Stok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
