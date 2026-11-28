import { useState } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import type { DocTemplateRow } from "@/types/database.types";

interface SystemConfigTabTemplatesProps {
  templates: DocTemplateRow[];
  onSaveTemplate: (
    tmpl: DocTemplateRow,
    rawJson: string,
    footerNotes: string,
  ) => Promise<void>;
}

export function SystemConfigTabTemplates({
  templates,
  onSaveTemplate,
}: SystemConfigTabTemplatesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((tmpl) => (
        <TemplateEditorCard
          key={tmpl.doc_type}
          template={tmpl}
          onSave={onSaveTemplate}
        />
      ))}
    </div>
  );
}

function TemplateEditorCard({
  template,
  onSave,
}: {
  template: DocTemplateRow;
  onSave: (
    tmpl: DocTemplateRow,
    rawJson: string,
    footerNotes: string,
  ) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(template.default_placeholders, null, 2),
  );
  const [notes, setNotes] = useState(template.footer_notes ?? "");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.title}</CardTitle>
          <StatusBadge tone="outline" label={`v${template.version}`} />
        </div>
        <CardDescription>
          {t("settings:admin_settings.col_code")}: <code>{template.doc_type}</code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`json-${template.doc_type}`}>
              {t("settings:admin_settings.field_placeholder_json")}
            </FieldLabel>
            <Textarea
              id={`json-${template.doc_type}`}
              className="font-mono text-xs min-h-28"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`note-${template.doc_type}`}>
              {t("settings:admin_settings.field_footer_notes")}
            </FieldLabel>
            <Textarea
              id={`note-${template.doc_type}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onSave(template, jsonText, notes)}
            >
              {t("settings:admin_settings.btn_save_template")}
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
