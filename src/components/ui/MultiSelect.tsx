import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, X } from "lucide-react";
import { cn, getDirection } from "./utils";
import { useIsMobile, usePrefersReducedMotion } from "./hooks";

export interface MultiSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface MultiSelectProps {
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: ReactNode;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

const heightBySize = {
  sm: "min-h-9 text-xs",
  md: "min-h-11 text-sm",
} as const;

function groupOptions(options: MultiSelectOption[]) {
  const hasGroup = options.some((o) => o.group);
  if (!hasGroup) return [{ items: options }];
  const map = new Map<string | undefined, MultiSelectOption[]>();
  for (const o of options) {
    if (!map.has(o.group)) map.set(o.group, []);
    map.get(o.group)!.push(o);
  }
  return Array.from(map, ([name, items]) => ({ name, items }));
}

/**
 * Accessible multi-select with chip/tag display. Listbox + checkbox options,
 * Esc to close, click-outside, viewport-clamped popover, mobile sheet.
 */
export function MultiSelect({
  value,
  defaultValue = [],
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
}: MultiSelectProps): ReactNode {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('common.ui.multiSelectPlaceholder');
  const listboxId = useId();
  const triggerId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const selected = isControlled ? (value as string[]) : internal;

  const setValue = (next: string[]): void => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const toggle = (val: string): void => {
    setValue(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  };

  const remove = (val: string): void => {
    setValue(selected.filter((v) => v !== val));
  };

  const groups = useMemo(() => groupOptions(options), [options]);

  const [coords, setCoords] = useState<{ top: number; start: number; width: number }>({
    top: 0,
    start: 0,
    width: 0,
  });
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || isMobile) return;
    const trig = triggerRef.current.getBoundingClientRect();
    const estHeight = Math.min(options.length * 40 + 16, 360) + 12;
    const spaceBelow = window.innerHeight - trig.bottom;
    const above = spaceBelow < estHeight && trig.top > estHeight;
    const top = above ? trig.top - estHeight - 4 : trig.bottom + 4;
    const dir = getDirection(triggerRef.current);
    const start = dir === "rtl" ? window.innerWidth - trig.right : trig.left;
    const width = Math.max(trig.width, 220);
    const clamped = Math.max(8, Math.min(start, window.innerWidth - width - 8));
    setCoords({ top, start: clamped, width });
  }, [open, options.length, isMobile]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
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
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const enabled = options.filter((o) => !o.disabled);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = enabled.findIndex((o) => o.value === active);
      const next = enabled[(i + (e.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length];
      setActive(next?.value ?? null);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = enabled.find((o) => o.value === active) ?? enabled[0];
      if (opt) toggle(opt.value);
    }
  };

  const transition = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 34 };

  const renderPopover = (style: CSSProperties): ReactNode => (
    <div
      ref={popoverRef}
      style={style}
      className="glass-card-strong rounded-2xl border border-white/60 p-1.5 shadow-2xl z-[9000]"
    >
      <ul
        role="listbox"
        aria-multiselectable="true"
        id={listboxId}
        tabIndex={0}
        aria-activedescendant={active ? `${listboxId}-opt-${active}` : undefined}
        className="ui-popover-scroll outline-none"
      >
        {groups.map((g: { name: string | undefined; items: MultiSelectOption[] }) => (
          <li key={g.name ?? "__nogroup"} role="presentation">
            {g.name && (
              <div className="px-3 pt-2 pb-1 text-[11px] font-extrabold uppercase tracking-wide text-indigo-500/80">
                {g.name}
              </div>
            )}
            <ul role="presentation">
              {g.items.map((opt: MultiSelectOption) => {
                const isSel = selected.includes(opt.value);
                const isActive = active === opt.value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    id={`${listboxId}-opt-${opt.value}`}
                    aria-selected={isSel}
                    aria-disabled={opt.disabled || undefined}
                    data-active={isActive}
                    onMouseEnter={() => !opt.disabled && setActive(opt.value)}
                    onClick={() => !opt.disabled && toggle(opt.value)}
                    className={cn(
                      "ui-option flex items-center gap-2.5 px-3 rounded-xl cursor-pointer text-sm font-semibold",
                      size === "sm" ? "py-1.5" : "py-2.5",
                      opt.disabled && "opacity-40 cursor-not-allowed",
                      isSel ? "text-indigo-700" : "text-gray-700",
                    )}
                  >
                    <span
                      className={cn("ui-check-box h-4.5 w-4.5 shrink-0")}
                      data-checked={isSel}
                      style={{ width: 18, height: 18 }}
                    >
                      {isSel && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{opt.label}</span>
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
        <label id={`${triggerId}-lbl`} className="block text-sm font-bold text-gray-700 mb-1.5">
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
          "input-premium w-full rounded-xl border bg-white/90 flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 flex-wrap",
          heightBySize[size],
          error ? "border-rose-400" : "border-slate-200",
          disabled && "opacity-60 cursor-not-allowed bg-slate-50",
        )}
      >
        {selected.length === 0 && (
          <span className="text-gray-400 font-medium px-1.5 flex-1 text-start">{resolvedPlaceholder}</span>
        )}
        {selected.map((val) => {
          const opt = options.find((o) => o.value === val);
          if (!opt) return null;
          return (
            <span key={val} className="ui-chip">
              <span className="truncate max-w-28">{opt.label}</span>
              <span
                role="button"
                tabIndex={-1}
                aria-label={t('common.ui.multiSelectRemove', { label: typeof opt.label === "string" ? opt.label : val })}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(val);
                }}
                className="inline-flex items-center justify-center hover:text-rose-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          );
        })}
        <span className="flex-1" />
        <ChevronDown
          className={cn("h-4 w-4 text-gray-400 shrink-0 ms-auto transition-transform duration-200", open && "rotate-180")}
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
                {renderPopover({ width: "100%" })}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={transition}
              style={{ position: "fixed", top: coords.top, insetInlineStart: coords.start, width: coords.width }}
            >
              {renderPopover({})}
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
