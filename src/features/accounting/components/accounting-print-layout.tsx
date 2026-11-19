import * as React from "react";
import { createPortal } from "react-dom";
import type { CompanyProfileRow } from "@/types/database.types";
import { formatDateID } from "@/lib/formatters";
import { resolveDocTitleConfig } from "@/lib/pdf-generator";

export interface AccountingPrintLayoutProps {
  printAreaId: string;
  company: CompanyProfileRow | null;
  docTitle: string;
  docSubtitle?: string;
  periodLabel: string;
  children: React.ReactNode;
}

export function AccountingPrintLayout({
  printAreaId,
  company,
  docTitle,
  docSubtitle,
  periodLabel,
  children,
}: AccountingPrintLayoutProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const companyName = company?.company_name || "ALTVIRA TECHNOLOGY";
  const legalEntity = company?.legal_entity_name || "PT Representasi Mitra Mandiri";
  const address =
    company?.address ||
    "Area Pandu Raya, Villa Citra, Bantarjati Jl. Flamboyan F2 No. 12 Kota Bogor, Jawa Barat.";
  const email = company?.email || "altvira.tech@gmail.com";
  const phone = company?.phone || "0895-4173-11976";
  const currentDate = formatDateID(new Date().toISOString().slice(0, 10));

  const titleConfig = resolveDocTitleConfig(docTitle);
  const headerShortTitle = titleConfig.headerTitle;
  const fullTitleBar = titleConfig.fullTitleBar || docTitle;

  const content = (
    <div data-accounting-print-area={printAreaId} aria-hidden="true">
      {/* 1. KOP RESMI ALTVIRA (Standar Dokumen Administrasi Altcycles) */}
      <div className="print-kop-wrapper">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src="/brand/altvira-icon-dark.png"
              alt="Logo"
              style={{
                height: "36px",
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <img
              src="/brand/altvira-wordmark-pdf.png"
              alt="Altvira"
              style={{
                height: "22px",
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "#0f172a",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              textAlign: "right",
            }}
          >
            {headerShortTitle}
          </div>
        </div>

        {/* Info Badan Usaha & Kontak */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            paddingBottom: "8px",
            borderBottom: "0.5px solid #e2e8f0",
            marginBottom: "8px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "#1e293b",
                lineHeight: 1.2,
              }}
            >
              {legalEntity}
            </div>
            <div
              style={{
                fontSize: "8px",
                color: "#64748b",
                marginTop: "2px",
                lineHeight: 1.3,
              }}
            >
              {address} | Email: {email} | Telp: {phone}
            </div>
          </div>
          <div
            style={{
              fontSize: "8.5px",
              color: "#64748b",
              textAlign: "right",
            }}
          >
            Ref: {docTitle.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase()}/{new Date().toISOString().slice(0, 10).replace(/-/g, "")}
          </div>
        </div>

        {/* Baris Biru Judul Lengkap Dokumen (Standar Patokan UAT) */}
        <div
          style={{
            backgroundColor: "#0B43C8",
            color: "#ffffff",
            padding: "5px 12px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            marginBottom: "10px",
          }}
        >
          {fullTitleBar}
        </div>

        {/* Blok Info 2 Kolom di Bawah Baris Biru */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: "8px",
            marginBottom: "12px",
            borderBottom: "0.5px solid #e2e8f0",
          }}
        >
          <div>
            <div style={{ fontSize: "9px", fontWeight: "700", color: "#334155" }}>
              Dasar Penyusunan / Ruang Lingkup:
            </div>
            <div style={{ fontSize: "8.5px", color: "#64748b", marginTop: "2px" }}>
              {docSubtitle || "Seluruh Akun & Transaksi Terverifikasi"}
            </div>
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: "8.5px",
              color: "#475569",
              lineHeight: 1.3,
            }}
          >
            <div>Tanggal Terbit: {currentDate}</div>
            <div style={{ fontWeight: "600", color: "#1e293b" }}>
              Periode: {periodLabel}
            </div>
          </div>
        </div>
      </div>

      {/* 2. ISI DOKUMEN */}
      <div className="print-body-content">{children}</div>

      {/* 3. FOOTER STANDAR SISTEM ALTVIRA */}
      <div className="print-footer-wrapper">
        <div style={{ fontWeight: "700", color: "#334155" }}>
          {companyName}
        </div>
        <div style={{ display: "flex", gap: "10px", color: "#64748b" }}>
          <span>LinkedIn: Altvira Technology</span>
          <span>•</span>
          <span>Instagram: @altvira.tech</span>
          <span>•</span>
          <span>Website: altvira.tech</span>
        </div>
        <div style={{ color: "#94a3b8" }}>
          Dokumen ini dibuat otomatis oleh Altcycles
        </div>
      </div>

      {/* 4. CSS KHUSUS MEDIA PRINT & FIX BACKGROUND HITAM */}
      <style>{`
        @media screen {
          [data-accounting-print-area="${printAreaId}"] {
            display: none !important;
          }
        }

        @media print {
          :root,
          html,
          body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #111827 !important;
            color-scheme: light !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
            background: #ffffff !important;
          }

          body > :not([data-accounting-print-area="${printAreaId}"]) {
            display: none !important;
          }

          [data-accounting-print-area="${printAreaId}"] {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #1f2937 !important;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif !important;
            line-height: 1.4 !important;
          }

          [data-accounting-print-area="${printAreaId}"] * {
            box-sizing: border-box !important;
          }

          [data-accounting-print-area="${printAreaId}"] table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-size: 10px !important;
            margin-top: 6px !important;
          }

          [data-accounting-print-area="${printAreaId}"] th {
            border: 1px solid #cbd5e1 !important;
            background-color: #f8fafc !important;
            background: #f8fafc !important;
            color: #0f172a !important;
            padding: 5px 8px !important;
            font-weight: 700 !important;
            font-size: 10px !important;
            text-align: center !important;
            text-transform: uppercase !important;
          }

          [data-accounting-print-area="${printAreaId}"] td {
            border: 1px solid #e2e8f0 !important;
            padding: 5px 8px !important;
            vertical-align: top !important;
            color: #334155 !important;
          }

          [data-accounting-print-area="${printAreaId}"] tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }

          [data-accounting-print-area="${printAreaId}"] .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }

          [data-accounting-print-area="${printAreaId}"] .print-amount-row {
            color: #0f172a !important;
            font-weight: 600 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            min-height: 16px !important;
            width: 100% !important;
            white-space: nowrap !important;
            word-break: normal !important;
            font-variant-numeric: tabular-nums !important;
          }

          [data-accounting-print-area="${printAreaId}"] .print-currency {
            color: #94a3b8 !important;
            font-weight: 400 !important;
            margin-right: 4px !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }

          [data-accounting-print-area="${printAreaId}"] .print-val {
            white-space: nowrap !important;
            font-variant-numeric: tabular-nums !important;
            flex-shrink: 0 !important;
          }

          [data-accounting-print-area="${printAreaId}"] .print-blank {
            visibility: hidden !important;
          }

          [data-accounting-print-area="${printAreaId}"] .print-memo {
            color: #0b43c8 !important;
            font-style: italic !important;
            margin-top: 4px !important;
            font-weight: 500 !important;
          }

          [data-accounting-print-area="${printAreaId}"] tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          [data-accounting-print-area="${printAreaId}"] .print-footer-wrapper {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin-top: 0 !important;
            padding-top: 8px !important;
            border-top: 0.6px solid #cbd5e1 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 8px !important;
            background: #ffffff !important;
          }
        }
      `}</style>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
