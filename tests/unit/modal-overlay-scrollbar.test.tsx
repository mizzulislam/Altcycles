// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import * as React from "react";
import { ModalOverlayScrollbar } from "@/components/ui/modal-overlay-scrollbar";

describe("ModalOverlayScrollbar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when content does not overflow", () => {
    function TestComponent() {
      const ref = React.useRef<HTMLDivElement>(null);
      React.useEffect(() => {
        if (ref.current) {
          Object.defineProperty(ref.current, "scrollHeight", { value: 300, configurable: true });
          Object.defineProperty(ref.current, "clientHeight", { value: 300, configurable: true });
          Object.defineProperty(ref.current, "scrollTop", { value: 0, configurable: true });
        }
      }, []);

      return (
        <div ref={ref} style={{ height: 300, overflow: "auto" }}>
          <div>Content</div>
          <ModalOverlayScrollbar containerRef={ref} />
        </div>
      );
    }

    const { container } = render(<TestComponent />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("renders floating thumb when content overflows and auto-hides after scroll", () => {
    function TestComponent() {
      const ref = React.useRef<HTMLDivElement>(null);
      const setRef = React.useCallback((node: HTMLDivElement | null) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (node) {
          Object.defineProperty(node, "scrollHeight", { value: 900, configurable: true });
          Object.defineProperty(node, "clientHeight", { value: 300, configurable: true });
          Object.defineProperty(node, "scrollTop", { value: 0, configurable: true, writable: true });
        }
      }, []);

      return (
        <div ref={setRef} style={{ height: 300, overflow: "auto" }}>
          <div style={{ height: 900 }}>Long Content</div>
          <ModalOverlayScrollbar containerRef={ref} />
        </div>
      );
    }

    let container!: HTMLElement;
    act(() => {
      const rendered = render(<TestComponent />);
      container = rendered.container;
    });

    const scrollableEl = container.firstElementChild as HTMLElement;

    act(() => {
      scrollableEl.dispatchEvent(new Event("scroll"));
    });

    const scrollbarTrack = container.querySelector('[aria-hidden="true"]');
    expect(scrollbarTrack).toBeTruthy();

    // Should be visible (opacity-100) while scrolling
    expect(scrollbarTrack?.className).toContain("opacity-100");

    // Fast-forward 1200ms -> should fade back to opacity-0
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(scrollbarTrack?.className).toContain("opacity-0");
  });
});
