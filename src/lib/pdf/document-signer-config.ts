import { demoStore, getMergedProfileFields } from "@/lib/data-service";
import type { CompanyProfileRow, ProfileRow, UserRole } from "@/types/database.types";

export type SignableDocType =
  | "INV"
  | "KW"
  | "PA"
  | "POP"
  | "CLIENT_PO"
  | "QT"
  | "SOW"
  | "SPK"
  | "BAKP"
  | "UAT"
  | "BAST";

export type SignatureSlot = "left" | "right" | "third";

export type SignerSourcePolicy =
  | "specific_user_only"
  | "user_or_company_signer"
  | "client_party";

export interface DocumentSlotConfig {
  policy: SignerSourcePolicy;
  defaultRoleHint?: UserRole;
  defaultJobTitleHint?: string;
  description: string;
}

/**
 * Tabel Konfigurasi Tunggal Penandatangan Dokumen PDF (Item 4).
 * Memetakan setiap jenis dokumen dan slot tanda tangan ke kebijakan resolusi profil & gambar TTD.
 */
export const DOCUMENT_SIGNER_CONFIG: Record<
  SignableDocType,
  Partial<Record<SignatureSlot, DocumentSlotConfig>>
> = {
  INV: {
    right: {
      policy: "user_or_company_signer",
      defaultRoleHint: "admin",
      description: "Pejabat Keuangan / Penandatangan Resmi pada Invoice Penagihan",
    },
  },
  KW: {
    right: {
      policy: "user_or_company_signer",
      defaultRoleHint: "admin",
      description: "Pejabat Keuangan / Penerima Pembayaran pada Kuitansi Resmi",
    },
  },
  PA: {
    left: {
      policy: "specific_user_only",
      defaultRoleHint: "user",
      description: "Pemohon / Pengaju Dana pada Form Persetujuan Pembayaran (PA)",
    },
    right: {
      policy: "user_or_company_signer",
      defaultRoleHint: "admin",
      description: "Penyetuju / Pejabat Keuangan pada Form Persetujuan Pembayaran (PA)",
    },
  },
  POP: {
    left: {
      policy: "user_or_company_signer",
      description: "Pembuat PO / Pejabat Pengadaan pada PO Pembelian Vendor",
    },
    third: {
      policy: "user_or_company_signer",
      defaultRoleHint: "admin",
      defaultJobTitleHint: "Direktur Keuangan",
      description: "Pejabat Verifikasi / Direktur Keuangan pada PO Pembelian Vendor",
    },
    right: {
      policy: "client_party",
      description: "Perwakilan Vendor / Pemasok pada PO Pembelian Vendor",
    },
  },
  CLIENT_PO: {
    left: {
      policy: "client_party",
      description: "Pihak Klien Pengaju Purchase Order",
    },
    right: {
      policy: "user_or_company_signer",
      description: "Pejabat Penerima PO Klien Altvira",
    },
  },
  QT: {
    left: {
      policy: "client_party",
      description: "Perwakilan Klien pada Surat Penawaran Harga (Quotation)",
    },
    right: {
      policy: "user_or_company_signer",
      description: "Pejabat Penandatangan Quotation Altvira",
    },
  },
  SOW: {
    left: {
      policy: "client_party",
      description: "Perwakilan Klien pada Statement of Work (SoW)",
    },
    right: {
      policy: "user_or_company_signer",
      description: "Pejabat Pelaksana Altvira pada Statement of Work (SoW)",
    },
  },
  SPK: {
    left: {
      policy: "user_or_company_signer",
      description: "Pihak Pertama (Pejabat Altvira) pada SPK / Project Charter",
    },
    right: {
      policy: "client_party",
      description: "Pihak Kedua (Perwakilan Klien) pada SPK / Project Charter",
    },
  },
  BAKP: {
    left: {
      policy: "client_party",
      description: "Perwakilan Klien pada Berita Acara Kemajuan Pekerjaan (BAKP)",
    },
    right: {
      policy: "user_or_company_signer",
      description: "Pejabat Pelaksana Altvira pada BAKP",
    },
  },
  UAT: {
    left: {
      policy: "client_party",
      description: "Penguji Pihak Klien pada Dokumen UAT",
    },
    right: {
      policy: "specific_user_only",
      description: "Pendamping Teknis Altvira pada Dokumen UAT",
    },
  },
  BAST: {
    left: {
      policy: "client_party",
      description: "Penerima Hasil Pekerjaan (Klien) pada BAST",
    },
    right: {
      policy: "user_or_company_signer",
      description: "Pejabat Pelaksana Altvira pada BAST",
    },
  },
};

export interface ResolveDocumentSignerInput {
  docType: SignableDocType;
  slot: SignatureSlot;
  company?: CompanyProfileRow | null;
  profiles?: ProfileRow[];
  signerUserId?: string | null;
  signerName?: string | null;
  signerJobTitle?: string | null;
  customerSignatureUrl?: string | null;
  explicitSignatureUrl?: string | null;
}

export interface ResolvedDocumentSigner {
  signerName: string;
  signerTitle: string | null;
  displayNameWithTitle: string;
  signatureImageUrl: string | null;
  matchedProfileId: string | null;
  policy: SignerSourcePolicy;
}

function extractCleanPersonName(rawName: string | null | undefined): string {
  if (!rawName) return "";
  const idx = rawName.indexOf(" - ");
  return (idx >= 0 ? rawName.slice(0, idx) : rawName).trim();
}

function getCandidateProfiles(provided?: ProfileRow[]): ProfileRow[] {
  const source = provided && provided.length > 0 ? provided : demoStore.profiles;
  return source.map((p) => getMergedProfileFields(p) ?? p);
}

function findMatchingProfile(
  candidates: ProfileRow[],
  params: {
    userId?: string | null;
    personName?: string | null;
    jobTitle?: string | null;
  },
): ProfileRow | null {
  const cleanName = extractCleanPersonName(params.personName).toLowerCase();
  const cleanTitle = (params.jobTitle || "").trim().toLowerCase();

  // 1. Jika nama eksplisit diberikan dan cocok persis dengan full_name salah satu profil, prioritaskan profil tersebut
  if (cleanName) {
    const byExactName = candidates.find(
      (p) => p.full_name.trim().toLowerCase() === cleanName,
    );
    if (byExactName) return byExactName;
  }

  // 2. Cocokkan berdasarkan user ID
  if (params.userId) {
    const byId = candidates.find((p) => p.id === params.userId);
    if (byId) {
      // Jika tidak ada nama eksplisit yang bertentangan, gunakan profil byId
      if (
        !cleanName ||
        byId.full_name.trim().toLowerCase() === cleanName
      ) {
        return byId;
      }
    }
  }

  // 3. Cocokkan berdasarkan jabatan kerja (job_title)
  if (cleanTitle) {
    const byTitle = candidates.find(
      (p) => (p.job_title || "").trim().toLowerCase() === cleanTitle,
    );
    if (byTitle) return byTitle;
  }

  return null;
}

/**
 * Menentukan penandatangan dan gambar TTD otomatis berdasarkan DOCUMENT_SIGNER_CONFIG.
 * - Jika penandatangan yang cocok memiliki `signature_storage_path`, gunakan TTD pengguna tersebut.
 * - Jika kebijakan slot adalah `specific_user_only` (mis. Pemohon PA atau Pendamping UAT) dan pengguna tersebut
 *   belum mengunggah TTD, fallback ke `null` (tanpa gambar TTD) tanpa error.
 * - Jika kebijakan slot adalah `user_or_company_signer` dan penandatangan merupakan pejabat penandatangan perusahaan
 *   (`company.signer_name`), fallback ke `company.signer_signature_path` bila profil belum memiliki TTD pribadi.
 */
export function resolveDocumentSigner(
  input: ResolveDocumentSignerInput,
): ResolvedDocumentSigner {
  const slotConfig = DOCUMENT_SIGNER_CONFIG[input.docType]?.[input.slot] ?? {
    policy: "user_or_company_signer",
    description: "Default Document Signer",
  };

  if (slotConfig.policy === "client_party") {
    const cleanName = extractCleanPersonName(input.signerName) || "Pihak Klien";
    return {
      signerName: cleanName,
      signerTitle: input.signerJobTitle ?? null,
      displayNameWithTitle: input.signerName || cleanName,
      signatureImageUrl: input.customerSignatureUrl ?? null,
      matchedProfileId: null,
      policy: slotConfig.policy,
    };
  }

  const candidates = getCandidateProfiles(input.profiles);
  const companySignerName = input.company?.signer_name?.trim() || "";
  const companySignerTitle = input.company?.signer_title?.trim() || null;

  const targetName =
    input.signerName?.trim() ||
    (slotConfig.policy === "user_or_company_signer" ? companySignerName : "");
  const targetTitle =
    input.signerJobTitle?.trim() ||
    slotConfig.defaultJobTitleHint ||
    (slotConfig.policy === "user_or_company_signer" ? companySignerTitle : null);

  const matched = findMatchingProfile(candidates, {
    userId: input.signerUserId,
    personName: targetName,
    jobTitle: targetTitle,
  });

  const resolvedName =
    extractCleanPersonName(targetName) ||
    matched?.full_name ||
    companySignerName ||
    "-";
  const resolvedTitle =
    targetTitle || matched?.job_title || companySignerTitle || null;
  const displayNameWithTitle =
    input.signerName?.includes(" - ")
      ? input.signerName
      : resolvedTitle
        ? `${resolvedName} - ${resolvedTitle}`
        : resolvedName;

  if (input.explicitSignatureUrl !== undefined && input.explicitSignatureUrl !== null) {
    return {
      signerName: resolvedName,
      signerTitle: resolvedTitle,
      displayNameWithTitle,
      signatureImageUrl: input.explicitSignatureUrl,
      matchedProfileId: matched?.id ?? null,
      policy: slotConfig.policy,
    };
  }

  if (matched?.signature_storage_path) {
    return {
      signerName: resolvedName,
      signerTitle: resolvedTitle,
      displayNameWithTitle,
      signatureImageUrl: matched.signature_storage_path,
      matchedProfileId: matched.id,
      policy: slotConfig.policy,
    };
  }

  if (slotConfig.policy === "specific_user_only") {
    return {
      signerName: resolvedName,
      signerTitle: resolvedTitle,
      displayNameWithTitle,
      signatureImageUrl: null,
      matchedProfileId: matched?.id ?? null,
      policy: slotConfig.policy,
    };
  }

  // Untuk user_or_company_signer: jika nama penandatangan berbeda dari company.signer_name
  // dan profil pengguna tersebut ditemukan namun belum mengunggah TTD, jangan menempelkan TTD orang lain.
  const isDifferentNamedPerson =
    Boolean(extractCleanPersonName(input.signerName)) &&
    Boolean(companySignerName) &&
    extractCleanPersonName(input.signerName).toLowerCase() !==
      companySignerName.toLowerCase();

  if (isDifferentNamedPerson) {
    return {
      signerName: resolvedName,
      signerTitle: resolvedTitle,
      displayNameWithTitle,
      signatureImageUrl: null,
      matchedProfileId: matched?.id ?? null,
      policy: slotConfig.policy,
    };
  }

  // Cek juga apakah profil yang cocok dengan company.signer_name punya signature_storage_path
  const companySignerProfile = companySignerName
    ? findMatchingProfile(candidates, {
        personName: companySignerName,
        jobTitle: companySignerTitle,
      })
    : null;

  return {
    signerName: resolvedName,
    signerTitle: resolvedTitle,
    displayNameWithTitle,
    signatureImageUrl:
      companySignerProfile?.signature_storage_path ??
      input.company?.signer_signature_path ??
      null,
    matchedProfileId: matched?.id ?? companySignerProfile?.id ?? null,
    policy: slotConfig.policy,
  };
}
