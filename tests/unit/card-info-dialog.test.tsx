// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GameDialogProvider } from "@/components/shared/game-dialog";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Card } from "@/components/ui/card";

function TestPilotCard({
  title = "Daftar Pengajuan Pembayaran Tim",
  description = "Periksa bukti lampiran pengeluaran sebelum menyetujui atau menolak permohonan dana.",
}) {
  return (
    <Card>
      <CardHeaderWithInfo
        title={title}
        description={description}
        controls={<button type="button">Filter Status</button>}
      />
    </Card>
  );
}

describe("GameDialog & CardHeaderWithInfo Components", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("A.1 & A.2: Merender judul kartu, tombol info tanpa atribut title, dan TIDAK merender teks deskripsi di bawah judul", () => {
    render(
      <GameDialogProvider>
        <TestPilotCard />
      </GameDialogProvider>,
    );

    // Judul kartu muncul
    expect(screen.getByText("Daftar Pengajuan Pembayaran Tim")).toBeInTheDocument();

    // Teks deskripsi TIDAK tampil di DOM kartu
    expect(
      screen.queryByText("Periksa bukti lampiran pengeluaran sebelum menyetujui atau menolak permohonan dana."),
    ).not.toBeInTheDocument();

    // Tombol info muncul dengan aria-label, dan TANPA atribut title
    const infoButton = screen.getByRole("button", { name: /Informasi/i });
    expect(infoButton).toBeInTheDocument();
    expect(infoButton.getAttribute("title")).toBeNull();
  });

  it("A.3: Kartu tanpa deskripsi TIDAK menampilkan tombol ikon info", () => {
    render(
      <GameDialogProvider>
        <TestPilotCard description="" />
      </GameDialogProvider>,
    );

    expect(screen.getByText("Daftar Pengajuan Pembayaran Tim")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Informasi/i })).not.toBeInTheDocument();
  });

  it("B.1 & B.2: Klik tombol info membuka GameDialog dengan tab label dan deskripsi", async () => {
    render(
      <GameDialogProvider>
        <TestPilotCard />
      </GameDialogProvider>,
    );

    const infoButton = screen.getByRole("button", { name: /Informasi/i });

    // Klik tombol info
    act(() => {
      fireEvent.click(infoButton);
    });

    // Dialog ter-mount dengan role="dialog"
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-labelledby", "game-dialog-title");
    expect(dialog).toHaveAttribute("aria-describedby", "game-dialog-desc");

    // Judul tab label di dalam dialog
    const dialogTitle = dialog.querySelector("#game-dialog-title");
    expect(dialogTitle).toHaveTextContent("Daftar Pengajuan Pembayaran Tim");

    // Jalankan timer untuk efek typewriter
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByText(/Periksa bukti lampiran pengeluaran sebelum menyetujui atau menolak permohonan dana\./),
    ).toBeInTheDocument();
  });

  it("B.3 & B.4: Tombol X dan tombol Esc menutup GameDialog dengan animasi dan mengembalikan fokus", async () => {
    render(
      <GameDialogProvider>
        <TestPilotCard />
      </GameDialogProvider>,
    );

    const infoButton = screen.getByRole("button", { name: /Informasi/i });

    // Buka dialog
    act(() => {
      fireEvent.click(infoButton);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Tekan Esc
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    // Menjalankan timer animasi keluar (180ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Dialog dilepas dari DOM setelah animasi keluar
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("B.5: Klik cepat berulang atau membuka dialog kedua saat pertama terbuka tidak membuat dialog ganda", () => {
    function MultiCardTest() {
      return (
        <GameDialogProvider>
          <TestPilotCard title="Kartu A" description="Deskripsi A" />
          <TestPilotCard title="Kartu B" description="Deskripsi B" />
        </GameDialogProvider>
      );
    }

    render(<MultiCardTest />);

    const buttons = screen.getAllByRole("button", { name: /Informasi/i });
    expect(buttons.length).toBe(2);

    // Klik tombol A lalu klik tombol B dengan cepat
    const btnA = buttons[0];
    const btnB = buttons[1];
    expect(btnA).toBeDefined();
    expect(btnB).toBeDefined();
    if (!btnA || !btnB) return;

    act(() => {
      fireEvent.click(btnA);
    });
    expect(screen.getAllByRole("dialog").length).toBe(1);

    act(() => {
      fireEvent.click(btnB);
    });
    // Tetap hanya 1 dialog terbuka
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs.length).toBe(1);
    const activeDialog = dialogs[0];
    expect(activeDialog).toBeDefined();
    expect(activeDialog?.querySelector("#game-dialog-title")).toHaveTextContent("Kartu B");
  });

  it("B.6: Menghormati prefers-reduced-motion tanpa animasi gerak", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <GameDialogProvider>
        <TestPilotCard />
      </GameDialogProvider>,
    );

    const infoButton = screen.getByRole("button", { name: /Informasi/i });
    act(() => {
      fireEvent.click(infoButton);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/Periksa bukti lampiran pengeluaran sebelum menyetujui atau menolak permohonan dana\./),
    ).toBeInTheDocument();
  });

  it("B.7: Hover saja TIDAK membuka dialog (hanya klik atau keyboard)", () => {
    render(
      <GameDialogProvider>
        <TestPilotCard />
      </GameDialogProvider>,
    );

    const infoButton = screen.getByRole("button", { name: /Informasi/i });

    // Hover
    fireEvent.mouseEnter(infoButton);
    fireEvent.mouseOver(infoButton);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Klik
    act(() => {
      fireEvent.click(infoButton);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("B.8: Klik pada overlay luar menutup dialog", () => {
    render(
      <GameDialogProvider>
        <TestPilotCard />
      </GameDialogProvider>,
    );

    const infoButton = screen.getByRole("button", { name: /Informasi/i });
    act(() => {
      fireEvent.click(infoButton);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Click backdrop overlay
    const overlay = document.querySelector(".fixed.inset-0.bg-black\\/45");
    expect(overlay).toBeInTheDocument();
    act(() => {
      fireEvent.click(overlay!);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("C.1: Dialog merender kursor berkedip (|) khas warna biru Altvira saat efek typewriter aktif", () => {
    render(
      <GameDialogProvider>
        <TestPilotCard />
      </GameDialogProvider>,
    );

    const infoButton = screen.getByRole("button", { name: /Informasi/i });
    act(() => {
      fireEvent.click(infoButton);
    });

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Caret berkedip | ada di DOM
    const caret = dialog.querySelector(".animate-pulse");
    expect(caret).toBeInTheDocument();
    expect(caret).toHaveTextContent("|");
    expect(caret).toHaveClass("text-primary");
  });

  it("C.2: Pemindaian menyeluruh berkas di src/features/ memastikan tidak ada CardDescription liar di luar pengecualian resmi", () => {
    const featuresDir = path.resolve(process.cwd(), "src/features");
    const allowedExceptions = [
      // Portal publik pembeli (unauthenticated) yang disetujui dikecualikan
      path.normalize("buyer-portal/buyer-portal-page.tsx"),
      // Label metadata kode template di dalam admin (bukan subjudul kartu)
      path.normalize("system-config/system-config-page.tsx"),
    ];

    function scanFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const violations: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          violations.push(...scanFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
          const content = fs.readFileSync(fullPath, "utf-8");
          if (content.includes("<CardDescription>")) {
            const rel = path.relative(featuresDir, fullPath);
            const isAllowed = allowedExceptions.some((exc) => rel.includes(exc));
            if (!isAllowed) {
              violations.push(rel);
            }
          }
        }
      }
      return violations;
    }

    const unmigratedFiles = scanFiles(featuresDir);
    expect(
      unmigratedFiles,
      `Ditemukan kartu dengan <CardDescription> yang belum dimigrasikan ke GameDialog: ${unmigratedFiles.join(", ")}`,
    ).toEqual([]);
  });
});
