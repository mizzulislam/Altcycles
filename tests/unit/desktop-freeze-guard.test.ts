import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Pengaman Regresi Desktop Terkunci: Tampilan PC (>=1024px) 100% Identik", () => {
  it("Memastikan DialogContent mengunci layout desktop di tengah dengan max-w-lg dan padding sm:p-6", () => {
    const dialogPath = path.resolve(process.cwd(), "src/components/ui/dialog.tsx");
    const content = fs.readFileSync(dialogPath, "utf-8");

    // Desktop classes wajib ada persis:
    expect(content).toContain("max-w-lg");
    expect(content).toContain("-translate-x-1/2");
    expect(content).toContain("-translate-y-1/2");
    expect(content).toContain("sm:p-6");
    expect(content).toContain("sm:-top-6");
    expect(content).toContain("sm:flex-row");
    expect(content).toContain("sm:justify-end");
  });

  it("Memastikan PortalShell mempertahankan top bar desktop h-16 dan sidebar desktop md:w-64", () => {
    const shellPath = path.resolve(process.cwd(), "src/components/layout/portal-shell.tsx");
    const content = fs.readFileSync(shellPath, "utf-8");

    expect(content).toContain("hidden md:flex h-16");
    expect(content).toContain('isCollapsed ? "md:ml-16" : "md:ml-64"');
    expect(content).toContain("sm:px-6 lg:px-8");
  });

  it("Memastikan Sidebar Desktop (ShellSidebar) tetap memiliki lebar md:w-64 dan md:w-16 saat collapsed", () => {
    const sidebarPath = path.resolve(process.cwd(), "src/components/layout/shell-sidebar.tsx");
    const content = fs.readFileSync(sidebarPath, "utf-8");

    expect(content).toContain('isCollapsed ? "md:w-16" : "md:w-64"');
    expect(content).toContain("md:translate-x-0");
  });

  it("Memastikan Table komponen mempertahankan align-top, sel padding px-3 py-3.5, dan header text-center", () => {
    const tablePath = path.resolve(process.cwd(), "src/components/ui/table.tsx");
    const content = fs.readFileSync(tablePath, "utf-8");

    expect(content).toContain("text-center");
    expect(content).toContain("align-middle text-xs sm:text-sm font-semibold");
    expect(content).toContain("px-3 py-3.5 align-top text-xs sm:text-sm");
  });

  it("Memastikan KpiCard dan ChartCard mempertahankan padding desktop sm:p-6 atau sm:px-6", () => {
    const chartPath = path.resolve(process.cwd(), "src/components/shared/dashboard-chart-card.tsx");
    const chartContent = fs.readFileSync(chartPath, "utf-8");

    expect(chartContent).toContain("sm:px-6");
    expect(chartContent).toContain("border-b border-border/70");
  });

  it("Memastikan komponen Form Input, Textarea, dan Select bebas auto-zoom di mobile (text-base) dan tetap 14px di desktop (sm:text-sm) (MB-01)", () => {
    const inputContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/input.tsx"), "utf-8");
    const textareaContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/textarea.tsx"), "utf-8");
    const selectContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/select.tsx"), "utf-8");

    expect(inputContent).toContain("text-base sm:text-sm");
    expect(textareaContent).toContain("text-base sm:text-sm");
    expect(selectContent).toContain("text-base sm:text-sm");
  });

  it("Memastikan index.html menyertakan viewport-fit=cover untuk safe-area insets mobile (MB-07)", () => {
    const htmlContent = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
    expect(htmlContent).toContain("viewport-fit=cover");
  });

  it("Memastikan DialogContent dan CommandPalette adaptif dvh di mobile dan tetap mengunci layout desktop (MB-06, MB-10)", () => {
    const dialogContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/dialog.tsx"), "utf-8");
    const cmdContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/navigation/command-palette-dialog.tsx"), "utf-8");
    const confirmContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/shared/confirm-dialog.tsx"), "utf-8");

    expect(dialogContent).toContain("max-h-[90dvh] sm:max-h-[90vh]");
    expect(dialogContent).toContain("p-4 sm:p-6");
    expect(cmdContent).toContain("max-h-[85dvh] sm:max-h-[600px]");
    expect(cmdContent).toContain("sm:top-1/2 sm:-translate-y-1/2");
    expect(confirmContent).toContain("w-full sm:w-auto");
  });

  it("Memastikan header mobile ringkas dan kontrol utilitas di sidebar terisolasi md:hidden (MB-02)", () => {
    const shellContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/portal-shell.tsx"), "utf-8");
    const sidebarContent = fs.readFileSync(path.resolve(process.cwd(), "src/components/layout/shell-sidebar.tsx"), "utf-8");

    // Di header desktop tombol tetap ada lengkap
    expect(shellContent).toContain("hidden md:flex h-16");
    expect(shellContent).toContain("LanguageToggle");
    expect(shellContent).toContain("ThemeToggle");
    // Di sidebar utilitas mobile dibatasi md:hidden
    expect(sidebarContent).toContain("flex md:hidden");
  });

  it("Paket M4: tombol aksi transaksi di desktop tetap sm:flex-row / sm:w-auto tanpa mengubah tata letak desktop", () => {
    const exportBtn = fs.readFileSync(path.resolve(process.cwd(), "src/components/shared/export-download-menu.tsx"), "utf-8");
    const buttonSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/button.tsx"), "utf-8");
    expect(exportBtn).toContain("w-full sm:w-auto");
    expect(buttonSource).toContain("sm:after:hidden");
  });

  it("Paket M5: Table dan Tabs mengisolasi edge fade hint dan auto-scroll hanya di mobile tanpa menggeser desktop", () => {
    const tableSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/table.tsx"), "utf-8");
    const tabsSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/tabs.tsx"), "utf-8");
    // Edge fade hint terisolasi dengan lg:hidden
    expect(tableSource).toContain("lg:hidden");
    // Auto scroll TabsTrigger diisolasi untuk lebar < 1024
    expect(tabsSource).toContain("window.innerWidth < 1024");
  });

  it("Paket M6: KpiCard dan LoginPage mempertahankan padding desktop lg:p-12 dan sm:p-5 / sm:p-6", () => {
    const kpiSource = fs.readFileSync(path.resolve(process.cwd(), "src/components/shared/dashboard-kpi-card.tsx"), "utf-8");
    const loginSource = fs.readFileSync(path.resolve(process.cwd(), "src/features/auth/login-page.tsx"), "utf-8");
    expect(kpiSource).toContain("sm:p-5");
    expect(loginSource).toContain("lg:p-12");
  });
});
