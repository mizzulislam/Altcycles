import * as React from "react";
import { createPortal } from "react-dom";
import { InfoIcon, XIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export interface GameDialogPayload {
  id?: string;
  title: React.ReactNode;
  description: React.ReactNode;
  triggerRef?: React.RefObject<HTMLButtonElement | null> | null;
}

interface GameDialogContextValue {
  openGameDialog: (payload: GameDialogPayload) => void;
  closeGameDialog: () => void;
  activePayload: GameDialogPayload | null;
  isOpen: boolean;
}

const GameDialogContext = React.createContext<GameDialogContextValue | null>(null);

export function useGameDialog(): GameDialogContextValue {
  const ctx = React.useContext(GameDialogContext);
  if (!ctx) {
    // Safe fallback jika digunakan di luar provider (misalnya unit test terisolasi)
    return {
      openGameDialog: () => {},
      closeGameDialog: () => {},
      isOpen: false,
      activePayload: null,
    };
  }
  return ctx;
}

export function GameDialogProvider({ children }: { children: React.ReactNode }) {
  const [activePayload, setActivePayload] = React.useState<GameDialogPayload | null>(null);
  const [isRendered, setIsRendered] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);
  const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const closeGameDialog = React.useCallback(() => {
    if (!isRendered || isExiting) return;
    setIsExiting(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setIsRendered(false);
      setIsExiting(false);
      const prevTrigger = lastTriggerRef.current;
      setActivePayload(null);
      // Restore focus to triggering info icon
      if (prevTrigger && typeof prevTrigger.focus === "function") {
        try {
          prevTrigger.focus();
        } catch {
          // ignore focus error
        }
      }
    }, 180);
  }, [isRendered, isExiting]);

  const openGameDialog = React.useCallback((payload: GameDialogPayload) => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (payload.triggerRef?.current) {
      lastTriggerRef.current = payload.triggerRef.current;
    }
    setActivePayload(payload);
    setIsExiting(false);
    setIsRendered(true);
  }, []);

  const value = React.useMemo<GameDialogContextValue>(
    () => ({
      openGameDialog,
      closeGameDialog,
      activePayload,
      isOpen: isRendered && !isExiting,
    }),
    [openGameDialog, closeGameDialog, activePayload, isRendered, isExiting],
  );

  return (
    <GameDialogContext.Provider value={value}>
      {children}
      {isRendered && activePayload ? (
        <GameDialogView
          payload={activePayload}
          isExiting={isExiting}
          onClose={closeGameDialog}
        />
      ) : null}
    </GameDialogContext.Provider>
  );
}

interface GameDialogViewProps {
  payload: GameDialogPayload;
  isExiting: boolean;
  onClose: () => void;
}

function GameDialogView({ payload, isExiting, onClose }: GameDialogViewProps) {
  const { t } = useLanguage();
  const [isEntering, setIsEntering] = React.useState(true);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  // Entrance animation trigger
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsEntering(false);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Focus trap and keyboard handling
  React.useEffect(() => {
    // Focus dialog on open
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Typewriter effect
  const fullText = React.useMemo(() => {
    if (typeof payload.description === "string") return payload.description;
    return "";
  }, [payload.description]);

  const [charCount, setCharCount] = React.useState(() =>
    prefersReducedMotion || !fullText ? fullText.length : 0,
  );

  React.useEffect(() => {
    if (prefersReducedMotion || !fullText) {
      setCharCount(fullText.length);
      return;
    }
    setCharCount(0);
    const interval = setInterval(() => {
      setCharCount((prev) => {
        if (prev >= fullText.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 14);

    return () => clearInterval(interval);
  }, [fullText, prefersReducedMotion]);

  const handleSkipTypewriter = () => {
    if (fullText && charCount < fullText.length) {
      setCharCount(fullText.length);
    }
  };

  if (typeof document === "undefined") return null;

  const isMotionActive = !prefersReducedMotion;
  const isTransitioningOut = isExiting;
  const isTransitioningIn = isEntering;

  const overlayOpacity = isTransitioningOut || isTransitioningIn ? 0 : 1;
  const dialogOpacity = isTransitioningOut || isTransitioningIn ? 0 : 1;
  const dialogTranslate =
    isMotionActive && (isTransitioningOut || isTransitioningIn)
      ? "translate(-50%, 16px)"
      : "translate(-50%, 0)";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none"
      aria-hidden={isExiting}
    >
      {/* Overlay Tipis Tanpa Blur Berat */}
      <div
        className="fixed inset-0 bg-black/45 dark:bg-black/65 pointer-events-auto transition-opacity"
        style={{
          transitionDuration: isTransitioningOut ? "180ms" : "220ms",
          transitionTimingFunction: isTransitioningOut ? "ease-in" : "ease-out",
          opacity: overlayOpacity,
        }}
        onClick={onClose}
      />

      {/* Kotak Dialog Bergaya Gim (HUD Bottom Dialog) */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-dialog-title"
        aria-describedby="game-dialog-desc"
        tabIndex={-1}
        onClick={handleSkipTypewriter}
        className="fixed bottom-6 sm:bottom-8 left-1/2 pointer-events-auto w-[calc(100%-2rem)] max-w-[720px] rounded-xs border border-border/90 dark:border-border/80 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xs p-5 sm:p-6 pt-7 sm:pt-8 focus-visible:outline-none"
        style={{
          transition: isMotionActive
            ? isTransitioningOut
              ? "transform 180ms ease-in, opacity 180ms ease-in"
              : "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)"
            : "opacity 150ms ease",
          transform: dialogTranslate,
          opacity: dialogOpacity,
        }}
      >
        {/* Tab Label Menempel di Tepi Atas Kiri Bingkai */}
        <div className="absolute -top-3.5 left-4 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-xs bg-card border border-border/90 dark:border-border/80 text-xs font-bold text-foreground shadow-xs select-none">
          <InfoIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span
            id="game-dialog-title"
            className="truncate max-w-[280px] sm:max-w-[500px]"
          >
            {payload.title}
          </span>
        </div>

        {/* Tombol Tutup (X) di Sudut Kanan Atas - Area Sentuh >= 40px */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={t("action.close", "Tutup")}
          className="absolute top-1.5 right-1.5 size-10 rounded-xs flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        >
          <XIcon className="size-4 shrink-0" aria-hidden="true" />
        </button>

        {/* Teks Deskripsi (Apa Adanya + Typewriter + Blinking Caret Altvira) */}
        <div
          id="game-dialog-desc"
          className="text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-[38vh] overflow-y-auto pr-6 no-scrollbar select-text cursor-default"
        >
          {fullText ? (
            <span>
              {fullText.slice(0, charCount)}
              <span
                className="inline-block ml-0.5 font-bold text-primary dark:text-sky-400 animate-pulse select-none"
                aria-hidden="true"
              >
                |
              </span>
            </span>
          ) : (
            <span>
              {payload.description}
              <span
                className="inline-block ml-0.5 font-bold text-primary dark:text-sky-400 animate-pulse select-none"
                aria-hidden="true"
              >
                |
              </span>
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
