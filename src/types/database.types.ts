export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "user" | "admin" | "super_admin";

export type DocTypeCode =
  | "QT"
  | "SOW"
  | "SPK"
  | "BAKP"
  | "INV"
  | "KW"
  | "UAT"
  | "BAST"
  | "POP"
  | "PA"
  | "JRN"
  | "PRJ";

export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "CLOSE_PERIOD"
  | "REOPEN_PERIOD"
  | "VERIFY_PO"
  | "FINALIZE_SHARING";

export type AccountType =
  | "asset"
  | "contra_asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export type NormalBalance = "debit" | "credit";

export type AccountSystemTag =
  | "none"
  | "cash_bank"
  | "accounts_receivable"
  | "unbilled_receivable"
  | "work_in_progress"
  | "contract_billings"
  | "accounts_payable"
  | "unearned_revenue"
  | "profit_sharing_payable"
  | "retained_earnings"
  | "income_summary"
  | "service_revenue"
  | "profit_sharing_expense"
  | "shared_expense";

export type CashFlowCategory =
  | "operating"
  | "investing"
  | "financing"
  | "cash_equivalent";

export type PeriodStatus = "open" | "closed";
export type ProjectCategory = "client" | "internal";
export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "cancelled";
export type RevenueRecognitionMethod =
  | "single_term_deferral"
  | "two_term_accrual"
  | "progress_billing";

export type PoStatus = "draft" | "issued" | "completed" | "cancelled";
export type PaymentRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "paid";
export type AttachmentEntityType =
  | "payment_request_proof"
  | "payment_transfer_proof"
  | "project_document"
  | "client_po"
  | "bakp_signed"
  | "uat_signed"
  | "bast_signed";

export type JournalType =
  | "general"
  | "auto_expense"
  | "auto_payment"
  | "auto_invoice"
  | "auto_receipt"
  | "adjustment"
  | "progress_billing"
  | "elimination"
  | "reversing"
  | "closing"
  | "correction"
  | "profit_sharing";

export type JournalStatus = "draft" | "posted";
export type BudgetStatus = "draft" | "active" | "superseded";

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
export type ClientPoStatus = "pending_verification" | "verified" | "rejected";
export type MilestoneStatus =
  | "planned"
  | "in_progress"
  | "bakp_approved"
  | "invoiced"
  | "paid";
export type BakpStatus = "draft" | "approved_by_client";
export type UatConclusion =
  | "pending"
  | "accepted"
  | "accepted_with_notes"
  | "rejected";
export type BastStatus = "draft" | "signed";
export type InvoiceKind = "down_payment" | "milestone" | "final_settlement";
export type InvoiceDocStatus = "draft" | "issued" | "cancelled";
export type InvoicePaymentStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type ProfitSharingStatus = "draft_simulation" | "finalized";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  username?: string | null;
  avatar_url?: string | null;
  phone_number?: string | null;
  job_title?: string | null;
  bio?: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialMediaEntry = {
  platform: string;
  username: string;
};

export type BankAccountEntry = {
  bank_name: string;
  account_number: string;
  account_holder: string;
};

export type CompanyProfileRow = {
  id: number;
  company_name: string;
  legal_entity_name: string;
  tagline?: string | null;
  address: string;
  email: string;
  phone: string;
  signing_city?: string | null;
  logo_storage_path: string | null;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  bank_accounts_json?: BankAccountEntry[] | null;
  signer_name: string;
  signer_title: string;
  tax_id_number?: string | null;
  signer_signature_path?: string | null;
  signer_paraf_path?: string | null;
  social_links_json?: SocialMediaEntry[] | null;
  pkp_enabled: boolean;
  ppn_rate: number;
  pph_enabled: boolean;
  journal_lock_enabled?: boolean;
  auto_closing_enabled?: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocSequenceRow = {
  doc_type: DocTypeCode;
  label: string;
  prefix_pattern: string;
  padding_digits: number;
  reset_period: "monthly" | "yearly" | "never";
  updated_by: string | null;
  updated_at: string;
};

export type DocSequenceCounterRow = {
  doc_type: DocTypeCode;
  period_key: string;
  last_number: number;
  updated_at: string;
};

export type DocTemplateRow = {
  doc_type: DocTypeCode;
  title: string;
  version: number;
  default_placeholders: Record<string, string | number | boolean>;
  footer_notes: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: AuditAction;
  entity_name: string;
  entity_id: string;
  old_data: Record<string, Json | undefined> | null;
  new_data: Record<string, Json | undefined> | null;
  created_at: string;
};

export type AccountRow = {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  parent_id: string | null;
  system_tag: AccountSystemTag;
  cash_flow_category: CashFlowCategory;
  is_postable: boolean;
  is_active: boolean;
  used_in_journal_count: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PeriodRow = {
  id: string;
  year: number;
  month: number;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
  reopen_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VendorRow = {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  npwp: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerRow = {
  id: string;
  code: string;
  name: string;
  company_name: string | null;
  contact_person: string | null;
  contact_title: string | null;
  email: string | null;
  phone: string | null;
  npwp: string | null;
  address: string | null;
  logo_storage_path?: string | null;
  signature_storage_path?: string | null;
  paraf_storage_path?: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  project_category: ProjectCategory;
  customer_id: string | null;
  status: ProjectStatus;
  start_date: string | null;
  target_end_date: string | null;
  completed_date: string | null;
  contract_value: number;
  term_count: number;
  revenue_method: RevenueRecognitionMethod;
  spk_number: string | null;
  has_posted_journal: boolean;
  is_eliminated: boolean;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectMemberRow = {
  project_id: string;
  user_id: string;
  member_role: string;
  assigned_by: string | null;
  assigned_at: string;
};

// Fase 2 Rows
export type PurchaseOrderRow = {
  id: string;
  po_number: string;
  po_date: string;
  vendor_id: string;
  project_id: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: PoStatus;
  notes: string | null;
  budget_warning_acknowledged: boolean;
  issued_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PoItemRow = {
  id: string;
  po_id: string;
  line_no: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
};

export type AttachmentRow = {
  id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link_path: string | null;
  is_read: boolean;
  created_at: string;
};

export type ExportLogRow = {
  id: string;
  user_id: string;
  report_type: string;
  format: "PDF" | "EXCEL" | "CSV";
  period_filter: string | null;
  created_at: string;
};

export type PaymentRequestRow = {
  id: string;
  request_number: string;
  revision_no: number;
  requester_id: string;
  purpose: string;
  recipient_name: string;
  recipient_bank_info: string | null;
  amount: number;
  project_id: string;
  expense_account_id: string;
  po_id: string | null;
  status: PaymentRequestStatus;
  budget_warning_acknowledged: boolean;
  submitted_at: string | null;
  approver_id: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  paid_date: string | null;
  source_cash_account_id: string | null;
  accrual_journal_id: string | null;
  payment_journal_id: string | null;
  created_at: string;
  updated_at: string;
};

// Fase 3 Rows
export type JournalRow = {
  id: string;
  journal_number: string;
  journal_date: string;
  period_id: string;
  journal_type: JournalType;
  source_type: string | null;
  source_id: string | null;
  project_id: string | null;
  description: string;
  status: JournalStatus;
  reference_journal_id: string | null;
  auto_reverse_next_period: boolean;
  is_reversed: boolean;
  posted_at: string | null;
  posted_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type JournalLineRow = {
  id: string;
  journal_id: string;
  line_no: number;
  account_id: string;
  project_id: string | null;
  description: string | null;
  debit: number;
  credit: number;
};

export type BudgetRow = {
  id: string;
  project_id: string;
  period_id: string | null;
  version: number;
  alert_threshold_pct: number;
  status: BudgetStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetLineRow = {
  id: string;
  budget_id: string;
  account_id: string;
  allocated_amount: number;
};

export type BudgetComparisonRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  allocated_amount: number;
  realized_amount: number;
  committed_po_amount: number;
  remaining_amount: number;
  absorption_pct: number;
  alert_threshold_pct: number;
  is_over_threshold: boolean;
};

// Fase 4 Rows
export type QuotationRow = {
  id: string;
  quotation_number: string;
  quotation_date: string;
  valid_until: string;
  customer_id: string;
  project_id: string | null;
  project_title: string;
  client_need_summary: string | null;
  estimated_weeks: number;
  revision_limit: number;
  total_amount: number;
  status: QuotationStatus;
  terms_json: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationItemRow = {
  id: string;
  quotation_id: string;
  line_no: number;
  feature_name: string;
  description: string | null;
  cost_amount: number;
};

export type ClientPoItemJson = {
  item: string;
  qty: number;
  price: number;
};

export type ClientPurchaseOrderRow = {
  id: string;
  po_number: string;
  project_id: string | null;
  quotation_reference: string | null;
  client_name: string;
  client_company: string | null;
  client_email: string;
  client_phone: string | null;
  items_json: ClientPoItemJson[];
  po_value: number;
  status: ClientPoStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_note: string | null;
  attachment_path: string | null;
  submitted_ip_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type SpkPartyIdentity = {
  name: string;
  title: string;
  company: string;
  address: string;
  email: string;
  phone: string;
};

export type SpkScopeGroup = {
  category: string;
  items: string[];
};

export type SpkTimelineRow = {
  week: string;
  activities: string;
  output: string;
};

export type SpkTeamRoleRow = {
  role: string;
  capacity: string;
  responsibility: string;
};

export type SpkClientRoleRow = {
  role: string;
  responsibility: string;
};

export type SpkCeremonyRow = {
  event: string;
  frequency: string;
  attendees: string;
  schedule: string;
};

export type SpkCostDetailRow = {
  label: string;
  amount: number;
};

export type SpkCharterContent = {
  summary?: string;
  headerSubtitle?: string;
  docVersion?: string;
  signingCity?: string;
  signingDate?: string;
  partyOne?: SpkPartyIdentity;
  partyTwo?: SpkPartyIdentity;
  clientLogoDataUrl?: string | null;
  partyOneSignatureUrl?: string | null;
  partyTwoSignatureUrl?: string | null;
  partyOneParafUrl?: string | null;
  partyTwoParafUrl?: string | null;
  pasal1Tujuan?: string;
  scopeGroups?: SpkScopeGroup[];
  outOfScope?: string[];
  pasal3Intro?: string;
  timelineRows?: SpkTimelineRow[];
  teamRoles?: SpkTeamRoleRow[];
  clientRoles?: SpkClientRoleRow[];
  ceremonies?: SpkCeremonyRow[];
  totalProjectCost?: number;
  costDetails?: SpkCostDetailRow[];
  paymentTermsText?: string[];
  pasal6Kerahasiaan?: string;
  pasal7Haki?: string[];
  pasal8ForceMajeure?: string;
  pasal9Penyelesaian?: string;
  pasal10LainLain?: string;
  closingText?: string;
};

export type ProjectDocumentRow = {
  id: string;
  project_id: string;
  doc_type: "SOW" | "SPK" | "OTHER";
  doc_number: string;
  title: string;
  version: number;
  content_json: Record<string, Json | undefined>;
  is_signed: boolean;
  signed_storage_path: string | null;
  visible_to_buyer: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MilestoneRow = {
  id: string;
  project_id: string;
  sequence_no: number;
  name: string;
  is_down_payment: boolean;
  is_final_settlement: boolean;
  percentage: number;
  amount: number;
  achievement_criteria: string | null;
  status: MilestoneStatus;
  created_at: string;
};

export type ProgressReportRow = {
  id: string;
  bakp_number: string;
  bakp_date: string;
  project_id: string;
  milestone_id: string;
  cumulative_percentage: number;
  billable_amount: number;
  deliverables_json: Array<{ name: string; status: string }>;
  findings_notes: string | null;
  status: BakpStatus;
  signed_storage_path: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type UatChecklistRow = {
  id: string;
  uat_number: string;
  test_date: string;
  project_id: string;
  staging_url: string | null;
  client_tester_name: string;
  altvira_companion_name: string;
  conclusion: UatConclusion;
  signed_storage_path: string | null;
  created_by: string | null;
  created_at: string;
};

export type UatItemRow = {
  id: string;
  uat_id: string;
  line_no: number;
  feature_name: string;
  test_scenario: string;
  result: "pending" | "pass" | "fail";
  notes: string | null;
};

export type HandoverReportRow = {
  id: string;
  bast_number: string;
  bast_date: string;
  project_id: string;
  uat_id: string;
  handover_items_json: Array<{ item: string; format: string; note: string }>;
  warranty_days: number;
  status: BastStatus;
  signed_storage_path: string | null;
  signed_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type ProjectProgressRow = {
  id: string;
  project_id: string;
  period_id: string;
  progress_date: string;
  bakp_id: string | null;
  cumulative_percentage: number;
  cumulative_recognized_revenue: number;
  period_recognized_revenue: number;
  adjustment_journal_id: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type SalesInvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  project_id: string;
  customer_id: string;
  milestone_id: string | null;
  client_po_id: string;
  bakp_id: string | null;
  bast_id: string | null;
  invoice_kind: InvoiceKind;
  subtotal_amount: number;
  ppn_amount: number;
  total_amount: number;
  paid_amount: number;
  doc_status: InvoiceDocStatus;
  payment_status: InvoicePaymentStatus;
  journal_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoicePaymentRow = {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  destination_account_id: string;
  payment_method: string;
  proof_storage_path: string | null;
  journal_id: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type ReceiptRow = {
  id: string;
  receipt_number: string;
  receipt_date: string;
  invoice_id: string;
  invoice_payment_id: string;
  amount: number;
  received_from: string;
  created_at: string;
};

export type ProfitSharingSchemeRow = {
  id: string;
  project_id: string;
  recipient_name: string;
  recipient_user_id: string | null;
  percentage: number;
  created_at: string;
};

export type ProfitSharingResultRow = {
  id: string;
  project_id: string;
  recognized_revenue: number;
  direct_cost: number;
  allocated_shared_cost: number;
  gross_profit: number;
  status: ProfitSharingStatus;
  journal_id: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfitSharingLineRow = {
  id: string;
  result_id: string;
  recipient_name: string;
  recipient_user_id: string | null;
  percentage: number;
  share_amount: number;
};

export type BuyerPortalLookupDto = {
  po_number: string;
  client_name: string;
  client_company: string | null;
  po_value: number;
  verification_status: ClientPoStatus;
  submitted_at: string;
  project: {
    code: string;
    name: string;
    status: ProjectStatus;
    start_date: string | null;
    target_end_date: string | null;
    cumulative_progress_pct: number;
  } | null;
  milestones: Array<{
    sequence_no: number;
    name: string;
    percentage: number;
    amount: number;
    status: MilestoneStatus;
    achievement_criteria: string | null;
  }>;
  documents: Array<{
    category: string;
    doc_number: string;
    doc_date: string;
    status: string;
  }>;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "full_name" | "email">;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      company_profile: {
        Row: CompanyProfileRow;
        Insert: Partial<CompanyProfileRow>;
        Update: Partial<CompanyProfileRow>;
        Relationships: [];
      };
      doc_sequences: {
        Row: DocSequenceRow;
        Insert: Omit<DocSequenceRow, "updated_at" | "updated_by"> &
          Partial<Pick<DocSequenceRow, "updated_at" | "updated_by">>;
        Update: Partial<DocSequenceRow>;
        Relationships: [];
      };
      doc_sequence_counters: {
        Row: DocSequenceCounterRow;
        Insert: DocSequenceCounterRow;
        Update: Partial<DocSequenceCounterRow>;
        Relationships: [];
      };
      doc_templates: {
        Row: DocTemplateRow;
        Insert: Omit<DocTemplateRow, "updated_at" | "updated_by"> &
          Partial<Pick<DocTemplateRow, "updated_at" | "updated_by">>;
        Update: Partial<DocTemplateRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      accounts: {
        Row: AccountRow;
        Insert: Omit<
          AccountRow,
          "id" | "created_at" | "updated_at" | "used_in_journal_count"
        > &
          Partial<Pick<AccountRow, "id" | "used_in_journal_count">>;
        Update: Partial<AccountRow>;
        Relationships: [];
      };
      periods: {
        Row: PeriodRow;
        Insert: Pick<PeriodRow, "year" | "month" | "name" | "start_date" | "end_date"> &
          Partial<PeriodRow>;
        Update: Partial<PeriodRow>;
        Relationships: [];
      };
      vendors: {
        Row: VendorRow;
        Insert: Pick<VendorRow, "code" | "name"> & Partial<VendorRow>;
        Update: Partial<VendorRow>;
        Relationships: [];
      };
      customers: {
        Row: CustomerRow;
        Insert: Pick<CustomerRow, "code" | "name"> & Partial<CustomerRow>;
        Update: Partial<CustomerRow>;
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: Pick<ProjectRow, "code" | "name"> & Partial<ProjectRow>;
        Update: Partial<ProjectRow>;
        Relationships: [];
      };
      project_members: {
        Row: ProjectMemberRow;
        Insert: Pick<ProjectMemberRow, "project_id" | "user_id"> &
          Partial<ProjectMemberRow>;
        Update: Partial<ProjectMemberRow>;
        Relationships: [];
      };
      purchase_orders: {
        Row: PurchaseOrderRow;
        Insert: Pick<
          PurchaseOrderRow,
          "po_number" | "vendor_id" | "project_id" | "created_by"
        > &
          Partial<PurchaseOrderRow>;
        Update: Partial<PurchaseOrderRow>;
        Relationships: [];
      };
      po_items: {
        Row: PoItemRow;
        Insert: Omit<PoItemRow, "id"> & Partial<Pick<PoItemRow, "id">>;
        Update: Partial<PoItemRow>;
        Relationships: [];
      };
      attachments: {
        Row: AttachmentRow;
        Insert: Omit<AttachmentRow, "id" | "created_at"> &
          Partial<Pick<AttachmentRow, "id">>;
        Update: Partial<AttachmentRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, "id" | "created_at" | "is_read"> &
          Partial<Pick<NotificationRow, "is_read">>;
        Update: Partial<NotificationRow>;
        Relationships: [];
      };
      export_logs: {
        Row: ExportLogRow;
        Insert: Omit<ExportLogRow, "id" | "created_at">;
        Update: Partial<ExportLogRow>;
        Relationships: [];
      };
      payment_requests: {
        Row: PaymentRequestRow;
        Insert: Pick<
          PaymentRequestRow,
          | "request_number"
          | "requester_id"
          | "purpose"
          | "recipient_name"
          | "amount"
          | "project_id"
          | "expense_account_id"
        > &
          Partial<PaymentRequestRow>;
        Update: Partial<PaymentRequestRow>;
        Relationships: [];
      };
      journals: {
        Row: JournalRow;
        Insert: Pick<
          JournalRow,
          "journal_number" | "journal_date" | "period_id" | "description"
        > &
          Partial<JournalRow>;
        Update: Partial<JournalRow>;
        Relationships: [];
      };
      journal_lines: {
        Row: JournalLineRow;
        Insert: Omit<JournalLineRow, "id">;
        Update: Partial<JournalLineRow>;
        Relationships: [];
      };
      budgets: {
        Row: BudgetRow;
        Insert: Pick<BudgetRow, "project_id"> & Partial<BudgetRow>;
        Update: Partial<BudgetRow>;
        Relationships: [];
      };
      budget_lines: {
        Row: BudgetLineRow;
        Insert: Omit<BudgetLineRow, "id">;
        Update: Partial<BudgetLineRow>;
        Relationships: [];
      };
      quotations: {
        Row: QuotationRow;
        Insert: Pick<
          QuotationRow,
          "quotation_number" | "valid_until" | "customer_id" | "project_title"
        > &
          Partial<QuotationRow>;
        Update: Partial<QuotationRow>;
        Relationships: [];
      };
      quotation_items: {
        Row: QuotationItemRow;
        Insert: Omit<QuotationItemRow, "id">;
        Update: Partial<QuotationItemRow>;
        Relationships: [];
      };
      client_purchase_orders: {
        Row: ClientPurchaseOrderRow;
        Insert: Pick<
          ClientPurchaseOrderRow,
          "po_number" | "client_name" | "client_email" | "po_value"
        > &
          Partial<ClientPurchaseOrderRow>;
        Update: Partial<ClientPurchaseOrderRow>;
        Relationships: [];
      };
      project_documents: {
        Row: ProjectDocumentRow;
        Insert: Pick<
          ProjectDocumentRow,
          "project_id" | "doc_type" | "doc_number" | "title"
        > &
          Partial<ProjectDocumentRow>;
        Update: Partial<ProjectDocumentRow>;
        Relationships: [];
      };
      milestones: {
        Row: MilestoneRow;
        Insert: Omit<MilestoneRow, "id" | "created_at">;
        Update: Partial<MilestoneRow>;
        Relationships: [];
      };
      progress_reports: {
        Row: ProgressReportRow;
        Insert: Pick<
          ProgressReportRow,
          | "bakp_number"
          | "project_id"
          | "milestone_id"
          | "cumulative_percentage"
          | "billable_amount"
        > &
          Partial<ProgressReportRow>;
        Update: Partial<ProgressReportRow>;
        Relationships: [];
      };
      uat_checklists: {
        Row: UatChecklistRow;
        Insert: Pick<
          UatChecklistRow,
          | "uat_number"
          | "project_id"
          | "client_tester_name"
          | "altvira_companion_name"
        > &
          Partial<UatChecklistRow>;
        Update: Partial<UatChecklistRow>;
        Relationships: [];
      };
      uat_items: {
        Row: UatItemRow;
        Insert: Omit<UatItemRow, "id">;
        Update: Partial<UatItemRow>;
        Relationships: [];
      };
      handover_reports: {
        Row: HandoverReportRow;
        Insert: Pick<HandoverReportRow, "bast_number" | "project_id" | "uat_id"> &
          Partial<HandoverReportRow>;
        Update: Partial<HandoverReportRow>;
        Relationships: [];
      };
      project_progress: {
        Row: ProjectProgressRow;
        Insert: Omit<ProjectProgressRow, "id" | "created_at">;
        Update: Partial<ProjectProgressRow>;
        Relationships: [];
      };
      sales_invoices: {
        Row: SalesInvoiceRow;
        Insert: Pick<
          SalesInvoiceRow,
          | "invoice_number"
          | "due_date"
          | "project_id"
          | "customer_id"
          | "client_po_id"
          | "invoice_kind"
          | "subtotal_amount"
          | "total_amount"
        > &
          Partial<SalesInvoiceRow>;
        Update: Partial<SalesInvoiceRow>;
        Relationships: [];
      };
      invoice_payments: {
        Row: InvoicePaymentRow;
        Insert: Omit<InvoicePaymentRow, "id" | "created_at">;
        Update: Partial<InvoicePaymentRow>;
        Relationships: [];
      };
      receipts: {
        Row: ReceiptRow;
        Insert: Omit<ReceiptRow, "id" | "created_at">;
        Update: Partial<ReceiptRow>;
        Relationships: [];
      };
      profit_sharing_schemes: {
        Row: ProfitSharingSchemeRow;
        Insert: Omit<ProfitSharingSchemeRow, "id" | "created_at">;
        Update: Partial<ProfitSharingSchemeRow>;
        Relationships: [];
      };
      profit_sharing_results: {
        Row: ProfitSharingResultRow;
        Insert: Pick<ProfitSharingResultRow, "project_id"> &
          Partial<ProfitSharingResultRow>;
        Update: Partial<ProfitSharingResultRow>;
        Relationships: [];
      };
      profit_sharing_lines: {
        Row: ProfitSharingLineRow;
        Insert: Omit<ProfitSharingLineRow, "id">;
        Update: Partial<ProfitSharingLineRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_doc_number: {
        Args: { p_doc_type: DocTypeCode; p_doc_date?: string };
        Returns: string;
      };
      generate_client_po_number: {
        Args: { p_doc_date?: string };
        Returns: string;
      };
      close_accounting_period: {
        Args: { p_period_id: string };
        Returns: PeriodRow;
      };
      reopen_accounting_period: {
        Args: { p_period_id: string; p_reason: string };
        Returns: PeriodRow;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole | null;
      };
      touch_last_login: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      submit_payment_request: {
        Args: { p_request_id: string };
        Returns: PaymentRequestRow;
      };
      decide_payment_request: {
        Args: {
          p_request_id: string;
          p_decision: string;
          p_rejection_reason?: string | null;
          p_accounting_date?: string;
        };
        Returns: PaymentRequestRow;
      };
      record_payment_disbursement: {
        Args: {
          p_request_id: string;
          p_paid_date: string;
          p_source_cash_account_id: string;
        };
        Returns: PaymentRequestRow;
      };
      create_and_post_journal: {
        Args: {
          p_journal_date: string;
          p_journal_type: JournalType;
          p_description: string;
          p_lines: Json;
          p_project_id?: string | null;
          p_source_type?: string | null;
          p_source_id?: string | null;
          p_reference_journal_id?: string | null;
          p_auto_reverse_next_period?: boolean;
        };
        Returns: string;
      };
      create_correction_journal: {
        Args: {
          p_original_journal_id: string;
          p_correction_date: string;
          p_reason: string;
          p_lines?: Json | null;
        };
        Returns: string;
      };
      generate_optional_reversing_entries: {
        Args: {
          p_source_period_id: string;
          p_reversing_date: string;
        };
        Returns: number;
      };
      run_period_closing: {
        Args: {
          p_period_id: string;
          p_closing_date?: string | null;
        };
        Returns: string | null;
      };
      get_project_budget_vs_actual: {
        Args: { p_project_id: string };
        Returns: BudgetComparisonRow[];
      };
      save_project_milestones: {
        Args: { p_project_id: string; p_milestones: Json };
        Returns: MilestoneRow[];
      };
      issue_sales_invoice: {
        Args: {
          p_invoice_id: string;
          p_direct_cash_account_id?: string | null;
        };
        Returns: SalesInvoiceRow;
      };
      record_invoice_payment: {
        Args: {
          p_invoice_id: string;
          p_payment_date: string;
          p_amount: number;
          p_destination_account_id: string;
          p_payment_method?: string;
        };
        Returns: ReceiptRow;
      };
      record_period_project_progress: {
        Args: {
          p_project_id: string;
          p_progress_date: string;
          p_cumulative_pct: number;
          p_cumulative_revenue_override?: number | null;
          p_enable_auto_reverse?: boolean | null;
          p_bakp_id?: string | null;
        };
        Returns: ProjectProgressRow;
      };
      save_profit_sharing_scheme: {
        Args: { p_project_id: string; p_schemes: Json };
        Returns: ProfitSharingSchemeRow[];
      };
      calculate_project_profit_sharing: {
        Args: {
          p_project_id: string;
          p_finalize?: boolean;
          p_posting_date?: string;
          p_manual_shared_cost?: number | null;
        };
        Returns: ProfitSharingResultRow;
      };
      verify_client_po: {
        Args: {
          p_client_po_id: string;
          p_project_id: string;
          p_approve: boolean;
          p_rejection_note?: string | null;
        };
        Returns: ClientPurchaseOrderRow;
      };
      switch_active_role: {
        Args: { p_target_role: UserRole };
        Returns: ProfileRow;
      };
      update_my_profile: {
        Args: {
          p_full_name: string;
          p_username?: string | null;
          p_phone_number?: string | null;
          p_job_title?: string | null;
          p_bio?: string | null;
          p_avatar_url?: string | null;
        };
        Returns: ProfileRow;
      };
      delete_internal_user: {
        Args: { p_target_user_id: string };
        Returns: boolean;
      };
      update_user_roles: {
        Args: {
          p_target_user_id: string;
          p_roles: UserRole[];
          p_primary_role?: UserRole | null;
        };
        Returns: ProfileRow;
      };
    };
    Enums: {
      user_role: UserRole;
      doc_type_code: DocTypeCode;
      audit_action: AuditAction;
      account_type: AccountType;
      normal_balance: NormalBalance;
      account_system_tag: AccountSystemTag;
      cash_flow_category: CashFlowCategory;
      period_status: PeriodStatus;
      project_category: ProjectCategory;
      project_status: ProjectStatus;
      revenue_recognition_method: RevenueRecognitionMethod;
      po_status: PoStatus;
      payment_request_status: PaymentRequestStatus;
      attachment_entity_type: AttachmentEntityType;
      journal_type: JournalType;
      journal_status: JournalStatus;
      budget_status: BudgetStatus;
      quotation_status: QuotationStatus;
      client_po_status: ClientPoStatus;
      milestone_status: MilestoneStatus;
      bakp_status: BakpStatus;
      uat_conclusion: UatConclusion;
      bast_status: BastStatus;
      invoice_kind: InvoiceKind;
      invoice_doc_status: InvoiceDocStatus;
      invoice_payment_status: InvoicePaymentStatus;
      profit_sharing_status: ProfitSharingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
