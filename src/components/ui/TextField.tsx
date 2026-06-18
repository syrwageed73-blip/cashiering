import { forwardRef, useId, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "./utils";
import { FieldShell } from "./FieldLabel";

export type FieldSize = "sm" | "md" | "lg";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  size?: FieldSize;
  /** Icon rendered inside the field at the inline-start. */
  leftIcon?: ReactNode;
  /** Icon rendered inside the field at the inline-end. */
  rightIcon?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

const heightBySize: Record<FieldSize, string> = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-13 text-base py-3.5",
};

/**
 * Premium text field built on input-premium. Supports prefix/suffix icon slots,
 * error state (aria-invalid + role=alert), clear button, and logical-property
 * padding so icons mirror correctly under RTL/LTR.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    required,
    size = "md",
    leftIcon,
    rightIcon,
    clearable = false,
    onClear,
    id,
    className,
    containerClassName,
    value,
    defaultValue,
    onChange,
    disabled,
    ...rest
  },
  ref,
) {
  const { t } = useTranslation();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [internal, setInternal] = useState<string>(
    typeof defaultValue === "string" ? defaultValue : "",
  );
  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value) : internal;
  const showClear = clearable && currentValue.length > 0 && !disabled;

  const padStart = leftIcon ? "ps-10" : "";
  const padEnd = showClear || rightIcon ? "pe-10" : "";

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
        {leftIcon && (
          <span className="pointer-events-none absolute inset-inline-start-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          type="text"
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            if (!isControlled) setInternal(e.target.value);
            onChange?.(e);
          }}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          aria-required={required || undefined}
          required={required}
          className={cn(
            "input-premium w-full rounded-xl border bg-white/90 text-gray-800 placeholder:text-gray-400",
            "font-medium tabular-nums",
            heightBySize[size],
            padStart,
            padEnd,
            error ? "border-rose-400 focus:border-rose-400" : "border-slate-200",
            disabled && "opacity-60 cursor-not-allowed bg-slate-50",
            className,
          )}
          {...rest}
        />
        {rightIcon && !showClear && (
          <span className="pointer-events-none absolute inset-inline-end-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400">
            {rightIcon}
          </span>
        )}
        {showClear && (
          <button
            type="button"
            onClick={() => {
              if (!isControlled) setInternal("");
              onClear?.();
              onChange?.({
                target: { value: "" },
              } as ChangeEvent<HTMLInputElement>);
            }}
            aria-label={t('common.ui.fieldClear')}
            className="ui-press absolute inset-inline-end-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-400 hover:text-rose-500 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </FieldShell>
  );
});
