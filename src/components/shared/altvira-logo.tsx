import * as React from "react";

export type AltviraIconVariant = "transparent" | "square";
export type AltviraThemeVariant = "dark" | "light"; // "dark" = for light bg; "light" = for dark bg
export type AltviraLayout = "horizontal" | "vertical";

export interface AltviraLogoMarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
  iconVariant?: AltviraIconVariant;
}

export interface AltviraWordmarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  height?: number;
  variant?: AltviraThemeVariant;
}

export interface AltviraLogoProps {
  size?: number; // Ukuran tinggi/lebar ikon (default: 40)
  wordmarkHeight?: number; // Tinggi teks wordmark (default: proportional ~18px)
  showText?: boolean;
  variant?: AltviraThemeVariant;
  iconVariant?: AltviraIconVariant;
  layout?: AltviraLayout;
  subtitle?: string;
  className?: string;
}

/**
 * Komponen Ikon Logo Altvira Resmi:
 * - `iconVariant="transparent"` (Gambar 2): Ribbon AV 3D transparan tanpa background
 * - `iconVariant="square"` (Gambar 1): App icon AV squircle dengan latar belakang gelap
 */
export function AltviraLogoMark({
  size = 40,
  iconVariant = "transparent",
  className = "",
  alt = "Altvira Mark",
  style,
  ...props
}: AltviraLogoMarkProps) {
  const src =
    iconVariant === "square"
      ? "/brand/altvira-icon-square.png"
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
  height = 18,
  variant = "dark",
  className = "",
  alt = "ALTVIRA",
  style,
  ...props
}: AltviraWordmarkProps) {
  const src =
    variant === "light"
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
        width: "auto",
        maxWidth: "100%",
        ...style,
      }}
      draggable={false}
      {...props}
    />
  );
}

/**
 * Komponen Logo Lengkap Altvira (Kombinasi Ikon Gambar 1/2 + Teks Gambar 3)
 */
export function AltviraLogo({
  size = 40,
  wordmarkHeight,
  showText = true,
  variant = "dark",
  iconVariant = "transparent",
  layout = "horizontal",
  subtitle = "FINANCIAL ERP",
  className = "",
}: AltviraLogoProps) {
  const isLight = variant === "light";
  const actualWordmarkHeight = wordmarkHeight ?? Math.max(15, Math.round(size * 0.45));

  if (layout === "vertical") {
    return (
      <div className={`flex flex-col items-center text-center gap-3 select-none ${className}`}>
        <div className="relative flex items-center justify-center">
          <AltviraLogoMark size={size} iconVariant={iconVariant} />
        </div>
        {showText && (
          <div className="flex flex-col items-center">
            <AltviraWordmark height={actualWordmarkHeight} variant={variant} />
            {subtitle && (
              <span
                className={`text-[9.5px] tracking-[0.38em] font-semibold mt-1.5 uppercase ${
                  isLight ? "text-[#C9C9C9]/80" : "text-[#616C82]"
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
        <AltviraLogoMark size={size} iconVariant={iconVariant} />
      </div>
      {showText && (
        <div className="flex flex-col justify-center">
          <AltviraWordmark height={actualWordmarkHeight} variant={variant} />
          {subtitle && (
            <span
              className={`text-[9px] tracking-[0.35em] font-semibold mt-1 uppercase ${
                isLight ? "text-[#C9C9C9]/80" : "text-[#616C82]"
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
