import React from 'react';
import {
  LogOut,
  Store,
  User,
  Shield,
  Clock,
  Truck,
  Inbox,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { Karyawan, Cabang, ActiveTab, SuratJalan, PermintaanBarang, PengeluaranToko, DataCabang, AppSettings } from '../types';
import { getBranchName } from '../utils/branchHelper';
import { DEFAULT_APP_SETTINGS, DEFAULT_LOGO_URL } from '../utils/theme';

interface NavbarProps {
  currentUser: Karyawan | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onLogout: () => void;
  suratJalanList: SuratJalan[];
  permintaanList: PermintaanBarang[];
  pengeluaranList?: PengeluaranToko[];
  dataCabangList?: DataCabang[];
  activeOrdersCount?: number;
  appSettings?: AppSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  suratJalanList,
  permintaanList,
  pengeluaranList = [],
  dataCabangList = [],
  activeOrdersCount = 0,
  appSettings,
}) => {
  if (!currentUser) return null;
  const brandName = (appSettings?.namaUsaha || DEFAULT_APP_SETTINGS.namaUsaha).trim() || DEFAULT_APP_SETTINGS.namaUsaha;
  const brandLogoUrl = appSettings?.logoUrl || DEFAULT_LOGO_URL;

  const isOwner = currentUser.jabatan === 'Owner';
  const isAdminDc = currentUser.jabatan === 'Admin DC Pusat' || currentUser.jabatan === 'Admin';
  const isSupervisorArea = currentUser.jabatan === 'Supervisor Area';
  const isCrewStore = currentUser.jabatan === 'Crew Store' || (currentUser.jabatan as string) === 'CREW STORE';
  const isKitchen = currentUser.jabatan === 'Kitchen' || (currentUser.jabatan as string) === 'KITCHEN';
  const isDriver = currentUser.jabatan === 'Driver';
  const isDcPusat = currentUser.cabang === 'DC PUSAT' || isOwner || isAdminDc;

  // Count incoming delivery for current branch
  const incomingShipments = suratJalanList.filter(
    (sj) => sj.cabangTujuan === currentUser.cabang && (sj.status === 'Dikirim' || sj.status === 'Terkirim')
  ).length;

  // Count pending requests at DC
  const pendingRequests = permintaanList.filter(
    (p) => p.status === 'Menunggu'
  ).length;

  // Count pending pengeluaran needing ACC at DC
  const pendingExpenses = pengeluaranList.filter(
    (p) => p.status === 'Menunggu ACC'
  ).length;

  // Count active driver deliveries
  const activeDriverShipments = suratJalanList.filter(
    (sj) => sj.status === 'Dikirim' || sj.status === 'Terkirim'
  ).length;

  // Role-based NavItems builder
  let visibleNavItems: { id: ActiveTab; label: string; badge?: number }[] = [];

  // Jabatan Kitchen & Crew Store: Muncul Menu Pesanan serta Absensi
  if (isKitchen || isCrewStore) {
    visibleNavItems = [
      {
        id: 'pesanan',
        label: 'Menu Pesanan',
        badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      },
      { id: 'absensi', label: 'Absensi' },
    ];
  }
  // REQUIREMENT 8: Jabatan Driver hanya muncul Absensi & Pengiriman Barang
  else if (isDriver) {
    visibleNavItems = [
      { id: 'absensi', label: 'Absensi' },
      { id: 'pengirimanDriver', label: 'Pengiriman Barang', badge: activeDriverShipments > 0 ? activeDriverShipments : undefined },
    ];
  }
  // Regular and Management Roles
  else {
    const allItems: {
      id: ActiveTab;
      label: string;
      ownerOnly?: boolean;
      dcOnly?: boolean;
      branchOnly?: boolean;
      badge?: number;
    }[] = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'pos', label: 'POS Kasir', branchOnly: !isSupervisorArea },
      {
        id: 'pesanan',
        label: 'Menu Pesanan',
        badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      },
      { id: 'katalog', label: 'Katalog Menu' },
      {
        id: 'pengeluaran',
        label: 'Pengeluaran Toko',
        badge: isDcPusat && pendingExpenses > 0 ? pendingExpenses : undefined,
      },
      { id: 'bahanBaku', label: 'Bahan Baku & DC', dcOnly: true },
      { id: 'stokCabang', label: 'Permintaan & Stok Cabang' },
      { id: 'suratJalan', label: 'Surat Jalan DC', dcOnly: true, badge: pendingRequests },
      { id: 'terimaBarang', label: 'Terima Barang', branchOnly: !isSupervisorArea, badge: incomingShipments },
      { id: 'absensi', label: 'Absensi' },
      { id: 'bukaTutup', label: 'Buka / Tutup Toko' },
      { id: 'dataCabang', label: 'Data Cabang', dcOnly: true },
      { id: 'karyawan', label: 'Data Karyawan', dcOnly: true }, // REQUIREMENT 5: Ubah jadi Data Karyawan
      { id: 'dataOwner', label: 'Data Owner & NIB', ownerOnly: true }, // REQUIREMENT 2: Menu terpisah khusus Owner
      { id: 'laporan', label: 'Laporan & Print' },
      { id: 'pengaturan', label: 'Pengaturan', dcOnly: true },
    ];

    visibleNavItems = allItems.filter((item) => {
      // Owner only menu
      if (item.ownerOnly && !isOwner) return false;

      // DC only menu (Owner & Admin DC Pusat)
      if (item.dcOnly && !isDcPusat) return false;

      // Branch only menu: Visible for branch staff and Supervisor Area
      if (item.branchOnly && isDcPusat && !isSupervisorArea) return false;

      return true;
    });
  }

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-orange-100 dark:border-slate-800 shadow-sm no-print transition-colors">
      {/* Top Banner */}
      <div className="brand-gradient text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold tracking-wide">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white shadow-xs p-0.5 shrink-0 overflow-hidden">
              <img
                src={brandLogoUrl}
                alt={`Logo ${brandName}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </span>
            <span className="text-sm">MY KASIR POS {brandName.toUpperCase()}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase">
              Multi-Cabang POS
            </span>
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-400/30 px-2 py-0.5 rounded text-[10px] text-emerald-200" title="Firestore Realtime Aktif: Sinkronisasi data otomatis ke semua HP">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold">Firestore Realtime</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md">
              <Store className="w-3.5 h-3.5 text-amber-200" />
              <span className="font-semibold text-amber-100">Tugas:</span>
              <span className="font-bold underline decoration-amber-300 decoration-2">
                {getBranchName(currentUser.cabang, dataCabangList)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md">
              {currentUser.jabatan === 'Owner' ? (
                <Shield className="w-3.5 h-3.5 text-yellow-300 fill-yellow-400" />
              ) : currentUser.jabatan === 'Admin DC Pusat' || currentUser.jabatan === 'Admin' ? (
                <Shield className="w-3.5 h-3.5 text-red-300" />
              ) : currentUser.jabatan === 'Supervisor Area' ? (
                <Shield className="w-3.5 h-3.5 text-indigo-300" />
              ) : (
                <User className="w-3.5 h-3.5 text-sky-300" />
              )}
              <span className="font-semibold">{currentUser.nama}</span>
              <span className="text-white/70">({currentUser.jabatan})</span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 bg-red-800 hover:bg-red-900 text-white px-2.5 py-1 rounded-md font-semibold transition cursor-pointer shadow-sm active:scale-95"
              title="Logout dan Ganti Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'brand-tab-active'
                    : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-slate-900'
                        : 'bg-red-500 text-white animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
