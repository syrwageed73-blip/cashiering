import type { ReactNode } from "react";
import { cn } from "./utils";

/**
 * Shared field chrome: label + helper text + error message + required asterisk.
 * Used by TextField, NumberField, Textarea, Select, etc. for visual consistency.
 */
export interface FieldLabelProps {
  label?: ReactNode;
  /** Connects label/error to the control via aria-labelledby/aria-describedby by the consumer. */
  labelFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** Optional element rendered at the inline-end of the label row (e.g. char counter). */
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FieldShell({
  label,
  labelFor,
  required,
  hint,
  error,
  trailing,
  className,
  children,
}: FieldLabelProps): ReactNode {
  const describedById = error
    ? `${labelFor}-error`
    : hint
      ? `${labelFor}-hint`
      : undefined;
  void describedById;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || trailing) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={labelFor}
              className="text-sm font-bold text-gray-700 select-none"
            >
              {label}
              {required && <span className="text-rose-500 ms-1">*</span>}
            </label>
          )}
          {trailing}
        </div>
      )}
      {children}
      {error ? (
        <p
          id={labelFor ? `${labelFor}-error` : undefined}
          role="alert"
          className="text-xs font-semibold text-rose-600 flex items-center gap-1"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={labelFor ? `${labelFor}-hint` : undefined}
          className="text-xs text-gray-400"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
