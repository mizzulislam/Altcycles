/**
 * Facade Hub untuk Data Service Altcycles.
 *
 * Menggabungkan seluruh domain services modular:
 * - `services/demo-store`: Demo seed store dan helper mutasi audit/counter lokal
 * - `services/storage-helpers`: Helper persistensi localStorage terstandar
 * - `services/auth-profile-service`: Manajemen profil pengguna, peran, dan avatar
 * - `services/system-settings-service`: Konfigurasi perusahaan, penomoran dokumen, template, dan audit log
 * - `services/accounting-master-service`: Master bagan akun (COA) dan periode akuntansi
 * - `services/master-data-service`: Master data vendor, pelanggan, dan proyek klien
 */

export * from "./services/demo-store";
export * from "./services/storage-helpers";
export * from "./services/auth-profile-service";
export * from "./services/system-settings-service";
export * from "./services/accounting-master-service";
export * from "./services/master-data-service";
