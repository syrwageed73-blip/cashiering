import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn, getDirection } from "./utils";
import { useIsMobile, usePrefersReducedMotion } from "./hooks";

export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Render a divider after this item. */
  dividerAfter?: boolean;
}

/** Props the consumer must spread onto their trigger element. */
export interface MenuTriggerProps {
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
  onKeyDown: (e: ReactKeyboardEvent) => void;
  ref: (node: HTMLElement | null) => void;
}

export interface MenuProps {
  items: MenuItem[];
  /**
   * Render prop for the trigger. Spread `triggerProps` onto your button and keep
   * full control over its styling/icon. `triggerProps.ref` accepts the element.
   */
  trigger: (triggerProps: MenuTriggerProps, open: boolean) => ReactNode;
  ariaLabel?: string;
  /** Alignment of the popover relative to the trigger (logical: start/end). */
  align?: "start" | "end";
  className?: string;
}

/**
 * Accessible actions dropdown menu. Glass popover, RTL-aware placement,
 * keyboard navigation (Arrow/Home/End/Enter/Esc), click-outside, mobile sheet.
 */
export function Menu({ items, trigger, ariaLabel, align = "end" }: MenuProps): ReactNode {
  const menuId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const [coords, setCoords] = useState<{ top: number; start: number; width: number; above: boolean }>({
    top: 0,
    start: 0,
    width: 220,
    above: false,
  });
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || isMobile) return;
    const trig = triggerRef.current.getBoundingClientRect();
    const estHeight = Math.min(items.length * 44 + 16, 360);
    const spaceBelow = window.innerHeight - trig.bottom;
    const above = spaceBelow < estHeight && trig.top > estHeight;
    const top = above ? trig.top - estHeight - 4 : trig.bottom + 4;
    const dir = getDirection(triggerRef.current);
    const width = 220;
    const startEdge = dir === "rtl" ? window.innerWidth - trig.right : trig.left;
    const endEdge = dir === "rtl" ? window.innerWidth - trig.left : trig.right;
    const preferStart = align === "start";
    const start = preferStart ? startEdge : endEdge - width;
    const clamped = Math.max(8, Math.min(start, window.innerWidth - width - 8));
    setCoords({ top, start: clamped, width, above });
  }, [open, items.length, align, isMobile]);

  useEffect(() => {
    if (!open) return;
    setActive(items.findIndex((it) => !it.disabled));
    const onDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, items]);

  const onTriggerKey = (e: ReactKeyboardEvent): void => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e: ReactKeyboardEvent): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      for (let i = active + 1; i < items.length; i += 1) {
        if (!items[i].disabled) {
          setActive(i);
          break;
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      for (let i = active - 1; i >= 0; i -= 1) {
        if (!items[i].disabled) {
          setActive(i);
          break;
        }
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(items.findIndex((it) => !it.disabled));
    } else if (e.key === "End") {
      e.preventDefault();
      for (let i = items.length - 1; i >= 0; i -= 1) {
        if (!items[i].disabled) {
          setActive(i);
          break;
        }
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[active];
      if (item && !item.disabled) {
        item.onSelect?.();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
  };

  const transition = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 34 };

  const panel = (style: CSSProperties): ReactNode => (
    <div ref={popoverRef} role="menu" id={menuId} aria-label={ariaLabel} style={style} className={cn("glass-card-strong rounded-2xl border border-white/60 p-1.5 shadow-2xl z-[9000]")}>
      <div role="presentation" onKeyDown={onListKey} tabIndex={-1}>
        {items.map((item, idx) => (
          <div key={item.key}>
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              data-active={idx === active}
              onMouseEnter={() => !item.disabled && setActive(idx)}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect?.();
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={cn(
                "ui-option ui-press w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-start cursor-pointer",
                item.danger ? "text-rose-600 hover:bg-rose-50" : "text-gray-700",
                item.disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span className="flex-1 truncate">{item.label}</span>
            </button>
            {item.dividerAfter && <div className="h-px bg-slate-100 my-1 mx-1" role="separator" />}
          </div>
        ))}
      </div>
    </div>
  );

  const triggerProps: MenuTriggerProps = {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": menuId,
    onClick: () => setOpen((o) => !o),
    onKeyDown: onTriggerKey,
    ref: (node) => {
      triggerRef.current = node;
    },
  };

  return (
    <>
      {trigger(triggerProps, open)}
      <AnimatePresence>
        {open &&
          (isMobile ? (
            <>
              <motion.div
                className="fixed inset-0 z-[8999] modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={transition}
                className="fixed inset-x-2 bottom-2 z-[9000]"
              >
                {panel({ width: "100%" })}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: coords.above ? -6 : 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.above ? -6 : 6, scale: 0.98 }}
              transition={transition}
              style={{ position: "fixed", top: coords.top, insetInlineStart: coords.start, width: coords.width }}
            >
              {panel({})}
            </motion.div>
          ))}
      </AnimatePresence>
    </>
  );
}
