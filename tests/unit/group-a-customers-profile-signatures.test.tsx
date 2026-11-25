/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  isDemoMode: true,
  supabase: null,
  IDLE_TIMEOUT_MINUTES: 30,
  TAB_AUTH_STORAGE_KEY: "altcycles_tab_auth_token",
}));

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
import { CustomerTabContent } from "@/features/master-data/parties/customer-tab-content";
import { AuthProvider } from "@/features/auth/auth-context";
import { ProfileOverviewPage } from "@/features/profile/profile-overview-page";
import { ProfileSettingsPage } from "@/features/profile/profile-settings-page";
import {
  demoStore,
  listCustomers,
  listProfiles,
  saveCustomer,
  setDemoCurrentUser,
  updateMyProfile,
  uploadProfileSignature,
} from "@/lib/data-service";
import {
  formatNpwpDisplay,
  isValidBankAccountNumber,
  isValidNpwp,
  maskBankAccountNumber,
  maskNpwp,
  normalizeBankAccountNumber,
  normalizeNpwp,
} from "@/lib/formatters";
import { LanguageProvider } from "@/lib/i18n";
import {
  DOCUMENT_SIGNER_CONFIG,
  resolveDocumentSigner,
} from "@/lib/pdf/document-signer-config";
import {
  buildInvoicePdfSpec,
  buildPaymentApprovalPdfSpec,
  buildReceiptPdfSpec,
} from "@/lib/pdf/specs/transaction-specs";
import {
  makeBakpSpec,
  makeBastSpec,
  makeQuotationSpec,
  makeSowDocSpec,
  makeUatSpec,
} from "@/features/client-projects/project-specs-builder";
import { getProjectWorkspace } from "@/lib/operations/client-projects";

describe("Kelompok A — Item 1, 2, dan 4 (Pelanggan, Data Keuangan, & TTD PDF)", () => {
  const initialCustomers = structuredClone(demoStore.customers);
  const initialProfiles = structuredClone(demoStore.profiles);
  const initialAuditCount = demoStore.auditLogs.length;

  beforeEach(() => {
    localStorage.clear();
    demoStore.customers = structuredClone(initialCustomers);
    demoStore.profiles = structuredClone(initialProfiles);
    demoStore.auditLogs.splice(initialAuditCount);
    // Default actor: Bendahara (admin)
    const adminUser = demoStore.profiles.find((p) => p.role === "admin");
    if (adminUser) {
      setDemoCurrentUser(adminUser.id);
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // (a) ITEM 1: Dialog Pelanggan/Klien (NPWP & Alamat Pengiriman + Checkbox)
  // ===========================================================================
  describe("(a) Item 1 — NPWP & Alamat Pengiriman Pelanggan/Klien", () => {
    it("memvalidasi dan menormalisasi NPWP 15/16 digit serta menolak format tidak valid", async () => {
      expect(isValidNpwp("01.234.567.8-901.000")).toBe(true);
      expect(normalizeNpwp("01.234.567.8-901.000")).toBe("012345678901000");
      expect(formatNpwpDisplay("012345678901000")).toBe("01.234.567.8-901.000");
      expect(maskNpwp("012345678901000")).toBe("••.•••.•••.•-•••.000");

      // 16 digit (NIK/NPWP 16 digit)
      expect(isValidNpwp("3271012345678901")).toBe(true);
      expect(formatNpwpDisplay("3271012345678901")).toBe("3271 0123 4567 8901");
      expect(maskNpwp("3271012345678901")).toBe("•••• •••• •••• 8901");

      // Invalid NPWP (< 15 digit atau > 16 digit)
      expect(isValidNpwp("12345")).toBe(false);
      await expect(
        saveCustomer({
          code: "CST-ERR",
          name: "PT Invalid NPWP",
          npwp: "12345-ABCD",
        }),
      ).rejects.toThrow(/NPWP/i);
    });

    it("menyimpan pelanggan baru dengan checkbox 'Samakan dengan alamat kantor' dicentang lalu melepas centang untuk alamat pengiriman terpisah", async () => {
      const onReload = vi.fn().mockResolvedValue(undefined);
      const onRequestDelete = vi.fn();

      const { rerender } = render(
        <LanguageProvider>
          <MemoryRouter>
            <CustomerTabContent
              customers={demoStore.customers}
              onReload={onReload}
              onRequestDelete={onRequestDelete}
            />
          </MemoryRouter>
        </LanguageProvider>,
      );

      // Buka dialog Tambah Pelanggan
      const addBtn = screen.getByRole("button", { name: /Tambah Pelanggan|Add Client/i });
      fireEvent.click(addBtn);

      const nameInputs = await screen.findAllByLabelText(
        /Nama Klien \/ Instansi|Client \/ Company Name/i,
      );
      const nameInput = nameInputs[0]!;
      const npwpInput = screen.getByLabelText(/NPWP|Tax ID/i);
      const officeAddrInput = screen.getByLabelText(/Alamat Lengkap|Full Address/i);
      const shippingAddrInput = screen.getByLabelText(/Alamat Pengiriman|Shipping Address/i) as HTMLTextAreaElement;
      const sameCheckbox = screen.getByRole("checkbox", {
        name: /Samakan dengan alamat kantor|Same as office address/i,
      });

      fireEvent.change(nameInput, { target: { value: "PT Nusantara Logistik" } });
      fireEvent.change(npwpInput, { target: { value: "02.345.678.9-012.000" } });
      fireEvent.change(officeAddrInput, {
        target: { value: "Jl. Sudirman Kav. 21, Jakarta Selatan" },
      });

      // Centang "Samakan dengan alamat kantor"
      fireEvent.click(sameCheckbox);
      expect(shippingAddrInput.value).toBe("Jl. Sudirman Kav. 21, Jakarta Selatan");
      expect(shippingAddrInput).toHaveAttribute("readonly");

      // Ubah alamat kantor saat masih tercentang -> alamat pengiriman otomatis ikut berubah
      fireEvent.change(officeAddrInput, {
        target: { value: "Jl. Gatot Subroto Kav. 50, Jakarta Selatan" },
      });
      expect(shippingAddrInput.value).toBe("Jl. Gatot Subroto Kav. 50, Jakarta Selatan");

      // Simpan pelanggan
      const saveBtn = screen.getByRole("button", { name: /Simpan Pelanggan|Save Client/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onReload).toHaveBeenCalledTimes(1);
      });

      const created = demoStore.customers.find((c) => c.name === "PT Nusantara Logistik");
      expect(created).toBeDefined();
      expect(created?.npwp).toBe("023456789012000");
      expect(created?.shipping_same_as_office).toBe(true);
      expect(created?.shipping_address).toBe("Jl. Gatot Subroto Kav. 50, Jakarta Selatan");

      // Pastikan audit log terbaru (index 0 karena unshift) tidak membocorkan digit NPWP penuh
      const lastAudit = demoStore.auditLogs.find(
        (a) => a.entity_name === "customers" && a.entity_id === created?.id,
      );
      expect(JSON.stringify(lastAudit?.new_data)).not.toContain("023456789012000");
      expect(JSON.stringify(lastAudit?.new_data)).toContain("••.•••.•••.•-•••.000");

      // Render ulang tabel dengan pelanggan baru + pelanggan lama tanpa NPWP/alamat pengiriman
      const legacyCustomer = {
        ...demoStore.customers[0]!,
        id: "cust-legacy-no-npwp",
        code: "CST-OLD",
        name: "Klien Lama Tanpa NPWP",
        npwp: null,
        shipping_address: undefined,
        shipping_same_as_office: undefined,
      };
      const updatedList = [legacyCustomer, created!];

      rerender(
        <LanguageProvider>
          <MemoryRouter>
            <CustomerTabContent
              customers={updatedList}
              onReload={onReload}
              onRequestDelete={onRequestDelete}
            />
          </MemoryRouter>
        </LanguageProvider>,
      );

      // Pastikan data lama tampil tanpa error dan NPWP pelanggan baru tampil dimasking
      expect(screen.getByText("Klien Lama Tanpa NPWP")).toBeInTheDocument();
      expect(screen.getByText(/••\.•••\.•••\.•-•••\.000/)).toBeInTheDocument();

      // Buka edit pada pelanggan baru, lepas centang, dan ubah alamat pengiriman terpisah
      const editButtons = screen.getAllByRole("button", { name: /^Edit$/i });
      fireEvent.click(editButtons[1]!);

      const editShippingInput = (await screen.findByLabelText(
        /Alamat Pengiriman|Shipping Address/i,
      )) as HTMLTextAreaElement;
      const editSameCheckbox = screen.getByRole("checkbox", {
        name: /Samakan dengan alamat kantor|Same as office address/i,
      });

      expect(editShippingInput).toHaveAttribute("readonly");
      // Lepas centang -> nilai terakhir tetap dipertahankan & bisa diedit
      fireEvent.click(editSameCheckbox);
      expect(editShippingInput).not.toHaveAttribute("readonly");
      expect(editShippingInput.value).toBe("Jl. Gatot Subroto Kav. 50, Jakarta Selatan");

      fireEvent.change(editShippingInput, {
        target: { value: "Gudang Cikarang Blok B2, Bekasi" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Simpan Pelanggan|Save Client/i }));

      await waitFor(() => {
        expect(created?.shipping_same_as_office).toBe(false);
        expect(created?.shipping_address).toBe("Gudang Cikarang Blok B2, Bekasi");
        expect(created?.address).toBe("Jl. Gatot Subroto Kav. 50, Jakarta Selatan");
      });
    });
  });

  // ===========================================================================
  // (b) & (c) ITEM 2: Data Keuangan Pengguna, Masking, & Pembatasan RLS/Peran
  // ===========================================================================
  describe("(b) & (c) Item 2 — Data Keuangan Pengguna, Masking, & Pembatasan Akses", () => {
    it("menyimpan NPWP & rekening bank pengguna, memvalidasi format angka rekening, serta melakukan masking di audit log", async () => {
      const teamUser = demoStore.profiles.find((p) => p.role === "user")!;
      setDemoCurrentUser(teamUser.id);

      expect(isValidBankAccountNumber("103289122849")).toBe(true);
      expect(isValidBankAccountNumber("12345ABC")).toBe(false);
      expect(normalizeBankAccountNumber("1032-8912-2849")).toBe("103289122849");
      expect(maskBankAccountNumber("103289122849")).toBe("•••• •••• 2849");

      // Tolak nomor rekening tidak valid
      await expect(
        updateMyProfile({
          fullName: teamUser.full_name,
          bankName: "Bank Jago",
          bankAccountNumber: "123-ABC",
          bankAccountHolder: teamUser.full_name,
        }),
      ).rejects.toThrow(/rekening/i);

      // Simpan data keuangan yang valid
      const updated = await updateMyProfile({
        fullName: teamUser.full_name,
        npwp: "09.876.543.2-109.000",
        bankName: "Bank Jago",
        bankAccountNumber: "1032-8912-2849",
        bankAccountHolder: teamUser.full_name,
      });

      expect(updated.npwp).toBe("098765432109000");
      expect(updated.bank_name).toBe("Bank Jago");
      expect(updated.bank_account_number).toBe("103289122849");
      expect(updated.bank_account_holder).toBe(teamUser.full_name);

      // Pastikan audit log terbaru tidak menyimpan NPWP atau nomor rekening utuh
      const lastAudit = demoStore.auditLogs.find(
        (a) => a.entity_name === "profiles" && a.entity_id === teamUser.id,
      );
      const serializedAudit = JSON.stringify(lastAudit?.new_data);
      expect(serializedAudit).not.toContain("098765432109000");
      expect(serializedAudit).not.toContain("103289122849");
      expect(serializedAudit).toContain("••.•••.•••.•-•••.000");
      expect(serializedAudit).toContain("•••• •••• 2849");

      // Render ProfileSettingsPage (5 tab sama lebar) & ProfileOverviewPage (masking + toggle Lihat/Sembunyikan)
      window.sessionStorage.setItem("altcycles_demo_session_email", teamUser.email);
      render(
        <LanguageProvider>
          <MemoryRouter initialEntries={["/pengaturan/profil?tab=financial"]}>
            <AuthProvider>
              <ProfileSettingsPage />
              <ProfileOverviewPage />
            </AuthProvider>
          </MemoryRouter>
        </LanguageProvider>,
      );

      // Pastikan ke-5 tab tampil
      expect(screen.getByRole("button", { name: /^Profil Pengguna$|^User Profile$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Data Pribadi$|^Personal Data$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Data Keuangan$|^Financial Data$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Akun & Kata Sandi$|^Account & Password$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Notifikasi$|^Notifications$/i })).toBeInTheDocument();

      // Pastikan di Profil Saya (ProfileOverviewPage) NPWP & Nomor Rekening tampil dimasking secara default
      const npwpOverview = screen.getByTestId("overview-npwp-value");
      const accOverview = screen.getByTestId("overview-bank-acc-value");
      expect(npwpOverview.textContent).toBe("••.•••.•••.•-•••.000");
      expect(accOverview.textContent).toBe("•••• •••• 2849");

      // Klik icon mata pada container NPWP & Nomor Rekening -> tampil penuh untuk pemilik
      const toggleNpwpBtn = screen.getByRole("button", {
        name: /Lihat NPWP|Show Tax ID/i,
      });
      const toggleAccBtn = screen.getByRole("button", {
        name: /Lihat Nomor Rekening|Show Account Number/i,
      });
      fireEvent.click(toggleNpwpBtn);
      fireEvent.click(toggleAccBtn);
      expect(npwpOverview.textContent).toBe("09.876.543.2-109.000");
      expect(accOverview.textContent).toBe("103289122849");

      // Klik kembali untuk menyembunyikan -> kembali dimasking
      fireEvent.click(
        screen.getByRole("button", { name: /Sembunyikan NPWP|Hide Tax ID/i }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /Sembunyikan Nomor Rekening|Hide Account Number/i }),
      );
      expect(npwpOverview.textContent).toBe("••.•••.•••.•-•••.000");
      expect(accOverview.textContent).toBe("•••• •••• 2849");
    });

    it("membatasi akses data sensitif: role 'user' hanya dapat membaca profil miliknya sendiri dan ditolak membaca daftar pelanggan, sedangkan Bendahara ('admin') dapat membaca data keuangan tim dari sumber yang sama", async () => {
      const teamUser = demoStore.profiles.find((p) => p.role === "user")!;
      setDemoCurrentUser(teamUser.id);

      await updateMyProfile({
        fullName: teamUser.full_name,
        npwp: "01.111.222.3-444.000",
        bankName: "BCA",
        bankAccountNumber: "8820192837",
        bankAccountHolder: teamUser.full_name,
      });

      // Role 'user' memanggil listProfiles() -> hanya mengembalikan dirinya sendiri (tidak bisa melihat profil user lain)
      const userVisibleProfiles = await listProfiles();
      expect(userVisibleProfiles).toHaveLength(1);
      expect(userVisibleProfiles[0]?.id).toBe(teamUser.id);

      // Role 'user' memanggil listCustomers() -> ditolak
      await expect(listCustomers()).rejects.toThrow(/Akses ditolak/i);

      // Beralih ke Bendahara ('admin') -> dapat membaca data keuangan anggota tim dari sumber profil yang sama
      const adminUser = demoStore.profiles.find((p) => p.role === "admin")!;
      setDemoCurrentUser(adminUser.id);
      const adminVisibleProfiles = await listProfiles();
      const targetMember = adminVisibleProfiles.find((p) => p.id === teamUser.id);
      expect(targetMember?.npwp).toBe("011112223444000");
      expect(targetMember?.bank_name).toBe("BCA");
      expect(targetMember?.bank_account_number).toBe("8820192837");
    });
  });

  // ===========================================================================
  // (d) ITEM 4: Unggah Tanda Tangan Pengguna & Tabel Konfigurasi Tunggal PDF
  // ===========================================================================
  describe("(d) Item 4 — Unggah Tanda Tangan & Resolusi Penandatangan PDF (DOCUMENT_SIGNER_CONFIG)", () => {
    it("memvalidasi format (PNG/JPG/WEBP) dan batas ukuran (maks 2 MB) saat mengunggah tanda tangan pengguna", async () => {
      const validPng = new File([new Uint8Array([137, 80, 78, 71])], "ttd-user.png", {
        type: "image/png",
      });
      const dataUrl = await uploadProfileSignature(validPng);
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);

      // Tolak format tidak didukung (misal PDF atau EXE)
      const invalidFormatFile = new File(["%PDF-1.4"], "dokumen.pdf", {
        type: "application/pdf",
      });
      await expect(uploadProfileSignature(invalidFormatFile)).rejects.toThrow(
        /Format berkas tanda tangan tidak didukung/i,
      );

      // Tolak ukuran > 2 MB
      const oversizedBytes = new Uint8Array(2 * 1024 * 1024 + 1024);
      const oversizedFile = new File([oversizedBytes], "ttd-besar.png", {
        type: "image/png",
      });
      await expect(uploadProfileSignature(oversizedFile)).rejects.toThrow(
        /melebihi batas maksimal 2 MB/i,
      );
    });

    it("menggunakan tanda tangan pengguna sesuai DOCUMENT_SIGNER_CONFIG pada seluruh spesifikasi dokumen PDF dan fallback bersih tanpa error bila pengguna belum mengunggah TTD", async () => {
      expect(Object.keys(DOCUMENT_SIGNER_CONFIG)).toEqual(
        expect.arrayContaining([
          "INV",
          "KW",
          "PA",
          "POP",
          "CLIENT_PO",
          "QT",
          "SOW",
          "SPK",
          "BAKP",
          "UAT",
          "BAST",
        ]),
      );

      const teamUser = demoStore.profiles.find((p) => p.role === "user")!;
      const adminUser = demoStore.profiles.find((p) => p.role === "admin")!;

      // 1. Sebelum teamUser punya TTD: Form PA untuk Pemohon (teamUser) fallback ke null (tanpa gambar TTD)
      teamUser.signature_storage_path = null;
      adminUser.signature_storage_path = "data:image/png;base64,ADMIN_SIG_BASE64";

      const paSpecWithoutUserSig = buildPaymentApprovalPdfSpec({
        company: demoStore.company,
        requestNumber: "PA/ALT/2026/11/001",
        requestDate: "2026-11-25",
        requesterId: teamUser.id,
        requesterName: teamUser.full_name,
        approverId: adminUser.id,
        approverName: adminUser.full_name,
        recipientName: "Vendor Cloud",
        purpose: "Sewa Server",
        amount: 1500000,
        status: "approved",
      });

      expect(paSpecWithoutUserSig.leftSignatureImageUrl).toBeNull();
      expect(paSpecWithoutUserSig.rightSignatureImageUrl).toBe(
        "data:image/png;base64,ADMIN_SIG_BASE64",
      );

      // 2. Setelah teamUser mengunggah TTD: Form PA dan Dokumen UAT otomatis memakai TTD teamUser!
      teamUser.signature_storage_path = "data:image/png;base64,TEAM_USER_SIG_BASE64";

      const paSpecWithUserSig = buildPaymentApprovalPdfSpec({
        company: demoStore.company,
        requestNumber: "PA/ALT/2026/11/002",
        requestDate: "2026-11-25",
        requesterId: teamUser.id,
        requesterName: teamUser.full_name,
        approverId: adminUser.id,
        approverName: adminUser.full_name,
        recipientName: "Vendor Cloud",
        purpose: "Sewa Server",
        amount: 1500000,
        status: "approved",
      });

      expect(paSpecWithUserSig.leftSignatureImageUrl).toBe(
        "data:image/png;base64,TEAM_USER_SIG_BASE64",
      );
      expect(paSpecWithUserSig.rightSignatureImageUrl).toBe(
        "data:image/png;base64,ADMIN_SIG_BASE64",
      );

      // 3. Dokumen UAT: Pendamping Teknis Altvira adalah teamUser.full_name -> otomatis memakai TTD teamUser (bukan Finance!)
      const project = demoStore.projects[0]!;
      const customer = demoStore.customers[0]!;
      const bundle = await getProjectWorkspace(project.id);
      const sampleUat = {
        ...(bundle.uatList[0] ?? demoStore.uatChecklists[0]!),
        id: "uat-test-01",
        project_id: project.id,
        uat_number: "UAT/ALT/2026/11/001",
        test_date: "2026-11-25",
        client_tester_name: "Rudi Hartono - Penguji Klien",
        altvira_companion_name: teamUser.full_name,
        conclusion: "accepted" as const,
        created_by: teamUser.id,
      };

      const uatSpec = makeUatSpec(sampleUat, {
        project,
        customer,
        company: demoStore.company,
        bundle,
      });
      expect(uatSpec?.rightSignatureImageUrl).toBe(
        "data:image/png;base64,TEAM_USER_SIG_BASE64",
      );

      // Jika Pendamping UAT adalah pegawai lain yang belum punya TTD -> fallback null (tidak memakai TTD Finance!)
      const uatSpecNoSig = makeUatSpec(
        {
          ...sampleUat,
          altvira_companion_name: "Pegawai Baru Belum Ada TTD",
          created_by: "unknown-user-id",
        },
        {
          project,
          customer,
          company: demoStore.company,
          bundle,
        },
      );
      expect(uatSpecNoSig?.rightSignatureImageUrl).toBeNull();

      // 4. Invoice, Kuitansi, Quotation, SoW, BAKP, BAST memakai resolusi pejabat perusahaan/proyek
      demoStore.company.signer_name = adminUser.full_name;
      const invSpec = buildInvoicePdfSpec({
        company: demoStore.company,
        invoiceNumber: "INV/ALT/2026/11/099",
        invoiceDate: "2026-11-25",
        dueDate: "2026-12-05",
        customerName: customer.name,
        customerAddress: customer.address ?? "-",
        projectName: project.name,
        clientPoNumber: "PO-CLIENT-001",
        description: "Termin 1",
        subtotal: 5000000,
        ppnAmount: 0,
        totalAmount: 5000000,
        paymentStatus: "unpaid",
        docStatus: "issued",
      });
      expect(invSpec.rightSignatureImageUrl).toBe(
        "data:image/png;base64,ADMIN_SIG_BASE64",
      );

      const kwSpec = buildReceiptPdfSpec({
        company: demoStore.company,
        receiptNumber: "KW/ALT/2026/11/099",
        receiptDate: "2026-11-25",
        receivedFrom: customer.name,
        invoiceNumber: "INV/ALT/2026/11/099",
        projectName: project.name,
        amount: 5000000,
      });
      expect(kwSpec.rightSignatureImageUrl).toBe(
        "data:image/png;base64,ADMIN_SIG_BASE64",
      );

      if (demoStore.quotations[0]) {
        const qtSpec = makeQuotationSpec(demoStore.quotations[0], {
          project,
          customer,
          company: demoStore.company,
          bundle,
        });
        expect(qtSpec?.rightSignatureImageUrl).toBeDefined();
      }
      if (demoStore.projectDocuments[0]) {
        const sowSpec = makeSowDocSpec(demoStore.projectDocuments[0], {
          project,
          customer,
          company: demoStore.company,
          bundle,
        });
        expect(sowSpec?.rightSignatureImageUrl).toBeDefined();
      }
      if (demoStore.progressReports[0]) {
        const bakpSpec = makeBakpSpec(demoStore.progressReports[0], {
          project,
          customer,
          company: demoStore.company,
          bundle,
        });
        expect(bakpSpec?.rightSignatureImageUrl).toBeDefined();
      }
      if (demoStore.handoverReports[0]) {
        const bastSpec = makeBastSpec(demoStore.handoverReports[0], {
          project,
          customer,
          company: demoStore.company,
          bundle,
        });
        expect(bastSpec?.rightSignatureImageUrl).toBeDefined();
      }

      const spkResolved = resolveDocumentSigner({
        docType: "SPK",
        slot: "left",
        company: demoStore.company,
        signerName: adminUser.full_name,
      });
      expect(spkResolved.signatureImageUrl).toBe(
        "data:image/png;base64,ADMIN_SIG_BASE64",
      );
    });
  });
});
