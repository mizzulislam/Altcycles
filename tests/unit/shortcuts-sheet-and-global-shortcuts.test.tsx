// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShortcutsSheet } from "@/components/navigation/shortcuts-sheet";
import {
  isEditableElement,
  useGlobalShortcuts,
} from "@/hooks/use-global-shortcuts";
import {
  formatShortcutDisplay,
  saveShortcutOverride,
  resetAllShortcutOverrides,
} from "@/lib/navigation-shortcuts-registry";

// Mock router navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "id" },
  }),
}));

describe("Helper isEditableElement", () => {
  it("mengidentifikasi field formulir yang sedang diedit dengan benar", () => {
    const textInput = document.createElement("input");
    textInput.type = "text";
    expect(isEditableElement(textInput)).toBe(true);

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    expect(isEditableElement(emailInput)).toBe(true);

    const textarea = document.createElement("textarea");
    expect(isEditableElement(textarea)).toBe(true);

    const select = document.createElement("select");
    expect(isEditableElement(select)).toBe(true);

    const contentEditableDiv = document.createElement("div");
    contentEditableDiv.setAttribute("contenteditable", "true");
    expect(isEditableElement(contentEditableDiv)).toBe(true);

    const roleTextboxDiv = document.createElement("div");
    roleTextboxDiv.setAttribute("role", "textbox");
    expect(isEditableElement(roleTextboxDiv)).toBe(true);
  });

  it("tidak menandai elemen non-input sebagai editable", () => {
    const button = document.createElement("button");
    expect(isEditableElement(button)).toBe(false);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    expect(isEditableElement(checkbox)).toBe(false);

    const div = document.createElement("div");
    expect(isEditableElement(div)).toBe(false);

    expect(isEditableElement(null)).toBe(false);
  });
});

describe("Helper formatShortcutDisplay", () => {
  it("memformat pintasan sekuensial dengan kata 'lalu' dalam bahasa Indonesia", () => {
    const formatted = formatShortcutDisplay(["g", "d"], false, "id");
    expect(formatted.isSequence).toBe(true);
    expect(formatted.parts).toEqual(["G", "D"]);
    expect(formatted.sequenceThenText).toBe("lalu");
  });

  it("memformat pintasan sekuensial dengan kata 'then' dalam bahasa Inggris", () => {
    const formatted = formatShortcutDisplay(["g", "a"], false, "en");
    expect(formatted.isSequence).toBe(true);
    expect(formatted.parts).toEqual(["G", "A"]);
    expect(formatted.sequenceThenText).toBe("then");
  });

  it("memformat modifier Ctrl di Windows dan ⌘ di macOS", () => {
    const windows = formatShortcutDisplay(["mod", "shift", "j"], false, "id");
    expect(windows.isSequence).toBe(false);
    expect(windows.parts).toEqual(["Ctrl", "Shift", "J"]);

    const mac = formatShortcutDisplay(["mod", "shift", "j"], true, "id");
    expect(mac.isSequence).toBe(false);
    expect(mac.parts).toEqual(["⌘", "⇧", "J"]);
  });
});

describe("Hook useGlobalShortcuts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    resetAllShortcutOverrides();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestHarness({
    onOpenCommandPalette = vi.fn(),
    onOpenShortcutsPanel = vi.fn(),
    isModalOpen = false,
  }) {
    useGlobalShortcuts({
      currentRole: "admin",
      onOpenCommandPalette,
      onOpenShortcutsPanel,
      isModalOpen,
    });
    return <div data-testid="test-harness">Harness</div>;
  }

  it("membuka Command Palette saat tombol '/' ditekan di luar input", () => {
    const onOpenPalette = vi.fn();
    render(<TestHarness onOpenCommandPalette={onOpenPalette} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
    });

    expect(onOpenPalette).toHaveBeenCalledTimes(1);
  });

  it("membuka Panel Pintasan saat tombol '?' (Shift + /) ditekan", () => {
    const onOpenShortcuts = vi.fn();
    render(<TestHarness onOpenShortcutsPanel={onOpenShortcuts} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", shiftKey: true }));
    });

    expect(onOpenShortcuts).toHaveBeenCalledTimes(1);
  });

  it("tidak memicu pintasan saat fokus berada di elemen input", () => {
    const onOpenPalette = vi.fn();
    render(<TestHarness onOpenCommandPalette={onOpenPalette} />);

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "/", bubbles: true }),
      );
    });

    expect(onOpenPalette).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("menjalankan navigasi sekuensial 'G lalu D' ke /admin/dashboard dalam batas 1 detik", () => {
    render(<TestHarness />);

    // Tekan 'g'
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }));
    });

    // Tekan 'd' dalam rentang 400ms
    act(() => {
      vi.advanceTimersByTime(400);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    });

    expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("membatalkan urutan jika jeda antara 'g' dan tombol kedua melebihi 1 detik", () => {
    render(<TestHarness />);

    // Tekan 'g'
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }));
    });

    // Lewati waktu 1200ms
    act(() => {
      vi.advanceTimersByTime(1200);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("Komponen ShortcutsSheet", () => {
  beforeEach(() => {
    resetAllShortcutOverrides();
  });

  it("merender panel samping kanan saat isOpen=true dengan judul dan pengelompokan", () => {
    const onClose = vi.fn();
    render(
      <ShortcutsSheet isOpen={true} onClose={onClose} currentRole="admin" />,
    );

    // Judul panel
    expect(screen.getByText("Pintasan Keyboard")).toBeTruthy();

    // Kelompok grup
    expect(screen.getAllByText("Umum").length).toBeGreaterThan(0);
    expect(screen.getByText("Navigasi")).toBeTruthy();
    expect(screen.getByText("Aksi Cepat")).toBeTruthy();

    // Input cari pintasan
    const searchInput = screen.getByPlaceholderText("Cari pintasan...");
    expect(searchInput).toBeTruthy();
  });

  it("menyaring daftar pintasan secara instan saat pengguna mengetik", () => {
    render(
      <ShortcutsSheet isOpen={true} onClose={vi.fn()} currentRole="admin" />,
    );

    const searchInput = screen.getByPlaceholderText("Cari pintasan...");

    act(() => {
      fireEvent.change(searchInput, { target: { value: "buku besar" } });
    });

    // Harus menampilkan entri buku besar
    expect(screen.getByText("Buku Besar")).toBeTruthy();

    // Harus menyembunyikan entri yang tidak relevan (misalnya Dashboard)
    expect(screen.queryByText("Dashboard Keuangan")).toBeNull();
  });

  it("menampilkan empty state jika pencarian tidak membuahkan hasil", () => {
    render(
      <ShortcutsSheet isOpen={true} onClose={vi.fn()} currentRole="admin" />,
    );

    const searchInput = screen.getByPlaceholderText("Cari pintasan...");

    act(() => {
      fireEvent.change(searchInput, { target: { value: "xyznotfound999" } });
    });

    expect(screen.getByText("Tidak ada pintasan yang cocok")).toBeTruthy();
  });

  it("menampilkan label 'Kustom' saat ada override tombol dari Super Admin", () => {
    // Simpan override kustom untuk Catat Transaksi Jurnal
    saveShortcutOverride("action_record_transaction", ["mod", "shift", "k"]);

    render(
      <ShortcutsSheet isOpen={true} onClose={vi.fn()} currentRole="admin" />,
    );

    expect(screen.getByText("Kustom")).toBeTruthy();
  });
});
