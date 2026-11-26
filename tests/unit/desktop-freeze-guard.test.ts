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
});
