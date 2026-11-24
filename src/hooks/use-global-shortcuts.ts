import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/types/database.types";
import {
  BROWSER_RESERVED_COMBOS,
  getEffectiveShortcuts,
  type NavigationShortcutItem,
} from "@/lib/navigation-shortcuts-registry";
import { recordPageVisit } from "@/lib/navigation-history";

export interface UseGlobalShortcutsOptions {
  currentRole: UserRole;
  onOpenCommandPalette: () => void;
  onOpenShortcutsPanel: () => void;
  isModalOpen?: boolean;
}

/**
 * Mengecek apakah elemen yang sedang menerima fokus adalah input teks yang sedang diedit pengguna
 */
export function isEditableElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  if (tagName === "input") {
    const inputType = (element as HTMLInputElement).type.toLowerCase();
    // Abaikan input non-teks seperti button, checkbox, radio
    return !["button", "checkbox", "radio", "submit", "reset"].includes(inputType);
  }

  if (tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (element.isContentEditable || element.getAttribute("contenteditable") === "true") {
    return true;
  }

  const role = element.getAttribute("role");
  if (role === "textbox" || role === "searchbox" || role === "combobox") {
    return true;
  }

  return false;
}

/**
 * Hook global untuk mendengarkan pintasan keyboard di seluruh aplikasi Altcycles
 * - Mendukung pemicu '/' & 'Ctrl+K' (Command Palette) & '?' (Panel Pintasan)
 * - Mendukung urutan sekuensial "G lalu X" dengan jeda maksimal 1 detik
 * - Mendukung kombinasi modifier (Ctrl+Shift+J, dsb.)
 * - Menjaga 100% tombol native peramban (Ctrl+C, Ctrl+V, Ctrl+T, Ctrl+W, dll) agar tidak pernah dibajak
 * - Mengabaikan event saat modal/dialog aplikasi terbuka atau saat IME composing aktif
 */
export function useGlobalShortcuts({
  currentRole,
  onOpenCommandPalette,
  onOpenShortcutsPanel,
  isModalOpen = false,
}: UseGlobalShortcutsOptions) {
  const navigate = useNavigate();
  const pendingSequenceRef = React.useRef<string | null>(null);
  const sequenceTimerRef = React.useRef<number | null>(null);

  // Cache pintasan efektif role aktif yang diperbarui saat ada event perubahan
  const [effectiveItems, setEffectiveItems] = React.useState<NavigationShortcutItem[]>(() =>
    getEffectiveShortcuts(currentRole),
  );

  React.useEffect(() => {
    setEffectiveItems(getEffectiveShortcuts(currentRole));

    const handleShortcutsUpdated = () => {
      setEffectiveItems(getEffectiveShortcuts(currentRole));
    };

    window.addEventListener("altcycles:shortcuts-updated", handleShortcutsUpdated);
    return () => {
      window.removeEventListener("altcycles:shortcuts-updated", handleShortcutsUpdated);
    };
  }, [currentRole]);

  // Handler eksekusi item navigasi / aksi
  const executeShortcutItem = React.useCallback(
    (item: NavigationShortcutItem) => {
      if (item.actionId === "open_shortcuts" || item.id === "action_open_shortcuts") {
        onOpenShortcutsPanel();
        return;
      }

      if (item.actionId === "open_command_palette" || item.id === "general_open_command_palette") {
        onOpenCommandPalette();
        return;
      }

      if (item.route) {
        recordPageVisit(item.id, currentRole);
        navigate(item.route);
      }
    },
    [currentRole, navigate, onOpenCommandPalette, onOpenShortcutsPanel],
  );

  React.useEffect(() => {
    const clearSequence = () => {
      pendingSequenceRef.current = null;
      if (sequenceTimerRef.current) {
        window.clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 0. Abaikan IME composition (misal input karakter Jepang/Mandarin/Korea) dan key repeat
      if (e.isComposing) {
        return;
      }

      // 1. Jangan jalankan pintasan jika fokus berada di dalam field input/textarea/editable
      if (isEditableElement(e.target)) {
        clearSequence();
        return;
      }

      // 2. Jangan jalankan pintasan jika dialog/modal sedang terbuka
      const isAnyModalActive =
        isModalOpen ||
        Boolean(
          typeof document !== "undefined" &&
            document.querySelector('[role="dialog"], [role="alertdialog"]'),
        );

      if (isAnyModalActive) {
        clearSequence();
        return;
      }

      const key = e.key;
      const lowerKey = key.toLowerCase();
      const hasMod = e.ctrlKey || e.metaKey;
      const hasShift = e.shiftKey;
      const hasAlt = e.altKey;

      // 3. JAGA TOMBOL NATIVE PERAMBAN:
      // Jika kombinasi adalah tombol bawaan browser (Ctrl+C, Ctrl+V, Ctrl+T, Ctrl+W, Ctrl+R, F5, F12, dll),
      // JANGAN PERNAH panggil e.preventDefault() dan biarkan peramban mengeksekusi fungsinya secara alami.
      const pressedCombo = [
        hasMod ? "mod" : null,
        hasAlt ? "alt" : null,
        hasShift ? "shift" : null,
        lowerKey,
      ]
        .filter(Boolean)
        .join("+");

      if (BROWSER_RESERVED_COMBOS.has(pressedCombo)) {
        clearSequence();
        return;
      }

      // 4. Tangani tombol pemicu Command Palette: '/' tanpa modifier ATAU 'Ctrl+K' / 'Cmd+K'
      const isPaletteTrigger =
        (!hasMod && !hasAlt && !hasShift && key === "/") ||
        (hasMod && !hasAlt && !hasShift && lowerKey === "k");

      if (isPaletteTrigger) {
        e.preventDefault();
        clearSequence();
        onOpenCommandPalette();
        return;
      }

      // 5. Tangani tombol '?' (Shift + / pada layout standar, atau '?' di layout internasional) untuk membuka panel pintasan
      const isShortcutsPanelTrigger =
        !hasMod && !hasAlt && (key === "?" || (hasShift && (e.code === "Slash" || key === "?")));

      if (isShortcutsPanelTrigger) {
        e.preventDefault();
        clearSequence();
        onOpenShortcutsPanel();
        return;
      }

      // 6. Tangani pintasan berurutan "G lalu X" (Sequence)
      if (pendingSequenceRef.current === "g") {
        if (e.repeat) return; // Abaikan jika tombol ditekan berulang (held down)
        e.preventDefault();
        const secondKey = lowerKey;
        clearSequence();

        // Cari item dengan keys: ["g", secondKey]
        const matchedSequenceItem = effectiveItems.find((it) => {
          const keys = it.defaultKeys;
          return (
            keys.length === 2 &&
            keys[0]?.toLowerCase() === "g" &&
            keys[1]?.toLowerCase() === secondKey
          );
        });

        if (matchedSequenceItem) {
          executeShortcutItem(matchedSequenceItem);
        }
        return;
      }

      // Jika tombol 'g' ditekan tanpa modifier (dan bukan repeat), aktifkan jeda urutan sekuensial (~1 detik)
      if (!hasMod && !hasAlt && !hasShift && lowerKey === "g") {
        if (e.repeat) return;
        pendingSequenceRef.current = "g";
        if (sequenceTimerRef.current) {
          window.clearTimeout(sequenceTimerRef.current);
        }
        sequenceTimerRef.current = window.setTimeout(() => {
          pendingSequenceRef.current = null;
          sequenceTimerRef.current = null;
        }, 1000);
        return;
      }

      // 7. Tangani kombinasi tombol dengan Modifier (misalnya Ctrl+Shift+J)
      if (hasMod) {
        const matchedModifierItem = effectiveItems.find((it) => {
          const keys = it.defaultKeys;
          if (keys.length === 0) return false;

          const expectsMod = keys.includes("mod") || keys.includes("ctrl") || keys.includes("cmd");
          const expectsShift = keys.includes("shift");
          const expectsAlt = keys.includes("alt");

          if (expectsMod !== hasMod) return false;
          if (expectsShift !== hasShift) return false;
          if (expectsAlt !== hasAlt) return false;

          // Cari tombol non-modifier
          const letterKey = keys.find(
            (k) => !["mod", "ctrl", "cmd", "shift", "alt"].includes(k.toLowerCase()),
          );
          return letterKey && letterKey.toLowerCase() === lowerKey;
        });

        if (matchedModifierItem) {
          e.preventDefault();
          clearSequence();
          executeShortcutItem(matchedModifierItem);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", clearSequence);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", clearSequence);
      clearSequence();
    };
  }, [effectiveItems, executeShortcutItem, isModalOpen, onOpenCommandPalette, onOpenShortcutsPanel]);
}
