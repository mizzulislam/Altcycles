import type { CompanyProfileRow } from "@/types/database.types";

export type DocStatusVariant =
  | "neutral"
  | "info"
  | "success"
  | "danger"
  | "warning";

export interface PdfKeyValue {
  label: string;
  value: string;
}

export interface PdfTableColumn {
  header: string;
  widthRatio: number;
  align?: "left" | "right" | "center";
}

export interface PdfDocumentSpec {
  docTitle: string;
  docSubtitle?: string;
  docNumber: string;
  docDate: string;
  language?: "id" | "en";
  orientation?: "portrait" | "landscape";
  docVersion?: number | string;
  statusBadge?: {
    text: string;
    variant?: DocStatusVariant;
  };
  balanceDueBox?: {
    label: string;
    amountText: string;
    dueDateText?: string;
  };
  company: CompanyProfileRow;
  clientLogoUrl?: string | null;
  recipientTitle?: string;
  recipientLines?: string[];
  metaRows?: PdfKeyValue[];
  paragraphsBefore?: string[];
  tableColumns?: PdfTableColumn[];
  tableRows?: string[][];
  summaryRows?: PdfKeyValue[];
  terbilangAmount?: number;
  documentNotes?: string | null;
  paymentDetail?: {
    terbilangText: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    transferNews: string;
    isPaid?: boolean;
    swiftCode?: string | null;
  } | null;
  notes?: string[];
  notesTitle?: string;
  closingNote?: string;
  hasMeterai?: boolean;
  meteraiLabel?: string;
  minSignatureSpace?: number;
  leftSignatureLabel?: string;
  leftSignatureName?: string;
  leftSignatureImageUrl?: string | null;
  rightSignatureLabel?: string;
  rightSignatureName?: string;
  rightSignatureImageUrl?: string | null;
  thirdSignatureLabel?: string;
  thirdSignatureName?: string;
  thirdSignatureImageUrl?: string | null;
  footerDocNumber?: string;
  hideSystemFooter?: boolean;
  refDocNumber?: string | null;
  appreciationBarText?: string | null;
  docStatus?: string | null;
  watermarkText?: string | null;
  bannerBox?: PdfBannerBox;
  sections?: PdfDocumentSection[];
}

export interface PdfBannerBox {
  text: string;
  variant?: "success" | "info" | "warning" | "neutral";
}

export interface PdfDocumentSection {
  title?: string;
  subtitle?: string;
  badge?: string;
  metaRows?: PdfKeyValue[];
  tableColumns: PdfTableColumn[];
  tableRows: string[][];
  summaryRows?: PdfKeyValue[];
  pageBreakBefore?: boolean;
}

export interface PdfTextBox {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  zone: string;
}

export interface PdfCollisionIssue {
  pageIndex: number;
  boxA: PdfTextBox;
  boxB: PdfTextBox;
  overlapX: number;
  overlapY: number;
}

export interface PdfMarginIssue {
  pageIndex: number;
  box: PdfTextBox;
  reason: string;
}

export interface PdfHeaderAlignmentMetrics {
  legalNameBaselineY: number;
  noBaselineY: number;
  addrLine1BaselineY: number;
  refBaselineY: number;
  iconInkHeight: number;
  wordmarkInkHeight: number;
  deltaNoVsLegalName: number;
  deltaRefVsAddr1: number;
  deltaIconVsWordmarkInk: number;
}

export interface PdfLayoutInspectionResult {
  pdfBytes: Uint8Array;
  pageCount: number;
  textBoxes: PdfTextBox[];
  collisions: PdfCollisionIssue[];
  marginViolations: PdfMarginIssue[];
  headerAlignment: PdfHeaderAlignmentMetrics;
}

export interface DocTitleConfig {
  headerTitle: string;
  fullTitleBar?: string;
}

export interface DocumentTitleMapping {
  headerTitle: string;
  fullTitle: string;
}
