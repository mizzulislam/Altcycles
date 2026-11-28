import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  getCompanyProfile,
  listDocSequences,
  listDocTemplates,
  purgeTestData,
  setJournalLockStatus,
  updateCompanyProfile,
  updateDocSequence,
  updateDocTemplate,
} from "@/lib/data-service";
import type {
  CompanyProfileRow,
  DocSequenceCounterRow,
  DocSequenceRow,
  DocTemplateRow,
} from "@/types/database.types";

export function useSystemConfigState() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<CompanyProfileRow | null>(null);
  const [sequences, setSequences] = useState<DocSequenceRow[]>([]);
  const [counters, setCounters] = useState<DocSequenceCounterRow[]>([]);
  const [templates, setTemplates] = useState<DocTemplateRow[]>([]);
  const [savingCompany, setSavingCompany] = useState(false);
  const [pendingPkpState, setPendingPkpState] = useState<boolean | null>(null);
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [comp, seqData, tmpls] = await Promise.all([
        getCompanyProfile(),
        listDocSequences(),
        listDocTemplates(),
      ]);
      setCompany(comp);
      setSequences(seqData.sequences);
      setCounters(seqData.counters);
      setTemplates(tmpls);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat konfigurasi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSaveCompany(e: FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSavingCompany(true);
    try {
      const updated = await updateCompanyProfile({
        company_name: company.company_name,
        legal_entity_name: company.legal_entity_name,
        address: company.address,
        email: company.email,
        phone: company.phone,
        logo_storage_path: company.logo_storage_path,
        bank_name: company.bank_name,
        bank_account_number: company.bank_account_number,
        bank_account_holder: company.bank_account_holder,
        signer_name: company.signer_name,
        signer_title: company.signer_title,
        ppn_rate: company.ppn_rate,
      });
      setCompany(updated);
      toast.success("Identitas dan rekening perusahaan berhasil disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSavingCompany(false);
    }
  }

  async function handleSaveSequence(seq: DocSequenceRow) {
    try {
      await updateDocSequence(seq.doc_type, {
        prefix_pattern: seq.prefix_pattern,
        padding_digits: seq.padding_digits,
        reset_period: seq.reset_period,
      });
      toast.success(`Format penomoran ${seq.doc_type} disimpan.`);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan format nomor.",
      );
    }
  }

  async function handlePurgeTestData() {
    setPurging(true);
    try {
      const res = await purgeTestData();
      toast.success(res.message || "Data pengujian berhasil dibersihkan.");
      setConfirmPurgeOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal membersihkan data testing.",
      );
    } finally {
      setPurging(false);
    }
  }

  async function handleSaveTemplate(
    tmpl: DocTemplateRow,
    rawJson: string,
    footerNotes: string,
  ) {
    try {
      const parsed = JSON.parse(rawJson) as Record<
        string,
        string | number | boolean
      >;
      await updateDocTemplate(tmpl.doc_type, {
        default_placeholders: parsed,
        footer_notes: footerNotes,
      });
      toast.success(`Template ${tmpl.doc_type} diperbarui.`);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Format JSON placeholder tidak valid.",
      );
    }
  }

  async function handleToggleTesting(enableTesting: boolean) {
    try {
      const nextLock = !enableTesting;
      await setJournalLockStatus(nextLock);
      setCompany((prev) =>
        prev ? { ...prev, journal_lock_enabled: nextLock } : prev,
      );
      if (enableTesting) {
        toast.warning(
          "Mode Testing diaktifkan. Kunci jurnal dibuka untuk pengujian.",
        );
      } else {
        toast.success(
          "Mode Normal (Produksi) aktif. Seluruh jurnal terkunci otomatis.",
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui status mode testing.",
      );
    }
  }

  async function handleConfirmPkp(toastTaxUpdatedMsg: string) {
    if (pendingPkpState === null) return;
    try {
      const updated = await updateCompanyProfile({
        pkp_enabled: pendingPkpState,
      });
      setCompany(updated);
      toast.success(toastTaxUpdatedMsg);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui status PKP.",
      );
    } finally {
      setPendingPkpState(null);
    }
  }

  return {
    loading,
    company,
    setCompany,
    sequences,
    setSequences,
    counters,
    templates,
    savingCompany,
    pendingPkpState,
    setPendingPkpState,
    confirmPurgeOpen,
    setConfirmPurgeOpen,
    purging,
    reload,
    handleSaveCompany,
    handleSaveSequence,
    handlePurgeTestData,
    handleSaveTemplate,
    handleToggleTesting,
    handleConfirmPkp,
  };
}
