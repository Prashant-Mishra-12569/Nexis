import { useEffect, useRef } from "react";

/**
 * Animated neon cursor that follows the mouse — rings + dot
 * Hidden on touch devices via CSS.
 */
export function NexisCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    const onHover = () => cursor.classList.add("hover");
    const onLeave = () => cursor.classList.remove("hover");

    // Smooth follow for outer ring
    let raf: number;
    const tick = () => {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    document.addEventListener("mousemove", onMove);
    const interactives = document.querySelectorAll("a, button, [role='button'], input, textarea, select");
    interactives.forEach((el) => {
      el.addEventListener("mouseenter", onHover);
      el.addEventListener("mouseleave", onLeave);
    });

    // Re-observe for dynamic elements
    const observer = new MutationObserver(() => {
      const els = document.querySelectorAll("a, button, [role='button'], input, textarea, select");
      els.forEach((el) => {
        el.removeEventListener("mouseenter", onHover);
        el.removeEventListener("mouseleave", onLeave);
        el.addEventListener("mouseenter", onHover);
        el.addEventListener("mouseleave", onLeave);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      interactives.forEach((el) => {
        el.removeEventListener("mouseenter", onHover);
        el.removeEventListener("mouseleave", onLeave);
      });
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="nexis-cursor" />
      <div ref={dotRef} className="nexis-cursor-dot" />
    </>
  );
}
