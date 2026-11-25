// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WalletIcon } from "lucide-react";
import { KpiCard } from "@/components/shared/dashboard-kpi-card";
import { PageHeader, TruncatedTooltipText } from "@/components/shared/page-header";
import { ActionTooltip } from "@/components/ui/action-tooltip";

afterEach(() => {
  cleanup();
});

/* -------------------------------------------------------------------------- */
/* Item 10: satu komponen KpiCard bersama                                     */
/* -------------------------------------------------------------------------- */
describe("Item 10 - KpiCard bersama", () => {
  it("merender varian standar, sparkline, dan displayValue dengan struktur & tinggi seragam", () => {
    render(
      <MemoryRouter>
        <div>
          <KpiCard label="Label A" value={10} subtext="Keterangan A" icon={WalletIcon} />
          <KpiCard
            label="Label B"
            value={20}
            icon={WalletIcon}
            sparklineData={[1, 3, 2, 5]}
            changePercent={4.5}
            changeLabel="vs periode lalu"
          />
          <KpiCard label="Label C" displayValue={<span>Rp1.000</span>} icon={WalletIcon} to="/x" />
        </div>
      </MemoryRouter>,
    );

    const cards = document.querySelectorAll('[data-slot="kpi-card"]');
    expect(cards).toHaveLength(3);
    cards.forEach((card) => {
      expect(card.className).toContain("h-full");
      expect(card.className).toContain("rounded-2xl");
      expect(card.className).toContain("p-5");
    });
    expect(screen.getByText("Rp1.000")).toBeInTheDocument();
    expect(screen.getByText("+4.5%")).toBeInTheDocument();
  });

  it("halaman yang dimigrasikan tidak lagi menulis kartu KPI manual", () => {
    const migrated = [
      "src/features/invoicing/components/invoice-kpi-summary.tsx",
      "src/features/budgeting/budget-page.tsx",
      "src/features/payment-approvals/admin-approvals-page.tsx",
      "src/features/payment-approvals/user-payments-page.tsx",
      "src/features/client-projects/components/project-detail-header.tsx",
      "src/features/system-config/login-media-page.tsx",
      "src/features/profile/profile-overview-page.tsx",
    ];
    for (const rel of migrated) {
      const src = fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
      expect(src, rel).toContain("KpiCard");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Item 11 & 13: tooltip kustom                                               */
/* -------------------------------------------------------------------------- */
describe("Item 11 - ActionTooltip", () => {
  it("muncul saat fokus keyboard, memasang aria-describedby, dan tertutup dengan Escape", async () => {
    render(
      <ActionTooltip content="Teks Bantuan" delayMs={0}>
        <button type="button">Aksi</button>
      </ActionTooltip>,
    );
    const btn = screen.getByRole("button", { name: "Aksi" });
    await act(async () => {
      fireEvent.focus(btn);
      await new Promise((r) => setTimeout(r, 5));
    });
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Teks Bantuan");
    expect(btn.parentElement).toHaveAttribute("aria-describedby", tip.id);

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------- */
/* Item 12: header halaman satu baris + ellipsis                              */
/* -------------------------------------------------------------------------- */
describe("Item 12 - PageHeader & TruncatedTooltipText", () => {
  it("judul dan deskripsi memakai kelas truncate satu baris", () => {
    render(<PageHeader title="Judul Halaman Panjang" description="Deskripsi halaman panjang" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    for (const cls of ["whitespace-nowrap", "overflow-hidden", "text-ellipsis"]) {
      expect(h1.className).toContain(cls);
    }
    const desc = screen.getByText("Deskripsi halaman panjang");
    expect(desc.tagName).toBe("P");
    for (const cls of ["whitespace-nowrap", "overflow-hidden", "text-ellipsis"]) {
      expect(desc.className).toContain(cls);
    }
  });

  it("tooltip hanya muncul bila teks benar-benar terpotong", async () => {
    render(
      <TruncatedTooltipText as="p" data-testid="txt">
        Teks yang sangat panjang sekali
      </TruncatedTooltipText>,
    );
    const el = screen.getByTestId("txt");

    // Tidak terpotong: scrollWidth == clientWidth
    Object.defineProperty(el, "scrollWidth", { configurable: true, value: 100 });
    Object.defineProperty(el, "clientWidth", { configurable: true, value: 100 });
    await act(async () => {
      fireEvent.mouseEnter(el);
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(el).toHaveAttribute("data-truncated", "false");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Terpotong: scrollWidth > clientWidth
    Object.defineProperty(el, "scrollWidth", { configurable: true, value: 300 });
    await act(async () => {
      fireEvent.mouseLeave(el);
      fireEvent.mouseEnter(el);
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(el).toHaveAttribute("data-truncated", "true");
    await act(async () => {
      fireEvent.mouseLeave(el);
      fireEvent.mouseEnter(el);
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Teks yang sangat panjang sekali");
  });
});

/* -------------------------------------------------------------------------- */
/* Item 11 (CI guard): tidak ada atribut title bawaan di elemen interaktif   */
/* -------------------------------------------------------------------------- */
const INTERACTIVE_TAGS = new Set([
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  "svg",
  "img",
]);
const INTERACTIVE_PROPS = new Set(["onClick", "role", "tabIndex", "onKeyDown", "href"]);

function collectTsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTsxFiles(full, acc);
    else if (entry.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

function findNativeTitleViolations(file: string): string[] {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      const isIntrinsic = /^[a-z]/.test(tag);
      if (isIntrinsic) {
        const attrNames = node.attributes.properties
          .filter(ts.isJsxAttribute)
          .map((a) => a.name.getText(sf));
        const interactive =
          INTERACTIVE_TAGS.has(tag) || attrNames.some((n) => INTERACTIVE_PROPS.has(n));
        if (interactive && attrNames.includes("title")) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          out.push(`${path.relative(process.cwd(), file)}:${line + 1} <${tag} title=...>`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

describe("Item 11 - CI guard atribut title bawaan browser", () => {
  it("tidak ada elemen interaktif di src/ yang memakai atribut title bawaan", () => {
    const files = collectTsxFiles(path.resolve(process.cwd(), "src"));
    const violations = files.flatMap(findNativeTitleViolations);
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
