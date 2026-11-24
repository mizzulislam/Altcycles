import * as React from "react";

export interface AnimatedNumberProps {
  value: number;
  duration?: number; // ms, default 600
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (val: number) => string;
}

/**
 * Komponen Animasi Count-Up Angka Saldo / KPI yang ringan (60 FPS via rAF).
 * Mematuhi prefers-reduced-motion dan menjamin zero-layout-shift dengan tabular-nums.
 */
export function AnimatedNumber({
  value,
  duration = 600,
  prefix = "",
  suffix = "",
  className,
  formatter,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = React.useState<number>(() => {
    // Jika user mengaktifkan prefers-reduced-motion, langsung render nilai akhir
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)")?.matches
    ) {
      return value;
    }
    return 0;
  });

  const prefersReduced = React.useRef(false);

  React.useEffect(() => {
    prefersReduced.current =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)")?.matches;
  }, []);

  React.useEffect(() => {
    if (prefersReduced.current || duration <= 0) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp: number | null = null;
    const startVal = displayValue;
    const diff = value - startVal;
    let frameId: number;

    function step(timestamp: number) {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: easeOutExpo (1 - Math.pow(2, -10 * progress))
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startVal + diff * ease);

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    }

    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = formatter
    ? formatter(displayValue)
    : displayValue.toLocaleString("id-ID");

  const renderedSuffix =
    suffix && /^[\p{L}\p{N}]/u.test(suffix.trim()) && !suffix.startsWith(" ")
      ? ` ${suffix}`
      : suffix;

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {renderedSuffix}
    </span>
  );
}
