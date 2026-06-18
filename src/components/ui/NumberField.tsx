import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { cn, clamp } from "./utils";
import { FieldShell } from "./FieldLabel";
import { useControllableState } from "./hooks";

export interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "onChange"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  /** Called with the parsed numeric value (or NaN when empty/invalid). */
  onValueChange?: (value: number) => void;
  /** Controlled numeric value. */
  value?: number;
  defaultValue?: number;
}

/**
 * Numeric field with +/- stepper buttons (RTL-aware via logical placement),
 * min/max/step clamping, tabular-nums, and mobile numeric inputmode.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField(
    {
      label,
      hint,
      error,
      required,
      min = -Infinity,
      max = Infinity,
      step = 1,
      onValueChange,
      value,
      defaultValue = 0,
      disabled,
      id,
      className,
      ...rest
    },
    ref,
  ) {
    const { t } = useTranslation();
    const autoId = useId();
    const fieldId = id ?? autoId;
    const [current, setCurrent] = useControllableState<number>(
      value,
      defaultValue,
      onValueChange,
    );

    const commit = (next: number): void => {
      const clamped = clamp(next, min, max);
      setCurrent(clamped);
    };

    const stepBy = (dir: 1 | -1): void => {
      commit(Number((current + dir * step).toFixed(10)));
    };

    return (
      <FieldShell
        label={label}
        labelFor={fieldId}
        required={required}
        hint={hint}
        error={error}
      >
        <div
          className={cn(
            "flex items-stretch rounded-xl border bg-white/90 overflow-hidden input-premium",
            error ? "border-rose-400" : "border-slate-200",
            disabled && "opacity-60 cursor-not-allowed bg-slate-50",
          )}
        >
          {/* Decrement at inline-start; mirrors automatically under RTL/LTR */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={t('common.ui.numberDecrease')}
            onClick={() => stepBy(-1)}
            disabled={disabled || (current <= min && Number.isFinite(min))}
            className="ui-press w-11 shrink-0 grid place-items-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-e border-slate-100"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            ref={ref}
            id={fieldId}
            type="number"
            inputMode="decimal"
            dir="ltr"
            value={Number.isNaN(current) ? "" : current}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            onChange={(e) => {
              const raw = e.target.value;
              commit(raw === "" ? Number.NaN : Number(raw));
            }}
            min={Number.isFinite(min) ? min : undefined}
            max={Number.isFinite(max) ? max : undefined}
            step={step}
            className={cn(
              "ui-number-input h-11 flex-1 min-w-0 bg-transparent text-center text-gray-800 font-bold tabular-nums focus:outline-none px-2",
              className,
            )}
            {...rest}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={t('common.ui.numberIncrease')}
            onClick={() => stepBy(1)}
            disabled={disabled || (current >= max && Number.isFinite(max))}
            className="ui-press w-11 shrink-0 grid place-items-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-s border-slate-100"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </FieldShell>
    );
  },
);
