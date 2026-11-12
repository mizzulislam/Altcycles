// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase")>();
  return {
    ...actual,
    isDemoMode: true,
    supabase: null,
  };
});

import { RoleGuard } from "@/app/role-guard";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { demoStore, switchActiveRole } from "@/lib/data-service";
import { createAndIssueSalesInvoice } from "@/lib/operations-service";

function MultiRoleHarness() {
  const { profile, activeRole, availableRoles, signIn, switchRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <div data-testid="auth-state">
        {profile ? `${profile.email}|${activeRole}|${availableRoles.join(",")}` : "anon"}
      </div>
      <button
        type="button"
        onClick={() => {
          void signIn("admin@altvira.id", "demo1234");
        }}
      >
        Masuk Admin
      </button>
      <button
        type="button"
        onClick={() => {
          void switchRole("user").then(() => navigate("/user/dashboard"));
        }}
      >
        Pindah Ke User
      </button>
      <button
        type="button"
        onClick={() => {
          navigate("/super-admin/dashboard");
        }}
      >
        Coba Super Admin
      </button>

      <Routes>
        <Route path="/login" element={<div data-testid="view-login">Login View</div>} />
        <Route element={<RoleGuard allowedRole="admin" />}>
          <Route path="/admin/dashboard" element={<div data-testid="view-admin">Admin Portal</div>} />
        </Route>
        <Route element={<RoleGuard allowedRole="user" />}>
          <Route path="/user/dashboard" element={<div data-testid="view-user">User Portal</div>} />
        </Route>
        <Route element={<RoleGuard allowedRole="super_admin" />}>
          <Route
            path="/super-admin/dashboard"
            element={<div data-testid="view-super-admin">Super Admin Portal</div>}
          />
        </Route>
      </Routes>
    </div>
  );
}

describe("Integrasi Multi-Peran React & Skenario Jurnal Faktur PKP", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("mendukung login multi-peran, switchRole ke portal user, dan menolak rute super_admin via RoleGuard", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <AuthProvider>
          <MultiRoleHarness />
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("view-login")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Masuk Admin"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "admin@altvira.id|admin|admin,user",
      );
    });

    // Switch role dari admin -> user dan arahkan ke /user/dashboard
    fireEvent.click(screen.getByText("Pindah Ke User"));

    await waitFor(() => {
      expect(screen.getByTestId("view-user")).toBeInTheDocument();
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "admin@altvira.id|user|admin,user",
      );
    });

    // Coba akses rute super_admin -> harus dialihkan kembali ke /user/dashboard
    fireEvent.click(screen.getByText("Coba Super Admin"));

    await waitFor(() => {
      expect(screen.getByTestId("view-user")).toBeInTheDocument();
      expect(screen.queryByTestId("view-super-admin")).not.toBeInTheDocument();
    });
  });

  it("createAndIssueSalesInvoice Mode Demo saat pkp_enabled=true memisahkan kredit Utang PPN Keluaran (2-1501)", async () => {
    const prevPkp = demoStore.company.pkp_enabled;
    const prevRate = demoStore.company.ppn_rate;
    const ppnAcc = demoStore.accounts.find((a) => a.code === "2-1501");
    const prevPpnActive = ppnAcc?.is_active ?? false;
    const prevSession = localStorage.getItem("altcycles_demo_session_email");

    const verifiedCpo = demoStore.clientPos.find((c) => c.status === "verified");
    const openPeriod = demoStore.periods.find((p) => p.status === "open");
    const targetProject =
      demoStore.projects.find((p) => p.id === verifiedCpo?.project_id) ??
      demoStore.projects[0]!;
    expect(ppnAcc).toBeDefined();
    expect(verifiedCpo).toBeDefined();
    expect(openPeriod).toBeDefined();

    try {
      localStorage.setItem("altcycles_demo_session_email", "admin@altvira.id");
      await switchActiveRole("admin");
      demoStore.company.pkp_enabled = true;
      demoStore.company.ppn_rate = 11;
      ppnAcc!.is_active = true;

      const monthStr = String(openPeriod!.month).padStart(2, "0");
      const invoiceDate = `${openPeriod!.year}-${monthStr}-10`;
      const dueDate = `${openPeriod!.year}-${monthStr}-24`;

      const journalsBefore = demoStore.journals.length;
      const invoice = await createAndIssueSalesInvoice({
        invoiceDate,
        dueDate,
        projectId: targetProject.id,
        customerId: targetProject.customer_id ?? demoStore.customers[0]!.id,
        milestoneId: null,
        clientPoId: verifiedCpo!.id,
        bakpId: null,
        bastId: null,
        invoiceKind: "down_payment",
        subtotalAmount: 10_000_000,
      });

      expect(invoice.ppn_amount).toBe(1_100_000);
      expect(invoice.total_amount).toBe(11_100_000);
      expect(demoStore.journals.length).toBe(journalsBefore + 1);

      const createdJournal = demoStore.journals[0]!;
      const lines = demoStore.journalLines
        .filter((l) => l.journal_id === createdJournal.id)
        .map((l) => ({
          code: demoStore.accounts.find((a) => a.id === l.account_id)?.code,
          debit: l.debit,
          credit: l.credit,
        }))
        .sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));

      expect(lines).toEqual([
        { code: "1-1201", debit: 11_100_000, credit: 0 },
        { code: "1-1310", debit: 0, credit: 10_000_000 },
        { code: "2-1501", debit: 0, credit: 1_100_000 },
      ]);
    } finally {
      demoStore.company.pkp_enabled = prevPkp;
      demoStore.company.ppn_rate = prevRate;
      if (ppnAcc) ppnAcc.is_active = prevPpnActive;
      if (prevSession) {
        localStorage.setItem("altcycles_demo_session_email", prevSession);
      } else {
        localStorage.removeItem("altcycles_demo_session_email");
      }
    }
  });
});
