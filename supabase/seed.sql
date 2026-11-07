-- =============================================================================
-- Seed Data Altcycles (Idempoten & Dapat Diulang)
-- Memuat: Profil Altvira, Penomoran Lampiran A.0, Template Lampiran A,
--         Bagan Akun SAK + Akun Progress Billing, Periode, & Master Data Contoh
-- =============================================================================

-- 1. Profil Perusahaan Default (Altvira belum PKP -> pkp_enabled = false)
INSERT INTO public.company_profile (
  id,
  company_name,
  legal_entity_name,
  address,
  email,
  phone,
  bank_name,
  bank_account_number,
  bank_account_holder,
  signer_name,
  signer_title,
  pkp_enabled,
  ppn_rate,
  pph_enabled
) VALUES (
  1,
  'Altvira Technology',
  'PT Representasi Mitra Mandiri',
  '[Alamat Kantor Altvira, Indonesia]',
  'finance@altvira.id',
  '[Nomor Telepon Altvira]',
  '[Bank Mandiri / BCA Altvira]',
  '[Nomor Rekening Perusahaan]',
  'PT Representasi Mitra Mandiri',
  'Muhammad Izzul Islam',
  'Project Manager',
  false,
  11.00,
  false
)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  legal_entity_name = EXCLUDED.legal_entity_name;

-- 2. Format Penomoran Dokumen (PRD Lampiran A.0 + Dokumen Internal)
INSERT INTO public.doc_sequences (doc_type, label, prefix_pattern, padding_digits, reset_period)
VALUES
  ('QT',   'Quotation (Penawaran Harga)',           'QT/ALT/{{tahun}}/{{bulan}}/{{urut}}',   3, 'monthly'),
  ('SOW',  'Scope of Work (Proposal Teknis)',       'SOW/ALT/{{tahun}}/{{bulan}}/{{urut}}',  3, 'monthly'),
  ('SPK',  'Surat Perjanjian Kerja Sama',           'SPK/ALT/{{tahun}}/{{bulan}}/{{urut}}',  3, 'monthly'),
  ('BAKP', 'Berita Acara Kemajuan Pekerjaan',       'BAKP/ALT/{{tahun}}/{{bulan}}/{{urut}}', 3, 'monthly'),
  ('INV',  'Invoice Penagihan Klien',               'INV/ALT/{{tahun}}/{{bulan}}/{{urut}}',  3, 'monthly'),
  ('KW',   'Kuitansi Pembayaran',                   'KW/ALT/{{tahun}}/{{bulan}}/{{urut}}',   3, 'monthly'),
  ('UAT',  'User Acceptance Testing',               'UAT/ALT/{{tahun}}/{{bulan}}/{{urut}}',  3, 'monthly'),
  ('BAST', 'Berita Acara Serah Terima',             'BAST/ALT/{{tahun}}/{{bulan}}/{{urut}}', 3, 'monthly'),
  ('POP',  'Purchase Order Pembelian Vendor',       'POP/ALT/{{tahun}}/{{bulan}}/{{urut}}',  3, 'monthly'),
  ('PA',   'Pengajuan Pembayaran (Payment Approval)','PA/ALT/{{tahun}}/{{bulan}}/{{urut}}',  3, 'monthly'),
  ('JRN',  'Jurnal Akuntansi',                      'JRN/ALT/{{tahun}}/{{bulan}}/{{urut}}',  3, 'monthly'),
  ('PRJ',  'Kode Proyek',                           'PRJ/ALT/{{tahun}}/{{urut}}',            3, 'yearly')
ON CONFLICT (doc_type) DO NOTHING;

-- 3. Template Dokumen & Placeholder [kurung siku] (PRD Lampiran A.1 – A.8)
INSERT INTO public.doc_templates (doc_type, title, version, default_placeholders, footer_notes)
VALUES
  ('QT', 'Quotation (Penawaran Harga)', 1,
    '{"masa_berlaku_hari": 14, "batas_revisi_per_tahap": 2, "dp_persen_default": 30, "progres_persen_default": 40, "pelunasan_persen_default": 30}'::jsonb,
    'Perubahan di luar daftar fitur dikenakan biaya tambahan; source code diserahkan setelah pelunasan; tidak dikenakan PPN karena Altvira belum PKP.'),
  ('SOW', 'Scope of Work (Proposal Teknis)', 1,
    '{"batas_revisi_per_tahap": 2, "masa_garansi_hari": 30}'::jsonb,
    'Perubahan di luar ruang lingkup diproses melalui change request tertulis.'),
  ('SPK', 'Surat Perjanjian Kerja Sama', 1,
    '{"batas_umpan_balik_hari_kerja": 5, "batas_revisi_per_tahap": 2, "denda_per_hari_persen": 0.1, "denda_maksimal_persen": 5, "masa_garansi_hari": 30, "pengalihan_hak_cipta": "Setelah pelunasan penuh", "lembaga_sengketa": "Pengadilan Negeri setempat"}'::jsonb,
    'Draf kerangka perjanjian — wajib ditinjau pihak yang memahami hukum kontrak sebelum ditandatangani.'),
  ('BAKP', 'Berita Acara Kemajuan Pekerjaan', 1,
    '{}'::jsonb,
    'Persentase penyelesaian kumulatif pada BAKP menjadi dasar pengakuan pendapatan progress billing.'),
  ('INV', 'Invoice Penagihan', 1,
    '{"jatuh_tempo_hari": 7}'::jsonb,
    'Harga tidak dikenakan PPN karena Altvira belum dikukuhkan sebagai Pengusaha Kena Pajak.'),
  ('KW', 'Kuitansi Bukti Pembayaran', 1,
    '{"catatan_meterai": "Bea meterai dikenakan sesuai ketentuan peraturan perundang-undangan yang berlaku"}'::jsonb,
    'Kuitansi sah diterbitkan otomatis setelah dana tercatat masuk ke rekening perusahaan.'),
  ('UAT', 'User Acceptance Testing', 1,
    '{"lingkungan_uji_default": "https://staging.altvira.id"}'::jsonb,
    'Pengujian fungsional dilakukan bersama perwakilan klien sebelum penerbitan BAST.'),
  ('BAST', 'Berita Acara Serah Terima', 1,
    '{"masa_garansi_hari": 30}'::jsonb,
    'Invoice pelunasan menjadi dapat ditagih setelah BAST ditandatangani kedua belah pihak.'),
  ('POP', 'Purchase Order Pembelian Internal', 1,
    '{"syarat_pembayaran": "Sesuai kesepakatan tagihan vendor"}'::jsonb,
    'Harap cantumkan nomor PO ini pada setiap tagihan/invoice vendor.')
ON CONFLICT (doc_type) DO NOTHING;

-- 4. Bagan Akun (Chart of Accounts) Default SAK + Akun Khusus Progress Billing
-- Akun Induk (Header non-postable)
INSERT INTO public.accounts (code, name, account_type, normal_balance, system_tag, cash_flow_category, is_postable, is_active, description)
VALUES
  ('1-0000', 'ASET',                        'asset',     'debit',  'none', 'operating', false, true, 'Kelompok Utama Aset'),
  ('2-0000', 'LIABILITAS',                  'liability', 'credit', 'none', 'operating', false, true, 'Kelompok Utama Liabilitas'),
  ('3-0000', 'EKUITAS',                     'equity',    'credit', 'none', 'financing', false, true, 'Kelompok Utama Ekuitas'),
  ('4-0000', 'PENDAPATAN USAHA',            'revenue',   'credit', 'none', 'operating', false, true, 'Kelompok Utama Pendapatan'),
  ('5-0000', 'BEBAN LANGSUNG PROYEK',       'expense',   'debit',  'none', 'operating', false, true, 'Biaya langsung pengerjaan proyek klien'),
  ('6-0000', 'BEBAN OPERASIONAL BERSAMA',   'expense',   'debit',  'none', 'operating', false, true, 'Biaya bersama yang dialokasikan proporsional ke proyek')
ON CONFLICT (code) DO NOTHING;

-- Akun Buku Besar (Postable)
INSERT INTO public.accounts (code, name, account_type, normal_balance, parent_id, system_tag, cash_flow_category, is_postable, is_active, description)
VALUES
  -- ASET
  ('1-1101', 'Kas Kecil Operasional', 'asset', 'debit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'cash_bank', 'cash_equivalent', true, true, 'Kas tunai operasional kecil'),
  ('1-1102', 'Bank Operasional Utama Altvira', 'asset', 'debit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'cash_bank', 'cash_equivalent', true, true, 'Rekening bank utama penerimaan klien & pembayaran vendor'),
  ('1-1201', 'Piutang Usaha Klien', 'asset', 'debit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'accounts_receivable', 'operating', true, true, 'Tagihan invoice termin/pelunasan yang belum dibayar klien'),
  ('1-1210', 'Piutang Belum Ditagih (Accrued Revenue)', 'asset', 'debit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'unbilled_receivable', 'operating', true, true, 'Piutang akrual akhir periode untuk proyek 2 termin lintas tahun'),
  ('1-1300', 'Jasa dalam Proses', 'asset', 'debit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'work_in_progress', 'operating', true, true, 'Akun aset kontrak Progress Billing: akumulasi pendapatan dari progres penyelesaian'),
  ('1-1310', 'Penagihan atas Kontrak', 'contra_asset', 'credit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'contract_billings', 'operating', true, true, 'Akun kontra-aset Progress Billing (saldo kredit): akumulasi nilai termin yang ditagih'),
  ('1-1401', 'Beban Dibayar di Muka', 'asset', 'debit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'none', 'operating', true, true, 'Sewa atau langganan tahunan dibayar di muka'),
  ('1-2101', 'Peralatan & Perangkat Keras', 'asset', 'debit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'none', 'investing', true, true, 'Laptop, server lokal, dan inventaris kerja'),
  ('1-2102', 'Akumulasi Penyusutan Peralatan', 'contra_asset', 'credit',
    (SELECT id FROM public.accounts WHERE code = '1-0000'), 'none', 'operating', true, true, 'Kontra-aset penyusutan perangkat keras'),

  -- LIABILITAS
  ('2-1101', 'Utang Usaha Vendor', 'liability', 'credit',
    (SELECT id FROM public.accounts WHERE code = '2-0000'), 'accounts_payable', 'operating', true, true, 'Kewajiban atas pengajuan pembayaran/tagihan vendor yang telah disetujui'),
  ('2-1201', 'Beban yang Masih Harus Dibayar', 'liability', 'credit',
    (SELECT id FROM public.accounts WHERE code = '2-0000'), 'none', 'operating', true, true, 'Beban akrual akhir periode yang belum dibayar'),
  ('2-1301', 'Utang Bagi Hasil Proyek', 'liability', 'credit',
    (SELECT id FROM public.accounts WHERE code = '2-0000'), 'profit_sharing_payable', 'operating', true, true, 'Kewajiban pembagian laba kotor proyek yang telah difinalisasi'),
  ('2-1401', 'Pendapatan Diterima di Muka', 'liability', 'credit',
    (SELECT id FROM public.accounts WHERE code = '2-0000'), 'unearned_revenue', 'operating', true, true, 'Uang muka / pembayaran klien sebelum jasa diselesaikan (skenario 1 & 2 termin)'),
  ('2-1501', 'Utang PPN Keluaran', 'liability', 'credit',
    (SELECT id FROM public.accounts WHERE code = '2-0000'), 'none', 'operating', true, false, 'Dinonaktifkan secara default karena Altvira belum PKP (BR-22)'),

  -- EKUITAS
  ('3-1101', 'Modal Disetor', 'equity', 'credit',
    (SELECT id FROM public.accounts WHERE code = '3-0000'), 'none', 'financing', true, true, 'Modal awal entitas'),
  ('3-1201', 'Laba Ditahan', 'equity', 'credit',
    (SELECT id FROM public.accounts WHERE code = '3-0000'), 'retained_earnings', 'financing', true, true, 'Akumulasi laba bersih periode-periode tertutup'),
  ('3-1301', 'Ikhtisar Laba Rugi', 'equity', 'credit',
    (SELECT id FROM public.accounts WHERE code = '3-0000'), 'income_summary', 'operating', true, true, 'Akun perantara penutupan periode'),

  -- PENDAPATAN
  ('4-1101', 'Pendapatan Jasa Pengembangan Perangkat Lunak', 'revenue', 'credit',
    (SELECT id FROM public.accounts WHERE code = '4-0000'), 'service_revenue', 'operating', true, true, 'Pendapatan utama proyek software house Altvira'),
  ('4-1201', 'Pendapatan Pemeliharaan & Dukungan Teknis', 'revenue', 'credit',
    (SELECT id FROM public.accounts WHERE code = '4-0000'), 'none', 'operating', true, true, 'Pendapatan kontrak dukungan pasca-garansi'),

  -- BEBAN LANGSUNG PROYEK
  ('5-1101', 'Beban Cloud, Hosting, & Domain Proyek', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '5-0000'), 'none', 'operating', true, true, 'Biaya server, domain, dan layanan cloud khusus proyek tertentu'),
  ('5-1201', 'Beban Tenaga Ahli & Subkontraktor Proyek', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '5-0000'), 'none', 'operating', true, true, 'Biaya tenaga lepas atau spesialis yang terkait langsung dengan satu proyek'),
  ('5-1301', 'Beban Lisensi & API Pihak Ketiga Proyek', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '5-0000'), 'none', 'operating', true, true, 'Biaya aset font, plugin, atau komponen khusus proyek'),
  ('5-1401', 'Beban Bagi Hasil Proyek', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '5-0000'), 'profit_sharing_expense', 'operating', true, true, 'Beban pembagian laba kotor proyek'),

  -- BEBAN OPERASIONAL BERSAMA (SHARED COSTS)
  ('6-1101', 'Beban Langganan Alat Kerja Bersama', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '6-0000'), 'shared_expense', 'operating', true, true, 'Biaya repositori, desain kolaboratif, & produktivitas bersama'),
  ('6-1201', 'Beban Internet, Listrik, & Utilitas Kantor', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '6-0000'), 'shared_expense', 'operating', true, true, 'Biaya operasional rutin kantor bersama'),
  ('6-1301', 'Beban Administrasi & Umum', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '6-0000'), 'shared_expense', 'operating', true, true, 'Alat tulis, meterai, pengiriman dokumen, & biaya bank'),
  ('6-1401', 'Beban Penyusutan Peralatan', 'expense', 'debit',
    (SELECT id FROM public.accounts WHERE code = '6-0000'), 'shared_expense', 'operating', true, true, 'Penyusutan bulanan perangkat keras')
ON CONFLICT (code) DO NOTHING;

-- 5. Periode Akuntansi Contoh (Mendukung Skenario Nov 2026 – Jan 2027)
INSERT INTO public.periods (year, month, name, start_date, end_date, status)
VALUES
  (2026, 11, 'November 2026', '2026-11-01', '2026-11-30', 'open'),
  (2026, 12, 'Desember 2026', '2026-12-01', '2026-12-31', 'open'),
  (2027, 1,  'Januari 2027',  '2027-01-01', '2027-01-31', 'open')
ON CONFLICT (year, month) DO NOTHING;

-- 6. Master Vendor & Pelanggan Contoh
INSERT INTO public.vendors (code, name, contact_name, email, phone, address, bank_name, bank_account_number, bank_account_holder)
VALUES
  ('VND-001', 'PT Awan Nusantara Cloud', 'Rizky Pratama', 'billing@awannusantara.id', '021-5550101', 'Jakarta Selatan', 'Bank Mandiri', '1240098765432', 'PT Awan Nusantara Cloud'),
  ('VND-002', 'CV Domain & SSL Indonesia', 'Siti Rahma', 'support@domainssl.co.id', '022-4200889', 'Bandung', 'BCA', '4371122334', 'CV Domain & SSL Indonesia')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.customers (code, name, company_name, contact_person, contact_title, email, phone, address)
VALUES
  ('CST-001', 'PT Sinar Niaga Digital', 'PT Sinar Niaga Digital', 'Hendra Wijaya', 'Direktur Operasional', 'hendra@sinarniaga.co.id', '021-7894321', 'Jl. Jend. Sudirman Kav. 45, Jakarta'),
  ('CST-002', 'Koperasi Mitra Sejahtera', 'Koperasi Mitra Sejahtera', 'Dewi Kartika', 'Ketua Pengurus', 'sekretariat@mitrasejahtera.org', '031-5678910', 'Jl. Darmo No. 18, Surabaya')
ON CONFLICT (code) DO NOTHING;

-- 7. Proyek Contoh (Kontrak Rp120.000.000, 3 Termin -> otomatis progress_billing)
INSERT INTO public.projects (
  code,
  name,
  project_category,
  customer_id,
  status,
  start_date,
  target_end_date,
  contract_value,
  term_count,
  description
)
VALUES (
  'PRJ/ALT/2026/001',
  'Pengembangan Sistem Portal Distribusi Sinar Niaga',
  'client',
  (SELECT id FROM public.customers WHERE code = 'CST-001'),
  'active',
  '2026-11-01',
  '2027-01-31',
  120000000,
  3,
  'Proyek pengembangan web distribusi 3 termin (DP 25%, Progres 37.5%, Pelunasan 37.5%)'
)
ON CONFLICT (code) DO NOTHING;

