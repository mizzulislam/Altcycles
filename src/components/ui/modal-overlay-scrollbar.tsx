import * as React from "react";
import { cn } from "@/lib/utils";

export interface ModalOverlayScrollbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  topInset?: number;
  bottomInset?: number;
  rightInset?: number;
}

/**
 * ModalOverlayScrollbar
 * Scrollbar kustom melayang untuk dialog modal yang menyembunyikan diri (auto-hide)
 * saat tidak sedang digeser, meniru perilaku OverlayPageScrollbar pada halaman utama.
 * Bebas dari tombol panah segitiga klasik OS (▲ dan ▼) pada Windows Chromium.
 */
export function ModalOverlayScrollbar({
  containerRef,
  className,
  topInset = 12,
  bottomInset = 12,
  rightInset = 4,
}: ModalOverlayScrollbarProps) {
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const [scrollTop, setScrollTop] = React.useState(0);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragStartY = React.useRef<number>(0);
  const dragStartScrollTop = React.useRef<number>(0);
  const hideTimeoutRef = React.useRef<number | null>(null);

  const updateScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 4) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    setScrollTop(el.scrollTop);

    const availableTrackHeight = Math.max(0, clientHeight - topInset - bottomInset);
    const calculatedThumbHeight = Math.max(
      28,
      Math.min(availableTrackHeight * 0.7, (clientHeight / scrollHeight) * availableTrackHeight),
    );
    setThumbHeight(calculatedThumbHeight);

    const currentScrollTop = el.scrollTop;
    const progress = Math.min(1, Math.max(0, currentScrollTop / maxScroll));
    setScrollProgress(progress);

    // Tampilkan saat sedang scroll, lalu sembunyikan kembali setelah jeda 1.1 detik
    setIsScrolling(true);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 1100);
  }, [containerRef, topInset, bottomInset]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScroll();

    el.addEventListener("scroll", updateScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateScroll();
      });
      resizeObserver.observe(el);
    }

    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        updateScroll();
      });
      mutationObserver.observe(el, { childList: true, subtree: true });
    }

    return () => {
      el.removeEventListener("scroll", updateScroll);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [containerRef, updateScroll]);

  // Handler drag thumb dengan pointer
  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;

    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = el.scrollTop;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - dragStartY.current;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      const availableTrackHeight = Math.max(0, clientHeight - topInset - bottomInset);
      const trackTravel = availableTrackHeight - thumbHeight;

      if (trackTravel <= 0) return;

      const scrollDelta = (deltaY / trackTravel) * (scrollHeight - clientHeight);
      el.scrollTop = Math.max(0, Math.min(scrollHeight - clientHeight, dragStartScrollTop.current + scrollDelta));
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Handler klik pada track untuk melompat ke posisi scroll
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const availableTrackHeight = Math.max(0, clientHeight - topInset - bottomInset);
    const trackTravel = availableTrackHeight - thumbHeight;

    if (trackTravel <= 0) return;

    const targetThumbTop = clickY - thumbHeight / 2;
    const progress = Math.max(0, Math.min(1, targetThumbTop / trackTravel));
    el.scrollTo({
      top: progress * (scrollHeight - clientHeight),
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  const el = containerRef.current;
  const clientHeight = el?.clientHeight ?? 400;
  const availableTrackHeight = Math.max(0, clientHeight - topInset - bottomInset);
  const trackTravel = Math.max(0, availableTrackHeight - thumbHeight);
  const thumbRelativeTop = topInset + scrollProgress * trackTravel;

  const showActive = isHovered || isDragging || isScrolling;

  return (
    <div
      ref={trackRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTrackClick}
      className={cn(
        "absolute top-0 bottom-0 z-50 w-2.5 transition-opacity duration-300 select-none",
        showActive ? "opacity-100" : "opacity-0 hover:opacity-100",
        className,
      )}
      style={{
        right: `${rightInset}px`,
        transform: `translate3d(0, ${scrollTop}px, 0)`,
        height: `${clientHeight}px`,
        pointerEvents: showActive ? "auto" : "none",
      }}
      aria-hidden="true"
    >
      <div
        onMouseDown={handleThumbMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate3d(0, ${thumbRelativeTop}px, 0)`,
          height: `${thumbHeight}px`,
        }}
        className={cn(
          "absolute right-0.5 w-1.5 rounded-full cursor-pointer",
          isDragging
            ? "w-2 bg-primary/70 dark:bg-sky-400/80 shadow-xs transition-none"
            : "transition-[transform,background-color,width] duration-300 ease-out",
          isHovered && !isDragging
            ? "w-2 bg-primary/70 dark:bg-sky-400/80 shadow-xs"
            : !isDragging && "bg-muted-foreground/35 hover:bg-muted-foreground/65 dark:bg-white/20 dark:hover:bg-white/40",
        )}
      />
    </div>
  );
}
