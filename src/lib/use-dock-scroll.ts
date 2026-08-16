import { useEffect, useState, type RefObject } from "react";

/** Hide dock on scroll-down, show on scroll-up. Hide when the soft keyboard opens. */
export function useDockScroll(
  scrollRef: RefObject<HTMLElement | null>,
  opts?: { threshold?: number; keyboardMinShrink?: number },
) {
  const threshold = opts?.threshold ?? 8;
  const keyboardMinShrink = opts?.keyboardMinShrink ?? 120;
  const [dockHidden, setDockHidden] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastY = el.scrollTop;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = el.scrollTop;
        const dy = y - lastY;
        if (y < 24) setDockHidden(false);
        else if (dy > threshold) setDockHidden(true);
        else if (dy < -threshold) setDockHidden(false);
        lastY = y;
        ticking = false;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, threshold]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const check = () => {
      setKeyboardOpen(window.innerHeight - vv.height > keyboardMinShrink);
    };
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    check();
    return () => {
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
    };
  }, [keyboardMinShrink]);

  return { dockHidden, keyboardOpen };
}
