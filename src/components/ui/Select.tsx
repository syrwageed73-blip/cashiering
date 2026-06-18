import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { cn, getDirection } from "./utils";
import {
  useControllableState,
  useIsMobile,
  usePrefersReducedMotion,
} from "./hooks";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  /** Optional group header — options sharing a group render under one label. */
  group?: string;
}

export interface SelectProps {
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: ReactNode;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
  /** Optional stable id for the trigger (E2E / external label `htmlFor`). */
  id?: string;
}

const heightBySize = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-13 text-base py-3.5",
} as const;

/** Build groups from flat options while preserving order. */
function groupOptions(options: SelectOption[]): { name?: string; items: SelectOption[] }[] {
  const hasGroup = options.some((o) => o.group);
  if (!hasGroup) return [{ items: options }];
  const map = new Map<string | undefined, SelectOption[]>();
  for (const o of options) {
    const key = o.group;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  return Array.from(map, ([name, items]) => ({ name, items }));
}

/**
 * Accessible custom single-select (NOT native <select>). Full listbox keyboard
 * model: ArrowUp/Down, Home/End, type-ahead, Enter, Esc, focus restore.
 * Popover clamps to the viewport; on mobile becomes a full-width glass sheet.
 */
export function Select({
  value,
  defaultValue = null,
  onChange,
  options,
  placeholder,
  label,
  hint,
  error,
  required,
  disabled,
  size = "md",
  className,
  ariaLabel,
  id,
}: SelectProps): ReactNode {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('common.ui.selectPlaceholder');
  const listboxId = useId();
  const autoTriggerId = useId();
  const triggerId = id ?? autoTriggerId;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const [current, setCurrent] = useControllableState<string | null>(
    value === undefined ? undefined : value,
    defaultValue,
    (v) => onChange?.(v),
  );

  const selectable = useMemo(() => options.filter((o) => !o.disabled), [options]);
  const selectedOption = options.find((o) => o.value === current) ?? null;

  const groups = useMemo(() => groupOptions(options), [options]);

  // Popover positioning (fixed, viewport-clamped).
  const [coords, setCoords] = useState<{ top: number; start: number; width: number; above: boolean }>(
    { top: 0, start: 0, width: 0, above: false },
  );
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || isMobile) return;
    const trig = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const estHeight = Math.min(selectable.length * 40 + 16, 360) + 12;
    const spaceBelow = window.innerHeight - trig.bottom;
    const above = spaceBelow < estHeight && trig.top > estHeight;
    const top = above ? trig.top - estHeight - 4 : trig.bottom + 4;
    const dir = getDirection(triggerRef.current);
    const start = dir === "rtl" ? window.innerWidth - trig.right : trig.left;
    // Clamp so the popover stays on-screen.
    const width = Math.max(trig.width, 220);
    const maxStart = window.innerWidth - width - margin;
    const clampedStart = Math.max(margin, Math.min(start, maxStart));
    setCoords({ top, start: clampedStart, width, above });
  }, [open, selectable.length, isMobile]);

  // Outside click to close (manual handler covers both trigger + fixed popover).
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (
        popoverRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reset active index when opening.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === current);
    setActiveIndex(idx >= 0 ? idx : selectable.findIndex((o) => !o.disabled));
    // Focus the list after open.
    const t = window.setTimeout(() => listRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll active option into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // Esc closes and restores focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const choose = (opt: SelectOption): void => {
    if (opt.disabled) return;
    setCurrent(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent): void => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const list = selectable;
    const currentSel = list.findIndex((o) => o.value === options[activeIndex]?.value);
    let idx = currentSel < 0 ? -1 : currentSel;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        idx = Math.min(list.length - 1, idx + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        idx = Math.max(0, idx - 1);
        break;
      case "Home":
        e.preventDefault();
        idx = 0;
        break;
      case "End":
        e.preventDefault();
        idx = list.length - 1;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (list[idx]) choose(list[idx]);
        return;
      default:
        // Type-ahead: single char jumps to first option whose label starts with it.
        if (e.key.length === 1) {
          const ch = e.key.toLowerCase();
          const next = list.findIndex(
            (o) =>
              typeof o.label === "string" &&
              o.label.toLowerCase().startsWith(ch),
          );
          if (next >= 0) idx = next;
        }
    }
    if (idx >= 0) {
      const realIdx = options.indexOf(list[idx]);
      setActiveIndex(realIdx);
    }
  };

  const transition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 500, damping: 34 };

  const popover = (style: CSSProperties): ReactNode => (
    <div
      ref={popoverRef}
      role="presentation"
      style={style}
      className="glass-card-strong rounded-2xl border border-white/60 p-1.5 shadow-2xl z-[9000]"
    >
      <ul
        ref={listRef}
        tabIndex={0}
        role="listbox"
        id={listboxId}
        aria-labelledby={label ? triggerId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        className="ui-popover-scroll outline-none"
      >
        {groups.map((group) => (
          <li key={group.name ?? "__nogroup"} role="presentation">
            {group.name && (
              <div className="px-3 pt-2 pb-1 text-[11px] font-extrabold uppercase tracking-wide text-indigo-500/80">
                {group.name}
              </div>
            )}
            <ul role="presentation">
              {group.items.map((opt) => {
                const realIdx = options.indexOf(opt);
                const isActive = realIdx === activeIndex;
                const isSelected = opt.value === current;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    id={`${listboxId}-opt-${realIdx}`}
                    data-index={realIdx}
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled || undefined}
                    data-active={isActive}
                    onMouseEnter={() => !opt.disabled && setActiveIndex(realIdx)}
                    onClick={() => choose(opt)}
                    className={cn(
                      "ui-option flex items-center justify-between gap-2 px-3 rounded-xl cursor-pointer text-sm font-semibold",
                      size === "sm" ? "py-1.5" : "py-2.5",
                      opt.disabled && "opacity-40 cursor-not-allowed",
                      isSelected ? "text-indigo-700" : "text-gray-700",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" strokeWidth={3} />}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label
          id={`${triggerId}-lbl`}
          className="block text-sm font-bold text-gray-700 mb-1.5"
        >
          {label}
          {required && <span className="text-rose-500 ms-1">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={label ? `${triggerId}-lbl ${triggerId}` : undefined}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          "input-premium w-full rounded-xl border bg-white/90 flex items-center justify-between gap-2 px-3.5 cursor-pointer",
          heightBySize[size],
          error ? "border-rose-400" : "border-slate-200",
          disabled && "opacity-60 cursor-not-allowed bg-slate-50",
        )}
      >
        <span className={cn("truncate", !selectedOption && "text-gray-400 font-medium")}>
          {selectedOption ? selectedOption.label : resolvedPlaceholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}

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
                {popover({ width: "100%" })}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: coords.above ? -6 : 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.above ? -6 : 6, scale: 0.98 }}
              transition={transition}
              style={{
                position: "fixed",
                top: coords.top,
                insetInlineStart: coords.start,
                width: coords.width,
              }}
            >
              {popover({})}
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
