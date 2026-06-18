import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Calendar, Clock } from "lucide-react";
import { cn } from "./utils";
import { FieldShell } from "./FieldLabel";

type NativeKind = "date" | "time" | "datetime-local";

export interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  kind?: NativeKind;
  size?: "sm" | "md" | "lg";
  /** When provided, used as the accessible label instead of `label`. */
  ariaLabel?: string;
  containerClassName?: string;
}

const heightBySize = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-13 text-base py-3.5",
} as const;

/**
 * Native date/time field with consistent glass chrome + leading icon.
 * Keeps the native picker for cross-browser reliability but matches input-premium.
 * Uses dir=ltr on the control so the native date format reads correctly, while
 * the surrounding field stays direction-agnostic.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  {
    label,
    hint,
    error,
    required,
    kind = "date",
    size = "md",
    ariaLabel,
    id,
    className,
    containerClassName,
    disabled,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const Icon = kind === "time" ? Clock : Calendar;

  return (
    <FieldShell
      label={label}
      labelFor={fieldId}
      required={required}
      hint={hint}
      error={error}
      className={containerClassName}
    >
      <div className="relative">
        <span className="pointer-events-none absolute inset-inline-start-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400">
          <Icon className="h-4 w-4" />
        </span>
        <input
          ref={ref}
          id={fieldId}
          type={kind}
          dir="ltr"
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          className={cn(
            "ui-native-field input-premium w-full rounded-xl border bg-white/90 ps-10 text-gray-800 font-semibold tabular-nums",
            heightBySize[size],
            "text-start",
            error ? "border-rose-400" : "border-slate-200",
            disabled && "opacity-60 cursor-not-allowed bg-slate-50",
            className,
          )}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});
