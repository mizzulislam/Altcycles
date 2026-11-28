import { FlaskConicalIcon, RotateCcwIcon } from "lucide-react";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { CompanyProfileRow } from "@/types/database.types";

interface SystemConfigTabAccountingProps {
  company: CompanyProfileRow;
  onToggleTesting: (enableTesting: boolean) => Promise<void>;
  onOpenPurgeConfirm: () => void;
  purging: boolean;
}

export function SystemConfigTabAccounting({
  company,
  onToggleTesting,
  onOpenPurgeConfirm,
  purging,
}: SystemConfigTabAccountingProps) {
  return (
    <Card>
      <CardHeaderWithInfo
        title={
          <span className="inline-flex items-center gap-2">
            <FlaskConicalIcon className="size-5 text-amber-500 shrink-0" />
            <span>Mode Testing / Sandbox Sistem</span>
          </span>
        }
        description="Bungkus kontrol pengujian integritas akuntansi dan pencatatan dokumen. Saat mode testing aktif, transaksi jurnal dapat diedit/dihapus untuk pengujian dan nomor urut dokumen dapat dibersihkan."
      />
      <CardContent className="flex flex-col gap-5">
        <Alert variant={company.journal_lock_enabled === false ? "warning" : "info"}>
          <AlertTitle>
            {company.journal_lock_enabled === false
              ? "Mode Testing Sedang Aktif"
              : "Mode Normal (Produksi) Aktif"}
          </AlertTitle>
          <AlertDescription>
            {company.journal_lock_enabled === false
              ? "Sistem berada dalam mode sandbox/testing. Transaksi jurnal tidak dikunci secara permanen sehingga dapat diedit atau dihapus. Anda dapat membersihkan data transaksi testing dan mereset penomoran dokumen di bawah."
              : "Sistem berada dalam mode operasional resmi. Seluruh jurnal transaksi terkunci otomatis (Strict Immutability) untuk menjamin kepatuhan audit PSAK/IFRS Altvira."}
          </AlertDescription>
        </Alert>

        <FieldSet>
          <FieldLegend>Status Mode Testing Sistem</FieldLegend>
          <Field orientation="horizontal">
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="sw-testing-mode">
                Aktifkan Sandbox / Mode Testing
              </FieldLabel>
              <FieldDescription>
                Buka kunci transaksi jurnal sementara untuk keperluan simulasi pembukuan dan pengujian fungsional sistem.
              </FieldDescription>
            </div>
            <Switch
              id="sw-testing-mode"
              checked={company.journal_lock_enabled === false}
              onCheckedChange={(checked) => void onToggleTesting(checked)}
            />
          </Field>

          {company.journal_lock_enabled === false && (
            <div className="mt-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive">
                  Bersihkan Data Pengujian & Reset Counter Dokumen
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hapus seluruh counter urutan dokumen testing dan kembalikan urutan penomoran ke awal tanpa mempengaruhi format pola penomoran dokumen.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={purging}
                onClick={onOpenPurgeConfirm}
                className="rounded-xl h-8 px-3 text-xs gap-1.5 shrink-0"
              >
                <RotateCcwIcon className="size-3.5" />
                Bersihkan Data Testing
              </Button>
            </div>
          )}
        </FieldSet>
      </CardContent>
    </Card>
  );
}
