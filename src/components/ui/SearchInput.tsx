import { forwardRef, useCallback, useEffect, useId, useRef } from "react";
import type { InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { cn } from "./utils";
import { useControllableState } from "./hooks";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "size"> {
  /** Controlled value. */
  value?: string;
  defaultValue?: string;
  /** Fires on every keystroke (raw value). */
  onChange?: (value: string) => void;
  /** Fires after the user stops typing for `debounceMs`. */
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  clearable?: boolean;
  size?: "sm" | "md" | "lg";
}

const heightBySize = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-13 text-base py-3.5",
} as const;

/** Debounce an arbitrary callback, returning a stable invoker. */
function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const fnRef = useRef(fn);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}

/**
 * Search field with leading search icon, clear button, and a debounced change
 * callback (default 300ms) for filtering product lists etc.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      defaultValue = "",
      onChange,
      onDebouncedChange,
      debounceMs = 300,
      placeholder,
      clearable = true,
      size = "md",
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const { t } = useTranslation();
    const resolvedPlaceholder = placeholder ?? t('common.ui.searchPlaceholder');
    const autoId = useId();
    const fieldId = id ?? autoId;
    const [current, setCurrent] = useControllableState<string>(value, defaultValue, onChange);
    const fire = useDebouncedCallback(
      (val: string) => onDebouncedChange?.(val),
      debounceMs,
    );

    return (
      <div className="relative w-full">
        <span className="pointer-events-none absolute inset-inline-start-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          ref={ref}
          id={fieldId}
          type="search"
          role="searchbox"
          inputMode="search"
          value={current}
          disabled={disabled}
          placeholder={resolvedPlaceholder}
          onChange={(e) => {
            const v = e.target.value;
            setCurrent(v);
            fire(v);
          }}
          className={cn(
            "input-premium w-full rounded-xl border border-slate-200 bg-white/90 ps-10 text-gray-800 placeholder:text-gray-400 font-medium",
            clearable && "pe-10",
            heightBySize[size],
            disabled && "opacity-60 cursor-not-allowed bg-slate-50",
            className,
          )}
          {...rest}
        />
        {clearable && current.length > 0 && !disabled && (
          <button
            type="button"
            aria-label={t('common.ui.searchClear')}
            onClick={() => {
              setCurrent("");
              onDebouncedChange?.("");
            }}
            className="ui-press absolute inset-inline-end-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400 hover:text-rose-500 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
