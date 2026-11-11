import { formatDateID, formatRupiah } from "@/lib/formatters";
import type {
  CompanyProfileRow,
  CustomerRow,
  MilestoneRow,
  ProjectRow,
  SpkCharterContent,
} from "@/types/database.types";

export function buildDefaultSpkContent(params: {
  project: ProjectRow;
  customer: CustomerRow | null;
  company: CompanyProfileRow;
  milestones: MilestoneRow[];
  summary?: string;
}): SpkCharterContent {
  const { project, customer, company, milestones, summary } = params;
  const clientCompany = customer?.company_name || customer?.name || "Pihak Klien";
  const periodLabel = `${formatDateID(project.start_date)} s.d. ${formatDateID(project.target_end_date)}`;

  const paymentTerms =
    milestones.length > 0
      ? milestones.map(
          (m, i) =>
            `Pembayaran ke-${i + 1} (${m.name}) sebesar ${m.percentage}% (${formatRupiah(m.amount)}) — ${m.achievement_criteria || "Sesuai pencapaian termin"}.`,
        )
      : [
          `Total nilai kontrak sebesar ${formatRupiah(project.contract_value)} dibayarkan sesuai kesepakatan termin penagihan resmi.`,
        ];

  return {
    summary:
      summary ||
      `Perjanjian kerja sama pelaksanaan proyek ${project.name} antara ${company.company_name} dan ${clientCompany}.`,
    headerSubtitle: "Project Charter / Surat Perjanjian Kerjasama",
    docVersion: "1.0",
    signingCity: company.signing_city || "Bogor",
    signingDate: project.start_date || new Date().toISOString().slice(0, 10),
    partyOne: {
      name: company.signer_name,
      title: company.signer_title,
      company: company.company_name,
      address: company.address,
      email: company.email,
      phone: company.phone,
    },
    partyTwo: {
      name: customer?.contact_person || customer?.name || "[Nama PIC Klien]",
      title: customer?.contact_title || "Direktur / Penanggung Jawab",
      company: clientCompany,
      address: customer?.address || "-",
      email: customer?.email || "-",
      phone: customer?.phone || "-",
    },
    clientLogoDataUrl: customer?.logo_storage_path ?? null,
    partyOneSignatureUrl: company.signer_signature_path ?? null,
    partyTwoSignatureUrl: customer?.signature_storage_path ?? null,
    partyOneParafUrl: company.signer_paraf_path ?? null,
    partyTwoParafUrl: customer?.paraf_storage_path ?? null,
    pasal1Tujuan: `PIHAK PERTAMA dan PIHAK KEDUA sepakat menjalin kerja sama dalam proyek ${project.name} untuk mendukung kebutuhan operasional dan eksistensi digital ${clientCompany}, sebagaimana ruang lingkup yang dijelaskan dalam pasal-pasal berikut.`,
    scopeGroups: [
      {
        category: "UI/UX & Perancangan Sistem",
        items: [
          "Audit kebutuhan & penyusunan struktur modul aplikasi",
          "Desain antarmuka responsif (desktop & mobile) dan konsistensi visual",
          "Review & finalisasi prototipe bersama PIHAK KEDUA",
        ],
      },
      {
        category: "Implementasi & Pengujian",
        items: [
          "Pengembangan fitur inti sesuai SoW dan spesifikasi yang disepakati",
          "Pengujian QA internal dan fasilitasi User Acceptance Testing (UAT)",
          "Deployment ke environment produksi & serah terima (BAST)",
        ],
      },
    ],
    outOfScope: [
      "Penambahan modul, integrasi sistem pihak ketiga, atau halaman baru di luar ruang lingkup yang telah disepakati.",
      "Biaya sewa server/domain/layanan pihak ketiga serta dukungan operasional pascarilis di luar masa garansi yang ditetapkan.",
    ],
    pasal3Intro: `Perjanjian ini berlaku selama periode pelaksanaan proyek (${periodLabel}) dan dapat diperpanjang berdasarkan kesepakatan tertulis kedua belah pihak. Adapun rincian timeline pelaksanaan yang direncanakan adalah sebagai berikut:`,
    timelineRows: [
      {
        week: "Minggu 1",
        activities: "Kick-off project, discovery kebutuhan, audit awal, dan perancangan arsitektur/UI.",
        output: "Locked Requirements, Timeline & Wireframe / Desain Awal.",
      },
      {
        week: "Minggu 2–3",
        activities: "Implementasi modul inti, integrasi fungsional, dan QA internal berkala.",
        output: "Staging Build untuk peninjauan progres oleh PIHAK KEDUA.",
      },
      {
        week: "Minggu 4",
        activities: "User Acceptance Testing (UAT), perbaikan temuan minor, dan serah terima proyek (BAST).",
        output: "Berita Acara UAT & BAST ditandatangani kedua belah pihak.",
      },
    ],
    teamRoles: [
      {
        role: "Project Manager",
        capacity: "Full Cycle",
        responsibility: "Mengelola rencana, koordinasi, risiko, status, perubahan, eskalasi, dan serah terima.",
      },
      {
        role: "UI/UX Designer",
        capacity: "Sesuai Fase",
        responsibility: "Audit UX ringkas, struktur wireframe, desain visual, dan revisi terencana.",
      },
      {
        role: "Developer / Engineer",
        capacity: "Full Cycle",
        responsibility: "Implementasi sistem, QA internal, perbaikan bug, dan deployment.",
      },
    ],
    clientRoles: [
      {
        role: `Product Owner (${clientCompany})`,
        responsibility: "Mengambil keputusan scope/desain/konten, memberi approval termin, dan menerima deliverables.",
      },
      {
        role: `Content & Asset Provider (${clientCompany})`,
        responsibility: "Menyediakan konten, aset, akses sistem, dan umpan balik terkoordinasi tepat waktu.",
      },
    ],
    ceremonies: [
      {
        event: "Kick-Off Meeting Project",
        frequency: "1x (awal proyek)",
        attendees: `Tim ${company.company_name} & ${clientCompany}`,
        schedule: formatDateID(project.start_date),
      },
      {
        event: "Checkpoint Status & Progress",
        frequency: "Mingguan",
        attendees: `Tim ${company.company_name} & ${clientCompany}`,
        schedule: "Online / Sesuai Kesepakatan",
      },
      {
        event: "UAT & Handoff Project",
        frequency: "1x (akhir proyek)",
        attendees: `Tim ${company.company_name} & ${clientCompany}`,
        schedule: formatDateID(project.target_end_date),
      },
    ],
    totalProjectCost: project.contract_value,
    costDetails: [
      {
        label: `Development & Implementation (${project.name})`,
        amount: project.contract_value,
      },
    ],
    paymentTermsText: paymentTerms,
    pasal6Kerahasiaan:
      "Kedua belah pihak sepakat menjaga kerahasiaan semua informasi, data, kode sumber, maupun dokumen yang diperoleh selama kerja sama berlangsung, baik yang bersifat teknis maupun non-teknis, dan tidak akan mengungkapkannya kepada pihak ketiga tanpa persetujuan tertulis dari pihak terkait.",
    pasal7Haki: [
      "Hak kekayaan intelektual atas hasil pekerjaan yang dikembangkan selama proyek ini beralih menjadi milik PIHAK KEDUA setelah seluruh kewajiban pembayaran diselesaikan 100%.",
      "PIHAK PERTAMA berhak mencantumkan proyek ini sebagai portofolio non-komersial atas seizin PIHAK KEDUA.",
    ],
    pasal8ForceMajeure:
      "Kedua pihak dibebaskan dari tanggung jawab atas keterlambatan atau kegagalan pelaksanaan kewajiban apabila disebabkan oleh hal-hal di luar kendali (force majeure), seperti bencana alam, peperangan, gangguan jaringan nasional, atau kebijakan pemerintah.",
    pasal9Penyelesaian:
      "Segala perselisihan yang timbul akibat perjanjian ini akan diselesaikan terlebih dahulu secara musyawarah untuk mencapai mufakat antara kedua belah pihak.",
    pasal10LainLain:
      "Hal-hal yang belum diatur dalam perjanjian ini akan dibicarakan dan disepakati kemudian secara tertulis sebagai adendum atau bagian yang tidak terpisahkan dari perjanjian ini.",
    closingText:
      "Demikian surat perjanjian kerja sama ini dibuat dengan itikad baik dan mempunyai kekuatan hukum yang sama bagi kedua belah pihak. Dokumen ini berlaku efektif sejak tanggal ditandatangani.",
  };
}

export function extractSpkCharterContent(
  raw: Record<string, unknown> | null | undefined,
  fallbackParams: {
    project: ProjectRow;
    customer: CustomerRow | null;
    company: CompanyProfileRow;
    milestones: MilestoneRow[];
  },
): SpkCharterContent {
  const defaults = buildDefaultSpkContent(fallbackParams);
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Partial<SpkCharterContent>;
  return {
    ...defaults,
    ...obj,
    partyOne: { ...defaults.partyOne!, ...(obj.partyOne ?? {}) },
    partyTwo: { ...defaults.partyTwo!, ...(obj.partyTwo ?? {}) },
    scopeGroups:
      Array.isArray(obj.scopeGroups) && obj.scopeGroups.length > 0
        ? obj.scopeGroups
        : defaults.scopeGroups,
    outOfScope:
      Array.isArray(obj.outOfScope) && obj.outOfScope.length > 0
        ? obj.outOfScope
        : defaults.outOfScope,
    timelineRows:
      Array.isArray(obj.timelineRows) && obj.timelineRows.length > 0
        ? obj.timelineRows
        : defaults.timelineRows,
    teamRoles:
      Array.isArray(obj.teamRoles) && obj.teamRoles.length > 0
        ? obj.teamRoles
        : defaults.teamRoles,
    clientRoles:
      Array.isArray(obj.clientRoles) && obj.clientRoles.length > 0
        ? obj.clientRoles
        : defaults.clientRoles,
    ceremonies:
      Array.isArray(obj.ceremonies) && obj.ceremonies.length > 0
        ? obj.ceremonies
        : defaults.ceremonies,
    costDetails:
      Array.isArray(obj.costDetails) && obj.costDetails.length > 0
        ? obj.costDetails
        : defaults.costDetails,
    paymentTermsText:
      Array.isArray(obj.paymentTermsText) && obj.paymentTermsText.length > 0
        ? obj.paymentTermsText
        : defaults.paymentTermsText,
    pasal7Haki:
      Array.isArray(obj.pasal7Haki) && obj.pasal7Haki.length > 0
        ? obj.pasal7Haki
        : defaults.pasal7Haki,
  };
}

