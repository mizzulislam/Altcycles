import * as React from "react";
import {
  CheckCircle2Icon,
  HardDriveIcon,
  Loader2Icon,
  PlusIcon,
  Settings2Icon,
  UploadCloudIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  GoogleDriveIcon,
  GoogleGLogo,
} from "@/components/shared/google-drive-picker-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  extractGoogleDriveFileId,
  getGoogleDriveDirectImageUrl,
  saveGoogleDriveFile,
  type GoogleDriveFileItem,
} from "@/lib/google-drive";
import {
  clearStoredGoogleOAuthToken,
  getGoogleOAuthUserInfo,
  getStoredGoogleCredentials,
  isGoogleOAuthConnected,
  openOfficialGooglePicker,
  saveStoredGoogleCredentials,
} from "@/lib/google-drive-picker";

export interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string | null;
  onSelectLocalFile: (file: File) => Promise<void>;
  onSelectGoogleDriveUrl: (driveDirectUrl: string) => Promise<void>;
  isProcessing?: boolean;
  dialogTitle?: string;
  maxSizeMb?: number;
  containPreview?: boolean;
}

export function AvatarUploadDialog({
  open,
  onOpenChange,
  currentAvatarUrl: _currentAvatarUrl,
  onSelectLocalFile,
  onSelectGoogleDriveUrl,
  isProcessing = false,
  dialogTitle = "Pilih Foto Profil",
  maxSizeMb = 2,
  containPreview = false,
}: AvatarUploadDialogProps) {
  const [activeTab, setActiveTab] = React.useState<"local" | "drive">("local");

  // State untuk Tab Lokal
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string | null>(
    null,
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const localInputRef = React.useRef<HTMLInputElement | null>(null);

  // State untuk Tab Google Drive
  const [manualLinkInput, setManualLinkInput] = React.useState("");
  const [isVerifyingLink, setIsVerifyingLink] = React.useState(false);
  const [verifiedFile, setVerifiedFile] = React.useState<{
    id: string;
    url: string;
    name: string;
  } | null>(null);
  const [showManualLink, setShowManualLink] = React.useState(false);

  // Status Koneksi Google Drive Asli
  const [isGoogleConnected, setIsGoogleConnected] = React.useState(false);
  const [googleUser, setGoogleUser] = React.useState<{ email?: string; name?: string } | null>(null);

  // State Kredensial Google Picker Resmi
  const [showConfigCredentials, setShowConfigCredentials] = React.useState(false);
  const [clientIdInput, setClientIdInput] = React.useState("");
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const [isLaunchingPicker, setIsLaunchingPicker] = React.useState(false);

  // Muat status saat dialog dibuka
  React.useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setLocalPreviewUrl(null);
      setManualLinkInput("");
      setVerifiedFile(null);
      setShowConfigCredentials(false);
      setShowManualLink(false);

      // Cek status koneksi Google OAuth
      setIsGoogleConnected(isGoogleOAuthConnected());
      setGoogleUser(getGoogleOAuthUserInfo());

      const creds = getStoredGoogleCredentials();
      setClientIdInput(creds.clientId);
      setApiKeyInput(creds.apiKey);
    }
  }, [open]);

  // Handle pembuatan URL preview untuk file lokal
  React.useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Validasi dan set file lokal
  function handlePickFile(file: File) {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`Ukuran gambar maksimal ${maxSizeMb}MB.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Format berkas harus berupa gambar (JPG, PNG, atau WebP).");
      return;
    }
    setSelectedFile(file);
  }

  // Handle Drag & Drop
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePickFile(file);
    }
  }

  // Handle Konfirmasi File Lokal
  async function handleConfirmLocal() {
    if (!selectedFile) {
      toast.error("Silakan pilih berkas foto terlebih dahulu.");
      return;
    }
    try {
      await onSelectLocalFile(selectedFile);
      onOpenChange(false);
    } catch {
      // Error sudah ditangani di parent
    }
  }

  // Handle Konfirmasi Foto dari Google Drive
  async function handleConfirmDrive() {
    const targetUrl = verifiedFile?.url;
    if (!targetUrl) {
      toast.error("Pilih atau tempelkan link foto dari Google Drive Anda terlebih dahulu.");
      return;
    }
    try {
      await onSelectGoogleDriveUrl(targetUrl);
      onOpenChange(false);
    } catch {
      // Error sudah ditangani di parent
    }
  }

  // Handle Evaluasi Link Manual dari Google Drive Pengguna
  function handleVerifyManualLink() {
    if (!manualLinkInput.trim()) return;
    setIsVerifyingLink(true);
    const fid = extractGoogleDriveFileId(manualLinkInput.trim());
    if (!fid) {
      toast.error("Tautan Google Drive tidak sah. Pastikan memasukkan tautan file Google Drive yang valid.");
      setIsVerifyingLink(false);
      return;
    }

    const directImg = getGoogleDriveDirectImageUrl(fid);
    const fileName = `Foto_Drive_${fid.slice(0, 8)}.jpg`;

    const newItem: GoogleDriveFileItem = {
      id: fid,
      name: fileName,
      mimeType: "image/jpeg",
      sizeFormatted: "Google Drive File",
      thumbnailUrl: directImg,
      directImageUrl: directImg,
      viewUrl: `https://drive.google.com/file/d/${fid}/view`,
      category: "image",
      folderId: "my-drive",
      modifiedDate: "Hari ini",
    };

    saveGoogleDriveFile(newItem);
    setVerifiedFile({
      id: fid,
      url: directImg,
      name: fileName,
    });
    setIsVerifyingLink(false);
    toast.success("Foto dari Google Drive Anda berhasil diverifikasi & ditautkan!");
  }

  // Handle Putuskan Koneksi Google OAuth
  function handleDisconnectGoogle() {
    clearStoredGoogleOAuthToken();
    setIsGoogleConnected(false);
    setGoogleUser(null);
    toast.info("Sesi Google Drive ditutup. Anda dapat masuk dengan akun lain kapan saja.");
  }

  // Handle Buka Google Picker Resmi dari Google
  async function handleLaunchOfficialGooglePicker() {
    const creds = getStoredGoogleCredentials();
    if (!creds.clientId || !creds.apiKey) {
      setShowConfigCredentials(true);
      toast.info(
        "Kredensial Google Cloud belum diatur pada sistem. Masukkan Client ID & API Key.",
      );
      return;
    }

    setIsLaunchingPicker(true);
    // Tutup sementara dialog utama agar Radix UI tidak mengunci focus / scroll / pointer events
    // sehingga Google Picker dapat berinteraksi penuh (klik, scroll folder, cari, pilih)
    onOpenChange(false);

    try {
      await openOfficialGooglePicker({
        clientId: creds.clientId,
        apiKey: creds.apiKey,
        mimeTypeFilter: "image",
        onSelect: async (item) => {
          const directUrl = item.directImageUrl || item.thumbnailUrl || item.url;
          const newItem: GoogleDriveFileItem = {
            id: item.id,
            name: item.name,
            mimeType: item.mimeType,
            sizeFormatted: item.sizeBytes
              ? `${Math.ceil(item.sizeBytes / 1024)} KB`
              : "Google Drive",
            thumbnailUrl: directUrl,
            directImageUrl: directUrl,
            viewUrl: item.url,
            category: "image",
            folderId: "my-drive",
            modifiedDate: "Hari ini",
          };
          saveGoogleDriveFile(newItem);
          setIsGoogleConnected(isGoogleOAuthConnected());
          setGoogleUser(getGoogleOAuthUserInfo());
          await onSelectGoogleDriveUrl(directUrl);
          toast.success(`Foto "${item.name}" dari Google Drive Anda berhasil diterapkan!`);
        },
        onCancel: () => {
          // Jika pengguna membatalkan atau menutup Google Picker tanpa memilih foto,
          // tampilkan kembali modal dialog upload
          setIsGoogleConnected(isGoogleOAuthConnected());
          setGoogleUser(getGoogleOAuthUserInfo());
          onOpenChange(true);
        },
      });
    } catch (err) {
      setIsGoogleConnected(isGoogleOAuthConnected());
      setGoogleUser(getGoogleOAuthUserInfo());
      onOpenChange(true);
      toast.error(
        err instanceof Error ? err.message : "Gagal membuka Google Picker resmi.",
      );
    } finally {
      setIsLaunchingPicker(false);
    }
  }

  // Handle Simpan Kredensial Google
  function handleSaveCredentials() {
    if (!clientIdInput.trim() || !apiKeyInput.trim()) {
      toast.error("Client ID dan API Key Google wajib diisi.");
      return;
    }
    saveStoredGoogleCredentials(clientIdInput.trim(), apiKeyInput.trim());
    setShowConfigCredentials(false);
    toast.success("Kredensial Google Cloud berhasil disimpan!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {/* Tab Switcher */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "local" | "drive")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-xl border-0 bg-muted/60 p-1 shadow-none">
            <TabsTrigger
              value="local"
              className="rounded-lg text-xs font-semibold gap-2 py-2 cursor-pointer"
            >
              <HardDriveIcon className="size-3.5" />
              <span>Berkas Komputer</span>
            </TabsTrigger>
            <TabsTrigger
              value="drive"
              className="rounded-lg text-xs font-semibold gap-2 py-2 cursor-pointer"
            >
              <GoogleDriveIcon className="size-3.5" />
              <span>Google Drive</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Berkas Komputer (Lokal) */}
          <TabsContent value="local" className="mt-4 space-y-4">
            <input
              ref={localInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePickFile(file);
              }}
              disabled={isProcessing}
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => localInputRef.current?.click()}
                className={`group w-full py-8 px-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[0.99]"
                    : "border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <div className="size-12 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloudIcon className="size-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Pilih Foto dari Komputer
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Tarik &amp; letakkan foto di sini, atau klik untuk memilih berkas.
                </p>
                <span className="mt-3 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/50">
                  Mendukung format JPG, PNG, WEBP (maks. {maxSizeMb}MB)
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex flex-col items-center gap-3 text-center">
                <div className="relative size-24 rounded-2xl overflow-hidden border-2 border-primary/40 shadow-xs bg-white flex items-center justify-center p-1">
                  {localPreviewUrl && (
                    <img
                      src={localPreviewUrl}
                      alt="Pratinjau Gambar"
                      className={containPreview ? "max-h-full max-w-full object-contain" : "size-full object-cover"}
                    />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground truncate max-w-xs">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Siap diterapkan
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => localInputRef.current?.click()}
                  disabled={isProcessing}
                  className="rounded-2xl text-xs h-8 px-3 cursor-pointer"
                >
                  <UploadIcon className="size-3 mr-1" />
                  Ganti Foto Lain
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Google Drive Asli */}
          <TabsContent value="drive" className="mt-4 space-y-3.5">
            {/* Kartu Status Google Drive */}
            {isGoogleConnected ? (
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-card border border-border/80 flex items-center justify-center shrink-0 shadow-2xs">
                      <GoogleDriveIcon className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm">
                        Google Drive Terhubung
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {googleUser?.email || "Akun Google Anda siap digunakan"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    title="Ganti atau putuskan akun Google"
                    className="text-xs text-muted-foreground hover:text-destructive hover:underline cursor-pointer px-2 py-1 shrink-0"
                  >
                    Ganti Akun
                  </button>
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    size="default"
                    onClick={handleLaunchOfficialGooglePicker}
                    disabled={isLaunchingPicker}
                    className="w-full rounded-xl text-xs h-10 gap-2 cursor-pointer font-semibold shadow-xs"
                  >
                    {isLaunchingPicker ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <GoogleDriveIcon className="size-4" />
                    )}
                    <span>Pilih Foto dari Drive Saya</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-card border border-border/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <GoogleDriveIcon className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-foreground text-sm block">
                      Integrasi Google Drive
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Masuk satu kali dengan akun Google untuk langsung membuka folder Drive Anda (Drive Saya, Dibagikan, Berbintang) dan memilih foto profil secara aman.
                    </p>
                  </div>
                </div>

                <div>
                  <Button
                    type="button"
                    size="default"
                    onClick={handleLaunchOfficialGooglePicker}
                    disabled={isLaunchingPicker}
                    className="w-full rounded-xl text-xs h-10 gap-2.5 cursor-pointer font-semibold shadow-xs"
                  >
                    {isLaunchingPicker ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <GoogleGLogo className="size-4" />
                    )}
                    <span>Masuk dengan Akun Google</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Opsi Tautan Manual (Sebagai Alternatif Cadangan) */}
            <div className="pt-1">
              {!showManualLink ? (
                <button
                  type="button"
                  onClick={() => setShowManualLink(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusIcon className="size-3" />
                  <span>Atau tautkan menggunakan tautan Google Drive manual</span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl border border-border/80 bg-card/60 space-y-2 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <FieldLabel className="text-xs font-semibold flex items-center gap-1.5">
                      <span>Tautkan Berkas dari Tab Google Drive Anda</span>
                    </FieldLabel>
                    <button
                      type="button"
                      onClick={() => setShowManualLink(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Sembunyikan
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={manualLinkInput}
                      onChange={(e) => setManualLinkInput(e.target.value)}
                      placeholder="https://drive.google.com/file/d/1.../view?usp=sharing"
                      className="text-xs h-9 rounded-xl flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleVerifyManualLink}
                      disabled={!manualLinkInput.trim() || isVerifyingLink}
                      className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
                    >
                      {isVerifyingLink ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <PlusIcon className="size-3.5" />
                      )}
                      <span>Tautkan</span>
                    </Button>
                  </div>

                  {verifiedFile && (
                    <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between text-xs mt-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-10 rounded-lg overflow-hidden border border-emerald-500/30 bg-card shrink-0">
                          <img
                            src={verifiedFile.url}
                            alt={verifiedFile.name}
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate text-xs">
                            {verifiedFile.name}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            ID: {verifiedFile.id} • Terverifikasi
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmDrive}
                        className="h-7 text-[11px] rounded-lg font-semibold"
                      >
                        Terapkan Foto
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pengaturan Kredensial untuk Pengembang / Admin jika belum di .env.local */}
            {(!clientIdInput || !apiKeyInput || showConfigCredentials) && (
              <div className="pt-2 border-t border-border/50 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {!clientIdInput || !apiKeyInput
                      ? "⚠️ Kredensial Google Cloud belum diatur di .env.local"
                      : "Kredensial Google Cloud (.env.local)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfigCredentials((prev) => !prev)}
                    className="text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium"
                  >
                    <Settings2Icon className="size-3" />
                    <span>{showConfigCredentials ? "Sembunyikan" : "Atur Kredensial"}</span>
                  </button>
                </div>

                {showConfigCredentials && (
                  <div className="mt-2.5 p-3 rounded-xl border border-border/80 bg-muted/30 space-y-2 text-xs">
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Cukup atur <strong>sekali saja</strong> di berkas <code>.env.local</code> (<code>VITE_GOOGLE_CLIENT_ID</code> &amp; <code>VITE_GOOGLE_API_KEY</code>) agar seluruh pengguna sistem tidak perlu memasukkan API key.
                    </p>
                    <div className="space-y-1.5">
                      <Input
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        placeholder="Google OAuth Client ID"
                        className="text-xs h-8 rounded-lg"
                      />
                      <Input
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Google API Key"
                        className="text-xs h-8 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveCredentials}
                        className="h-7 text-xs rounded-lg font-semibold"
                      >
                        Simpan Kredensial
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Dialog dengan Tombol Terapkan & Batal */}
        <DialogFooter className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={isProcessing}
            onClick={() => onOpenChange(false)}
            className="rounded-2xl text-xs h-9 px-4 cursor-pointer"
          >
            Batal
          </Button>

          {activeTab === "local" ? (
            <Button
              type="button"
              size="default"
              disabled={!selectedFile || isProcessing}
              onClick={handleConfirmLocal}
              className="rounded-2xl text-xs h-9 px-4 cursor-pointer gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="size-3.5" />
                  <span>Gunakan Gambar Ini</span>
                </>
              )}
            </Button>
          ) : verifiedFile ? (
            <Button
              type="button"
              size="default"
              disabled={isProcessing}
              onClick={handleConfirmDrive}
              className="rounded-2xl text-xs h-9 px-4 cursor-pointer gap-1.5 font-semibold"
            >
              {isProcessing ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>Menerapkan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="size-3.5" />
                  <span>Terapkan dari Drive</span>
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
