import { toast } from "sonner";
import { ShieldCheckIcon } from "lucide-react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { OAuthLoadingCard } from "@/components/shared/oauth-loading-card";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { portalHomeForRole } from "@/features/auth/auth-context";
import { LoginShowcaseSidebar } from "./components/login-showcase-sidebar";
import { LoginCredentialForm } from "./components/login-credential-form";
import { useLoginPageState } from "./hooks/use-login-page-state";

interface LoginPageProps {
  bannerSrc?: string;
}

export function LoginPage({ bannerSrc }: LoginPageProps) {
  const state = useLoginPageState();
  const {
    t,
    profile,
    profileRef,
    isDemoMode,
    resolvedTheme,
    navigate,
    mode,
    setMode,
    username,
    setUsername,
    fullName,
    setFullName,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    capsLockOn,
    setCapsLockOn,
    rememberMe,
    setRememberMe,
    submitting,
    googleSubmitting,
    error,
    setError,
    oauthChecking,
    setOauthChecking,
    mediaSlides,
    mediaLoading,
    safeSlideIndex,
    setActiveSlideIndex,
    setIsBannerHovered,
    currentMedia,
    loadedSlideIds,
    failedSlideIds,
    markSlideLoaded,
    markSlideFailed,
    pwdCriteria,
    pwdScore,
    handleGoogleSignIn,
    handleSignIn,
    handleSignUp,
    fillDemoAccount,
  } = state;

  if (oauthChecking) {
    return (
      <OAuthLoadingCard
        resolvedTheme={resolvedTheme}
        userName={profile?.full_name}
        isProfileReady={Boolean(profile)}
        onComplete={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("altcycles_oauth_in_progress");
          }
          setOauthChecking(false);
          const targetProfile = profileRef.current || profile;
          if (targetProfile) {
            toast.success(
              `Berhasil masuk! Selamat datang, ${targetProfile.full_name}`,
              { id: "auth-login-success" },
            );
            navigate(portalHomeForRole(targetProfile.role), { replace: true });
          } else {
            navigate("/portal/super-admin", { replace: true });
          }
        }}
        onCancel={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem("altcycles_oauth_in_progress");
          }
          setOauthChecking(false);
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-muted/30 dark:bg-background transition-colors duration-300">
      {/* Tombol Aksi di Ujung Kanan Atas: Dual Bahasa & Mode Gelap/Terang (Desktop) */}
      <div className="hidden lg:flex fixed top-4 right-5 z-[9999] flex-col items-center p-1 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-md gap-1">
        <LanguageToggle
          size="default"
          className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none"
        />
        <div className="w-4 h-px bg-border/60" aria-hidden="true" />
        <ThemeToggle
          variant="inline"
          size="default"
          className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none"
        />
      </div>

      {/* Grid 2 Kolom Murni: Kolom Kiri (Banner) & Kolom Kanan (Form) */}
      <div className="min-h-screen w-full grid lg:grid-cols-2">
        {/* KOLOM KIRI: Area Banner Informasi */}
        <LoginShowcaseSidebar
          bannerSrc={bannerSrc}
          mediaSlides={mediaSlides}
          mediaLoading={mediaLoading}
          safeSlideIndex={safeSlideIndex}
          setActiveSlideIndex={setActiveSlideIndex}
          setIsBannerHovered={setIsBannerHovered}
          currentMedia={currentMedia}
          loadedSlideIds={loadedSlideIds}
          failedSlideIds={failedSlideIds}
          markSlideLoaded={markSlideLoaded}
          markSlideFailed={markSlideFailed}
        />

        {/* KOLOM KANAN: Form Masuk / Buat Akun */}
        <div className="relative flex flex-col justify-center items-center px-4 sm:px-6 py-6 lg:p-12 min-h-dvh lg:min-h-screen overflow-hidden">
          {/* Background Architectural Grid Pattern */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"
            aria-hidden="true"
          />

          {/* Ambient Glow Orbs */}
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="w-full max-w-[420px] relative z-10 space-y-4 sm:space-y-6">
            {/* Baris Kontrol Header Khusus Mobile & Tablet (<1024px) */}
            <div className="w-full flex items-center justify-end -mt-3 sm:-mt-4 mb-2 lg:hidden">
              <div className="inline-flex items-center gap-1 p-1 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xs">
                <LanguageToggle
                  size="sm"
                  className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none p-2"
                />
                <div className="w-px h-4 bg-border/60" aria-hidden="true" />
                <ThemeToggle
                  variant="inline"
                  size="sm"
                  className="size-9 rounded-xl border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shadow-none p-2"
                />
              </div>
            </div>

            {/* Mode Pratinjau Alert */}
            {isDemoMode && (
              <Alert
                variant="info"
                className="border-sky-500/30 bg-sky-500/10 text-foreground py-2 sm:py-3 rounded-[10px]"
              >
                <ShieldCheckIcon className="text-primary dark:text-sky-400 size-4" />
                <AlertTitle className="text-primary dark:text-sky-400 font-bold text-xs sm:text-sm">
                  {t("auth.demo_mode_title", "Mode Pratinjau Lokal Aktif")}
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  {t("auth.demo_mode_desc", "Pilih akun contoh untuk menguji masing-masing portal peran:")}
                  <div className="mt-1.5 sm:mt-2.5 flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 sm:h-7 text-[11px] sm:text-xs bg-card text-foreground border-border hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => fillDemoAccount("superadmin@altvira.id")}
                    >
                      Super Admin
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 sm:h-7 text-[11px] sm:text-xs bg-card text-foreground border-border hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => fillDemoAccount("admin@altvira.id")}
                    >
                      Admin
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 sm:h-7 text-[11px] sm:text-xs bg-card text-foreground border-border hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => fillDemoAccount("user@altvira.id")}
                    >
                      User
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Main Credential Form */}
            <LoginCredentialForm
              mode={mode}
              setMode={setMode}
              username={username}
              setUsername={setUsername}
              fullName={fullName}
              setFullName={setFullName}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              capsLockOn={capsLockOn}
              setCapsLockOn={setCapsLockOn}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              submitting={submitting}
              googleSubmitting={googleSubmitting}
              error={error}
              setError={setError}
              pwdCriteria={pwdCriteria}
              pwdScore={pwdScore}
              onGoogleSignIn={handleGoogleSignIn}
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
