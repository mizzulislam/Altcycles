import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * OverlayPageScrollbar
 * Scrollbar kustom fixed-position yang mengambang di tepi paling kanan layar (z-index di atas header),
 * tanpa memakan lebar dokumen sehingga tidak menyebabkan layout shift saat berpindah halaman pendek/panjang.
 */
export function OverlayPageScrollbar() {
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragStartY = React.useRef<number>(0);
  const dragStartScrollY = React.useRef<number>(0);
  const hideTimeoutRef = React.useRef<number | null>(null);

  const updateScroll = React.useCallback(() => {
    const docEl = document.documentElement;
    const scrollHeight = Math.max(
      docEl.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight,
    );
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;

    if (maxScroll <= 2) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    // Hitung ukuran thumb proporsional (min 36px, max clientHeight * 0.8)
    const calculatedThumbHeight = Math.max(
      36,
      Math.min(clientHeight * 0.8, (clientHeight / scrollHeight) * clientHeight),
    );
    setThumbHeight(calculatedThumbHeight);

    const currentScrollY = window.scrollY || docEl.scrollTop || 0;
    const progress = Math.min(1, Math.max(0, currentScrollY / maxScroll));
    setScrollProgress(progress);

    // Tampilkan saat sedang scroll, lalu sembunyikan kembali setelah jeda
    setIsScrolling(true);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 1200);
  }, []);

  React.useEffect(() => {
    updateScroll();

    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);

    const observer = new ResizeObserver(() => {
      updateScroll();
    });

    observer.observe(document.documentElement);
    if (document.body) {
      observer.observe(document.body);
    }

    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      observer.disconnect();
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [updateScroll]);

  // Handler drag scrollbar thumb
  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScrollY.current = window.scrollY || document.documentElement.scrollTop;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - dragStartY.current;
      const docEl = document.documentElement;
      const scrollHeight = Math.max(
        docEl.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight,
      );
      const clientHeight = window.innerHeight;
      const trackAvailableHeight = clientHeight - thumbHeight;

      if (trackAvailableHeight <= 0) return;

      const scrollDelta = (deltaY / trackAvailableHeight) * (scrollHeight - clientHeight);
      window.scrollTo({
        top: Math.max(0, Math.min(scrollHeight - clientHeight, dragStartScrollY.current + scrollDelta)),
        behavior: "instant" as ScrollBehavior,
      });
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
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const docEl = document.documentElement;
    const scrollHeight = Math.max(
      docEl.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight,
    );
    const clientHeight = window.innerHeight;
    const trackAvailableHeight = clientHeight - thumbHeight;

    if (trackAvailableHeight <= 0) return;

    const targetThumbTop = clickY - thumbHeight / 2;
    const progress = Math.max(0, Math.min(1, targetThumbTop / trackAvailableHeight));
    window.scrollTo({
      top: progress * (scrollHeight - clientHeight),
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  const trackHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const availableTrackHeight = Math.max(0, trackHeight - thumbHeight);
  const thumbTop = scrollProgress * availableTrackHeight;

  const showActive = isHovered || isDragging || isScrolling;

  return (
    <div
      ref={trackRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTrackClick}
      className={cn(
        "fixed top-0 right-0 bottom-0 z-[60] w-2.5 transition-opacity duration-200 select-none",
        showActive ? "opacity-100" : "opacity-0 hover:opacity-100",
      )}
      style={{ pointerEvents: showActive ? "auto" : "none" }}
      aria-hidden="true"
    >
      <div
        onMouseDown={handleThumbMouseDown}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate3d(0, ${thumbTop}px, 0)`,
          height: `${thumbHeight}px`,
        }}
        className={cn(
          "absolute right-0.5 w-1.5 rounded-full transition-[background-color,width] cursor-pointer",
          isDragging || isHovered
            ? "w-2 bg-primary/70 dark:bg-sky-400/80 shadow-xs"
            : "bg-muted-foreground/40 hover:bg-muted-foreground/70",
        )}
      />
    </div>
  );
}
