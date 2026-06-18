import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { MutableRefObject, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";
import { FieldShell } from "./FieldLabel";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  autoGrow?: boolean;
  showCount?: boolean;
  maxLength?: number;
  containerClassName?: string;
}

/**
 * Premium textarea on input-premium. Optional auto-grow (resizes to content),
 * optional character counter, and consistent error/hint chrome.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    hint,
    error,
    required,
    autoGrow = false,
    showCount = false,
    maxLength,
    id,
    className,
    containerClassName,
    value,
    defaultValue,
    onChange,
    disabled,
    rows = autoGrow ? 1 : 3,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const [count, setCount] = useState<number>(() => {
    if (typeof value === "string") return value.length;
    if (typeof defaultValue === "string") return defaultValue.length;
    return 0;
  });

  // Merge external + internal refs.
  useEffect(() => {
    if (typeof ref === "function") ref(innerRef.current);
    else if (ref) (ref as MutableRefObject<HTMLTextAreaElement | null>).current = innerRef.current;
  });

  const resize = (): void => {
    const el = innerRef.current;
    if (!el || !autoGrow) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(resize, []);

  return (
    <FieldShell
      label={label}
      labelFor={fieldId}
      required={required}
      hint={hint}
      error={error}
      trailing={
        showCount ? (
          <span className="text-xs text-gray-400 tabular-nums">
            {count}
            {maxLength ? `/${maxLength}` : ""}
          </span>
        ) : null
      }
      className={containerClassName}
    >
      <textarea
        ref={innerRef}
        id={fieldId}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        disabled={disabled}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        onChange={(e) => {
          setCount(e.target.value.length);
          resize();
          onChange?.(e);
        }}
        className={cn(
          "input-premium w-full rounded-xl border bg-white/90 text-gray-800 placeholder:text-gray-400",
          "px-3.5 py-2.5 text-sm font-medium leading-relaxed resize-y min-h-[2.75rem]",
          error ? "border-rose-400" : "border-slate-200",
          autoGrow && "resize-none overflow-hidden",
          disabled && "opacity-60 cursor-not-allowed bg-slate-50",
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
});
