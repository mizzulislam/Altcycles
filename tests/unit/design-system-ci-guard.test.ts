import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("CI Guardrails: Penegakan Aturan Desain & Token Sistem (DS-03)", () => {
  it("Memastikan token status warna dan background terdaftar lengkap di src/index.css", () => {
    const cssPath = path.resolve(process.cwd(), "src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain("--status-success-bg");
    expect(cssContent).toContain("--status-warning-bg");
    expect(cssContent).toContain("--status-danger-bg");
    expect(cssContent).toContain("--muted-foreground: #A0ABBD;");
  });

  it("Memastikan Table komponen membungkus tabel dalam scroll horizontal responsif terkontrol", () => {
    const tablePath = path.resolve(process.cwd(), "src/components/ui/table.tsx");
    const tableContent = fs.readFileSync(tablePath, "utf-8");

    expect(tableContent).toContain("overflow-x-auto");
    expect(tableContent).toContain("max-w-full");
    expect(tableContent).toContain("touch-pan-x");
  });

  it("Memastikan rute wildcard * di src/App.tsx terhubung ke NotFoundPage dan bukan silent redirect", () => {
    const appPath = path.resolve(process.cwd(), "src/App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");

    expect(appContent).toContain('path="*" element={<NotFoundPage />}');
  });

  it("Memastikan kunci i18n not_found terdaftar lengkap di id dan en", () => {
    const idPath = path.resolve(process.cwd(), "src/locales/id/common.json");
    const enPath = path.resolve(process.cwd(), "src/locales/en/common.json");

    const idJson = JSON.parse(fs.readFileSync(idPath, "utf-8"));
    const enJson = JSON.parse(fs.readFileSync(enPath, "utf-8"));

    expect(idJson.not_found?.code).toBe("404");
    expect(enJson.not_found?.code).toBe("404");
    expect(idJson.not_found?.title).toBeTruthy();
    expect(enJson.not_found?.title).toBeTruthy();
  });
});
