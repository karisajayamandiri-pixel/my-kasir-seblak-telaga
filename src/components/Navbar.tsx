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

  const jabatanNorm = (currentUser.jabatan || '').trim().toLowerCase();
  const isOwner = jabatanNorm === 'owner';
  const isAdminDc = jabatanNorm === 'admin dc pusat' || jabatanNorm === 'admin';
  const isSupervisorArea = jabatanNorm === 'supervisor area';
  const isCrewStore = jabatanNorm === 'crew store';
  const isKitchen = jabatanNorm === 'kitchen';
  const isDriver = jabatanNorm === 'driver';
  const userBranchName = getBranchName(currentUser.cabang, dataCabangList);
  const isDcPusat = userBranchName === 'DC PUSAT' || (currentUser.cabang || '').trim().toUpperCase() === 'DC PUSAT' || isOwner || isAdminDc;

  // Count incoming delivery for current branch
  const incomingShipments = suratJalanList.filter(
    (sj) => getBranchName(sj.cabangTujuan, dataCabangList) === userBranchName && (sj.status === 'Dikirim' || sj.status === 'Terkirim')
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
      <div className="brand-gradient text-white px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-bold tracking-wide min-w-0">
            <img
              src={brandLogoUrl}
              alt={`Logo ${brandName}`}
              referrerPolicy="no-referrer"
              className="w-9 h-9 object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.38)]"
            />
            <span className="text-sm sm:text-base font-black tracking-wide whitespace-nowrap">
              MY KASIR POS {brandName.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0">
              <Store className="w-3.5 h-3.5 text-amber-200 shrink-0" />
              <span className="font-semibold text-amber-100">Tugas:</span>
              <span className="font-bold underline decoration-amber-300 decoration-2">
                {userBranchName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0">
              {isOwner ? (
                <Shield className="w-3.5 h-3.5 text-yellow-300 fill-yellow-400 shrink-0" />
              ) : isAdminDc ? (
                <Shield className="w-3.5 h-3.5 text-red-300 shrink-0" />
              ) : isSupervisorArea ? (
                <Shield className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              ) : (
                <User className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              )}
              <span className="font-semibold">{currentUser.nama}</span>
              <span className="text-white/80">({currentUser.jabatan})</span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-red-800 hover:bg-red-900 text-white px-3 py-1.5 rounded-lg font-bold transition cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              title="Logout dan Ganti Akun"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
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
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'brand-tab-active'
                    : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                      isActive
                        ? 'bg-white text-slate-900'
                        : 'bg-red-600 text-white'
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
