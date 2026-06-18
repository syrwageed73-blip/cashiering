import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "./utils";
import { useControllableState } from "./hooks";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  options: SegmentOption<T>[];
  size?: "sm" | "md";
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Pill segmented control (e.g. receipt 58mm/80mm, light/dark). Animated active
 * indicator uses motion-free transitions to stay lightweight. RTL-agnostic.
 */
export function SegmentedControl<T extends string = string>({
  value,
  defaultValue,
  onChange,
  options,
  size = "md",
  fullWidth = false,
  disabled,
  ariaLabel,
  className,
}: SegmentedControlProps<T>): ReactNode {
  const groupId = useId();
  const [current, setCurrent] = useControllableState<T | undefined>(
    value,
    defaultValue,
    onChange,
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70",
        fullWidth && "w-full",
        disabled && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={opt.disabled || disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setCurrent(opt.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const i = options.findIndex((o) => o.value === current);
              const dir = e.key === "ArrowRight" ? 1 : -1;
              const n = options.length;
              for (let k = 1; k <= n; k += 1) {
                const next = options[(i + dir * k + n) % n];
                if (next && !next.disabled) {
                  setCurrent(next.value);
                  break;
                }
              }
            }}
            className={cn(
              "ui-segment ui-press relative inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer",
              size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
              fullWidth && "flex-1",
              isActive
                ? "bg-white text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.18)]"
                : "text-gray-500 hover:text-indigo-600",
              opt.disabled && "opacity-50 cursor-not-allowed",
            )}
            data-active={isActive}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
      <span className="sr-only">{groupId}</span>
    </div>
  );
}
