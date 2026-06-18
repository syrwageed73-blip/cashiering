import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn, getDirection } from "./utils";
import { useIsMobile, usePrefersReducedMotion } from "./hooks";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown under the label and included in filtering. */
  hint?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: ReactNode;
  searchPlaceholder?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
  emptyText?: ReactNode;
}

const heightBySize = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
} as const;

/**
 * Searchable single-select (combobox) for product/customer pickers.
 * Filters options by label + hint as the user types, keyboard accessible,
 * viewport-clamped popover, mobile bottom-sheet.
 */
export function Combobox({
  value,
  defaultValue = null,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  label,
  hint,
  error,
  required,
  disabled,
  size = "md",
  className,
  ariaLabel,
  emptyText,
}: ComboboxProps): ReactNode {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('common.ui.comboboxPlaceholder');
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.ui.comboboxSearch');
  const resolvedEmptyText = emptyText ?? t('common.ui.comboboxEmpty');
  const listboxId = useId();
  const triggerId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const [current, setCurrent] = useState<string | null>(value === undefined ? defaultValue : value);
  useEffect(() => {
    if (value !== undefined) setCurrent(value);
  }, [value]);
  const selected = options.find((o) => o.value === current) ?? null;
  const notify = (v: string): void => {
    setCurrent(v);
    onChange?.(v);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  const [coords, setCoords] = useState<{ top: number; start: number; width: number }>({
    top: 0,
    start: 0,
    width: 0,
  });
  useLayoutEffect(() => {
    if (!open || !containerRef.current || isMobile) return;
    const trig = containerRef.current.getBoundingClientRect();
    const estHeight = 340;
    const spaceBelow = window.innerHeight - trig.bottom;
    const above = spaceBelow < estHeight && trig.top > estHeight;
    const top = above ? trig.top - estHeight - 4 : trig.bottom + 4;
    const dir = getDirection(containerRef.current);
    const start = dir === "rtl" ? window.innerWidth - trig.right : trig.left;
    const width = Math.max(trig.width, 240);
    const clamped = Math.max(8, Math.min(start, window.innerWidth - width - 8));
    setCoords({ top, start: clamped, width });
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || containerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(filtered[0]?.value ?? null);
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (opt: ComboboxOption): void => {
    if (opt.disabled) return;
    notify(opt.value);
    setOpen(false);
    containerRef.current?.querySelector<HTMLButtonElement>(`#${triggerId}`)?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent): void => {
    if (disabled) return;
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    const list = filtered;
    const i = list.findIndex((o) => o.value === active);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = list[Math.min(list.length - 1, i + 1)];
      setActive(next?.value ?? null);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = list[Math.max(0, i - 1)];
      setActive(next?.value ?? null);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = list.find((o) => o.value === active) ?? list[0];
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      containerRef.current?.querySelector<HTMLButtonElement>(`#${triggerId}`)?.focus();
    }
  };

  const transition = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 500, damping: 34 };

  const renderList = (style: CSSProperties): ReactNode => (
    <div ref={popoverRef} style={style} className="glass-card-strong rounded-2xl border border-white/60 shadow-2xl z-[9000] overflow-hidden">
      <div className="relative p-2 border-b border-slate-100">
        <span className="pointer-events-none absolute inset-inline-start-0 top-0 bottom-0 flex items-center justify-center w-9 text-gray-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(filtered[0]?.value ?? null);
          }}
          onKeyDown={onKeyDown}
          placeholder={resolvedSearchPlaceholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-slate-200 bg-white/90 ps-8 pe-2 h-9 text-sm font-medium input-premium"
        />
      </div>
      <ul role="listbox" id={listboxId} aria-activedescendant={active ? `${listboxId}-opt-${active}` : undefined} className="ui-popover-scroll p-1.5 outline-none">
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-gray-400 font-medium">{resolvedEmptyText}</li>
        )}
        {filtered.map((opt) => {
          const isSel = opt.value === current;
          const isActive = opt.value === active;
          return (
            <li
              key={opt.value}
              role="option"
              id={`${listboxId}-opt-${opt.value}`}
              aria-selected={isSel}
              aria-disabled={opt.disabled || undefined}
              data-active={isActive}
              onMouseEnter={() => !opt.disabled && setActive(opt.value)}
              onClick={() => choose(opt)}
              className={cn(
                "ui-option flex items-center justify-between gap-2 px-3 rounded-xl cursor-pointer",
                size === "sm" ? "py-1.5" : "py-2.5",
                opt.disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              <span className="flex flex-col min-w-0">
                <span className={cn("text-sm font-bold truncate", isSel ? "text-indigo-700" : "text-gray-800")}>
                  {opt.label}
                </span>
                {opt.hint && <span className="text-xs text-gray-400 truncate">{opt.hint}</span>}
              </span>
              {isSel && <Check className="h-4 w-4 text-indigo-600 shrink-0" strokeWidth={3} />}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label id={`${triggerId}-lbl`} className="block text-sm font-bold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
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
          <span className={cn("truncate flex items-center gap-2 min-w-0", !selected && "text-gray-400 font-medium")}>
            {selected ? (
              <>
                <span className="truncate font-semibold text-gray-800">{selected.label}</span>
                {selected.hint && <span className="text-xs text-gray-400 truncate">— {selected.hint}</span>}
              </>
            ) : (
              resolvedPlaceholder
            )}
          </span>
          {selected && (
            <X
              className="h-4 w-4 text-gray-400 hover:text-rose-500 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setCurrent(null);
                onChange?.("");
              }}
            />
          )}
          <ChevronDown className={cn("h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>
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
                {renderList({ width: "100%" })}
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
              {renderList({})}
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
