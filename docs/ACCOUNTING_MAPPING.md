# Pemetaan Bagan Akun (COA SAK) & Jurnal Otomatis Altcycles

Dokumen ini mendefinisikan struktur Bagan Akun default berbasis SAK Entitas Privat (SAK EP) beserta `system_tag` yang dipakai mesin jurnal otomatis Altcycles.

## 1. Struktur Kode Akun Default

| Kode | Nama Akun | Tipe | Saldo Normal | System Tag |
| --- | --- | --- | --- | --- |
| `1-1101` | Kas Kecil Operasional | `asset` | `debit` | `cash_bank` |
| `1-1102` | Bank Operasional Utama Altvira | `asset` | `debit` | `cash_bank` |
| `1-1201` | Piutang Usaha Klien | `asset` | `debit` | `accounts_receivable` |
| `1-1210` | Piutang Belum Ditagih (Accrued Revenue) | `asset` | `debit` | `unbilled_receivable` |
| `1-1300` | Jasa dalam Proses | `asset` | `debit` | `work_in_progress` |
| `1-1310` | Penagihan atas Kontrak | `contra_asset` | `credit` | `contract_billings` |
| `1-1401` | Beban Dibayar di Muka | `asset` | `debit` | `none` |
| `1-2101` | Peralatan & Perangkat Keras | `asset` | `debit` | `none` |
| `1-2102` | Akumulasi Penyusutan Peralatan | `contra_asset` | `credit` | `none` |
| `2-1101` | Utang Usaha Vendor | `liability` | `credit` | `accounts_payable` |
| `2-1201` | Beban yang Masih Harus Dibayar | `liability` | `credit` | `none` |
| `2-1301` | Utang Bagi Hasil Proyek | `liability` | `credit` | `profit_sharing_payable` |
| `2-1401` | Pendapatan Diterima di Muka | `liability` | `credit` | `unearned_revenue` |
| `2-1501` | Utang PPN Keluaran (Nonaktif Default — Belum PKP) | `liability` | `credit` | `none` |
| `3-1101` | Modal Disetor | `equity` | `credit` | `none` |
| `3-1201` | Laba Ditahan | `equity` | `credit` | `retained_earnings` |
| `3-1301` | Ikhtisar Laba Rugi | `equity` | `credit` | `income_summary` |
| `4-1101` | Pendapatan Jasa Pengembangan Perangkat Lunak | `revenue` | `credit` | `service_revenue` |
| `4-1201` | Pendapatan Pemeliharaan & Dukungan Teknis | `revenue` | `credit` | `none` |
| `5-1101` | Beban Infrastruktur Cloud, Server, & Domain Proyek | `expense` | `debit` | `none` |
| `5-1201` | Beban Tenaga Ahli & Subkontraktor Proyek | `expense` | `debit` | `none` |
| `5-1301` | Beban Lisensi & Layanan Pihak Ketiga Proyek | `expense` | `debit` | `none` |
| `5-1401` | Beban Bagi Hasil Proyek | `expense` | `debit` | `profit_sharing_expense` |
| `6-1101` | Beban Perangkat Lunak & Alat Kerja Bersama | `expense` | `debit` | `shared_expense` |
| `6-1201` | Beban Internet, Komunikasi, & Utilitas | `expense` | `debit` | `shared_expense` |
| `6-1301` | Beban Administrasi & Umum | `expense` | `debit` | `shared_expense` |
| `6-1401` | Beban Penyusutan Peralatan | `expense` | `debit` | `shared_expense` |

## 2. Aturan Perlindungan Akun (`BR-19`)

1. Akun yang sudah pernah direferensikan oleh `journal_lines` atau `budget_lines` **ditolak penghapusannya di level PostgreSQL** (`ON DELETE RESTRICT` + trigger `prevent_used_account_deletion`).
2. Admin tetap dapat menonaktifkan akun (`is_active = false`), sehingga histori laporan periode lampau tetap utuh namun akun tersebut tidak dapat dipilih untuk jurnal baru.

