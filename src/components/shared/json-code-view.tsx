import * as React from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TokenKind =
  | "whitespace"
  | "key"
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "brace"
  | "punctuation";

interface JsonToken {
  text: string;
  kind: TokenKind;
}

interface JsonLine {
  tokens: JsonToken[];
  changed: boolean;
}

const TOKEN_CLASSES: Record<TokenKind, string> = {
  whitespace: "",
  key: "text-sky-700 dark:text-sky-300",
  string: "text-amber-700 dark:text-amber-300",
  number: "text-emerald-700 dark:text-emerald-300",
  boolean: "text-blue-600 dark:text-blue-400 font-medium",
  null: "text-slate-500 dark:text-slate-400 italic",
  brace: "text-violet-600 dark:text-violet-400",
  punctuation: "text-slate-500 dark:text-slate-400",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, idx) => stableEquals(item, b[idx]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && stableEquals(a[k], b[k]));
  }
  return false;
}

function scalarTokens(value: unknown): JsonToken[] {
  if (typeof value === "string") {
    return [{ text: JSON.stringify(value), kind: "string" }];
  }
  if (typeof value === "number") {
    return [{ text: String(value), kind: "number" }];
  }
  if (typeof value === "boolean") {
    return [{ text: String(value), kind: "boolean" }];
  }
  return [{ text: "null", kind: "null" }];
}

function buildJsonLines(
  value: unknown,
  compareValue: unknown,
  hasCompare: boolean,
): JsonLine[] {
  const lines: JsonLine[] = [];

  function appendValue(
    val: unknown,
    cmp: unknown,
    cmpExists: boolean,
    indent: number,
    prefixTokens: JsonToken[],
    hasComma: boolean,
  ) {
    const pad = indent > 0 ? [{ text: "  ".repeat(indent), kind: "whitespace" as const }] : [];
    const commaToken: JsonToken[] = hasComma ? [{ text: ",", kind: "punctuation" }] : [];

    if (Array.isArray(val)) {
      if (val.length === 0) {
        const changed = hasCompare && (!cmpExists || !Array.isArray(cmp) || cmp.length > 0);
        lines.push({
          tokens: [...pad, ...prefixTokens, { text: "[]", kind: "brace" }, ...commaToken],
          changed,
        });
        return;
      }

      const cmpArray = Array.isArray(cmp) ? cmp : undefined;
      lines.push({
        tokens: [...pad, ...prefixTokens, { text: "[", kind: "brace" }],
        changed: hasCompare && !cmpExists,
      });

      val.forEach((item, idx) => {
        const itemCmpExists = cmpArray !== undefined && idx < cmpArray.length;
        const itemCmp = itemCmpExists ? cmpArray[idx] : undefined;
        appendValue(item, itemCmp, itemCmpExists, indent + 1, [], idx < val.length - 1);
      });

      lines.push({
        tokens: [...pad, { text: "]", kind: "brace" }, ...commaToken],
        changed: hasCompare && !cmpExists,
      });
      return;
    }

    if (isPlainObject(val)) {
      const entries = Object.entries(val);
      if (entries.length === 0) {
        const changed = hasCompare && (!cmpExists || !isPlainObject(cmp) || Object.keys(cmp).length > 0);
        lines.push({
          tokens: [...pad, ...prefixTokens, { text: "{}", kind: "brace" }, ...commaToken],
          changed,
        });
        return;
      }

      const cmpObj = isPlainObject(cmp) ? cmp : undefined;
      lines.push({
        tokens: [...pad, ...prefixTokens, { text: "{", kind: "brace" }],
        changed: hasCompare && !cmpExists,
      });

      entries.forEach(([key, propVal], idx) => {
        const propCmpExists =
          cmpObj !== undefined && Object.prototype.hasOwnProperty.call(cmpObj, key);
        const propCmp = propCmpExists ? cmpObj[key] : undefined;
        const keyPrefix: JsonToken[] = [
          { text: JSON.stringify(key), kind: "key" },
          { text: ": ", kind: "punctuation" },
        ];
        appendValue(propVal, propCmp, propCmpExists, indent + 1, keyPrefix, idx < entries.length - 1);
      });

      lines.push({
        tokens: [...pad, { text: "}", kind: "brace" }, ...commaToken],
        changed: hasCompare && !cmpExists,
      });
      return;
    }

    const changed = hasCompare && (!cmpExists || !stableEquals(val, cmp));
    lines.push({
      tokens: [...pad, ...prefixTokens, ...scalarTokens(val), ...commaToken],
      changed,
    });
  }

  appendValue(value, compareValue, hasCompare, 0, [], false);
  return lines;
}

export interface JsonCodeViewProps {
  data: unknown;
  compareWith?: unknown;
  diffTone?: "removed" | "added";
  emptyLabel?: string;
  className?: string;
}

/**
 * Renders structured JSON data with IDE-inspired syntax highlighting,
 * line numbers, and optional line-level diff emphasis.
 */
export function JsonCodeView({
  data,
  compareWith,
  diffTone,
  emptyLabel = "— (Kosong)",
  className,
}: JsonCodeViewProps) {
  const [copied, setCopied] = React.useState(false);

  const hasData = data !== null && data !== undefined;
  const hasCompare = compareWith !== null && compareWith !== undefined;

  const lines = React.useMemo(() => {
    if (!hasData) return [];
    return buildJsonLines(data, compareWith, hasCompare);
  }, [data, compareWith, hasData, hasCompare]);

  async function handleCopy() {
    if (!hasData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failure when permission is denied
    }
  }

  if (!hasData) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 text-center font-mono text-xs text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/80 bg-slate-50/90 dark:bg-[#090F1E] overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => void handleCopy()}
        title="Salin JSON"
        aria-label="Salin JSON"
        className="absolute right-2.5 top-2 z-10 inline-flex size-7 items-center justify-center rounded-lg border border-border/70 bg-background/85 text-muted-foreground opacity-0 backdrop-blur-xs transition-all hover:text-foreground group-hover:opacity-100 focus:opacity-100 cursor-pointer"
      >
        {copied ? (
          <CheckIcon className="size-3.5 text-emerald-500" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>

      <div className="max-h-80 overflow-auto py-2.5 font-mono text-xs leading-relaxed">
        <div className="min-w-max">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start px-3 transition-colors hover:bg-muted/40 dark:hover:bg-white/[0.03]",
                line.changed &&
                  diffTone === "removed" &&
                  "bg-rose-500/10 dark:bg-rose-500/15 border-l-2 border-l-rose-500/80 pl-2.5",
                line.changed &&
                  diffTone === "added" &&
                  "bg-emerald-500/10 dark:bg-emerald-500/15 border-l-2 border-l-emerald-500/80 pl-2.5",
              )}
            >
              <span className="mr-3 w-6 shrink-0 select-none text-right text-[11px] leading-relaxed text-muted-foreground/45 tabular-nums">
                {index + 1}
              </span>
              <span className="whitespace-pre">
                {line.tokens.map((token, tIdx) => (
                  <span key={tIdx} className={TOKEN_CLASSES[token.kind]}>
                    {token.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

