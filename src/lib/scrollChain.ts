import { useCallback, useEffect, useRef, type RefCallback } from "react";

const EDGE = 2;
const WHEEL_BOOST = 2.8;

function atScrollBoundary(el: HTMLElement, delta: number): boolean {
  const top = el.scrollTop <= EDGE;
  const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - EDGE;
  return (delta < 0 && top) || (delta > 0 && bottom);
}

function wheelDeltaPx(event: WheelEvent): number {
  let dy = event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 40;
  else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= window.innerHeight * 0.85;
  return dy * WHEEL_BOOST;
}

/**
 * When a nested scroller is already at the top or bottom, pass further
 * wheel/touch movement to the page so users can reach content below/above.
 */
export function useScrollChain<T extends HTMLElement>(): RefCallback<T> {
  const cleanupRef = useRef<(() => void) | null>(null);

  const setRef = useCallback((node: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if (!atScrollBoundary(node, event.deltaY)) return;
      event.preventDefault();
      window.scrollBy({ top: wheelDeltaPx(event), left: 0 });
    };

    let lastY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      lastY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (lastY == null) return;
      const y = event.touches[0]?.clientY ?? lastY;
      const delta = (lastY - y) * 1.6;
      lastY = y;
      if (!atScrollBoundary(node, delta)) return;
      if (event.cancelable) event.preventDefault();
      window.scrollBy({ top: delta, left: 0 });
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });

    cleanupRef.current = () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  return setRef;
}
