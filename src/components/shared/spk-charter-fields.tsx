import * as React from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SpkCharterContent } from "@/types/database.types";

type SpkEditorSection = "pihak" | "pasal1_3" | "pasal4_5" | "pasal6_10";

export function SpkCharterFields({
  value,
  onChange,
}: {
  value: SpkCharterContent;
  onChange: (next: SpkCharterContent) => void;
}) {
  const [section, setSection] = React.useState<SpkEditorSection>("pihak");

  const partyOne = value.partyOne ?? {
    name: "",
    title: "",
    company: "",
    address: "",
    email: "",
    phone: "",
  };
  const partyTwo = value.partyTwo ?? {
    name: "",
    title: "",
    company: "",
    address: "",
    email: "",
    phone: "",
  };

  return (
    <div className="space-y-4">
      {/* Navigasi Sub-Bagian SPK */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-xl border border-border/70 bg-muted/20 p-1">
        {[
          { id: "pihak" as const, label: "Pihak, Logo & TTD" },
          { id: "pasal1_3" as const, label: "Pasal 1–3 & Timeline" },
          { id: "pasal4_5" as const, label: "Pasal 4–5 (Tim & Biaya)" },
          { id: "pasal6_10" as const, label: "Pasal 6–10 & Penutup" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSection(t.id)}
            className={cn(
              "rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors cursor-pointer text-center",
              section === t.id
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* BAGIAN 1: PIHAK I & II, LOGO KLIEN, TTD, PARAF */}
      {section === "pihak" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field className="sm:col-span-2">
              <FieldLabel className="text-xs">Subjudul Kop Dokumen</FieldLabel>
              <Input
                value={value.headerSubtitle ?? ""}
                onChange={(e) =>
                  onChange({ ...value, headerSubtitle: e.target.value })
                }
                placeholder="Project Charter / Surat Perjanjian Kerjasama"
                className="text-xs"
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs">Versi</FieldLabel>
              <Input
                value={value.docVersion ?? "1.0"}
                onChange={(e) =>
                  onChange({ ...value, docVersion: e.target.value })
                }
                placeholder="1.0"
                className="text-xs"
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs">Kota TTD</FieldLabel>
              <Input
                value={value.signingCity ?? "Bogor"}
                onChange={(e) =>
                  onChange({ ...value, signingCity: e.target.value })
                }
                placeholder="Bogor"
                className="text-xs"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel className="text-xs">Tanggal Penandatanganan</FieldLabel>
              <DatePicker
                value={value.signingDate || new Date().toISOString().slice(0, 10)}
                onChange={(v) => onChange({ ...value, signingDate: v })}
              />
            </Field>
            <ImageAssetUploadBox
              label="Logo Klien (Kop Kanan)"
              emptyTitle="Upload Logo Klien"
              emptySubtitle="Opsional (otomatis terisi dari Master Pelanggan)"
              value={value.clientLogoDataUrl}
              onChange={(next) =>
                onChange({ ...value, clientLogoDataUrl: next })
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Pihak Pertama */}
            <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-2.5">
              <p className="text-xs font-bold text-primary">
                Pihak Pertama (Penyedia Jasa / Altvira)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Nama"
                  value={partyOne.name}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyOne: { ...partyOne, name: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
                <Input
                  placeholder="Jabatan"
                  value={partyOne.title}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyOne: { ...partyOne, title: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
              </div>
              <Input
                placeholder="Perusahaan"
                value={partyOne.company}
                onChange={(e) =>
                  onChange({
                    ...value,
                    partyOne: { ...partyOne, company: e.target.value },
                  })
                }
                className="text-xs h-8"
              />
              <Textarea
                rows={2}
                placeholder="Alamat"
                value={partyOne.address}
                onChange={(e) =>
                  onChange({
                    ...value,
                    partyOne: { ...partyOne, address: e.target.value },
                  })
                }
                className="text-xs"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Email"
                  value={partyOne.email}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyOne: { ...partyOne, email: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
                <Input
                  placeholder="No. Telepon"
                  value={partyOne.phone}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyOne: { ...partyOne, phone: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 pt-1">
                <ImageAssetUploadBox
                  label="TTD Pihak I"
                  emptyTitle="TTD Pihak I"
                  emptySubtitle="PNG transparan"
                  value={value.partyOneSignatureUrl}
                  onChange={(next) =>
                    onChange({ ...value, partyOneSignatureUrl: next })
                  }
                />
                <ImageAssetUploadBox
                  label="Paraf Pihak I"
                  emptyTitle="Paraf Pihak I"
                  emptySubtitle="PNG transparan"
                  value={value.partyOneParafUrl}
                  onChange={(next) =>
                    onChange({ ...value, partyOneParafUrl: next })
                  }
                />
              </div>
            </div>

            {/* Pihak Kedua */}
            <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-2.5">
              <p className="text-xs font-bold text-primary">
                Pihak Kedua (Client / Customer)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Nama PIC Klien"
                  value={partyTwo.name}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyTwo: { ...partyTwo, name: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
                <Input
                  placeholder="Jabatan"
                  value={partyTwo.title}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyTwo: { ...partyTwo, title: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
              </div>
              <Input
                placeholder="Perusahaan Klien"
                value={partyTwo.company}
                onChange={(e) =>
                  onChange({
                    ...value,
                    partyTwo: { ...partyTwo, company: e.target.value },
                  })
                }
                className="text-xs h-8"
              />
              <Textarea
                rows={2}
                placeholder="Alamat Klien"
                value={partyTwo.address}
                onChange={(e) =>
                  onChange({
                    ...value,
                    partyTwo: { ...partyTwo, address: e.target.value },
                  })
                }
                className="text-xs"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Email Klien"
                  value={partyTwo.email}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyTwo: { ...partyTwo, email: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
                <Input
                  placeholder="No. Telepon Klien"
                  value={partyTwo.phone}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      partyTwo: { ...partyTwo, phone: e.target.value },
                    })
                  }
                  className="text-xs h-8"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 pt-1">
                <ImageAssetUploadBox
                  label="TTD Pihak II"
                  emptyTitle="TTD Pihak II"
                  emptySubtitle="PNG transparan"
                  value={value.partyTwoSignatureUrl}
                  onChange={(next) =>
                    onChange({ ...value, partyTwoSignatureUrl: next })
                  }
                />
                <ImageAssetUploadBox
                  label="Paraf Pihak II"
                  emptyTitle="Paraf Pihak II"
                  emptySubtitle="PNG transparan"
                  value={value.partyTwoParafUrl}
                  onChange={(next) =>
                    onChange({ ...value, partyTwoParafUrl: next })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BAGIAN 2: PASAL 1-3 (TUJUAN, SCOPE, OUT OF SCOPE, TIMELINE) */}
      {section === "pasal1_3" && (
        <div className="space-y-4">
          <Field>
            <FieldLabel className="text-xs font-semibold">
              Pasal 1 — Maksud dan Tujuan
            </FieldLabel>
            <Textarea
              rows={3}
              value={value.pasal1Tujuan ?? ""}
              onChange={(e) =>
                onChange({ ...value, pasal1Tujuan: e.target.value })
              }
              className="text-xs"
            />
          </Field>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                Pasal 2 — Kelompok Ruang Lingkup (Deliverables)
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...value,
                    scopeGroups: [
                      ...(value.scopeGroups ?? []),
                      { category: "Kategori Pekerjaan Baru", items: ["Rincian pekerjaan"] },
                    ],
                  })
                }
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                <PlusIcon className="size-3" /> Tambah Kategori
              </Button>
            </div>
            {(value.scopeGroups ?? []).map((grp, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/70 bg-muted/15 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={grp.category}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        scopeGroups: (value.scopeGroups ?? []).map((g, i) =>
                          i === idx ? { ...g, category: e.target.value } : g,
                        ),
                      })
                    }
                    placeholder="Nama Kategori (mis. UI/UX Design)"
                    className="text-xs h-8 font-semibold"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      onChange({
                        ...value,
                        scopeGroups: (value.scopeGroups ?? []).filter(
                          (_, i) => i !== idx,
                        ),
                      })
                    }
                    className="size-8 text-destructive shrink-0"
                    title="Hapus kategori"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={grp.items.join("\n")}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      scopeGroups: (value.scopeGroups ?? []).map((g, i) =>
                        i === idx
                          ? {
                              ...g,
                              items: e.target.value.split("\n"),
                            }
                          : g,
                      ),
                    })
                  }
                  placeholder="Satu item pekerjaan per baris"
                  className="text-xs"
                />
              </div>
            ))}
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold">
              Hal yang Tidak Terlingkupi / Out of Scope (1 poin per baris)
            </FieldLabel>
            <Textarea
              rows={3}
              value={(value.outOfScope ?? []).join("\n")}
              onChange={(e) =>
                onChange({
                  ...value,
                  outOfScope: e.target.value.split("\n"),
                })
              }
              className="text-xs"
            />
          </Field>

          <Field>
            <FieldLabel className="text-xs font-semibold">
              Pasal 3 — Pengantar Jangka Waktu
            </FieldLabel>
            <Textarea
              rows={2}
              value={value.pasal3Intro ?? ""}
              onChange={(e) =>
                onChange({ ...value, pasal3Intro: e.target.value })
              }
              className="text-xs"
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                Tabel Timeline Proyek (Minggu | Aktivitas | Output)
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...value,
                    timelineRows: [
                      ...(value.timelineRows ?? []),
                      { week: "Minggu Baru", activities: "", output: "" },
                    ],
                  })
                }
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                <PlusIcon className="size-3" /> Tambah Baris
              </Button>
            </div>
            {(value.timelineRows ?? []).map((row, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-12 items-start">
                <Input
                  value={row.week}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      timelineRows: (value.timelineRows ?? []).map((r, i) =>
                        i === idx ? { ...r, week: e.target.value } : r,
                      ),
                    })
                  }
                  placeholder="Week"
                  className="sm:col-span-3 text-xs h-8"
                />
                <Input
                  value={row.activities}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      timelineRows: (value.timelineRows ?? []).map((r, i) =>
                        i === idx ? { ...r, activities: e.target.value } : r,
                      ),
                    })
                  }
                  placeholder="Key Activities"
                  className="sm:col-span-5 text-xs h-8"
                />
                <Input
                  value={row.output}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      timelineRows: (value.timelineRows ?? []).map((r, i) =>
                        i === idx ? { ...r, output: e.target.value } : r,
                      ),
                    })
                  }
                  placeholder="Output"
                  className="sm:col-span-3 text-xs h-8"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...value,
                      timelineRows: (value.timelineRows ?? []).filter(
                        (_, i) => i !== idx,
                      ),
                    })
                  }
                  className="size-8 text-destructive sm:col-span-1"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BAGIAN 3: PASAL 4-5 (TIM, EVENT, BIAYA & TERMIN) */}
      {section === "pasal4_5" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                Pasal 4 — Tim Pelaksana (Peran | Kapasitas | Tanggung Jawab)
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...value,
                    teamRoles: [
                      ...(value.teamRoles ?? []),
                      { role: "", capacity: "", responsibility: "" },
                    ],
                  })
                }
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                <PlusIcon className="size-3" /> Tambah Peran
              </Button>
            </div>
            {(value.teamRoles ?? []).map((r, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-12">
                <Input
                  value={r.role}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      teamRoles: (value.teamRoles ?? []).map((x, i) =>
                        i === idx ? { ...x, role: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Peran"
                  className="sm:col-span-3 text-xs h-8"
                />
                <Input
                  value={r.capacity}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      teamRoles: (value.teamRoles ?? []).map((x, i) =>
                        i === idx ? { ...x, capacity: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Kapasitas (mis. 3 MD)"
                  className="sm:col-span-2 text-xs h-8"
                />
                <Input
                  value={r.responsibility}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      teamRoles: (value.teamRoles ?? []).map((x, i) =>
                        i === idx ? { ...x, responsibility: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Tanggung jawab utama"
                  className="sm:col-span-6 text-xs h-8"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...value,
                      teamRoles: (value.teamRoles ?? []).filter((_, i) => i !== idx),
                    })
                  }
                  className="size-8 text-destructive sm:col-span-1"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                Event / Ceremony Proyek
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...value,
                    ceremonies: [
                      ...(value.ceremonies ?? []),
                      { event: "", frequency: "", attendees: "", schedule: "" },
                    ],
                  })
                }
                className="h-7 text-xs gap-1 cursor-pointer"
              >
                <PlusIcon className="size-3" /> Tambah Event
              </Button>
            </div>
            {(value.ceremonies ?? []).map((c, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-12">
                <Input
                  value={c.event}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      ceremonies: (value.ceremonies ?? []).map((x, i) =>
                        i === idx ? { ...x, event: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Nama Event"
                  className="sm:col-span-4 text-xs h-8"
                />
                <Input
                  value={c.frequency}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      ceremonies: (value.ceremonies ?? []).map((x, i) =>
                        i === idx ? { ...x, frequency: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Frekuensi"
                  className="sm:col-span-2 text-xs h-8"
                />
                <Input
                  value={c.attendees}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      ceremonies: (value.ceremonies ?? []).map((x, i) =>
                        i === idx ? { ...x, attendees: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Attendees"
                  className="sm:col-span-3 text-xs h-8"
                />
                <Input
                  value={c.schedule}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      ceremonies: (value.ceremonies ?? []).map((x, i) =>
                        i === idx ? { ...x, schedule: e.target.value } : x,
                      ),
                    })
                  }
                  placeholder="Jadwal"
                  className="sm:col-span-2 text-xs h-8"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...value,
                      ceremonies: (value.ceremonies ?? []).filter(
                        (_, i) => i !== idx,
                      ),
                    })
                  }
                  className="size-8 text-destructive sm:col-span-1"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel className="text-xs font-semibold">
                Pasal 5 — Total Biaya Proyek (Rp)
              </FieldLabel>
              <NumberInput
                allowDecimal={false}
                min={0}
                value={value.totalProjectCost ?? 0}
                onValueChange={(totalProjectCost) =>
                  onChange({ ...value, totalProjectCost })
                }
                className="text-xs h-9"
              />
            </Field>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold block">
                Rincian Item Biaya (mis. Development Cost)
              </span>
              {(value.costDetails ?? []).map((cd, idx) => (
                <div key={idx} className="grid gap-2 grid-cols-12">
                  <Input
                    value={cd.label}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        costDetails: (value.costDetails ?? []).map((x, i) =>
                          i === idx ? { ...x, label: e.target.value } : x,
                        ),
                      })
                    }
                    placeholder="Keterangan"
                    className="col-span-7 text-xs h-8"
                  />
                  <NumberInput
                    allowDecimal={false}
                    min={0}
                    value={cd.amount}
                    onValueChange={(amount) =>
                      onChange({
                        ...value,
                        costDetails: (value.costDetails ?? []).map((x, i) =>
                          i === idx ? { ...x, amount } : x,
                        ),
                      })
                    }
                    className="col-span-5 text-xs h-8"
                  />
                </div>
              ))}
            </div>
          </div>

          <Field>
            <FieldLabel className="text-xs font-semibold">
              Mekanisme Pembayaran / Termin (1 poin per baris)
            </FieldLabel>
            <Textarea
              rows={3}
              value={(value.paymentTermsText ?? []).join("\n")}
              onChange={(e) =>
                onChange({
                  ...value,
                  paymentTermsText: e.target.value.split("\n"),
                })
              }
              className="text-xs"
            />
          </Field>
        </div>
      )}

      {/* BAGIAN 4: PASAL 6-10 & PENUTUP */}
      {section === "pasal6_10" && (
        <div className="space-y-3">
          <Field>
            <FieldLabel className="text-xs font-semibold">
              Pasal 6 — Kerahasiaan
            </FieldLabel>
            <Textarea
              rows={2}
              value={value.pasal6Kerahasiaan ?? ""}
              onChange={(e) =>
                onChange({ ...value, pasal6Kerahasiaan: e.target.value })
              }
              className="text-xs"
            />
          </Field>
          <Field>
            <FieldLabel className="text-xs font-semibold">
              Pasal 7 — Hak Kepemilikan &amp; Intellectual Property (1 poin per baris)
            </FieldLabel>
            <Textarea
              rows={3}
              value={(value.pasal7Haki ?? []).join("\n")}
              onChange={(e) =>
                onChange({ ...value, pasal7Haki: e.target.value.split("\n") })
              }
              className="text-xs"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel className="text-xs font-semibold">
                Pasal 8 — Force Majeure
              </FieldLabel>
              <Textarea
                rows={2}
                value={value.pasal8ForceMajeure ?? ""}
                onChange={(e) =>
                  onChange({ ...value, pasal8ForceMajeure: e.target.value })
                }
                className="text-xs"
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs font-semibold">
                Pasal 9 — Penyelesaian Permasalahan
              </FieldLabel>
              <Textarea
                rows={2}
                value={value.pasal9Penyelesaian ?? ""}
                onChange={(e) =>
                  onChange({ ...value, pasal9Penyelesaian: e.target.value })
                }
                className="text-xs"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel className="text-xs font-semibold">
                Pasal 10 — Lain-Lain
              </FieldLabel>
              <Textarea
                rows={2}
                value={value.pasal10LainLain ?? ""}
                onChange={(e) =>
                  onChange({ ...value, pasal10LainLain: e.target.value })
                }
                className="text-xs"
              />
            </Field>
            <Field>
              <FieldLabel className="text-xs font-semibold">
                Kalimat Penutup Surat Perjanjian
              </FieldLabel>
              <Textarea
                rows={2}
                value={value.closingText ?? ""}
                onChange={(e) =>
                  onChange({ ...value, closingText: e.target.value })
                }
                className="text-xs"
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

