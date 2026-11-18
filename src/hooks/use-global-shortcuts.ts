import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { UserRole } from "@/types/database.types";
import {
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

  if (element.getAttribute("role") === "textbox") {
    return true;
  }

  return false;
}

/**
 * Hook global untuk mendengarkan pintasan keyboard di seluruh aplikasi Altcycles
 * - Mendukung pemicu tunggal '/' (Command Palette) & '?' (Panel Pintasan)
 * - Mendukung urutan sekuensial "G lalu X" dengan jeda maksimal 1 detik
 * - Mendukung kombinasi modifier (Ctrl+Shift+J, dsb.)
 * - Menghormati role pengguna aktif dan override kustom dari Super Admin
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
      // 1. Jangan jalankan pintasan jika fokus berada di dalam field input/textarea/editable
      if (isEditableElement(e.target)) {
        clearSequence();
        return;
      }

      // 2. Jangan jalankan pintasan jika modal sedang terbuka (kecuali escape)
      if (isModalOpen) {
        clearSequence();
        return;
      }

      const key = e.key;
      const lowerKey = key.toLowerCase();
      const hasMod = e.ctrlKey || e.metaKey;
      const hasShift = e.shiftKey;
      const hasAlt = e.altKey;

      // 3. Tangani tombol pemicu '/' untuk Command Palette
      if (!hasMod && !hasAlt && !hasShift && key === "/") {
        e.preventDefault();
        clearSequence();
        onOpenCommandPalette();
        return;
      }

      // 4. Tangani tombol '?' (Shift + /) untuk membuka panel pintasan keyboard
      if (!hasMod && !hasAlt && (key === "?" || (hasShift && key === "/"))) {
        e.preventDefault();
        clearSequence();
        onOpenShortcutsPanel();
        return;
      }

      // 5. Tangani pintasan berurutan "G lalu X" (Sequence)
      if (pendingSequenceRef.current === "g") {
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

      // Jika tombol 'g' ditekan tanpa modifier, aktifkan jeda urutan sekuensial (~1 detik)
      if (!hasMod && !hasAlt && !hasShift && lowerKey === "g") {
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

      // 6. Tangani kombinasi tombol dengan Modifier (misalnya Ctrl+Shift+J atau Cmd+Shift+P)
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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearSequence();
    };
  }, [effectiveItems, executeShortcutItem, isModalOpen, onOpenCommandPalette, onOpenShortcutsPanel]);
}
