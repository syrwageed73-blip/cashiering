import { cloneElement, isValidElement, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "./utils";
import { usePrefersReducedMotion } from "./hooks";

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  /** Preferred logical placement; auto-flips to stay in viewport. */
  side?: "top" | "bottom" | "start" | "end";
  delay?: number;
  className?: string;
}

/**
 * Lightweight glass tooltip with auto-flip placement. Shows on hover + focus,
 * respects reduced motion, RTL-aware positioning via logical insets.
 */
export function Tooltip({ content, children, side = "top", delay = 250, className }: TooltipProps): ReactNode {
  const tipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState(side);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timer = useRef<number | null>(null);
  const reduced = usePrefersReducedMotion();

  const show = (): void => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = (): void => {
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const trig = triggerRef.current.getBoundingClientRect();
    const TIP_W = 160;
    const TIP_H = 32;
    const gap = 8;
    let p = side;
    let top = 0;
    const cx = trig.left + trig.width / 2;
    const cy = trig.top + trig.height / 2;
    // Auto-flip when out of viewport.
    if (side === "top" && trig.top < TIP_H + gap) p = "bottom";
    if (side === "bottom" && window.innerHeight - trig.bottom < TIP_H + gap) p = "top";
    if (side === "start" && trig.left < TIP_W + gap) p = "end";
    if (side === "end" && window.innerWidth - trig.right < TIP_W + gap) p = "start";
    setPlacement(p);
    switch (p) {
      case "top":
        top = trig.top - TIP_H - gap;
        setCoords({ top, left: cx - TIP_W / 2 });
        break;
      case "bottom":
        top = trig.bottom + gap;
        setCoords({ top, left: cx - TIP_W / 2 });
        break;
      case "start":
        top = cy - TIP_H / 2;
        setCoords({ top, left: trig.left - TIP_W - gap });
        break;
      case "end":
        top = cy - TIP_H / 2;
        setCoords({ top, left: trig.right + gap });
        break;
    }
  }, [open, side]);

  const triggerProps = {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
    },
    "aria-describedby": open ? tipId : undefined,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  };

  const child = isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, triggerProps) : children;

  const transition = reduced ? { duration: 0 } : { duration: 0.15 };

  return (
    <>
      {child}
      <AnimatePresence>
        {open && (
          <motion.span
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={transition}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: 160, pointerEvents: "none", zIndex: 9500 }}
            className={cn("ui-tooltip text-center", placement === "top" || placement === "bottom" ? "" : "text-start", className)}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}
