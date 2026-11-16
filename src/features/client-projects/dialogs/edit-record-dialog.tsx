import * as React from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { NumberInput } from "@/components/ui/number-input";
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
import { SpkCharterFields } from "@/components/shared/spk-charter-fields";
import { extractSpkCharterContent } from "@/lib/spk-defaults";
import type { EditableRecord } from "../components/project-detail-shared";
import type {
  BakpStatus,
  BastStatus,
  ClientPoStatus,
  CompanyProfileRow,
  CustomerRow,
  MilestoneRow,
  MilestoneStatus,
  ProjectDocumentRow,
  ProjectRow,
  QuotationStatus,
  SpkCharterContent,
  UatConclusion,
} from "@/types/database.types";

interface EditRecordDialogProps {
  editRecord: EditableRecord | null;
  setEditRecord: React.Dispatch<React.SetStateAction<EditableRecord | null>>;
  onClose: () => void;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
  project: ProjectRow;
  customer: CustomerRow | null;
  company: CompanyProfileRow | null;
  milestones: MilestoneRow[];
}

export function EditRecordDialog({
  editRecord,
  setEditRecord,
  onClose,
  saving,
  onSave,
  project,
  customer,
  company,
  milestones,
}: EditRecordDialogProps) {
  return (
    <Dialog
      open={Boolean(editRecord)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={
          editRecord?.section === "documents" &&
          editRecord.item.doc_type === "SPK"
            ? "sm:max-w-3xl max-h-[90vh] overflow-y-auto"
            : "sm:max-w-lg"
        }
      >
        <DialogHeader>
          <DialogTitle>
            {editRecord?.section === "milestones"
              ? "Edit Termin Penagihan"
              : editRecord?.section === "progress"
                ? "Edit Catatan Progres Penyelesaian"
                : editRecord?.section === "quotations"
                  ? `Edit Quotation ${editRecord.item.quotation_number}`
                  : editRecord?.section === "clientPos"
                    ? `Edit PO Klien ${editRecord.item.po_number}`
                    : editRecord?.section === "documents"
                      ? `Edit Dokumen ${editRecord.item.doc_number}`
                      : editRecord?.section === "bakp"
                        ? `Edit BAKP ${editRecord.item.bakp_number}`
                        : editRecord?.section === "uat"
                          ? `Edit Checklist UAT ${editRecord.item.uat_number}`
                          : editRecord?.section === "bast"
                            ? `Edit BAST ${editRecord.item.bast_number}`
                            : "Edit Data"}
          </DialogTitle>
        </DialogHeader>
        {editRecord ? (
          <form onSubmit={onSave}>
            <FieldGroup>
              {editRecord.section === "milestones" && (
                <>
                  <Field>
                    <FieldLabel required>Nama Termin</FieldLabel>
                    <Input
                      required
                      value={editRecord.item.name}
                      onChange={(e) =>
                        setEditRecord({
                          section: "milestones",
                          item: { ...editRecord.item, name: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Porsi (%)</FieldLabel>
                      <NumberInput
                        allowDecimal
                        maxDecimals={2}
                        min={0}
                        max={100}
                        value={editRecord.item.percentage}
                        onValueChange={(percentage) =>
                          setEditRecord({
                            section: "milestones",
                            item: {
                              ...editRecord.item,
                              percentage,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Nominal (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={editRecord.item.amount}
                        onValueChange={(amount) =>
                          setEditRecord({
                            section: "milestones",
                            item: {
                              ...editRecord.item,
                              amount,
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Kriteria Pencapaian</FieldLabel>
                    <Input
                      value={editRecord.item.achievement_criteria ?? ""}
                      onChange={(e) =>
                        setEditRecord({
                          section: "milestones",
                          item: {
                            ...editRecord.item,
                            achievement_criteria: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Status Termin</FieldLabel>
                    <Select
                      value={editRecord.item.status}
                      onValueChange={(v) =>
                        setEditRecord({
                          section: "milestones",
                          item: {
                            ...editRecord.item,
                            status: v as MilestoneStatus,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="planned">Direncanakan</SelectItem>
                          <SelectItem value="in_progress">Berjalan</SelectItem>
                          <SelectItem value="bakp_approved">BAKP Disetujui</SelectItem>
                          <SelectItem value="invoiced">Ditagihkan</SelectItem>
                          <SelectItem value="paid">Lunas</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}

              {editRecord.section === "progress" && (
                <>
                  <Field>
                    <FieldLabel required>Tanggal Pengakuan</FieldLabel>
                    <DatePicker
                      required
                      value={editRecord.item.progress_date}
                      onChange={(v) =>
                        setEditRecord({
                          section: "progress",
                          item: { ...editRecord.item, progress_date: v },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>Progres Kumulatif (%)</FieldLabel>
                    <NumberInput
                      allowDecimal
                      maxDecimals={2}
                      min={0}
                      max={100}
                      value={editRecord.item.cumulative_percentage}
                      onValueChange={(cumulative_percentage) =>
                        setEditRecord({
                          section: "progress",
                          item: {
                            ...editRecord.item,
                            cumulative_percentage,
                          },
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Pendapatan Periode Ini (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={editRecord.item.period_recognized_revenue}
                        onValueChange={(period_recognized_revenue) =>
                          setEditRecord({
                            section: "progress",
                            item: {
                              ...editRecord.item,
                              period_recognized_revenue,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Pendapatan Kumulatif (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={editRecord.item.cumulative_recognized_revenue}
                        onValueChange={(cumulative_recognized_revenue) =>
                          setEditRecord({
                            section: "progress",
                            item: {
                              ...editRecord.item,
                              cumulative_recognized_revenue,
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                </>
              )}

              {editRecord.section === "quotations" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Tanggal Quotation</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.quotation_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "quotations",
                            item: { ...editRecord.item, quotation_date: v },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Berlaku Sampai</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.valid_until}
                        onChange={(v) =>
                          setEditRecord({
                            section: "quotations",
                            item: { ...editRecord.item, valid_until: v },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Nilai Penawaran (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={editRecord.item.total_amount}
                        onValueChange={(total_amount) =>
                          setEditRecord({
                            section: "quotations",
                            item: {
                              ...editRecord.item,
                              total_amount,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Status</FieldLabel>
                      <Select
                        value={editRecord.item.status}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "quotations",
                            item: {
                              ...editRecord.item,
                              status: v as QuotationStatus,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="draft">Draf</SelectItem>
                            <SelectItem value="sent">Terkirim</SelectItem>
                            <SelectItem value="accepted">Disetujui</SelectItem>
                            <SelectItem value="rejected">Ditolak</SelectItem>
                            <SelectItem value="expired">Kedaluwarsa</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Ringkasan Kebutuhan Klien</FieldLabel>
                    <Textarea
                      value={editRecord.item.client_need_summary ?? ""}
                      onChange={(e) =>
                        setEditRecord({
                          section: "quotations",
                          item: {
                            ...editRecord.item,
                            client_need_summary: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </>
              )}

              {editRecord.section === "clientPos" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Nama Klien</FieldLabel>
                      <Input
                        required
                        value={editRecord.item.client_name}
                        onChange={(e) =>
                          setEditRecord({
                            section: "clientPos",
                            item: {
                              ...editRecord.item,
                              client_name: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Perusahaan</FieldLabel>
                      <Input
                        value={editRecord.item.client_company ?? ""}
                        onChange={(e) =>
                          setEditRecord({
                            section: "clientPos",
                            item: {
                              ...editRecord.item,
                              client_company: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Nilai PO (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={editRecord.item.po_value}
                        onValueChange={(po_value) =>
                          setEditRecord({
                            section: "clientPos",
                            item: {
                              ...editRecord.item,
                              po_value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Status Verifikasi</FieldLabel>
                      <Select
                        value={editRecord.item.status}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "clientPos",
                            item: {
                              ...editRecord.item,
                              status: v as ClientPoStatus,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="pending_verification">
                              Menunggu Verifikasi
                            </SelectItem>
                            <SelectItem value="verified">Terverifikasi</SelectItem>
                            <SelectItem value="rejected">Ditolak</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </>
              )}

              {editRecord.section === "documents" && (
                <>
                  <Field>
                    <FieldLabel required>Jenis Dokumen</FieldLabel>
                    <Select
                      value={editRecord.item.doc_type}
                      onValueChange={(v) =>
                        setEditRecord({
                          section: "documents",
                          item: {
                            ...editRecord.item,
                            doc_type: v as "SOW" | "SPK",
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="SOW">SoW (Lampiran A.2)</SelectItem>
                          <SelectItem value="SPK">SPK (Lampiran A.3)</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel required>Judul Dokumen</FieldLabel>
                    <Input
                      required
                      value={editRecord.item.title}
                      onChange={(e) =>
                        setEditRecord({
                          section: "documents",
                          item: { ...editRecord.item, title: e.target.value },
                        })
                      }
                    />
                  </Field>
                  {editRecord.item.doc_type === "SPK" && company ? (
                    <SpkCharterFields
                      value={extractSpkCharterContent(
                        editRecord.item.content_json as Record<string, unknown> | null,
                        {
                          project,
                          customer,
                          company,
                          milestones,
                        },
                      )}
                      onChange={(nextSpk: SpkCharterContent) =>
                        setEditRecord({
                          section: "documents",
                          item: {
                            ...editRecord.item,
                            content_json: nextSpk as unknown as ProjectDocumentRow["content_json"],
                          },
                        })
                      }
                    />
                  ) : (
                    <Field>
                      <FieldLabel>Ringkasan Ruang Lingkup</FieldLabel>
                      <Textarea
                        value={String(
                          (editRecord.item.content_json as Record<string, unknown> | null)
                            ?.summary ?? "",
                        )}
                        onChange={(e) =>
                          setEditRecord({
                            section: "documents",
                            item: {
                              ...editRecord.item,
                              content_json: {
                                ...(editRecord.item.content_json as Record<string, unknown> | null),
                                summary: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </Field>
                  )}
                  <Field orientation="horizontal">
                    <FieldLabel>Telah Ditandatangani Kedua Pihak</FieldLabel>
                    <Switch
                      checked={editRecord.item.is_signed}
                      onCheckedChange={(checked) =>
                        setEditRecord({
                          section: "documents",
                          item: { ...editRecord.item, is_signed: checked },
                        })
                      }
                    />
                  </Field>
                </>
              )}

              {editRecord.section === "bakp" && (
                <>
                  <Field>
                    <FieldLabel required>Tanggal BAKP</FieldLabel>
                    <DatePicker
                      required
                      value={editRecord.item.bakp_date}
                      onChange={(v) =>
                        setEditRecord({
                          section: "bakp",
                          item: { ...editRecord.item, bakp_date: v },
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Capaian (%)</FieldLabel>
                      <NumberInput
                        allowDecimal
                        maxDecimals={2}
                        min={0}
                        max={100}
                        value={editRecord.item.cumulative_percentage}
                        onValueChange={(cumulative_percentage) =>
                          setEditRecord({
                            section: "bakp",
                            item: {
                              ...editRecord.item,
                              cumulative_percentage,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Nilai Tagih (Rp)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={editRecord.item.billable_amount}
                        onValueChange={(billable_amount) =>
                          setEditRecord({
                            section: "bakp",
                            item: {
                              ...editRecord.item,
                              billable_amount,
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select
                      value={editRecord.item.status}
                      onValueChange={(v) =>
                        setEditRecord({
                          section: "bakp",
                          item: {
                            ...editRecord.item,
                            status: v as BakpStatus,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="draft">Draf</SelectItem>
                          <SelectItem value="approved_by_client">
                            Disetujui Klien
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Catatan Pemeriksaan</FieldLabel>
                    <Textarea
                      value={editRecord.item.findings_notes ?? ""}
                      onChange={(e) =>
                        setEditRecord({
                          section: "bakp",
                          item: {
                            ...editRecord.item,
                            findings_notes: e.target.value,
                          },
                        })
                      }
                    />
                  </Field>
                </>
              )}

              {editRecord.section === "uat" && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Tanggal Pengujian</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.test_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "uat",
                            item: { ...editRecord.item, test_date: v },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>URL Staging</FieldLabel>
                      <Input
                        value={editRecord.item.staging_url ?? ""}
                        onChange={(e) =>
                          setEditRecord({
                            section: "uat",
                            item: { ...editRecord.item, staging_url: e.target.value },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel required>Penguji Klien</FieldLabel>
                      <Input
                        required
                        value={editRecord.item.client_tester_name}
                        onChange={(e) =>
                          setEditRecord({
                            section: "uat",
                            item: {
                              ...editRecord.item,
                              client_tester_name: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Pendamping Altvira</FieldLabel>
                      <Input
                        required
                        value={editRecord.item.altvira_companion_name}
                        onChange={(e) =>
                          setEditRecord({
                            section: "uat",
                            item: {
                              ...editRecord.item,
                              altvira_companion_name: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel required>Kesimpulan UAT</FieldLabel>
                    <Select
                      value={editRecord.item.conclusion}
                      onValueChange={(v) =>
                        setEditRecord({
                          section: "uat",
                          item: {
                            ...editRecord.item,
                            conclusion: v as UatConclusion,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="pending">Menunggu Hasil</SelectItem>
                          <SelectItem value="accepted">Diterima Penuh</SelectItem>
                          <SelectItem value="accepted_with_notes">
                            Diterima (Catatan)
                          </SelectItem>
                          <SelectItem value="rejected">Ditolak / Revisi</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}

              {editRecord.section === "bast" && (
                <>
                  <Field>
                    <FieldLabel required>Tanggal BAST</FieldLabel>
                    <DatePicker
                      required
                      value={editRecord.item.bast_date}
                      onChange={(v) =>
                        setEditRecord({
                          section: "bast",
                          item: { ...editRecord.item, bast_date: v },
                        })
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Masa Garansi (Hari)</FieldLabel>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={editRecord.item.warranty_days}
                        onValueChange={(warranty_days) =>
                          setEditRecord({
                            section: "bast",
                            item: {
                              ...editRecord.item,
                              warranty_days,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Status BAST</FieldLabel>
                      <Select
                        value={editRecord.item.status}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "bast",
                            item: {
                              ...editRecord.item,
                              status: v as BastStatus,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="draft">Draf</SelectItem>
                            <SelectItem value="signed">Ditandatangani</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="cursor-pointer">
                  {saving ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
