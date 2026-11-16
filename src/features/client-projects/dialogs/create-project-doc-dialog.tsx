import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { buildDefaultSpkContent } from "@/lib/spk-defaults";
import { SpkCharterFields } from "@/components/shared/spk-charter-fields";
import type {
  CompanyProfileRow,
  CustomerRow,
  ProjectRow,
  SpkCharterContent,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

interface CreateProjectDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRow;
  customer: CustomerRow | null;
  company: CompanyProfileRow | null;
  bundle: ProjectWorkspaceBundle | null;
  docType: "SOW" | "SPK";
  setDocType: (type: "SOW" | "SPK") => void;
  docTitle: string;
  setDocTitle: (val: string) => void;
  docSummary: string;
  setDocSummary: (val: string) => void;
  docSigned: boolean;
  setDocSigned: (val: boolean) => void;
  docSpkDraft: SpkCharterContent | null;
  setDocSpkDraft: (draft: SpkCharterContent | null) => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function CreateProjectDocDialog({
  open,
  onOpenChange,
  project,
  customer,
  company,
  bundle,
  docType,
  setDocType,
  docTitle,
  setDocTitle,
  docSummary,
  setDocSummary,
  docSigned,
  setDocSigned,
  docSpkDraft,
  setDocSpkDraft,
  saving,
  onSave,
}: CreateProjectDocDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={docType === "SPK" ? "sm:max-w-3xl max-h-[90vh] overflow-y-auto" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Rekam Dokumen SoW atau SPK</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <FieldGroup>
            <Field>
              <FieldLabel required>Jenis Dokumen</FieldLabel>
              <Select
                value={docType}
                onValueChange={(v) => {
                  const nextType = v as "SOW" | "SPK";
                  setDocType(nextType);
                  if (nextType === "SPK" && !docSpkDraft && company && bundle) {
                    setDocSpkDraft(
                      buildDefaultSpkContent({
                        project,
                        customer,
                        company,
                        milestones: bundle.milestones,
                      }),
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="SOW">
                      SoW: Statement of Work (Lampiran A.2)
                    </SelectItem>
                    <SelectItem value="SPK">
                      SPK: Surat Perjanjian Kerjasama / Project Charter (Lampiran A.3)
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="doc-title" required>Judul Dokumen</FieldLabel>
              <Input
                id="doc-title"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder={
                  docType === "SPK"
                    ? `SURAT PERJANJIAN KERJASAMA ${project.name.toUpperCase()}`
                    : `${docType} Pengembangan ${project.name}`
                }
              />
            </Field>
            {docType === "SPK" && docSpkDraft ? (
              <SpkCharterFields
                value={docSpkDraft}
                onChange={setDocSpkDraft}
              />
            ) : (
              <Field>
                <FieldLabel htmlFor="doc-sum">
                  Ringkasan Ruang Lingkup / Klausul Utama
                </FieldLabel>
                <Textarea
                  id="doc-sum"
                  value={docSummary}
                  onChange={(e) => setDocSummary(e.target.value)}
                />
              </Field>
            )}
            <Field orientation="horizontal">
              <FieldLabel htmlFor="doc-signed">
                Arsip Fisik / Pindaian Telah Ditandatangani Kedua Pihak
              </FieldLabel>
              <Switch
                id="doc-signed"
                checked={docSigned}
                onCheckedChange={setDocSigned}
              />
            </Field>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="cursor-pointer">
                {saving ? <Spinner data-icon="inline-start" /> : null}
                Simpan Dokumen
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
