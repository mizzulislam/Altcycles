import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "type" | "value" | "defaultValue" | "onChange" | "inputMode"
  > {
  value: number;
  onValueChange: (value: number) => void;
  /** Izinkan nilai desimal menggunakan koma (default: true). */
  allowDecimal?: boolean;
  /** Maksimal jumlah digit di belakang koma (default: 2). */
  maxDecimals?: number;
  min?: number;
  max?: number;
}

function formatNumberToIndonesian(
  num: number,
  allowDecimal: boolean,
  maxDecimals: number,
): string {
  if (!Number.isFinite(num)) return "";
  const isNeg = num < 0;
  const absNum = Math.abs(num);

  let rawStr: string;
  if (!allowDecimal || maxDecimals <= 0) {
    rawStr = String(Math.round(absNum));
  } else {
    // Hindari artefak floating point dengan pembulatan maxDecimals
    const factor = 10 ** maxDecimals;
    const rounded = Math.round(absNum * factor) / factor;
    rawStr = String(rounded);
  }

  const [intRaw = "0", decRaw] = rawStr.split(".");
  const intFormatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = isNeg && absNum !== 0 ? "-" : "";

  if (allowDecimal && decRaw !== undefined && decRaw.length > 0) {
    return `${sign}${intFormatted},${decRaw}`;
  }
  return `${sign}${intFormatted}`;
}

function formatRawInput(
  raw: string,
  allowDecimal: boolean,
  maxDecimals: number,
  allowNegative: boolean,
): { formatted: string; numeric: number } {
  // Hapus pemisah ribuan titik yang sudah ada
  let stripped = raw.replace(/\./g, "");

  // Pertahankan tanda minus di depan bila diizinkan
  let sign = "";
  if (allowNegative && stripped.startsWith("-")) {
    sign = "-";
    stripped = stripped.slice(1);
  }
  stripped = stripped.replace(/-/g, "");

  // Pertahankan hanya digit 0-9 dan koma desimal (jika diizinkan)
  stripped = stripped.replace(allowDecimal ? /[^0-9,]/g : /[^0-9]/g, "");

  let intPart = stripped;
  let decPart: string | undefined;
  let hasTrailingComma = false;

  if (allowDecimal) {
    const commaIdx = stripped.indexOf(",");
    if (commaIdx !== -1) {
      intPart = stripped.slice(0, commaIdx);
      const afterComma = stripped.slice(commaIdx + 1).replace(/,/g, "");
      decPart = afterComma.slice(0, Math.max(0, maxDecimals));
      hasTrailingComma = true;
    }
  }

  // Hilangkan nol di depan kecuali angka "0" tunggal
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (intPart === "" && hasTrailingComma) {
    intPart = "0";
  }

  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatted = hasTrailingComma
    ? `${sign}${intFormatted},${decPart ?? ""}`
    : intFormatted
      ? `${sign}${intFormatted}`
      : sign;

  const parseTarget = `${sign}${intPart || "0"}${decPart !== undefined ? `.${decPart}` : ""}`;
  const parsed = Number(parseTarget);
  const numeric = Number.isFinite(parsed) ? parsed : 0;

  return { formatted, numeric };
}

/**
 * Input angka terstandar Altcycles (Design System Rule):
 * - Titik (.) sebagai pemisah ribuan
 * - Koma (,) sebagai pemisah desimal
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      allowDecimal = true,
      maxDecimals = 2,
      min,
      max,
      className,
      onFocus,
      onBlur,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const mergedRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const allowNegative = min === undefined || min < 0;
    const [isFocused, setIsFocused] = React.useState(false);
    const [text, setText] = React.useState<string>(() =>
      formatNumberToIndonesian(value, allowDecimal, maxDecimals),
    );

    // Sinkronkan tampilan saat nilai berubah dari luar (mis. auto-hitung persentase/nominal)
    React.useEffect(() => {
      if (!isFocused) {
        setText(formatNumberToIndonesian(value, allowDecimal, maxDecimals));
        return;
      }
      const { numeric } = formatRawInput(text, allowDecimal, maxDecimals, allowNegative);
      if (Math.abs(numeric - value) > 1e-6) {
        setText(formatNumberToIndonesian(value, allowDecimal, maxDecimals));
      }
    }, [value, isFocused, allowDecimal, maxDecimals, allowNegative, text]);

    function updateFormattedAndCaret(rawNext: string, rawCaret: number) {
      const nonDotCountBefore = rawNext
        .slice(0, rawCaret)
        .replace(/\./g, "").length;

      const { formatted, numeric } = formatRawInput(
        rawNext,
        allowDecimal,
        maxDecimals,
        allowNegative,
      );

      setText(formatted);
      onValueChange(numeric);

      requestAnimationFrame(() => {
        const el = innerRef.current;
        if (!el || document.activeElement !== el) return;
        let seen = 0;
        let nextCaret = formatted.length;
        for (let i = 0; i < formatted.length; i++) {
          if (seen >= nonDotCountBefore) {
            nextCaret = i;
            break;
          }
          if (formatted[i] !== ".") {
            seen++;
          }
        }
        if (seen >= nonDotCountBefore && nonDotCountBefore === 0) {
          nextCaret = 0;
        }
        el.setSelectionRange(nextCaret, nextCaret);
      });
    }

    return (
      <Input
        ref={mergedRef}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        value={text}
        className={cn("tabular-nums", className)}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          let finalVal = value;
          if (min !== undefined && finalVal < min) finalVal = min;
          if (max !== undefined && finalVal > max) finalVal = max;
          if (finalVal !== value) {
            onValueChange(finalVal);
          }
          setText(formatNumberToIndonesian(finalVal, allowDecimal, maxDecimals));
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "." && allowDecimal) {
            e.preventDefault();
            const el = innerRef.current;
            if (!el) return;
            const start = el.selectionStart ?? text.length;
            const end = el.selectionEnd ?? text.length;
            if (!text.includes(",")) {
              const nextRaw = `${text.slice(0, start)},${text.slice(end)}`;
              updateFormattedAndCaret(nextRaw, start + 1);
            }
            return;
          }
          onKeyDown?.(e);
        }}
        onChange={(e) => {
          const el = e.target;
          const caret = el.selectionStart ?? el.value.length;
          updateFormattedAndCaret(el.value, caret);
        }}
        {...props}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

