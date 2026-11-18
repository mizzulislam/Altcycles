// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShortcutsManagementPage } from "@/features/system-config/shortcuts-management-page";
import {
  resetAllShortcutOverrides,
  saveShortcutOverride,
  getShortcutOverrides,
} from "@/lib/navigation-shortcuts-registry";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-i18next
vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback || key,
      i18n: { language: "id" },
    }),
  };
});

describe("ShortcutsManagementPage (Langkah 3: Pengaturan Super Admin)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAllShortcutOverrides();
  });

  afterEach(() => {
    localStorage.clear();
    resetAllShortcutOverrides();
    vi.clearAllMocks();
  });

  it("merender judul halaman dan 4 kartu ringkasan KPI sesuai standar AGENTS.md", () => {
    render(<ShortcutsManagementPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Pintasan Keyboard" })).toBeInTheDocument();
    expect(screen.getByText("Total Terdaftar")).toBeInTheDocument();
    expect(screen.getByText("Pintasan Kustom")).toBeInTheDocument();
    expect(screen.getByText("Sistem Terkunci")).toBeInTheDocument();
    expect(screen.getByText("Cakupan Portal")).toBeInTheDocument();
    expect(screen.getByText("3 Portal")).toBeInTheDocument();
  });

  it("menampilkan tabel pemetaan pintasan dengan kolom lengkap dan proper case", () => {
    render(<ShortcutsManagementPage />);

    expect(screen.getByText("Aksi & Modul")).toBeInTheDocument();
    expect(screen.getByText("Peran Akses")).toBeInTheDocument();
    expect(screen.getByText("Tombol Bawaan")).toBeInTheDocument();
    expect(screen.getByText("Tombol Efektif")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Aksi")).toBeInTheDocument();

    // Pastikan tombol bawaan dan terkunci ditampilkan
    expect(screen.getAllByText("Terkunci").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bawaan").length).toBeGreaterThan(0);
  });

  it("dapat memfilter daftar pintasan berdasarkan query pencarian", () => {
    render(<ShortcutsManagementPage />);

    const searchInput = screen.getByPlaceholderText("Cari pintasan...");
    act(() => {
      fireEvent.change(searchInput, { target: { value: "Audit Trail" } });
    });

    expect(screen.getByText("Audit Trail")).toBeInTheDocument();

    // Cari teks yang tidak ada
    act(() => {
      fireEvent.change(searchInput, { target: { value: "xyz_tidak_mungkin_ada_123" } });
    });
    expect(screen.getByText("Tidak ada pintasan yang cocok")).toBeInTheDocument();
  });

  it("membuka modal edit saat tombol edit diklik pada pintasan tidak terkunci", () => {
    render(<ShortcutsManagementPage />);

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    const firstEnabledEdit = editButtons.find((btn) => !btn.hasAttribute("disabled"));

    expect(firstEnabledEdit).toBeDefined();
    if (firstEnabledEdit) {
      act(() => {
        fireEvent.click(firstEnabledEdit);
      });
      expect(screen.getByText("Ubah Pintasan Keyboard")).toBeInTheDocument();
      expect(screen.getByText("Kombinasi Tombol Baru")).toBeInTheDocument();
      expect(screen.getByText("Simpan Perubahan")).toBeInTheDocument();
    }
  });

  it("mencegah penyimpanan jika terdapat konflik tombol dengan aksi pada peran yang sama", () => {
    render(<ShortcutsManagementPage />);

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    const firstEnabledEdit = editButtons.find((btn) => !btn.hasAttribute("disabled"));
    expect(firstEnabledEdit).toBeDefined();

    if (firstEnabledEdit) {
      act(() => {
        fireEvent.click(firstEnabledEdit);
      });

      const recorderArea = screen.getByRole("button", { name: "Area Perekaman Tombol" });
      act(() => {
        fireEvent.click(recorderArea);
      });

      act(() => {
        fireEvent.keyDown(recorderArea, { key: "/" });
      });

      expect(screen.getByText(/Konflik tombol terdeteksi dengan/i)).toBeInTheDocument();

      const saveButton = screen.getByRole("button", { name: "Simpan Perubahan" });
      expect(saveButton).toBeDisabled();
    }
  });

  it("berhasil menyimpan pintasan kustom baru dan merefleksikannya di tabel", () => {
    render(<ShortcutsManagementPage />);

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    const firstEnabledEdit = editButtons.find((btn) => !btn.hasAttribute("disabled"));

    if (firstEnabledEdit) {
      act(() => {
        fireEvent.click(firstEnabledEdit);
      });

      // Rekam kombinasi tombol unik dan valid: Mod + Shift + K
      const recorderArea = screen.getByRole("button", { name: "Area Perekaman Tombol" });
      act(() => {
        fireEvent.click(recorderArea);
      });
      act(() => {
        fireEvent.keyDown(recorderArea, { key: "k", ctrlKey: true, shiftKey: true });
      });

      const saveButton = screen.getByRole("button", { name: "Simpan Perubahan" });
      expect(saveButton).not.toBeDisabled();
      act(() => {
        fireEvent.click(saveButton);
      });

      expect(screen.queryByText("Ubah Pintasan Keyboard")).not.toBeInTheDocument();
      expect(screen.getAllByText("Kustom").length).toBeGreaterThan(0);
    }
  });

  it("dapat mereset pintasan individual kembali ke bawaan", () => {
    saveShortcutOverride("nav_super_dashboard", ["mod", "shift", "d"]);

    render(<ShortcutsManagementPage />);

    const resetButtons = screen.getAllByRole("button", { name: "Reset" });
    const activeReset = resetButtons.find((btn) => !btn.hasAttribute("disabled"));
    expect(activeReset).toBeDefined();

    if (activeReset) {
      act(() => {
        fireEvent.click(activeReset);
      });
      const overrides = getShortcutOverrides();
      expect(overrides["nav_super_dashboard"]).toBeUndefined();
    }
  });

  it("tombol 'Reset Semua ke Default' membuka dialog konfirmasi dan mereset semua override", () => {
    saveShortcutOverride("nav_super_dashboard", ["mod", "shift", "d"]);
    saveShortcutOverride("nav_admin_dashboard", ["mod", "shift", "a"]);

    render(<ShortcutsManagementPage />);

    const resetAllBtn = screen.getByRole("button", { name: "Reset Semua ke Default" });
    expect(resetAllBtn).not.toBeDisabled();

    act(() => {
      fireEvent.click(resetAllBtn);
    });

    expect(screen.getByText("Reset Semua Pintasan ke Bawaan?")).toBeInTheDocument();
    const confirmButton = screen.getByRole("button", { name: "Ya, Reset Semua" });
    act(() => {
      fireEvent.click(confirmButton);
    });

    const overrides = getShortcutOverrides();
    expect(Object.keys(overrides).length).toBe(0);
  });
});
