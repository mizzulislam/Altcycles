// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandPaletteDialog } from "@/components/navigation/command-palette-dialog";
import { clearPageVisitHistory, recordPageVisit } from "@/lib/navigation-history";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        "common:search.placeholder": "Cari halaman...",
        "common:search.modal_placeholder": "Ketik perintah, nama halaman, atau kata kunci...",
        "common:search.frequently_visited": "Sering Dikunjungi",
        "common:search.shortcuts": "Pintasan Cepat",
        "common:search.quick_actions": "Aksi Cepat",
        "common:search.show_all_shortcuts": "Tampilkan semua pintasan keyboard",
        "common:search.no_results": "Tidak ada halaman atau aksi yang cocok",
        "common:search.navigation_hint": "Gunakan panah ↑↓ untuk memilih, Enter untuk membuka, Esc untuk menutup",
        "common:search.modules.general": "Umum",
        "common:search.modules.dashboard": "Dashboard",
        "common:search.modules.operations": "Operasional & PO",
        "common:search.modules.projects": "Proyek & Pendapatan",
        "common:search.modules.accounting": "Akuntansi & Laporan",
        "common:search.modules.master": "Master Data",
        "common:search.modules.system": "Sistem Super Admin",
        "accounting:tab_ledger": "Buku Besar",
        "accounting:tab_journal": "Jurnal Umum",
        "common:nav.dashboard": "Dashboard Keuangan",
        "common:nav.accounting": "Akuntansi & Laporan",
      };
      return translations[key] || fallback || key;
    },
    i18n: { language: "id" },
  }),
}));

describe("Komponen CommandPaletteDialog", () => {
  beforeEach(() => {
    clearPageVisitHistory();
  });

  it("merender modal saat isOpen bernilai true dengan placeholder pencarian", () => {
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <CommandPaletteDialog
          isOpen={true}
          onClose={handleClose}
          currentRole="admin"
        />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(
      "Ketik perintah, nama halaman, atau kata kunci...",
    );
    expect(input).toBeInTheDocument();
  });

  it("menampilkan bagian 'Sering Dikunjungi' dan 'Aksi Cepat' saat input kosong", () => {
    recordPageVisit("tab_accounting_ledger", "admin");

    render(
      <MemoryRouter>
        <CommandPaletteDialog
          isOpen={true}
          onClose={vi.fn()}
          currentRole="admin"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sering Dikunjungi")).toBeInTheDocument();
    expect(screen.getByText("Aksi Cepat")).toBeInTheDocument();
    expect(
      screen.getByText("Tampilkan semua pintasan keyboard"),
    ).toBeInTheDocument();
  });

  it("memfilter hasil secara dinamis saat pengguna mengetik kata kunci pencarian", () => {
    render(
      <MemoryRouter>
        <CommandPaletteDialog
          isOpen={true}
          onClose={vi.fn()}
          currentRole="admin"
        />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(
      "Ketik perintah, nama halaman, atau kata kunci...",
    );

    // Ketik "buku besar"
    fireEvent.change(input, { target: { value: "buku besar" } });
    expect(screen.getByText("Buku Besar")).toBeInTheDocument();

    // Ketik kata kunci tidak ada
    fireEvent.change(input, { target: { value: "keywordacak999" } });
    expect(
      screen.getByText("Tidak ada halaman atau aksi yang cocok"),
    ).toBeInTheDocument();
  });

  it("dapat menemukan 'Tampilkan semua pintasan keyboard' via pencarian 'shortcut' atau 'pintasan'", () => {
    render(
      <MemoryRouter>
        <CommandPaletteDialog
          isOpen={true}
          onClose={vi.fn()}
          currentRole="admin"
        />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(
      "Ketik perintah, nama halaman, atau kata kunci...",
    );

    fireEvent.change(input, { target: { value: "shortcut" } });
    expect(
      screen.getByText("Tampilkan semua pintasan keyboard"),
    ).toBeInTheDocument();
  });

  it("memanggil callback onOpenShortcutsPanel saat memilih 'Tampilkan semua pintasan keyboard'", () => {
    const handleOpenShortcuts = vi.fn();
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <CommandPaletteDialog
          isOpen={true}
          onClose={handleClose}
          onOpenShortcutsPanel={handleOpenShortcuts}
          currentRole="admin"
        />
      </MemoryRouter>,
    );

    const shortcutsBtn = screen.getByText("Tampilkan semua pintasan keyboard");
    fireEvent.click(shortcutsBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenShortcuts).toHaveBeenCalled();
  });

  it("menutup modal saat pengguna menekan tombol Escape", () => {
    const handleClose = vi.fn();

    render(
      <MemoryRouter>
        <CommandPaletteDialog
          isOpen={true}
          onClose={handleClose}
          currentRole="admin"
        />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(
      "Ketik perintah, nama halaman, atau kata kunci...",
    );
    fireEvent.keyDown(input, { key: "Escape" });

    expect(handleClose).toHaveBeenCalled();
  });
});
