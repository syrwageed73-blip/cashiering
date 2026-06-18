import { useId, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cn, clamp } from "./utils";
import { useControllableState } from "./hooks";

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  /** Show a floating value bubble above the thumb while interacting. */
  showValue?: boolean;
  /** Render the raw numeric value or a formatter. */
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * Styled range slider on the indigo→cyan gradient track with a glass thumb.
 * Optional value bubble positioned along the track (RTL-aware via dir attribute).
 */
export function Slider({
  value,
  defaultValue = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  hint,
  disabled,
  showValue = true,
  formatValue,
  className,
}: SliderProps): ReactNode {
  const id = useId();
  const [current, setCurrent] = useControllableState<number>(value, defaultValue, onChange);
  const [interacting, setInteracting] = useState(false);
  const pct = clamp(((current - min) / (max - min)) * 100, 0, 100);
  const display = formatValue ? formatValue(current) : String(current);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label ? (
            <label htmlFor={id} className="text-sm font-bold text-gray-700">
              {label}
            </label>
          ) : (
            <span />
          )}
          {showValue && (
            <span
              className={cn(
                "tabular-nums text-xs font-bold px-2 py-0.5 rounded-full transition-colors",
                interacting ? "gradient-primary text-white" : "bg-indigo-50 text-indigo-700",
              )}
            >
              {display}
            </span>
          )}
        </div>
      )}
      <input
        id={id}
        type="range"
        role="slider"
        dir="ltr"
        value={current}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={display}
        onChange={(e) => setCurrent(Number(e.target.value))}
        onPointerDown={() => setInteracting(true)}
        onPointerUp={() => setInteracting(false)}
        onPointerCancel={() => setInteracting(false)}
        onBlur={() => setInteracting(false)}
        className="ui-range h-6"
        style={
          {
            background: `linear-gradient(to right, #6366f1 ${pct}%, #e2e8f0 ${pct}%)`,
          } as CSSProperties
        }
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
