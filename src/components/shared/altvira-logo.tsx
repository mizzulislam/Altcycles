import * as React from "react";
import { useOptionalTheme } from "@/lib/theme-context";

export type AltviraIconVariant = "transparent" | "square";
export type AltviraThemeVariant = "dark" | "light" | "white"; // "dark" = for light bg; "light" = for dark bg; "white" = pure white mark
export type AltviraLayout = "horizontal" | "vertical";

export interface AltviraLogoMarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
  iconVariant?: AltviraIconVariant;
  variant?: AltviraThemeVariant;
}

export interface AltviraWordmarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  height?: number;
  variant?: AltviraThemeVariant;
}

export interface AltviraLogoProps {
  size?: number; // Ukuran tinggi/lebar ikon (default: 38)
  wordmarkHeight?: number; // Tinggi teks wordmark (default: 12)
  showText?: boolean;
  variant?: AltviraThemeVariant;
  iconVariant?: AltviraIconVariant;
  layout?: AltviraLayout;
  subtitle?: string;
  className?: string;
}

/**
 * Komponen Ikon Logo Altvira Resmi:
 * - Mode Terang (`variant="dark"`): Menggunakan `/brand/altvira-icon-dark.png` (sayap kanan navy gelap kontras tinggi untuk latar putih/terang)
 * - Mode Gelap (`variant="light"`): Menggunakan `/brand/altvira-icon.png` (sayap kanan putih/silver kontras tinggi untuk latar gelap/midnight)
 * - Otomatis mendeteksi tema aktif saat ini apabila prop `variant` tidak diberikan secara eksplisit.
 */
export function AltviraLogoMark({
  size = 38,
  iconVariant = "transparent",
  variant,
  className = "",
  alt = "Altvira Mark",
  style,
  ...props
}: AltviraLogoMarkProps) {
  const themeCtx = useOptionalTheme();
  const effectiveVariant: AltviraThemeVariant =
    variant ?? (themeCtx?.resolvedTheme === "dark" ? "light" : "dark");

  const src =
    iconVariant === "square"
      ? "/brand/altvira-icon-square.png"
      : effectiveVariant === "white"
        ? "/brand/altvira-icon-white.png"
        : effectiveVariant === "dark"
          ? "/brand/altvira-icon-dark.png"
          : "/brand/altvira-icon.png";

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain shrink-0 select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...style,
      }}
      draggable={false}
      {...props}
    />
  );
}

/**
 * Komponen Wordmark Teks Resmi Altvira (Gambar 3):
 * - `variant="dark"`: Huruf gelap (#090E19) dengan huruf V biru cyan (untuk latar belakang terang/kartu putih)
 * - `variant="light"`: Huruf putih dengan huruf V biru cyan (untuk latar belakang gelap/midnight)
 */
export function AltviraWordmark({
  height = 12,
  variant,
  className = "",
  alt = "ALTVIRA",
  style,
  ...props
}: AltviraWordmarkProps) {
  const themeCtx = useOptionalTheme();
  const effectiveVariant: AltviraThemeVariant =
    variant ?? (themeCtx?.resolvedTheme === "dark" ? "light" : "dark");

  const src =
    effectiveVariant === "light"
      ? "/brand/altvira-wordmark.png"
      : "/brand/altvira-wordmark-dark.png";

  // Aspect ratio gambar asli 1024 / 91 ~= 11.25
  const width = Math.round(height * 11.25);

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`object-contain select-none ${className}`}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        maxWidth: "100%",
        ...style,
      }}
      draggable={false}
      {...props}
    />
  );
}

/**
 * Komponen Logo Lengkap Altvira (Kombinasi Ikon Gambar 1/2 + Teks Gambar 3 + Subtitle)
 * Ukuran logo teks dibuat seimbang dan seukuran dengan teks FINANCIAL ERP.
 * Tipografi FINANCIAL ERP menggunakan font Montserrat dengan line spacing 4% (line-height: 1.04, tracking: 0.04em).
 */
export function AltviraLogo({
  size = 38,
  wordmarkHeight = 12,
  showText = true,
  variant,
  iconVariant = "transparent",
  layout = "horizontal",
  subtitle = "FINANCIAL ERP",
  className = "",
}: AltviraLogoProps) {
  const themeCtx = useOptionalTheme();
  const effectiveVariant: AltviraThemeVariant =
    variant ?? (themeCtx?.resolvedTheme === "dark" ? "light" : "dark");
  const isLight = effectiveVariant === "light";
  const actualWordmarkHeight = wordmarkHeight;

  if (layout === "vertical") {
    return (
      <div className={`flex flex-col items-center text-center gap-2.5 select-none ${className}`}>
        <div className="relative flex items-center justify-center">
          <AltviraLogoMark size={size} iconVariant={iconVariant} variant={effectiveVariant} />
        </div>
        {showText && (
          <div className="flex flex-col items-center gap-1">
            <AltviraWordmark height={actualWordmarkHeight} variant={effectiveVariant} />
            {subtitle && (
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  lineHeight: "1.04",
                  letterSpacing: "0.04em",
                }}
                className={`text-[11px] font-semibold uppercase ${
                  isLight ? "text-[#C9C9C9]" : "text-[#616C82]"
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative flex items-center justify-center shrink-0">
        <AltviraLogoMark size={size} iconVariant={iconVariant} variant={effectiveVariant} />
      </div>
      {showText && (
        <div className="flex flex-col justify-center gap-1">
          <AltviraWordmark height={actualWordmarkHeight} variant={effectiveVariant} />
          {subtitle && (
            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                lineHeight: "1.04",
                letterSpacing: "0.04em",
              }}
              className={`text-[11px] font-semibold uppercase ${
                isLight ? "text-[#C9C9C9]" : "text-[#616C82]"
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
