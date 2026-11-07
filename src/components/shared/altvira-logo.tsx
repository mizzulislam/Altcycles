import * as React from "react";

interface AltviraLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  showText?: boolean;
  variant?: "dark" | "light"; // "light" = white text (for dark bg), "dark" = dark text (for light bg)
  subtitle?: string;
}

export function AltviraLogoMark({
  size = 48,
  className = "",
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const gradientId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient
          id={`${gradientId}-altvira-grad`}
          x1="10"
          y1="10"
          x2="110"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1FB1F2" />
          <stop offset="50%" stopColor="#0B43C8" />
          <stop offset="100%" stopColor="#083296" />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-cyan-accent`}
          x1="0"
          y1="0"
          x2="60"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#67D5FF" />
          <stop offset="100%" stopColor="#1FB1F2" />
        </linearGradient>
      </defs>

      {/* Geometric AV Ribbon Mark */}
      {/* Left Chevron (A Peak) */}
      <path
        d="M20 78L52 26C54 22.8 58.5 22.8 60.5 26L74 48L61 56L56 46L36 78H20Z"
        fill={`url(#${gradientId}-cyan-accent)`}
      />
      {/* Right Chevron (V Valley) and Interlocking Diagonal */}
      <path
        d="M100 42L68 94C66 97.2 61.5 97.2 59.5 94L46 72L59 64L64 74L84 42H100Z"
        fill={`url(#${gradientId}-altvira-grad)`}
      />
      {/* Core Center Joint Glow */}
      <circle cx="60" cy="60" r="3" fill="#67D5FF" opacity="0.8" />
    </svg>
  );
}

export function AltviraLogo({
  size = 40,
  showText = true,
  variant = "dark",
  subtitle = "ALTCYCLES",
  className = "",
}: AltviraLogoProps) {
  const isLight = variant === "light";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        <AltviraLogoMark size={size} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center tracking-[0.28em] font-black text-lg leading-none">
            <span className={isLight ? "text-white" : "text-[#090E19]"}>
              ALT
            </span>
            <span className="text-[#1FB1F2]">VIRA</span>
          </div>
          {subtitle && (
            <span
              className={`text-[10px] tracking-[0.35em] font-semibold mt-1 uppercase ${
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
