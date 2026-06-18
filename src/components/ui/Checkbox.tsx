import { forwardRef, useId, useState } from "react";
import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "./utils";

export interface CheckboxProps {
  /** Controlled checked state. */
  checked?: boolean;
  defaultChecked?: boolean;
  /** Indeterminate overrides checked visually (aria-checked="mixed"). */
  indeterminate?: boolean;
  disabled?: boolean;
  required?: boolean;
  label?: ReactNode;
  hint?: ReactNode;
  onChange?: (checked: boolean) => void;
  id?: string;
  name?: string;
  value?: string;
  className?: string;
}

const sizeBox = "h-5 w-5";

/**
 * Accessible custom checkbox (native input visually hidden but operable).
 * Supports indeterminate, label, hint, and a >=44px hit area via the wrapper.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    checked,
    defaultChecked = false,
    indeterminate = false,
    disabled,
    required,
    label,
    hint,
    onChange,
    id,
    name,
    value,
    className,
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [internal, setInternal] = useState<boolean>(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = indeterminate ? false : isControlled ? (checked as boolean) : internal;

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        "inline-flex items-start gap-2.5 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {/* Expanded hit target to >=44px via the clickable label padding */}
      <span className="relative inline-flex h-11 w-7 items-center justify-center -my-2.5 shrink-0">
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          name={name}
          value={value}
          checked={isChecked}
          required={required}
          disabled={disabled}
          onChange={(e) => {
            if (indeterminate) return;
            if (!isControlled) setInternal(e.target.checked);
            onChange?.(e.target.checked);
          }}
          aria-checked={indeterminate ? "mixed" : isChecked}
          className="sr-only peer"
        />
        <span
          className={cn("ui-check-box", sizeBox)}
          data-checked={isChecked || indeterminate}
        >
          {indeterminate ? (
            <Minus className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          ) : isChecked ? (
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          ) : null}
        </span>
      </span>
      {(label || hint) && (
        <span className="flex flex-col gap-0.5 pt-1.5">
          {label && (
            <span className="text-sm font-semibold text-gray-700 leading-tight">{label}</span>
          )}
          {hint && <span className="text-xs text-gray-400">{hint}</span>}
        </span>
      )}
    </label>
  );
});
