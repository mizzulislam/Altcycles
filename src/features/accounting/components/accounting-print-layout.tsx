import * as React from "react";
import { createPortal } from "react-dom";
import type { CompanyProfileRow } from "@/types/database.types";
import { formatDateID } from "@/lib/formatters";

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

  const content = (
    <div data-accounting-print-area={printAreaId} aria-hidden="true">
      {/* 1. KOP RESMI ALTVIRA (Standar Sistem Altcycles) */}
      <div className="print-kop-wrapper">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src="/brand/altvira-icon-dark.png"
              alt="Logo"
              style={{
                height: "40px",
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#0B43C8",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  lineHeight: 1.1,
                }}
              >
                {companyName}
              </div>
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  color: "#334155",
                  marginTop: "3px",
                  lineHeight: 1.2,
                }}
              >
                {legalEntity}
              </div>
              <div
                style={{
                  fontSize: "8px",
                  color: "#64748b",
                  marginTop: "3px",
                  lineHeight: 1.3,
                }}
              >
                {address} | Email: {email} | Telp: {phone}
              </div>
            </div>
          </div>
        </div>

        {/* Garis Tebal Biru Standar Altvira */}
        <div
          style={{
            height: "2px",
            backgroundColor: "#0B43C8",
            width: "100%",
            marginBottom: "12px",
          }}
        />

        {/* Judul Dokumen & Periode */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "14px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "14px",
                fontWeight: "800",
                color: "#0f172a",
                textTransform: "uppercase",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {docTitle}
            </h1>
            {docSubtitle && (
              <div
                style={{
                  fontSize: "9.5px",
                  color: "#475569",
                  marginTop: "2px",
                }}
              >
                {docSubtitle}
              </div>
            )}
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: "9.5px",
              color: "#475569",
              lineHeight: 1.3,
            }}
          >
            <div>Tanggal: {currentDate}</div>
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
          Dokumen Resmi Pembukuan Keuangan
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

          [data-accounting-print-area="${printAreaId}"] .print-footer-wrapper {
            margin-top: 24px !important;
            padding-top: 10px !important;
            border-top: 0.6px solid #cbd5e1 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 8px !important;
          }
        }
      `}</style>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
