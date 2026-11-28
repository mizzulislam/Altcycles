import type { FormEvent } from "react";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/lib/i18n";
import type {
  LoginMediaCategory,
  LoginMediaItemRow,
} from "@/types/database.types";

export interface LoginMediaFormDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  editingItem: LoginMediaItemRow | null;
  titleInput: string;
  setTitleInput: (val: string) => void;
  subtitleInput: string;
  setSubtitleInput: (val: string) => void;
  categoryInput: LoginMediaCategory;
  setCategoryInput: (val: LoginMediaCategory) => void;
  imageUrlInput: string | null;
  setImageUrlInput: (val: string | null) => void;
  linkUrlInput: string;
  setLinkUrlInput: (val: string) => void;
  orderInput: number;
  setOrderInput: (val: number) => void;
  activeInput: boolean;
  setActiveInput: (val: boolean) => void;
  saving: boolean;
  onSave: (e: FormEvent) => Promise<void>;
}

export function LoginMediaFormDialog({
  dialogOpen,
  setDialogOpen,
  editingItem,
  titleInput,
  setTitleInput,
  subtitleInput,
  setSubtitleInput,
  categoryInput,
  setCategoryInput,
  imageUrlInput,
  setImageUrlInput,
  linkUrlInput,
  setLinkUrlInput,
  orderInput,
  setOrderInput,
  activeInput,
  setActiveInput,
  saving,
  onSave,
}: LoginMediaFormDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem
              ? t("settings:login_media.modal_edit_header")
              : t("settings:login_media.modal_add_title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-5">
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="lm-title" required>
                  {t("settings:login_media.field_title_content")}
                </FieldLabel>
                <Input
                  id="lm-title"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder={t("settings:login_media.field_title_ph")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lm-order" required>
                  {t("settings:login_media.field_order_display")}
                </FieldLabel>
                <NumberInput
                  id="lm-order"
                  allowDecimal={false}
                  min={1}
                  required
                  value={orderInput}
                  onValueChange={setOrderInput}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel required>
                  {t("settings:login_media.field_category_label")}
                </FieldLabel>
                <Select
                  value={categoryInput}
                  onValueChange={(v) =>
                    setCategoryInput(v as LoginMediaCategory)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">
                      {t("settings:login_media.category_banner_desc")}
                    </SelectItem>
                    <SelectItem value="flyer">
                      {t("settings:login_media.category_flyer_desc")}
                    </SelectItem>
                    <SelectItem value="medsos">
                      {t("settings:login_media.category_medsos_desc")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="lm-link">
                  {t("settings:login_media.field_link_target")}
                </FieldLabel>
                <Input
                  id="lm-link"
                  type="url"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder={t(
                    "settings:login_media.field_link_placeholder",
                    "https://altvira.id atau /portal-pembeli",
                  )}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="lm-subtitle">
                {t("settings:login_media.field_subtitle_short")}
              </FieldLabel>
              <Input
                id="lm-subtitle"
                value={subtitleInput}
                onChange={(e) => setSubtitleInput(e.target.value)}
                placeholder={t("settings:login_media.field_subtitle_ph")}
              />
            </Field>

            <ImageAssetUploadBox
              required
              label={t("settings:login_media.field_image_upload_label")}
              helperText={t("settings:login_media.field_image_helper")}
              emptyTitle={t("settings:login_media.field_image_empty_title")}
              emptySubtitle={t("settings:login_media.field_image_empty_desc")}
              value={imageUrlInput}
              onChange={setImageUrlInput}
              maxWidth={1440}
              maxHeight={1800}
              format="webp"
              quality={0.82}
              containImage={categoryInput !== "banner"}
              previewHeightClassName="h-44"
            />

            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t("settings:login_media.field_toggle_login")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("settings:login_media.field_toggle_login_desc")}
                </p>
              </div>
              <Switch
                checked={activeInput}
                onCheckedChange={setActiveInput}
                aria-label={t("settings:login_media.field_toggle_login")}
              />
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {t("common:action.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              <span>
                {editingItem
                  ? t("settings:login_media.btn_save_changes")
                  : t("settings:login_media.btn_save")}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
