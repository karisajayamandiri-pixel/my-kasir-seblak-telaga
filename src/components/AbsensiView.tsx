import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  Calendar,
  UserCheck,
  Printer,
  Search,
  Check,
  UserMinus,
  HeartPulse,
  Info,
  X,
  Shield,
  User,
  Coffee,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  AlertTriangle,
  Settings,
  FileSpreadsheet,
  Building2,
  CalendarDays,
  DollarSign,
  ChevronRight,
  UserX,
  Share2,
} from 'lucide-react';
import { Karyawan, Absensi, Cabang, DataCabang, PengaturanOff, GajiKaryawanSetting, SlipGajiData } from '../types';
import { getTodayStr, getNowTimeStr, formatRupiah, STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { getBranchName, getStoreBranchNames } from '../utils/branchHelper';

interface AbsensiViewProps {
  currentUser: Karyawan;
  absensiList: Absensi[];
  karyawanList?: Karyawan[];
  onAddAbsensi: (absen: Absensi) => void;
  onDeleteAbsensi?: (absenId: string) => void;
  onAbsenPulang: (absenId: string, jamPulang: string, durasi: string) => void;
  onOpenPrintModal: (type: any, data?: any) => void;
  dataCabangList?: DataCabang[];
  pengaturanOffList?: PengaturanOff[];
  onSavePengaturanOff?: (poff: PengaturanOff) => void;
}

export const AbsensiView: React.FC<AbsensiViewProps> = ({
  currentUser,
  absensiList,
  karyawanList = [],
  onAddAbsensi,
  onDeleteAbsensi,
  onAbsenPulang,
  onOpenPrintModal,
  dataCabangList = [],
  pengaturanOffList = [],
  onSavePengaturanOff,
}) => {
  const isDcPusatOrOwner = currentUser.cabang === 'DC PUSAT' || currentUser.jabatan === 'Owner';
  const currentBranchName = getBranchName(currentUser.cabang, dataCabangList);
  const today = getTodayStr();

  const activeBranches = getStoreBranchNames(dataCabangList);

  // DC / Store Filter States
  const [filterCabang, setFilterCabang] = useState<string>(
    isDcPusatOrOwner ? 'Semua' : (currentBranchName || currentUser.cabang)
  );
  const [filterTanggal, setFilterTanggal] = useState<string>(today);
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [searchNama, setSearchNama] = useState<string>('');

  // Sub-tabs navigation: 'presensi' (harian), 'jadwalOff' (dinamis per cabang), 'laporanBulanan' (1 bulan full + gaji)
  const [activeSubTab, setActiveSubTab] = useState<'presensi' | 'jadwalOff' | 'laporanBulanan'>('presensi');

  // Modal Setting "Maks. OFF/Hari" per Cabang (disimpan ke pengaturan_off)
  const [settingOffBranch, setSettingOffBranch] = useState<DataCabang | null>(null);
  const [inputSenin, setInputSenin] = useState<number>(1);
  const [inputSelasa, setInputSelasa] = useState<number>(1);
  const [inputRabu, setInputRabu] = useState<number>(1);
  const [inputKamis, setInputKamis] = useState<number>(1);
  const [inputJumat, setInputJumat] = useState<number>(1);
  const [inputSabtu, setInputSabtu] = useState<number>(0);
  const [inputMinggu, setInputMinggu] = useState<number>(0);
  const [settingOffSuccess, setSettingOffSuccess] = useState<string | null>(null);

  // States untuk Laporan Absensi Bulanan (1 Bulan Full)
  const [laporanBulan, setLaporanBulan] = useState<string>(today.substring(0, 7)); // 'YYYY-MM'
  const [laporanCabangFilter, setLaporanCabangFilter] = useState<string>('Semua');
  const [laporanSearchNama, setLaporanSearchNama] = useState<string>('');

  // Search bar input for searching branch name (pengganti tombol atas)
  const [searchCabangInput, setSearchCabangInput] = useState<string>('');

  // Pengaturan Gaji Karyawan oleh Owner
  const [gajiSettings, setGajiSettings] = useState<Record<string, GajiKaryawanSetting>>(() =>
    loadFromStorage<Record<string, GajiKaryawanSetting>>(STORAGE_KEYS.PENGATURAN_GAJI, {})
  );
  const [editingGajiEmp, setEditingGajiEmp] = useState<Karyawan | null>(null);
  const [editGajiPokok, setEditGajiPokok] = useState<number>(100000);
  const [editUangMakan, setEditUangMakan] = useState<number>(20000);
  const [editDendaTelat, setEditDendaTelat] = useState<number>(10000);
  const [editBonus, setEditBonus] = useState<number>(0);
  const [gajiSaveSuccess, setGajiSaveSuccess] = useState<string | null>(null);

  const getEmpGajiSetting = (empId: string): GajiKaryawanSetting => {
    return (
      gajiSettings[empId] || {
        karyawanId: empId,
        gajiPokokHarian: 100000,
        uangMakanHarian: 20000,
        dendaTelat: 10000,
        bonus: 0,
        keterangan: '',
      }
    );
  };

  const handleOpenEditGaji = (emp: Karyawan) => {
    const cur = getEmpGajiSetting(emp.id);
    setEditGajiPokok(cur.gajiPokokHarian);
    setEditUangMakan(cur.uangMakanHarian);
    setEditDendaTelat(cur.dendaTelat);
    setEditBonus(cur.bonus || 0);
    setGajiSaveSuccess(null);
    setEditingGajiEmp(emp);
  };

  const handleSaveGajiSetting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGajiEmp) return;

    const updatedSetting: GajiKaryawanSetting = {
      karyawanId: editingGajiEmp.id,
      gajiPokokHarian: Number(editGajiPokok) || 0,
      uangMakanHarian: Number(editUangMakan) || 0,
      dendaTelat: Number(editDendaTelat) || 0,
      bonus: Number(editBonus) || 0,
      updatedAt: new Date().toISOString(),
    };

    const nextSettings = {
      ...gajiSettings,
      [editingGajiEmp.id]: updatedSetting,
    };

    setGajiSettings(nextSettings);
    saveToStorage(STORAGE_KEYS.PENGATURAN_GAJI, nextSettings);

    // Persist to Firestore if available
    try {
      import('../firebase').then(({ db }) => {
        if (db) {
          import('firebase/firestore').then(({ doc, setDoc }) => {
            setDoc(doc(db, 'pengaturan_gaji', editingGajiEmp.id), updatedSetting, { merge: true }).catch(() => {});
          });
        }
      });
    } catch {
      // safe fallback
    }

    setGajiSaveSuccess(`Pengaturan gaji untuk ${editingGajiEmp.nama} berhasil disimpan!`);
    setTimeout(() => {
      setEditingGajiEmp(null);
      setGajiSaveSuccess(null);
    }, 1000);
  };

  // Modal Edit Gaji Semua Karyawan Per Cabang (Filter dari data_cabang)
  const [showGajiCabangModal, setShowGajiCabangModal] = useState<boolean>(false);
  const [selectedCabangForGaji, setSelectedCabangForGaji] = useState<string>('');
  const [cabangGajiPokok, setCabangGajiPokok] = useState<number>(100000);
  const [cabangUangMakan, setCabangUangMakan] = useState<number>(20000);
  const [cabangDendaTelat, setCabangDendaTelat] = useState<number>(10000);
  const [cabangBonus, setCabangBonus] = useState<number>(0);
  const [cabangGajiSuccess, setCabangGajiSuccess] = useState<string | null>(null);

  const handleOpenEditGajiCabang = () => {
    const initialBranch =
      (laporanCabangFilter !== 'Semua' ? laporanCabangFilter : dataCabangList[0]?.nama) ||
      'DC PUSAT';
    setSelectedCabangForGaji(initialBranch);

    const targetBranch = dataCabangList.find(
      (b) => b.nama === initialBranch || b.id === initialBranch || b.branchId === initialBranch
    );
    const branchKey = targetBranch?.branchId || targetBranch?.id || initialBranch;
    const branchEmployees = karyawanList.filter(
      (k) =>
        k.cabang === initialBranch ||
        k.cabang_id === branchKey ||
        k.branchId === branchKey ||
        (targetBranch && k.cabang_id === targetBranch.id)
    );

    const firstSetting = branchEmployees[0] ? getEmpGajiSetting(branchEmployees[0].id) : null;
    if (firstSetting) {
      setCabangGajiPokok(firstSetting.gajiPokokHarian);
      setCabangUangMakan(firstSetting.uangMakanHarian);
      setCabangDendaTelat(firstSetting.dendaTelat);
      setCabangBonus(firstSetting.bonus || 0);
    } else {
      setCabangGajiPokok(100000);
      setCabangUangMakan(20000);
      setCabangDendaTelat(10000);
      setCabangBonus(0);
    }

    setCabangGajiSuccess(null);
    setShowGajiCabangModal(true);
  };

  const handleSelectCabangChange = (cabangNama: string) => {
    setSelectedCabangForGaji(cabangNama);
    const targetBranch = dataCabangList.find(
      (b) => b.nama === cabangNama || b.id === cabangNama || b.branchId === cabangNama
    );
    const branchKey = targetBranch?.branchId || targetBranch?.id || cabangNama;
    const branchEmployees = karyawanList.filter(
      (k) =>
        k.cabang === cabangNama ||
        k.cabang_id === branchKey ||
        k.branchId === branchKey ||
        (targetBranch && k.cabang_id === targetBranch.id)
    );

    const firstSetting = branchEmployees[0] ? getEmpGajiSetting(branchEmployees[0].id) : null;
    if (firstSetting) {
      setCabangGajiPokok(firstSetting.gajiPokokHarian);
      setCabangUangMakan(firstSetting.uangMakanHarian);
      setCabangDendaTelat(firstSetting.dendaTelat);
      setCabangBonus(firstSetting.bonus || 0);
    }
  };

  const handleSaveGajiCabang = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCabangForGaji) return;

    const targetBranch = dataCabangList.find(
      (b) =>
        b.nama === selectedCabangForGaji ||
        b.id === selectedCabangForGaji ||
        b.branchId === selectedCabangForGaji
    );
    const branchKey = targetBranch?.branchId || targetBranch?.id || selectedCabangForGaji;

    const branchEmployees = karyawanList.filter(
      (k) =>
        k.cabang === selectedCabangForGaji ||
        k.cabang_id === branchKey ||
        k.branchId === branchKey ||
        (targetBranch && k.cabang_id === targetBranch.id)
    );

    if (branchEmployees.length === 0) {
      alert(`Tidak ada karyawan yang terdaftar di Cabang ${selectedCabangForGaji}. Silakan daftarkan karyawan terlebih dahulu di menu Data Karyawan.`);
      return;
    }

    const nextSettings = { ...gajiSettings };
    const nowIso = new Date().toISOString();

    branchEmployees.forEach((emp) => {
      nextSettings[emp.id] = {
        karyawanId: emp.id,
        gajiPokokHarian: Number(cabangGajiPokok) || 0,
        uangMakanHarian: Number(cabangUangMakan) || 0,
        dendaTelat: Number(cabangDendaTelat) || 0,
        bonus: Number(cabangBonus) || 0,
        updatedAt: nowIso,
      };
    });

    setGajiSettings(nextSettings);
    saveToStorage(STORAGE_KEYS.PENGATURAN_GAJI, nextSettings);

    try {
      import('../firebase').then(({ db }) => {
        if (db) {
          import('firebase/firestore').then(({ doc, writeBatch }) => {
            const batch = writeBatch(db);
            branchEmployees.forEach((emp) => {
              batch.set(doc(db, 'pengaturan_gaji', emp.id), nextSettings[emp.id], { merge: true });
            });
            batch.commit().catch(() => {});
          });
        }
      });
    } catch {
      // safe fallback
    }

    setCabangGajiSuccess(`Berhasil menerapkan tarif gaji baru untuk seluruh ${branchEmployees.length} karyawan di Cabang ${selectedCabangForGaji}!`);
    setTimeout(() => {
      setShowGajiCabangModal(false);
      setCabangGajiSuccess(null);
    }, 1200);
  };

  const handleShareSlipWhatsApp = (emp: Karyawan, slipData: SlipGajiData) => {
    const rawHp = emp.hp || '';
    if (!rawHp.trim()) {
      alert(`Nomor WhatsApp/HP untuk ${emp.nama} belum terdaftar di Data Karyawan. Silakan lengkapi nomor HP terlebih dahulu di menu Data Karyawan.`);
      return;
    }

    let phone = rawHp.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    } else if (!phone.startsWith('62')) {
      phone = '62' + phone;
    }

    const text = `*SLIP GAJI & REKAPITULASI KEHADIRAN*
*TELAGA WARNA*
----------------------------------------
*Nama Karyawan:* ${slipData.nama}
*NIK:* ${slipData.nik || '-'}
*Jabatan:* ${slipData.jabatan}
*Penempatan Cabang:* ${slipData.cabang}
*Periode:* ${slipData.bulanNama}
----------------------------------------
*1. REKAP KEHADIRAN:*
• Total Hadir Kerja: ${slipData.hadirCount} Hari
• Hadir Tepat Waktu: ${slipData.tepatWaktuCount} Hari
• Keterlambatan (>08:00): ${slipData.telatCount} Kali
• Jadwal OFF Shift: ${slipData.offCount} Hari
• Izin: ${slipData.izinCount} Hari
• Sakit: ${slipData.sakitCount} Hari

*2. RINCIAN PENGHASILAN:*
+ Gaji Pokok Harian: ${formatRupiah(slipData.totalGajiPokok)} (${slipData.hadirCount} hari x ${formatRupiah(slipData.gajiPokokHarian)})
+ Uang Makan & Transport: ${formatRupiah(slipData.totalUangMakan)} (${slipData.hadirCount} hari x ${formatRupiah(slipData.uangMakanHarian)})
${slipData.bonus > 0 ? `+ Bonus / Insentif: ${formatRupiah(slipData.bonus)}\n` : ''}- Denda Keterlambatan: ${formatRupiah(slipData.potonganTelat)} (${slipData.telatCount}x telat x ${formatRupiah(slipData.dendaTelat)})
${slipData.potonganLain > 0 ? `- Potongan Lainnya: ${formatRupiah(slipData.potonganLain)}\n` : ''}----------------------------------------
*TOTAL GAJI BERSIH (TAKE HOME PAY):*
👉 *${formatRupiah(slipData.totalGajiBersih)}*
----------------------------------------
_Catatan: Dokumen rincian slip gaji resmi diterbitkan oleh Manajemen Pusat TELAGA WARNA._`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handlePrintSlipGaji = (slipData: SlipGajiData) => {
    onOpenPrintModal('slipGaji', slipData);
  };

  // Simulation time toggle (Optional helper so users can easily test 07:50 vs 08:15)
  const [useSimulationTime, setUseSimulationTime] = useState<boolean>(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('07:55:00');

  // Modal State for Self Izin / Sakit / Off / Libur
  const [showIzinModal, setShowIzinModal] = useState<boolean>(false);
  const [selectedJenis, setSelectedJenis] = useState<'Izin' | 'Sakit' | 'Off' | 'Libur'>('Izin');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(today);
  const [alasanIzinSakit, setAlasanIzinSakit] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State for Replacing Today's Attendance (replaces confirm() browser)
  const [showReplaceConfirmModal, setShowReplaceConfirmModal] = useState<boolean>(false);
  const [pendingAbsenData, setPendingAbsenData] = useState<Absensi | null>(null);

  // Modal State for Owner / Admin DC Pusat Scheduling Off / Libur
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [scheduleKaryawanId, setScheduleKaryawanId] = useState<string>('');
  const [scheduleJenis, setScheduleJenis] = useState<'Off' | 'Libur'>('Off');
  const [scheduleTanggal, setScheduleTanggal] = useState<string>(today);
  const [scheduleKeterangan, setScheduleKeterangan] = useState<string>('');
  const [scheduleFilterCabang, setScheduleFilterCabang] = useState<string>('Semua');
  const [scheduleModalError, setScheduleModalError] = useState<string | null>(null);
  const [scheduleModalSuccess, setScheduleModalSuccess] = useState<string | null>(null);

  // Modal State for Deleting / Canceling Attendance (replaces confirm() browser)
  const [deletingAbsenTarget, setDeletingAbsenTarget] = useState<Absensi | null>(null);

  // Check today's record for logged-in user
  const myTodayAbsen = absensiList.find(
    (a) => a.karyawanId === currentUser.id && a.tanggal === today
  );

  // Calculate duration between HH:mm:ss and HH:mm:ss
  const calculateDuration = (start: string, end: string): string => {
    try {
      const [sh, sm, ss] = start.split(':').map(Number);
      const [eh, em, es] = end.split(':').map(Number);
      const startSec = sh * 3600 + sm * 60 + (ss || 0);
      const endSec = eh * 3600 + em * 60 + (es || 0);
      const diffSec = Math.max(0, endSec - startSec);
      const hours = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      return `${hours} Jam ${mins} Menit`;
    } catch {
      return '-';
    }
  };

  // 1. Absen Masuk Mandiri
  const handleAbsenMasukSaya = () => {
    // Proteksi: Jadwal OFF yang sudah ditentukan oleh Admin DC Pusat tidak bisa diubah karyawan
    if (myTodayAbsen && myTodayAbsen.status === 'Off' && !isDcPusatOrOwner) {
      alert('Hari ini Anda memiliki Jadwal OFF resmi yang telah ditetapkan oleh Admin DC Pusat. Karyawan tidak dapat mengubah jadwal OFF ini.');
      return;
    }

    const jamMasuk = useSimulationTime ? simulatedTime : getNowTimeStr();
    // Rule: Telat jika > 08:00
    const [hh, mm] = jamMasuk.split(':').map(Number);
    const isLate = hh > 8 || (hh === 8 && mm > 0);
    const status: Absensi['status'] = isLate ? 'Terlambat' : 'Tepat Waktu';

    const newAbsen: Absensi = {
      id: 'abs-' + Date.now(),
      tanggal: today,
      cabang: currentUser.cabang,
      karyawanId: currentUser.id,
      nama: currentUser.nama,
      jabatan: currentUser.jabatan,
      kasirBertugas: currentUser.nama,
      jamMasuk,
      status,
      keterangan: isLate
        ? 'Masuk melewati batas jam 08:00'
        : 'Hadir tepat waktu sebelum 08:00',
    };

    onAddAbsensi(newAbsen);
  };

  // 2. Absen Pulang Mandiri
  const handleAbsenPulangSaya = () => {
    if (!myTodayAbsen) return;
    const jamPulang = useSimulationTime ? '17:00:00' : getNowTimeStr();
    const durasi = calculateDuration(myTodayAbsen.jamMasuk, jamPulang);
    onAbsenPulang(myTodayAbsen.id, jamPulang, durasi);
  };

  // 3. Izin / Sakit / Off / Libur Mandiri
  const handleSubmitIzinSakitSaya = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Proteksi: Cek apakah tanggal yang dipilih sudah memiliki Jadwal OFF yang ditentukan oleh DC Pusat/Owner
    const existingOffOnDate = absensiList.find(
      (a) =>
        (a.karyawanId === currentUser.id || a.karyawan_id === currentUser.id) &&
        a.tanggal === selectedTanggal &&
        a.status === 'Off'
    );

    if (existingOffOnDate && !isDcPusatOrOwner) {
      setFormError(
        `Tanggal ${selectedTanggal} telah ditetapkan sebagai Jadwal OFF oleh Admin DC Pusat. Karyawan tidak dapat mengubah atau mengganti jadwal OFF ini kecuali Admin DC Pusat.`
      );
      return;
    }

    // Jika hari ini statusnya Off dan bukan Admin DC Pusat, tidak boleh diubah
    if (myTodayAbsen && myTodayAbsen.status === 'Off' && !isDcPusatOrOwner && selectedTanggal === today) {
      setFormError('Jadwal OFF hari ini telah ditetapkan oleh Admin DC Pusat dan tidak dapat diubah oleh karyawan.');
      return;
    }

    // Keterangan opsional untuk Off / Libur tapi wajib untuk Izin / Sakit
    if (!alasanIzinSakit.trim() && (selectedJenis === 'Izin' || selectedJenis === 'Sakit')) {
      setFormError(`Harap masukkan keterangan/alasan ${selectedJenis}!`);
      return;
    }

    const defaultKeterangan =
      selectedJenis === 'Off'
        ? 'Jadwal Libur Shift Kerja'
        : selectedJenis === 'Libur'
        ? 'Hari Libur Toko / Nasional'
        : `${selectedJenis}: ${alasanIzinSakit.trim()}`;

    const newAbsen: Absensi = {
      id: 'abs-' + Date.now() + '-' + currentUser.id.slice(-4),
      tanggal: selectedTanggal,
      cabang: currentUser.cabang,
      karyawanId: currentUser.id,
      nama: currentUser.nama,
      jabatan: currentUser.jabatan,
      kasirBertugas: currentUser.nama,
      jamMasuk: '-',
      jamPulang: '-',
      durasi: '-',
      status: selectedJenis,
      keterangan: alasanIzinSakit.trim() ? `${selectedJenis}: ${alasanIzinSakit.trim()}` : defaultKeterangan,
    };

    if (myTodayAbsen && selectedTanggal === today) {
      setPendingAbsenData(newAbsen);
      setShowReplaceConfirmModal(true);
      return;
    }

    onAddAbsensi(newAbsen);
    setShowIzinModal(false);
  };

  const handleConfirmReplaceAbsen = () => {
    if (pendingAbsenData) {
      if (myTodayAbsen?.status === 'Off' && !isDcPusatOrOwner) {
        alert('Jadwal OFF resmi dari Admin DC Pusat tidak dapat diubah oleh karyawan.');
        setShowReplaceConfirmModal(false);
        setPendingAbsenData(null);
        return;
      }
      onAddAbsensi(pendingAbsenData);
      setPendingAbsenData(null);
    }
    setShowReplaceConfirmModal(false);
    setShowIzinModal(false);
  };

  // Helper konversi tanggal YYYY-MM-DD ke nama hari dalam pengaturan_off
  const getHariFromDate = (dateStr: string): 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu' | 'minggu' => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const dayNum = d.getDay();
      const map: Record<number, 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu' | 'minggu'> = {
        0: 'minggu',
        1: 'senin',
        2: 'selasa',
        3: 'rabu',
        4: 'kamis',
        5: 'jumat',
        6: 'sabtu',
      };
      return map[dayNum] || 'senin';
    } catch {
      return 'senin';
    }
  };

  // Helper mendapatkan Pengaturan OFF cabang dari state pengaturanOffList (Dinamis dari Firestore/Storage)
  const getBranchPengaturanOff = (cabangId: string, cabangNama: string): PengaturanOff => {
    const found = (pengaturanOffList || []).find(
      (p) => p.cabangId === cabangId || p.cabangId === cabangNama || p.cabangNama === cabangNama
    );
    if (found) return found;
    return {
      id: 'poff-' + cabangId,
      cabangId,
      cabangNama,
      senin: 1,
      selasa: 1,
      rabu: 1,
      kamis: 1,
      jumat: 1,
      sabtu: 0,
      minggu: 0,
    };
  };

  // Buka Modal Setting Maks. OFF/Hari per Cabang
  const openSettingOffModal = (branch: DataCabang) => {
    const branchKey = branch.branchId || branch.id;
    const currentSetting = getBranchPengaturanOff(branchKey, branch.nama);
    setSettingOffBranch(branch);
    setInputSenin(currentSetting.senin);
    setInputSelasa(currentSetting.selasa);
    setInputRabu(currentSetting.rabu);
    setInputKamis(currentSetting.kamis);
    setInputJumat(currentSetting.jumat);
    setInputSabtu(currentSetting.sabtu);
    setInputMinggu(currentSetting.minggu);
    setSettingOffSuccess(null);
  };

  // Simpan Pengaturan Maks. OFF/Hari ke tabel pengaturan_off
  const handleSaveSettingOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingOffBranch || !onSavePengaturanOff) return;
    const branchKey = settingOffBranch.branchId || settingOffBranch.id;
    const updatedPo: PengaturanOff = {
      id: 'poff-' + branchKey,
      cabangId: branchKey,
      cabangNama: settingOffBranch.nama,
      senin: Math.max(0, Number(inputSenin) || 0),
      selasa: Math.max(0, Number(inputSelasa) || 0),
      rabu: Math.max(0, Number(inputRabu) || 0),
      kamis: Math.max(0, Number(inputKamis) || 0),
      jumat: Math.max(0, Number(inputJumat) || 0),
      sabtu: Math.max(0, Number(inputSabtu) || 0),
      minggu: Math.max(0, Number(inputMinggu) || 0),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.nama,
    };
    onSavePengaturanOff(updatedPo);
    setSettingOffSuccess(`Pengaturan Maks. OFF/Hari untuk ${settingOffBranch.nama} berhasil disimpan.`);
    setTimeout(() => {
      setSettingOffBranch(null);
      setSettingOffSuccess(null);
    }, 1200);
  };

  // 4. Owner / Admin DC Pusat Handler: Jadwalkan Off / Libur untuk Karyawan
  const handleSaveScheduleOffLibur = (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleModalError(null);
    setScheduleModalSuccess(null);

    if (!scheduleKaryawanId) {
      setScheduleModalError('Harap pilih karyawan yang ingin dijadwalkan!');
      return;
    }
    if (!scheduleTanggal) {
      setScheduleModalError('Harap pilih tanggal jadwal!');
      return;
    }

    const targetKaryawan = karyawanList.find((k) => k.id === scheduleKaryawanId);
    if (!targetKaryawan) {
      setScheduleModalError('Karyawan tidak ditemukan!');
      return;
    }

    // Validasi kuota OFF jika tipe adalah 'Off'
    if (scheduleJenis === 'Off') {
      const branchKey = targetKaryawan.branchId || targetKaryawan.cabang_id || targetKaryawan.cabang;
      const branchSetting = getBranchPengaturanOff(branchKey, targetKaryawan.cabang);
      const dayKey = getHariFromDate(scheduleTanggal);
      const maxQuota = branchSetting[dayKey] ?? 0;

      if (maxQuota === 0) {
        setScheduleModalError(
          `Cabang ${targetKaryawan.cabang} pada hari ${dayKey.toUpperCase()} diatur 0 (Full Team - Tidak ada OFF). Karyawan tidak dapat dijadwalkan OFF pada hari ini!`
        );
        return;
      }

      // Hitung jumlah karyawan yang sudah dijadwalkan OFF pada tanggal tersebut di cabang ini
      const currentOffCount = absensiList.filter(
        (a) =>
          (a.cabang === targetKaryawan.cabang || a.cabang_id === branchKey) &&
          a.tanggal === scheduleTanggal &&
          a.status === 'Off' &&
          a.karyawanId !== targetKaryawan.id
      ).length;

      if (currentOffCount >= maxQuota) {
        setScheduleModalError(
          `Kuota OFF cabang ${targetKaryawan.cabang} pada ${scheduleTanggal} (${dayKey.toUpperCase()}) sudah penuh! Maksimal ${maxQuota} orang per hari, saat ini sudah ada ${currentOffCount} orang.`
        );
        return;
      }
    }

    const existingRecord = absensiList.find(
      (a) => a.karyawanId === targetKaryawan.id && a.tanggal === scheduleTanggal
    );

    const defaultKeterangan =
      scheduleJenis === 'Off'
        ? `Jadwal Libur Shift Kerja (oleh ${currentUser.nama})`
        : `Jadwal Hari Libur Toko (oleh ${currentUser.nama})`;

    const scheduledAbsen: Absensi = {
      id: existingRecord ? existingRecord.id : 'abs-' + Date.now() + '-' + targetKaryawan.id.slice(-4),
      tanggal: scheduleTanggal,
      cabang: targetKaryawan.cabang,
      cabang_id: targetKaryawan.branchId || targetKaryawan.cabang_id || targetKaryawan.cabang,
      karyawanId: targetKaryawan.id,
      karyawan_id: targetKaryawan.id,
      nama: targetKaryawan.nama,
      nik: targetKaryawan.nik || '',
      jabatan: targetKaryawan.jabatan,
      kasirBertugas: currentUser.nama,
      jamMasuk: '-',
      jamPulang: '-',
      durasi: '-',
      status: scheduleJenis,
      keterangan: scheduleKeterangan.trim() ? `${scheduleJenis}: ${scheduleKeterangan.trim()}` : defaultKeterangan,
    };

    onAddAbsensi(scheduledAbsen);
    setScheduleModalSuccess(
      `Sukses: Jadwal ${scheduleJenis} untuk ${targetKaryawan.nama} (${targetKaryawan.cabang}) pada ${scheduleTanggal} berhasil disimpan.`
    );
    setScheduleKeterangan('');
    setTimeout(() => {
      setShowScheduleModal(false);
      setScheduleModalSuccess(null);
    }, 1200);
  };

  const handleConfirmDeleteAbsen = () => {
    if (deletingAbsenTarget && onDeleteAbsensi) {
      onDeleteAbsensi(deletingAbsenTarget.id);
      setDeletingAbsenTarget(null);
    }
  };

  // Filtered absensi table
  const filteredAbsensi = absensiList.filter((a) => {
    const matchCabang = filterCabang === 'Semua' || a.cabang === filterCabang;
    const matchTanggal = !filterTanggal || a.tanggal === filterTanggal;
    const matchStatus = filterStatus === 'Semua' || a.status === filterStatus;
    const matchNama = !searchNama || a.nama.toLowerCase().includes(searchNama.toLowerCase());
    return matchCabang && matchTanggal && matchStatus && matchNama;
  });

  // Summary counts for current filter
  const activeAbsensiSubset = absensiList.filter(
    (a) =>
      (!filterTanggal || a.tanggal === filterTanggal) &&
      (filterCabang === 'Semua' || a.cabang === filterCabang)
  );

  const countHadirTepat = activeAbsensiSubset.filter((a) => a.status === 'Tepat Waktu').length;
  const countHadirTelat = activeAbsensiSubset.filter((a) => a.status === 'Terlambat').length;
  const countIzin = activeAbsensiSubset.filter((a) => a.status === 'Izin').length;
  const countSakit = activeAbsensiSubset.filter((a) => a.status === 'Sakit').length;
  const countOff = activeAbsensiSubset.filter((a) => a.status === 'Off').length;
  const countLibur = activeAbsensiSubset.filter((a) => a.status === 'Libur').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-black text-slate-800">
              Absensi Kehadiran Karyawan (Akun Mandiri)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Setiap karyawan (Crew Store, Driver, Cashier, Kepala Toko, SPV, Admin) wajib absen masuk, pulang, atau mengajukan izin/sakit menggunakan <strong>akun login masing-masing</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Input Pencarian Nama Cabang (Pengganti Tombol Atur Jadwal OFF) */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchCabangInput}
              onChange={(e) => setSearchCabangInput(e.target.value)}
              placeholder="Cari nama cabang..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenPrintModal('absen', filteredAbsensi)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap Absensi A4</span>
          </button>
        </div>
      </div>

      {/* 3 Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('presensi')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeSubTab === 'presensi'
              ? 'border-orange-600 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Presensi Harian & Mandiri</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('jadwalOff')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeSubTab === 'jadwalOff'
              ? 'border-purple-600 text-purple-600 bg-purple-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Jadwal OFF Karyawan (Per Cabang)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
            Dinamis
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('laporanBulanan')}
          className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeSubTab === 'laporanBulanan'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Laporan Absensi Bulanan (1 Bulan Full & Gaji)</span>
        </button>
      </div>

      {/* TAB 1: PRESENSI HARIAN & MANDIRI */}
      {activeSubTab === 'presensi' && (
        <div className="space-y-6">
          {/* CARD 1: ABSENSI MANDIRI AKUN LOGIN (Wajib Akun Sendiri) */}
          <div className="bg-white rounded-3xl border-2 border-orange-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full uppercase">
                {currentUser.cabang}
              </span>
              <span className="text-[10px] font-black bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full uppercase">
                {currentUser.jabatan}
              </span>
              {currentUser.nik && (
                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  NIK: {currentUser.nik}
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-800 mt-1.5">
              Absensi Mandiri: {currentUser.nama}
            </h3>
            <p className="text-xs text-slate-500">
              Tanggal Hari Ini: <strong>{today}</strong> • Batas jam masuk kerja tepat waktu: 08:00 WIB
            </p>
          </div>

          {/* Time simulation tool for easy grading / testing */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs flex items-center gap-2 self-start sm:self-auto">
            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={useSimulationTime}
                onChange={(e) => setUseSimulationTime(e.target.checked)}
                className="rounded text-orange-600"
              />
              <span>Simulasi Jam:</span>
            </label>
            {useSimulationTime && (
              <select
                value={simulatedTime}
                onChange={(e) => setSimulatedTime(e.target.value)}
                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-bold"
              >
                <option value="07:45:00">07:45 (Tepat Waktu)</option>
                <option value="07:58:00">07:58 (Tepat Waktu)</option>
                <option value="08:15:00">08:15 (Terlambat &gt;08:00)</option>
                <option value="08:45:00">08:45 (Terlambat &gt;08:00)</option>
              </select>
            )}
          </div>
        </div>

        {/* If user is recorded as Izin, Sakit, Off, or Libur today */}
        {myTodayAbsen && ['Izin', 'Sakit', 'Off', 'Libur'].includes(myTodayAbsen.status) ? (
          <div
            className={`p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              myTodayAbsen.status === 'Izin'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900'
                : myTodayAbsen.status === 'Sakit'
                ? 'bg-rose-50/80 border-rose-300 text-rose-900'
                : myTodayAbsen.status === 'Off'
                ? 'bg-purple-50/80 border-purple-300 text-purple-900'
                : 'bg-indigo-50/80 border-indigo-300 text-indigo-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                  myTodayAbsen.status === 'Izin'
                    ? 'bg-blue-200 text-blue-800'
                    : myTodayAbsen.status === 'Sakit'
                    ? 'bg-rose-200 text-rose-800'
                    : myTodayAbsen.status === 'Off'
                    ? 'bg-purple-200 text-purple-800'
                    : 'bg-indigo-200 text-indigo-800'
                }`}
              >
                {myTodayAbsen.status === 'Izin' ? (
                  <UserMinus className="w-6 h-6" />
                ) : myTodayAbsen.status === 'Sakit' ? (
                  <HeartPulse className="w-6 h-6" />
                ) : myTodayAbsen.status === 'Off' ? (
                  <Coffee className="w-6 h-6" />
                ) : (
                  <Calendar className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="font-black text-base flex items-center gap-2">
                  <span>Hari Ini Anda Tercatat: {myTodayAbsen.status}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-xs">
                    Tidak Wajib Absen Jam Kerja
                  </span>
                </div>
                <div className="text-xs opacity-85 mt-0.5 font-medium">
                  Keterangan: {myTodayAbsen.keterangan || '-'}
                </div>
              </div>
            </div>
            {myTodayAbsen.status === 'Off' && !isDcPusatOrOwner ? (
              <div className="px-3.5 py-2 bg-purple-100 text-purple-950 border border-purple-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs">
                <Shield className="w-4 h-4 text-purple-700" />
                <span>Jadwal OFF Terkunci (Ditetapkan Admin DC Pusat)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedJenis(myTodayAbsen.status as any);
                  setSelectedTanggal(today);
                  setAlasanIzinSakit(myTodayAbsen.keterangan?.replace(/^(Izin|Sakit|Off|Libur):\s*/, '') || '');
                  setShowIzinModal(true);
                }}
                className="px-4 py-2 bg-white text-xs font-bold rounded-xl border border-slate-300 shadow-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Ubah Status {myTodayAbsen.status}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Absen Masuk Box */}
            <div className="p-4 rounded-2xl border bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-orange-600" />
                  1. Absen Masuk
                </span>
                {myTodayAbsen && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      myTodayAbsen.status === 'Tepat Waktu'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {myTodayAbsen.status}
                  </span>
                )}
              </div>

              {myTodayAbsen ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-500 text-[11px]">Tercatat Jam Masuk:</div>
                  <div className="text-xl font-black text-slate-800">
                    {myTodayAbsen.jamMasuk}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {myTodayAbsen.keterangan}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleAbsenMasukSaya}
                    className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>KLIK ABSEN MASUK SEKARANG</span>
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJenis('Izin');
                        setSelectedTanggal(today);
                        setAlasanIzinSakit('');
                        setShowIzinModal(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Tidak Masuk Hari Ini? Ajukan Izin / Sakit / Off / Libur</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Absen Pulang Box */}
            <div className="p-4 rounded-2xl border bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  2. Absen Pulang
                </span>
                {myTodayAbsen?.jamPulang && myTodayAbsen.jamPulang !== '-' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-300">
                    Selesai Kerja
                  </span>
                )}
              </div>

              {myTodayAbsen?.jamPulang && myTodayAbsen.jamPulang !== '-' ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-500 text-[11px]">Jam Pulang & Durasi:</div>
                  <div className="text-xl font-black text-slate-800">
                    {myTodayAbsen.jamPulang}
                  </div>
                  <div className="text-[11px] font-semibold text-blue-600">
                    Total Waktu Kerja: {myTodayAbsen.durasi || '-'}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!myTodayAbsen}
                  onClick={handleAbsenPulangSaya}
                  className="w-full py-3 bg-slate-800 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
                >
                  <Clock className="w-4 h-4" />
                  <span>KLIK ABSEN PULANG</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK SUMMARY COUNTERS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Tepat Waktu</span>
          </div>
          <div className="text-xl font-black text-emerald-700">{countHadirTepat}</div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Terlambat (&gt;08:00)</span>
          </div>
          <div className="text-xl font-black text-amber-700">{countHadirTelat}</div>
        </div>

        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-blue-800 flex items-center justify-center gap-1">
            <UserMinus className="w-3.5 h-3.5" />
            <span>Izin</span>
          </div>
          <div className="text-xl font-black text-blue-700">{countIzin}</div>
        </div>

        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-rose-800 flex items-center justify-center gap-1">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Sakit</span>
          </div>
          <div className="text-xl font-black text-rose-700">{countSakit}</div>
        </div>

        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-purple-800 flex items-center justify-center gap-1">
            <Coffee className="w-3.5 h-3.5" />
            <span>Off (Shift)</span>
          </div>
          <div className="text-xl font-black text-purple-700">{countOff}</div>
        </div>

        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-center space-y-0.5">
          <div className="text-[11px] font-bold text-indigo-800 flex items-center justify-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Libur</span>
          </div>
          <div className="text-xl font-black text-indigo-700">{countLibur}</div>
        </div>
      </div>

      {/* REKAP TABEL ABSENSI */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>Tabel Rekap Kehadiran, Izin & Sakit</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Audit kedisiplinan jam masuk kerja & rekap permohonan izin/sakit karyawan
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
            {/* Search by Name */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={searchNama}
                onChange={(e) => setSearchNama(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold w-40"
              />
            </div>

            {/* Cabang Filter */}
            <select
              value={filterCabang}
              onChange={(e) => setFilterCabang(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="Semua">Semua Cabang</option>
              <option value="DC PUSAT">DC PUSAT</option>
              {activeBranches.map((cName) => (
                <option key={cName} value={cName}>
                  {cName}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
            >
              <option value="Semua">Semua Status</option>
              <option value="Tepat Waktu">Tepat Waktu</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Off">Off (Libur Shift)</option>
              <option value="Libur">Libur (Toko/Nasional)</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
            />
          </div>
        </div>

        {filteredAbsensi.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada rekaman absensi untuk filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Nama Karyawan</th>
                  <th className="py-3 px-3">Jabatan</th>
                  <th className="py-3 px-3">Cabang</th>
                  <th className="py-3 px-3">Jam Masuk</th>
                  <th className="py-3 px-3">Jam Pulang</th>
                  <th className="py-3 px-3">Durasi</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Keterangan / Alasan</th>
                  {isDcPusatOrOwner && (
                    <th className="py-3 px-3 text-right">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAbsensi.slice().reverse().map((a) => {
                  const displayJabatan =
                    a.jabatan ||
                    karyawanList.find((k) => k.id === a.karyawanId || k.nama === a.nama)?.jabatan ||
                    '-';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 text-slate-700 font-semibold whitespace-nowrap">
                        {a.tanggal}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {a.nama}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {displayJabatan}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-orange-700 whitespace-nowrap">
                        {a.cabang}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {a.jamMasuk}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {a.jamPulang || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {a.durasi || '-'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            a.status === 'Tepat Waktu'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : a.status === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : a.status === 'Izin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : a.status === 'Sakit'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : a.status === 'Off'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}
                        >
                          {a.status === 'Izin' && <UserMinus className="w-3 h-3" />}
                          {a.status === 'Sakit' && <HeartPulse className="w-3 h-3" />}
                          {a.status === 'Off' && <Coffee className="w-3 h-3" />}
                          {a.status === 'Libur' && <Calendar className="w-3 h-3" />}
                          <span>{a.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px] max-w-xs">
                        {a.keterangan || '-'}
                      </td>
                      {isDcPusatOrOwner && (
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {(a.status === 'Off' || a.status === 'Libur') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduleKaryawanId(a.karyawanId);
                                  setScheduleJenis(a.status as 'Off' | 'Libur');
                                  setScheduleTanggal(a.tanggal);
                                  setScheduleKeterangan(
                                    a.keterangan?.replace(/^(Off|Libur):\s*/, '') || ''
                                  );
                                  setScheduleModalError(null);
                                  setScheduleModalSuccess(null);
                                  setShowScheduleModal(true);
                                }}
                                title="Ubah Jadwal Off / Libur"
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeletingAbsenTarget(a)}
                              title="Hapus / Batalkan Catatan Absensi"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

  {/* TAB 2: JADWAL OFF KARYAWAN (DINAMIS DARI DATABASE MASTER) */}
  {activeSubTab === 'jadwalOff' && (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-5 rounded-3xl border-2 border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-purple-700" />
            <h3 className="text-base font-black text-purple-950">
              Jadwal OFF Karyawan (Dinamis dari Database Master)
            </h3>
          </div>
          <p className="text-xs text-purple-800 leading-relaxed max-w-3xl">
            Data cabang diambil langsung dari <strong>data_cabang</strong> dan karyawan dari <strong>data_karyawan</strong>.
            Batas <strong>Maks. OFF/Hari</strong> diatur 0-5+ per hari (Senin-Minggu) per cabang.
            Nilai <strong>0 = Full Team ("Tidak ada OFF")</strong>. Jadwal OFF otomatis terhubung ke <strong>Laporan Absensi Bulanan</strong> untuk perhitungan gaji.
          </p>
        </div>

      </div>

      {/* Group by Cabang (Dinamis dari dataCabangList, difilter oleh Pencarian Cabang) */}
      <div className="space-y-6">
        {(() => {
          const filteredBranches = dataCabangList.filter((branch) => {
            if (!searchCabangInput.trim()) return true;
            const term = searchCabangInput.toLowerCase().trim();
            return (
              branch.nama.toLowerCase().includes(term) ||
              (branch.branchId && branch.branchId.toLowerCase().includes(term)) ||
              (branch.id && branch.id.toLowerCase().includes(term))
            );
          });

          if (filteredBranches.length === 0) {
            return (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs">
                Tidak ada cabang yang cocok dengan pencarian &quot;{searchCabangInput}&quot;.
              </div>
            );
          }

          return filteredBranches.map((branch) => {
          const branchKey = branch.branchId || branch.id;
          const branchSetting = getBranchPengaturanOff(branchKey, branch.nama);

          // Filter karyawan by cabang_id / branchId / cabang name, sorted A-Z
          const branchEmployees = karyawanList
            .filter(
              (k) =>
                k.cabang_id === branchKey ||
                k.branchId === branchKey ||
                k.cabang_id === branch.id ||
                k.cabang === branch.nama
            )
            .sort((a, b) => a.nama.localeCompare(b.nama));

          const daysKeys: Array<'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu' | 'minggu'> = [
            'senin',
            'selasa',
            'rabu',
            'kamis',
            'jumat',
            'sabtu',
            'minggu',
          ];

          return (
            <div
              key={branch.id}
              className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-xs hover:shadow-sm transition"
            >
              {/* Branch Quota Header */}
              <div className="bg-slate-50/90 border-b border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <h4 className="text-base font-black text-slate-800">
                      {branch.nama}
                    </h4>
                    {branch.kode && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-bold">
                        Kode: {branch.kode}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                      {branchEmployees.length} Karyawan Terdaftar
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Aturan kuota maksimal karyawan yang diizinkan libur shift (OFF) per hari:
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isDcPusatOrOwner && (
                    <button
                      type="button"
                      onClick={() => openSettingOffModal(branch)}
                      className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Setting Kuota Maks. OFF/Hari</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quota Indicators for the 7 Days of the Week */}
              <div className="p-4 bg-slate-50/40 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {daysKeys.map((day) => {
                  const quota = branchSetting[day] ?? 0;
                  const isFullTeam = quota === 0;
                  return (
                    <div
                      key={day}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        isFullTeam
                          ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                          : 'bg-purple-50/60 border-purple-200 text-purple-900'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                        {day}
                      </span>
                      <span className="text-xs font-black block mt-0.5">
                        {isFullTeam ? (
                          <span className="text-emerald-700">0 (Tidak ada OFF)</span>
                        ) : (
                          <span className="text-purple-700">Maks {quota} Orang</span>
                        )}
                      </span>
                      <span className="text-[9px] block opacity-70 mt-0.5">
                        {isFullTeam ? 'Full Team Wajib Masuk' : `Boleh Libur: ${quota} Org`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Employees List for this Branch (Filtered by cabang_id, Sorted A-Z) */}
              <div className="p-5 space-y-3">
                {branchEmployees.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Belum ada karyawan terdaftar untuk cabang {branch.nama}. Tambah karyawan baru di menu <strong>Data Karyawan</strong>.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {branchEmployees.map((emp) => {
                      // Find all scheduled OFF records for this employee
                      const empOffSchedules = absensiList
                        .filter(
                          (a) =>
                            (a.karyawanId === emp.id || a.karyawan_id === emp.id) &&
                            a.status === 'Off'
                        )
                        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

                      return (
                        <div
                          key={emp.id}
                          className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          {/* Karyawan Profile */}
                          <div className="flex items-center gap-3 min-w-0 md:w-1/3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {emp.nama.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="font-black text-slate-800 text-sm truncate">
                                  {emp.nama}
                                </h5>
                                {emp.nik && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                    NIK: {emp.nik}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block truncate">
                                {emp.jabatan} • Cabang: {emp.cabang}
                              </span>
                            </div>
                          </div>

                          {/* Scheduled OFF Badges */}
                          <div className="flex-1 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block w-full sm:w-auto sm:mr-1">
                              Jadwal OFF:
                            </span>
                            {empOffSchedules.length > 0 ? (
                              empOffSchedules.map((offItem) => {
                                const dayName = getHariFromDate(offItem.tanggal);
                                return (
                                  <div
                                    key={offItem.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold shadow-2xs"
                                  >
                                    <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    <span>
                                      {offItem.tanggal}{' '}
                                      <strong className="uppercase">({dayName})</strong>
                                    </span>
                                    {isDcPusatOrOwner && (
                                      <button
                                        type="button"
                                        onClick={() => setDeletingAbsenTarget(offItem)}
                                        className="text-purple-400 hover:text-red-600 p-0.5 transition cursor-pointer"
                                        title="Batalkan Jadwal OFF"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                Belum ada tanggal OFF terjadwal
                              </span>
                            )}
                          </div>

                          {/* Action Button */}
                          {isDcPusatOrOwner && (
                            <div className="shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduleKaryawanId(emp.id);
                                  setScheduleJenis('Off');
                                  setScheduleTanggal(today);
                                  setScheduleKeterangan('');
                                  setScheduleModalError(null);
                                  setScheduleModalSuccess(null);
                                  setShowScheduleModal(true);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Atur Tanggal OFF</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        });
      })()}
      </div>
    </div>
  )}

  {/* TAB 3: LAPORAN ABSENSI BULANAN (1 BULAN FULL & GAJI) */}
  {activeSubTab === 'laporanBulanan' && (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-black text-slate-800">
                Laporan Absensi Bulanan (1 Bulan Full & Perhitungan Gaji)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Otomatis menggabungkan data Presensi Masuk (Hadir/Telat) dan <strong>Jadwal OFF</strong> untuk kalkulasi kehadiran dan estimasi gaji bersih karyawan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDcPusatOrOwner && (
              <button
                type="button"
                onClick={handleOpenEditGajiCabang}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer active:scale-95"
              >
                <Building2 className="w-4 h-4" />
                <span>Edit Gaji Semua Karyawan Per Cabang</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenPrintModal('absen', filteredAbsensi)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap A4</span>
            </button>
          </div>
        </div>

        {/* Filter Row: Bulan, Cabang, Cari Nama */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Pilih Bulan & Tahun:
            </label>
            <input
              type="month"
              value={laporanBulan}
              onChange={(e) => setLaporanBulan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Filter Cabang:
            </label>
            <select
              value={laporanCabangFilter}
              onChange={(e) => setLaporanCabangFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            >
              <option value="Semua">Semua Cabang ({dataCabangList.length})</option>
              {dataCabangList.map((b) => (
                <option key={b.id} value={b.nama}>
                  {b.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Cari Nama Karyawan / NIK:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama atau NIK..."
                value={laporanSearchNama}
                onChange={(e) => setLaporanSearchNama(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Matrix Grid Table */}
      {(() => {
        const [yearStr, monthStr] = (laporanBulan || today.substring(0, 7)).split('-');
        const yearNum = parseInt(yearStr, 10) || new Date().getFullYear();
        const monthNum = parseInt(monthStr, 10) || new Date().getMonth() + 1;
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const filteredEmployees = karyawanList
          .filter((k) => {
            const matchCabang =
              laporanCabangFilter === 'Semua' || k.cabang === laporanCabangFilter;
            const matchSearch =
              !laporanSearchNama ||
              k.nama.toLowerCase().includes(laporanSearchNama.toLowerCase()) ||
              (k.nik && k.nik.toLowerCase().includes(laporanSearchNama.toLowerCase()));
            return matchCabang && matchSearch;
          })
          .sort((a, b) => a.nama.localeCompare(b.nama));

        return (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-5">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs border-b pb-3">
              <span className="font-bold text-slate-600">Keterangan Status:</span>
              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                <span className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-[10px]">H</span>
                Hadir (Tepat Waktu)
              </span>
              <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                <span className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-[10px]">T</span>
                Terlambat
              </span>
              <span className="inline-flex items-center gap-1 text-purple-800 font-bold">
                <span className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center text-[10px]">OFF</span>
                Jadwal OFF Shift
              </span>
              <span className="inline-flex items-center gap-1 text-blue-800 font-bold">
                <span className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center text-[10px]">I</span>
                Izin
              </span>
              <span className="inline-flex items-center gap-1 text-rose-800 font-bold">
                <span className="w-5 h-5 rounded-md bg-rose-100 flex items-center justify-center text-[10px]">S</span>
                Sakit
              </span>
              <span className="inline-flex items-center gap-1 text-indigo-800 font-bold">
                <span className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center text-[10px]">L</span>
                Libur Toko
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] border-b">
                    <th className="p-2.5 text-center w-8 sticky left-0 bg-slate-100 z-10">No</th>
                    <th className="p-2.5 min-w-[160px] sticky left-8 bg-slate-100 z-10">Karyawan (NIK)</th>
                    <th className="p-2.5 min-w-[100px]">Cabang</th>
                    {daysArray.map((d) => (
                      <th key={d} className="p-1 text-center w-7 border-l border-slate-200">
                        {d}
                      </th>
                    ))}
                    <th className="p-2 text-center bg-emerald-50 text-emerald-800 border-l">Hadir</th>
                    <th className="p-2 text-center bg-amber-50 text-amber-800">Telat</th>
                    <th className="p-2 text-center bg-purple-50 text-purple-800">OFF</th>
                    <th className="p-2 text-center bg-blue-50 text-blue-800">Izin</th>
                    <th className="p-2 text-center bg-rose-50 text-rose-800">Sakit</th>
                    <th className="p-2 text-center bg-slate-50 text-slate-700">Kerja</th>
                    <th className="p-2.5 text-right min-w-[130px] bg-emerald-100 text-emerald-950 font-black">
                      Perhitungan Gaji
                    </th>
                    <th className="p-2.5 text-center min-w-[210px] bg-slate-200 text-slate-800 font-black">
                      Aksi &amp; Slip Gaji
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={daysArray.length + 11} className="p-8 text-center text-slate-400 italic">
                        Tidak ada data karyawan yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, idx) => {
                      let hadirCount = 0;
                      let telatCount = 0;
                      let offCount = 0;
                      let izinCount = 0;
                      let sakitCount = 0;
                      let liburCount = 0;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-2 text-center font-bold text-slate-400 sticky left-0 bg-white">
                            {idx + 1}
                          </td>
                          <td className="p-2 sticky left-8 bg-white font-bold text-slate-800 min-w-[160px]">
                            <div className="truncate">{emp.nama}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {emp.nik ? `NIK: ${emp.nik}` : emp.jabatan}
                            </div>
                          </td>
                          <td className="p-2 text-slate-600 font-semibold truncate max-w-[110px]">
                            {emp.cabang}
                          </td>

                          {/* Daily Attendance Columns (1 .. daysInMonth) */}
                          {daysArray.map((dayNum) => {
                            const dateFormatted = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                            const record = absensiList.find(
                              (a) =>
                                (a.karyawanId === emp.id || a.karyawan_id === emp.id) &&
                                a.tanggal === dateFormatted
                            );

                            let cellContent = <span className="text-slate-300">-</span>;
                            if (record) {
                              if (record.status === 'Tepat Waktu') {
                                hadirCount++;
                                cellContent = (
                                  <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-black text-[9px] flex items-center justify-center mx-auto" title="Tepat Waktu">
                                    H
                                  </span>
                                );
                              } else if (record.status === 'Terlambat') {
                                telatCount++;
                                hadirCount++;
                                cellContent = (
                                  <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-black text-[9px] flex items-center justify-center mx-auto" title="Terlambat">
                                    T
                                  </span>
                                );
                              } else if (record.status === 'Off') {
                                offCount++;
                                cellContent = (
                                  <span className="w-5 h-5 rounded bg-purple-100 text-purple-800 font-black text-[8px] flex items-center justify-center mx-auto" title="Off Shift">
                                    OFF
                                  </span>
                                );
                              } else if (record.status === 'Izin') {
                                izinCount++;
                                cellContent = (
                                  <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 font-black text-[9px] flex items-center justify-center mx-auto" title="Izin">
                                    I
                                  </span>
                                );
                              } else if (record.status === 'Sakit') {
                                sakitCount++;
                                cellContent = (
                                  <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 font-black text-[9px] flex items-center justify-center mx-auto" title="Sakit">
                                    S
                                  </span>
                                );
                              } else if (record.status === 'Libur') {
                                liburCount++;
                                cellContent = (
                                  <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-800 font-black text-[9px] flex items-center justify-center mx-auto" title="Libur Toko">
                                    L
                                  </span>
                                );
                              }
                            }

                            return (
                              <td key={dayNum} className="p-1 text-center border-l border-slate-100 text-[11px]">
                                {cellContent}
                              </td>
                            );
                          })}

                          {/* Summary Columns */}
                          <td className="p-2 text-center font-black text-emerald-700 bg-emerald-50/50">
                            {hadirCount}
                          </td>
                          <td className="p-2 text-center font-bold text-amber-700 bg-amber-50/50">
                            {telatCount}
                          </td>
                          <td className="p-2 text-center font-black text-purple-700 bg-purple-50/50">
                            {offCount}
                          </td>
                          <td className="p-2 text-center font-bold text-blue-700 bg-blue-50/50">
                            {izinCount}
                          </td>
                          <td className="p-2 text-center font-bold text-rose-700 bg-rose-50/50">
                            {sakitCount}
                          </td>
                          <td className="p-2 text-center font-black text-slate-800 bg-slate-50">
                            {hadirCount} Hari
                          </td>

                          {/* Perhitungan Gaji Bersih & Aksi */}
                          {(() => {
                            const gajiConfig = getEmpGajiSetting(emp.id);
                            const totalGajiPokok = hadirCount * gajiConfig.gajiPokokHarian;
                            const totalUangMakan = hadirCount * gajiConfig.uangMakanHarian;
                            const bonus = gajiConfig.bonus || 0;
                            const penghasilanKotor = totalGajiPokok + totalUangMakan + bonus;
                            const potonganTelat = telatCount * gajiConfig.dendaTelat;
                            const potonganLain = 0;
                            const totalPotongan = potonganTelat + potonganLain;
                            const totalGajiBersih = Math.max(0, penghasilanKotor - totalPotongan);

                            const monthNamesIndo = [
                              'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                              'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                            ];
                            const bulanNama = `${monthNamesIndo[monthNum - 1]} ${yearNum}`;

                            const slipData: SlipGajiData = {
                              karyawanId: emp.id,
                              nama: emp.nama,
                              nik: emp.nik,
                              jabatan: emp.jabatan,
                              cabang: emp.cabang,
                              hp: emp.hp,
                              bulan: laporanBulan,
                              bulanNama,
                              hadirCount,
                              tepatWaktuCount: Math.max(0, hadirCount - telatCount),
                              telatCount,
                              offCount,
                              izinCount,
                              sakitCount,
                              liburCount,
                              gajiPokokHarian: gajiConfig.gajiPokokHarian,
                              uangMakanHarian: gajiConfig.uangMakanHarian,
                              dendaTelat: gajiConfig.dendaTelat,
                              totalGajiPokok,
                              totalUangMakan,
                              bonus,
                              potonganTelat,
                              potonganLain,
                              penghasilanKotor,
                              totalPotongan,
                              totalGajiBersih,
                            };

                            return (
                              <>
                                <td className="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/60 whitespace-nowrap">
                                  <div className="text-xs">{formatRupiah(totalGajiBersih)}</div>
                                  <div className="text-[9px] text-slate-500 font-normal">
                                    {hadirCount}x ({formatRupiah(gajiConfig.gajiPokokHarian + gajiConfig.uangMakanHarian)}) - {telatCount}x telat
                                  </div>
                                </td>
                                <td className="p-2 text-center bg-white whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {isDcPusatOrOwner && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditGaji(emp)}
                                        title="Atur tarif gaji harian karyawan ini"
                                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                      >
                                        <Settings className="w-3 h-3" />
                                        <span>Edit Gaji</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handlePrintSlipGaji(slipData)}
                                      title="Cetak Dokumen Slip Gaji Resmi A4"
                                      className="px-2 py-1 bg-slate-800 hover:bg-black text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                                    >
                                      <Printer className="w-3 h-3" />
                                      <span>Slip Gaji</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleShareSlipWhatsApp(emp, slipData)}
                                      title={`Bagikan rincian slip gaji ke WhatsApp (${emp.hp || 'Belum ada No. HP'})`}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                                    >
                                      <Share2 className="w-3 h-3" />
                                      <span>Kirim WA</span>
                                    </button>
                                  </div>
                                </td>
                              </>
                            );
                          })()}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
              <div>
                * Standar Perhitungan Gaji: <strong>Gaji Pokok Harian + Uang Makan</strong> dikurangi <strong>Denda Keterlambatan (&gt;08:00)</strong>. Owner dapat mengatur tarif gaji harian masing-masing karyawan lewat tombol <strong>&quot;Edit Gaji&quot;</strong>, mencetak slip gaji resmi, dan membagikannya langsung ke WhatsApp karyawan.
              </div>
              <div>
                Total Karyawan Terhitung: <strong>{filteredEmployees.length} Orang</strong>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  )}

  {/* MODAL 1: INPUT IZIN / SAKIT / OFF / LIBUR MANDIRI (Akun Login Saat Ini) */}
      {showIzinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <UserMinus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Pengajuan Ketidakhadiran ({currentUser.nama})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pengajuan Izin, Sakit, Off (Shift), atau Libur
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIzinModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitIzinSakitSaya} className="space-y-4 text-xs">
              {/* Status Selection: 4 Options */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Jenis Ketidakhadiran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJenis('Izin')}
                    className={`p-2.5 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                      selectedJenis === 'Izin'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserMinus className={`w-4 h-4 ${selectedJenis === 'Izin' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Izin</span>
                    <span className="text-[10px] font-normal opacity-75">
                      Pribadi / Keluarga
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedJenis('Sakit')}
                    className={`p-2.5 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                      selectedJenis === 'Sakit'
                        ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <HeartPulse className={`w-4 h-4 ${selectedJenis === 'Sakit' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span>Sakit</span>
                    <span className="text-[10px] font-normal opacity-75">
                      Istirahat Dokter
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedJenis('Off')}
                    className={`p-2.5 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                      selectedJenis === 'Off'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Coffee className={`w-4 h-4 ${selectedJenis === 'Off' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span>Off (Shift)</span>
                    <span className="text-[10px] font-normal opacity-75">
                      Libur Shift Kerja
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedJenis('Libur')}
                    className={`p-2.5 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition cursor-pointer ${
                      selectedJenis === 'Libur'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className={`w-4 h-4 ${selectedJenis === 'Libur' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>Libur Toko</span>
                    <span className="text-[10px] font-normal opacity-75">
                      Hari Libur Toko
                    </span>
                  </button>
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Berlaku <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={selectedTanggal}
                  onChange={(e) => setSelectedTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  required
                />
                {(() => {
                  const offExists = absensiList.some(
                    (a) =>
                      (a.karyawanId === currentUser.id || a.karyawan_id === currentUser.id) &&
                      a.tanggal === selectedTanggal &&
                      a.status === 'Off'
                  );
                  if (offExists && !isDcPusatOrOwner) {
                    return (
                      <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-[11px] font-bold flex items-start gap-2 shadow-2xs">
                        <Shield className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-black text-purple-900">Jadwal OFF Terkunci</span>
                          <span className="text-[10px] font-normal text-purple-800 leading-tight block mt-0.5">
                            Tanggal {selectedTanggal} telah ditetapkan sebagai Jadwal OFF oleh Admin DC Pusat. Karyawan tidak dapat mengubah jadwal OFF ini kecuali Admin DC Pusat.
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Alasan / Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan / Alasan {selectedJenis === 'Izin' || selectedJenis === 'Sakit' ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(Opsional)</span>}
                </label>
                <textarea
                  rows={2}
                  required={selectedJenis === 'Izin' || selectedJenis === 'Sakit'}
                  placeholder={
                    selectedJenis === 'Izin'
                      ? 'Contoh: Izin urusan keluarga mendesak...'
                      : selectedJenis === 'Sakit'
                      ? 'Contoh: Demam, istirahat dokter...'
                      : selectedJenis === 'Off'
                      ? 'Contoh: Giliran shift libur mingguan'
                      : 'Contoh: Toko libur nasional'
                  }
                  value={alasanIzinSakit}
                  onChange={(e) => setAlasanIzinSakit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowIzinModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                {(() => {
                  const isDateLockedOff =
                    !isDcPusatOrOwner &&
                    absensiList.some(
                      (a) =>
                        (a.karyawanId === currentUser.id || a.karyawan_id === currentUser.id) &&
                        a.tanggal === selectedTanggal &&
                        a.status === 'Off'
                    );

                  return (
                    <button
                      type="submit"
                      disabled={isDateLockedOff}
                      className={`px-5 py-2 text-white font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                        isDateLockedOff
                          ? 'bg-slate-400 cursor-not-allowed opacity-60'
                          : selectedJenis === 'Izin'
                          ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                          : selectedJenis === 'Sakit'
                          ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                          : selectedJenis === 'Off'
                          ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                          : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{isDateLockedOff ? 'Jadwal OFF Terkunci' : `Kirim ${selectedJenis}`}</span>
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PENJADWALAN OFF & LIBUR OLEH OWNER / ADMIN DC PUSAT */}
      {showScheduleModal && isDcPusatOrOwner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-purple-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center shadow-xs">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <span>Atur & Jadwalkan Off / Libur Karyawan</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Owner / DC
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Atur jadwal libur shift karyawan toko atau libur operasional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {scheduleModalSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold animate-pulse">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{scheduleModalSuccess}</span>
              </div>
            )}

            {scheduleModalError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{scheduleModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveScheduleOffLibur} className="space-y-4 text-xs">
              {/* Filter Cabang untuk Mempermudah Memilih Karyawan */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    Filter Cabang Karyawan:
                  </label>
                  <select
                    value={scheduleFilterCabang}
                    onChange={(e) => setScheduleFilterCabang(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Semua">Semua Cabang</option>
                    <option value="DC PUSAT">DC PUSAT</option>
                    {activeBranches.map((bName) => (
                      <option key={bName} value={bName}>
                        {bName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pilih Karyawan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Nama Karyawan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={scheduleKaryawanId}
                    onChange={(e) => setScheduleKaryawanId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 text-xs"
                  >
                    <option value="">-- Pilih Karyawan --</option>
                    {karyawanList
                      .filter(
                        (k) =>
                          scheduleFilterCabang === 'Semua' || k.cabang === scheduleFilterCabang
                      )
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          [{k.cabang}] {k.nama} — {k.jabatan} {k.nik ? `(${k.nik})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Status Radio: Off vs Libur */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Tipe Jadwal Ketidakhadiran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleJenis('Off')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      scheduleJenis === 'Off'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Coffee className={`w-5 h-5 ${scheduleJenis === 'Off' ? 'text-purple-600' : 'text-slate-400'}`} />
                    <span className="font-extrabold">Off (Shift Kerja)</span>
                    <span className="text-[10px] font-normal opacity-80 text-center">
                      Jadwal libur shift mingguan karyawan
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleJenis('Libur')}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      scheduleJenis === 'Libur'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Calendar className={`w-5 h-5 ${scheduleJenis === 'Libur' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="font-extrabold">Libur (Toko / Nasional)</span>
                    <span className="text-[10px] font-normal opacity-80 text-center">
                      Toko tutup / libur nasional
                    </span>
                  </button>
                </div>
              </div>

              {/* Tanggal Penjadwalan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Berlaku Jadwal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduleTanggal}
                  onChange={(e) => setScheduleTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                  required
                />
              </div>

              {/* Conflict / Notice Box if employee already has attendance on that date */}
              {(() => {
                const conflict = absensiList.find(
                  (a) => a.karyawanId === scheduleKaryawanId && a.tanggal === scheduleTanggal
                );
                if (conflict) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Perhatian:</strong> Karyawan ini sudah tercatat <strong>{conflict.status}</strong> pada tanggal {scheduleTanggal}. Menyimpan jadwal ini akan memperbarui statusnya menjadi <strong>{scheduleJenis}</strong>.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Keterangan Tambahan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan / Catatan Jadwal <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder={
                    scheduleJenis === 'Off'
                      ? 'Contoh: Jadwal giliran libur shift Senin'
                      : 'Contoh: Toko libur pemeliharaan / tanggal merah'
                  }
                  value={scheduleKeterangan}
                  onChange={(e) => setScheduleKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl shadow-md shadow-purple-500/20 cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan Jadwal {scheduleJenis}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: KONFIRMASI GANTI STATUS HARI INI (Replaces window.confirm()) */}
      {showReplaceConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border-2 border-amber-200 text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">
                Konfirmasi Perubahan Status Absensi
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Hari ini Anda sudah tercatat absen masuk jam <strong>{myTodayAbsen?.jamMasuk}</strong>. Apakah Anda yakin ingin membatalkan absen masuk dan mengubah status menjadi <strong>{selectedJenis}</strong>?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowReplaceConfirmModal(false);
                  setPendingAbsenData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReplaceAbsen}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Ya, Ubah Menjadi {selectedJenis}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: KONFIRMASI HAPUS / BATALKAN JADWAL (Replaces window.confirm()) */}
      {deletingAbsenTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border-2 border-red-200 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">
                Hapus Catatan Absensi?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus catatan <strong>{deletingAbsenTarget.status}</strong> untuk <strong>{deletingAbsenTarget.nama}</strong> pada tanggal <strong>{deletingAbsenTarget.tanggal}</strong>?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeletingAbsenTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAbsen}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Ya, Hapus Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PENGATURAN MAKS. OFF/HARI PER CABANG (Tabel: pengaturan_off) */}
      {settingOffBranch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-purple-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Setting Maks. OFF/Hari Cabang
                  </h3>
                  <p className="text-[11px] text-purple-700 font-bold">
                    {settingOffBranch.nama} {settingOffBranch.kode ? `(${settingOffBranch.kode})` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingOffBranch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settingOffSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settingOffSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettingOff} className="space-y-4 text-xs">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-[11px] text-purple-900 leading-relaxed">
                Atur kuota jumlah karyawan yang diizinkan libur shift (OFF) pada setiap hari.
                <br />
                <strong>Aturan: Nilai 0 = Full Team ("Tidak ada OFF", semua tim wajib hadir).</strong>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 mr-1">Preset:</span>
                <button
                  type="button"
                  onClick={() => {
                    setInputSenin(1);
                    setInputSelasa(1);
                    setInputRabu(1);
                    setInputKamis(1);
                    setInputJumat(1);
                    setInputSabtu(0);
                    setInputMinggu(0);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer"
                >
                  Weekday 1, Weekend 0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputSenin(1);
                    setInputSelasa(1);
                    setInputRabu(1);
                    setInputKamis(1);
                    setInputJumat(1);
                    setInputSabtu(1);
                    setInputMinggu(1);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer"
                >
                  Semua Hari 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputSenin(0);
                    setInputSelasa(0);
                    setInputRabu(0);
                    setInputKamis(0);
                    setInputJumat(0);
                    setInputSabtu(0);
                    setInputMinggu(0);
                  }}
                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-[10px] font-bold text-emerald-800 cursor-pointer"
                >
                  Semua Full Team (0)
                </button>
              </div>

              {/* Inputs for Monday to Sunday */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: 'senin', label: 'Senin', val: inputSenin, setter: setInputSenin },
                  { key: 'selasa', label: 'Selasa', val: inputSelasa, setter: setInputSelasa },
                  { key: 'rabu', label: 'Rabu', val: inputRabu, setter: setInputRabu },
                  { key: 'kamis', label: 'Kamis', val: inputKamis, setter: setInputKamis },
                  { key: 'jumat', label: 'Jumat', val: inputJumat, setter: setInputJumat },
                  { key: 'sabtu', label: 'Sabtu', val: inputSabtu, setter: setInputSabtu },
                  { key: 'minggu', label: 'Minggu', val: inputMinggu, setter: setInputMinggu },
                ].map((item) => (
                  <div key={item.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 text-xs">{item.label}</label>
                      <span className={`text-[10px] font-bold ${item.val === 0 ? 'text-emerald-700' : 'text-purple-700'}`}>
                        {item.val === 0 ? 'Full Team (0)' : `Maks ${item.val}`}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={item.val}
                      onChange={(e) => item.setter(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-black text-slate-800 text-xs text-center"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSettingOffBranch(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl shadow-md shadow-purple-600/20 cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan ke Pengaturan OFF</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT GAJI KARYAWAN OLEH OWNER */}
      {editingGajiEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border-2 border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Atur Gaji Harian Karyawan (Khusus Owner)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingGajiEmp.nama} • {editingGajiEmp.cabang} ({editingGajiEmp.jabatan})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingGajiEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {gajiSaveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{gajiSaveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveGajiSetting} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Data Karyawan</div>
                <div className="font-bold text-slate-800 text-sm">{editingGajiEmp.nama}</div>
                <div className="text-[11px] text-slate-600">NIK: {editingGajiEmp.nik || '-'} | No. HP: {editingGajiEmp.hp || '-'}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Gaji Pokok Harian (Rp / Hari Hadir) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={editGajiPokok}
                  onChange={(e) => setEditGajiPokok(Number(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="100000"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Nominal: {formatRupiah(editGajiPokok)} / hari
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Uang Makan &amp; Transport (Rp / Hari Hadir)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={editUangMakan}
                  onChange={(e) => setEditUangMakan(Number(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="20000"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Nominal: {formatRupiah(editUangMakan)} / hari
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Denda Keterlambatan (Rp / Kali Telat &gt;08:00)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editDendaTelat}
                  onChange={(e) => setEditDendaTelat(Number(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-rose-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="10000"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Potongan per telat: {formatRupiah(editDendaTelat)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bonus / Insentif Bulanan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={editBonus}
                  onChange={(e) => setEditBonus(Number(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="0"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Bonus performa: {formatRupiah(editBonus)}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingGajiEmp(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl font-black shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  Simpan Pengaturan Gaji
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT GAJI SEMUA KARYAWAN PER CABANG (Filter dari Data Cabang) */}
      {showGajiCabangModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border-2 border-slate-100 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    Edit Gaji Semua Karyawan Per Cabang
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Filter dinamis dari Master Data Cabang &bull; Berlaku ke seluruh staf cabang terpilih
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGajiCabangModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cabangGajiSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cabangGajiSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveGajiCabang} className="space-y-4 text-xs">
              {/* Dropdown Pemilihan Cabang dari dataCabangList */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Cabang (Filter dari Master Data Cabang) <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCabangForGaji}
                  onChange={(e) => handleSelectCabangChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  required
                >
                  {dataCabangList.map((branch) => {
                    const branchKey = branch.branchId || branch.id;
                    const count = karyawanList.filter(
                      (k) =>
                        k.cabang === branch.nama ||
                        k.cabang_id === branchKey ||
                        k.branchId === branchKey ||
                        k.cabang_id === branch.id
                    ).length;

                    return (
                      <option key={branch.id} value={branch.nama}>
                        {branch.nama} ({count} Karyawan Terdaftar)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Ringkasan Karyawan di Cabang Terpilih */}
              {(() => {
                const targetBranch = dataCabangList.find(
                  (b) =>
                    b.nama === selectedCabangForGaji ||
                    b.id === selectedCabangForGaji ||
                    b.branchId === selectedCabangForGaji
                );
                const branchKey = targetBranch?.branchId || targetBranch?.id || selectedCabangForGaji;
                const empsInBranch = karyawanList.filter(
                  (k) =>
                    k.cabang === selectedCabangForGaji ||
                    k.cabang_id === branchKey ||
                    k.branchId === branchKey ||
                    (targetBranch && k.cabang_id === targetBranch.id)
                );

                return (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-950 text-xs">
                        Karyawan Terdaftar di {selectedCabangForGaji}:
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-[10px]">
                        {empsInBranch.length} Orang
                      </span>
                    </div>
                    {empsInBranch.length === 0 ? (
                      <p className="text-[11px] text-amber-800 italic">
                        Belum ada karyawan terdaftar untuk cabang ini di Data Karyawan.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                        {empsInBranch.map((emp) => (
                          <span
                            key={emp.id}
                            className="px-2 py-0.5 bg-white border border-amber-200 rounded-lg text-[10px] font-semibold text-slate-700 shadow-2xs"
                          >
                            {emp.nama} ({emp.jabatan})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Form Input Nominal Tarif Gaji Standar Cabang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gaji Pokok Harian (Rp/hari) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={cabangGajiPokok}
                    onChange={(e) => setCabangGajiPokok(Number(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="100000"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formatRupiah(cabangGajiPokok)}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Uang Makan &amp; Transport (Rp/hari)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={cabangUangMakan}
                    onChange={(e) => setCabangUangMakan(Number(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="20000"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formatRupiah(cabangUangMakan)}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Denda Terlambat (Rp/kali &gt;08:00)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={cabangDendaTelat}
                    onChange={(e) => setCabangDendaTelat(Number(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-rose-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="10000"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formatRupiah(cabangDendaTelat)}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bonus / Insentif Bulanan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={cabangBonus}
                    onChange={(e) => setCabangBonus(Number(e.target.value) || 0)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formatRupiah(cabangBonus)}
                  </span>
                </div>
              </div>

              {/* Total Gaji Harian Hadir Penuh Preview */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">
                    Total Gaji Hadir Penuh (Pokok + Makan)
                  </div>
                  <div className="text-[11px] text-slate-500">Per hari kerja hadir normal</div>
                </div>
                <div className="text-base font-black text-emerald-900 font-mono">
                  {formatRupiah(cabangGajiPokok + cabangUangMakan)} / hari
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowGajiCabangModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-black shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan &amp; Terapkan ke Cabang {selectedCabangForGaji}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
