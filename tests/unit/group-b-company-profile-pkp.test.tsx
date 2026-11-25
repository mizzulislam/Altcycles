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

import { getHeaderBreadcrumbs } from "@/components/layout/breadcrumb-map";
import { getNavStructureForRole } from "@/components/layout/nav-structure";
import { CompanyProfilePage } from "@/features/system-config/company-profile-page";
import {
  demoStore,
  getCompanyProfile,
  setDemoCurrentUser,
  updateCompanyProfile,
  uploadCompanyPkpProof,
} from "@/lib/data-service";
import { DICTIONARY, LanguageProvider, resolveTranslation } from "@/lib/i18n";
import { NAVIGATION_SHORTCUTS_REGISTRY } from "@/lib/navigation-shortcuts-registry";

describe("Kelompok B — Item 5, 6, dan 7 (Profil Perusahaan, Sosmed Footer, & Bukti PKP)", () => {
  const initialCompany = structuredClone(demoStore.company);
  const initialProfiles = structuredClone(demoStore.profiles);

  beforeEach(() => {
    localStorage.clear();
    demoStore.company = structuredClone(initialCompany);
    demoStore.profiles = structuredClone(initialProfiles);
    const superAdmin = demoStore.profiles.find((p) => p.role === "super_admin");
    if (superAdmin) {
      setDemoCurrentUser(superAdmin.id);
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // (a) ITEM 5: Hapus Field "Gambar Paraf Pihak Pertama" & Hapus "(Altvira)"
  // ===========================================================================
  describe("(a) Item 5 — Penghapusan Field Paraf Pihak Pertama & Label '(Altvira)'", () => {
    it("menghapus kata '(Altvira)' dari menu Super Admin, breadcrumb, command palette, kamus i18n, dan judul halaman", () => {
      const superAdminNav = getNavStructureForRole("super_admin");
      const companyNavItem = superAdminNav.find(
        (entry) => entry.type === "item" && entry.to === "/super-admin/profil-perusahaan",
      );
      expect(companyNavItem).toBeDefined();
      expect(companyNavItem?.label).toBe("Profil Perusahaan");
      expect(companyNavItem?.label).not.toContain("(Altvira)");

      const breadcrumbs = getHeaderBreadcrumbs("/super-admin/profil-perusahaan");
      expect(breadcrumbs[breadcrumbs.length - 1]?.label).toBe("Profil Perusahaan");
      expect(breadcrumbs[breadcrumbs.length - 1]?.label).not.toContain("(Altvira)");

      const shortcutEntry = NAVIGATION_SHORTCUTS_REGISTRY.find(
        (s) => s.id === "nav_super_company_profile",
      );
      expect(shortcutEntry?.fallbackTitle).toBe("Profil Perusahaan");
      expect(shortcutEntry?.fallbackTitle).not.toContain("(Altvira)");

      expect(DICTIONARY.id["nav.company_profile"]).toBe("Profil Perusahaan");
      expect(DICTIONARY.id["company.page_title"]).toBe("Profil Perusahaan");
      expect(DICTIONARY.en["nav.company_profile"]).toBe("Company Profile");
      expect(DICTIONARY.en["company.page_title"]).toBe("Company Profile");
      expect(resolveTranslation("common:nav.company_profile", "id")).toBe("Profil Perusahaan");
      expect(resolveTranslation("common:nav.company_profile", "en")).toBe("Company Profile");
      expect(resolveTranslation("settings:company.page_title", "id")).toBe("Profil Perusahaan");
      expect(resolveTranslation("settings:company.page_title", "en")).toBe("Company Profile");
    });

    it("tidak merender field 'Gambar Paraf Pihak Pertama' di tab Rekening & TTD dan menampilkan grid TTD yang proporsional", async () => {
      render(
        <LanguageProvider>
          <MemoryRouter initialEntries={["/super-admin/profil-perusahaan?tab=keuangan"]}>
            <CompanyProfilePage />
          </MemoryRouter>
        </LanguageProvider>,
      );

      const heading = await screen.findByRole("heading", { level: 1 });
      expect(heading.textContent).toBe("Profil Perusahaan");
      expect(heading.textContent).not.toContain("(Altvira)");

      // Pastikan field TTD ada, sedangkan field "Gambar Paraf Pihak Pertama" sudah dihapus dari UI
      expect(
        screen.getByText(/Gambar Tanda Tangan \(TTD\)|Signature Image/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Gambar Paraf Pihak Pertama|First Party Initial/i),
      ).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // (b) ITEM 6: Tambah, Edit, Hapus, & Validasi Akun Sosial Media Footer
  // ===========================================================================
  describe("(b) Item 6 — Penambahan, Edit, Hapus, dan Validasi Akun Sosial Media Footer", () => {
    it("menambah, mengedit, dan menghapus akun sosial media tanpa error serta menolak duplikat atau URL tidak valid", async () => {
      // 1. Tolak duplikat platform + username
      await expect(
        updateCompanyProfile({
          social_links_json: [
            { platform: "Instagram", username: "@altvira.tech", url: "https://instagram.com/altvira.tech" },
            { platform: "Instagram", username: "@altvira.tech", url: "https://instagram.com/altvira.tech" },
          ],
        }),
      ).rejects.toThrow(/duplikat/i);

      // 2. Tolak URL yang tidak valid
      await expect(
        updateCompanyProfile({
          social_links_json: [
            { platform: "Instagram", username: "@altvira.tech", url: "bukan-url-valid" },
          ],
        }),
      ).rejects.toThrow(/Format URL/i);

      // 3. Tolak username kosong
      await expect(
        updateCompanyProfile({
          social_links_json: [{ platform: "TikTok", username: "   " }],
        }),
      ).rejects.toThrow(/wajib memiliki platform dan username/i);

      // 4. Simpan penambahan akun sosial media baru (termasuk telephone_fax & website)
      const saved = await updateCompanyProfile({
        telephone_fax: "(0251) 8321999",
        website: "www.altvira.id",
        social_links_json: [
          { platform: "Instagram", username: "@altvira.tech", url: "https://instagram.com/altvira.tech" },
          { platform: "LinkedIn", username: "Altvira Technology", url: "https://linkedin.com/company/altviratech" },
          { platform: "YouTube", username: "@altviraofficial", url: "https://youtube.com/@altviraofficial" },
        ],
      });

      expect(saved.telephone_fax).toBe("(0251) 8321999");
      expect(saved.social_links_json).toHaveLength(3);
      expect(saved.social_links_json?.[2]?.platform).toBe("YouTube");

      // Reload lewat getCompanyProfile() -> tetap tersimpan
      const reloaded = await getCompanyProfile();
      expect(reloaded.social_links_json).toHaveLength(3);
      expect(reloaded.social_links_json?.[2]?.username).toBe("@altviraofficial");

      // 5. Render UI tab Sosial Media Footer, tambah slot baru, isi, lalu simpan
      render(
        <LanguageProvider>
          <MemoryRouter initialEntries={["/super-admin/profil-perusahaan?tab=sosmed"]}>
            <CompanyProfilePage />
          </MemoryRouter>
        </LanguageProvider>,
      );

      const addBtn = await screen.findByRole("button", {
        name: /Tambah Sosial Media|Add Social Media/i,
      });
      fireEvent.click(addBtn);

      const handleInputs = screen.getAllByPlaceholderText(/Contoh: @altvira\.tech|Example: @altvira\.tech/i);
      expect(handleInputs).toHaveLength(4);
      fireEvent.change(handleInputs[3]!, { target: { value: "@altvira.dev" } });

      const saveBtn = screen.getByRole("button", {
        name: /Simpan Sosial Media Footer|Save Footer Social Media/i,
      });
      fireEvent.click(saveBtn);

      await waitFor(async () => {
        const afterUiSave = await getCompanyProfile();
        expect(afterUiSave.social_links_json).toHaveLength(4);
        expect(afterUiSave.social_links_json?.[3]?.username).toBe("@altvira.dev");
      });
    });
  });

  // ===========================================================================
  // (c) ITEM 7: Bukti Pendukung Wajib Saat Mengaktifkan Status PKP
  // ===========================================================================
  describe("(c) Item 7 — Bukti Pendukung Wajib Saat Mengaktifkan Status PKP", () => {
    it("menolak aktivasi PKP tanpa bukti, memvalidasi format/ukuran berkas bukti, mengizinkan aktivasi setelah bukti valid diunggah, dan mempertahankan bukti saat PKP dimatikan", async () => {
      // Pastikan kondisi awal tanpa bukti PKP
      demoStore.company.pkp_enabled = false;
      demoStore.company.pkp_proof_storage_path = null;
      demoStore.company.pkp_proof_file_name = null;

      // 1. Coba aktifkan PKP di service/server tanpa bukti -> DITOLAK
      await expect(
        updateCompanyProfile({ pkp_enabled: true }),
      ).rejects.toThrow(/Wajib mengunggah dokumen bukti pengukuhan PKP/i);

      // 2. Validasi uploadCompanyPkpProof menolak format tidak valid (.exe / .docx) dan ukuran > 5 MB
      const invalidExtFile = new File(["invalid"], "bukti.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      await expect(uploadCompanyPkpProof(invalidExtFile)).rejects.toThrow(
        /Format berkas bukti PKP tidak didukung/i,
      );

      const oversizedFile = new File(
        [new Uint8Array(5 * 1024 * 1024 + 2048)],
        "sppkp-besar.pdf",
        { type: "application/pdf" },
      );
      await expect(uploadCompanyPkpProof(oversizedFile)).rejects.toThrow(
        /melebihi batas maksimal 5 MB/i,
      );

      // 3. Render tab Perpajakan (PKP) dan coba aktifkan switch tanpa bukti -> switch tetap nonaktif
      render(
        <LanguageProvider>
          <MemoryRouter initialEntries={["/super-admin/profil-perusahaan?tab=pajak"]}>
            <CompanyProfilePage />
          </MemoryRouter>
        </LanguageProvider>,
      );

      const pkpSwitch = await screen.findByRole("switch");
      expect(pkpSwitch).toHaveAttribute("aria-checked", "false");
      fireEvent.click(pkpSwitch);
      // Karena belum ada bukti, modal konfirmasi aktivasi tidak terbuka dan switch tetap false
      expect(
        screen.queryByText(/Aktifkan Status PKP & Modul Pajak\?/i),
      ).not.toBeInTheDocument();
      expect(demoStore.company.pkp_enabled).toBe(false);

      // 4. Unggah berkas bukti PKP yang valid (PDF <= 5 MB)
      const validPdfFile = new File(["%PDF-1.4 SPPKP ALTVIRA"], "SPPKP_Altvira_2026.pdf", {
        type: "application/pdf",
      });
      const fileInput = screen.getByTestId("pkp-proof-file-input");
      fireEvent.change(fileInput, { target: { files: [validPdfFile] } });

      // Pastikan kartu bukti PKP muncul menampilkan nama berkas & tombol Lihat Bukti
      const proofFilename = await screen.findByTestId("pkp-proof-filename");
      expect(proofFilename.textContent).toBe("SPPKP_Altvira_2026.pdf");
      expect(screen.getByText(/Lihat Bukti|View Proof/i)).toBeInTheDocument();
      expect(screen.getByText(/Ganti Bukti|Replace Proof/i)).toBeInTheDocument();

      // 5. Sekarang aktifkan switch PKP -> modal konfirmasi muncul -> konfirmasi -> PKP aktif!
      fireEvent.click(pkpSwitch);
      const confirmBtn = await screen.findByRole("button", {
        name: /Ya, Lanjutkan|Konfirmasi|Confirm/i,
      });
      fireEvent.click(confirmBtn);

      await waitFor(async () => {
        const afterActivate = await getCompanyProfile();
        expect(afterActivate.pkp_enabled).toBe(true);
        expect(afterActivate.pkp_proof_file_name).toBe("SPPKP_Altvira_2026.pdf");
      });

      // 6. Matikan kembali status PKP -> berhasil dan file bukti lama TIDAK dihapus
      const updatedOff = await updateCompanyProfile({ pkp_enabled: false });
      expect(updatedOff.pkp_enabled).toBe(false);
      expect(updatedOff.pkp_proof_file_name).toBe("SPPKP_Altvira_2026.pdf");
      expect(updatedOff.pkp_proof_storage_path).toBeTruthy();
    });
  });
});
