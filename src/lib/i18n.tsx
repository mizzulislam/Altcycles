import * as React from "react";
import { toast } from "sonner";

export type Language = "id" | "en";

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = "altcycles_language";

const DICTIONARY: Record<Language, Record<string, string>> = {
  id: {
    // Navigasi & Umum
    "nav.dashboard": "Dashboard",
    "nav.accounting": "Akuntansi",
    "nav.reports": "Laporan Keuangan",
    "nav.projects": "Proyek",
    "nav.invoicing": "Penagihan",
    "nav.parties": "Vendor & Pelanggan",
    "nav.settings": "Pengaturan Sistem",
    "nav.profile": "Profil Perusahaan",
    "nav.users": "Pengguna",

    // Header & Tindakan
    "header.notifications": "Notifikasi sistem",
    "header.theme": "Ganti mode tema",
    "header.language": "Pilihan Bahasa (Language)",
    "header.active_mode": "Mode Aktif",
    "header.role_switch": "Ganti peran aktif sistem",

    // Aksi Umum
    "action.save": "Simpan Perubahan",
    "action.cancel": "Batal",
    "action.add": "Tambah Data",
    "action.edit": "Ubah",
    "action.delete": "Hapus",
    "action.search": "Cari data...",
    "action.filter": "Saring",
    "action.download": "Unduh / Ekspor",
    "action.export": "Ekspor Dokumen",
    "action.close": "Tutup",
    "action.confirm": "Konfirmasi",

    // Notifikasi Toast
    "lang.switched_id": "Bahasa sistem berhasil diubah ke Bahasa Indonesia.",
    "lang.switched_en": "System language switched to English.",
  },
  en: {
    // Navigasi & Umum
    "nav.dashboard": "Dashboard",
    "nav.accounting": "Accounting",
    "nav.reports": "Financial Reports",
    "nav.projects": "Projects",
    "nav.invoicing": "Invoicing",
    "nav.parties": "Vendors & Clients",
    "nav.settings": "System Settings",
    "nav.profile": "Company Profile",
    "nav.users": "Users Management",

    // Header & Tindakan
    "header.notifications": "System Notifications",
    "header.theme": "Toggle theme mode",
    "header.language": "Language Options",
    "header.active_mode": "Active Mode",
    "header.role_switch": "Switch active system role",

    // Aksi Umum
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.add": "Add Record",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.search": "Search records...",
    "action.filter": "Filter",
    "action.download": "Download / Export",
    "action.export": "Export Document",
    "action.close": "Close",
    "action.confirm": "Confirm",

    // Notifikasi Toast
    "lang.switched_id": "Bahasa sistem berhasil diubah ke Bahasa Indonesia.",
    "lang.switched_en": "System language switched to English.",
  },
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(() => {
    if (typeof window === "undefined") return "id";
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    return saved === "id" || saved === "en" ? saved : "id";
  });

  const setLanguage = React.useCallback((nextLang: Language) => {
    setLanguageState(nextLang);
    try {
      localStorage.setItem(STORAGE_KEY, nextLang);
      document.documentElement.setAttribute("lang", nextLang);
    } catch {
      // Abaikan jika storage penuh atau tidak tersedia
    }
  }, []);

  const toggleLanguage = React.useCallback(() => {
    const nextLang: Language = language === "id" ? "en" : "id";
    setLanguage(nextLang);
    const message =
      nextLang === "id"
        ? DICTIONARY.id["lang.switched_id"]
        : DICTIONARY.en["lang.switched_en"];
    toast.success(message, { duration: 2500 });
  }, [language, setLanguage]);

  React.useEffect(() => {
    try {
      document.documentElement.setAttribute("lang", language);
    } catch {
      // Abaikan
    }
  }, [language]);

  const t = React.useCallback(
    (key: string, fallback?: string): string => {
      const dict = DICTIONARY[language];
      const val = dict ? dict[key] : undefined;
      if (typeof val === "string") {
        return val;
      }
      return fallback !== undefined ? fallback : key;
    },
    [language],
  );

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    // Fallback aman jika digunakan di luar provider
    return {
      language: "id",
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (_key: string, fallback?: string) => fallback ?? _key,
    };
  }
  return ctx;
}
