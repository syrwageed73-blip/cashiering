import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "./utils";

export interface RadioOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  hint?: ReactNode;
}

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  /** Field label for the group. */
  label?: ReactNode;
  name?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/**
 * Accessible radio group with roving tabindex and full keyboard support
 * (Arrow keys move selection, role=radiogroup). Custom indigo mark.
 */
export function RadioGroup({
  value,
  defaultValue,
  onChange,
  options,
  label,
  name,
  disabled,
  orientation = "vertical",
  className,
}: RadioGroupProps): ReactNode {
  const groupName = name ?? useId();
  const [internal, setInternal] = useState<string>(defaultValue ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? (value as string) : internal;

  const enabled = options.filter((o) => !o.disabled && !disabled);
  const selectedIndex = enabled.findIndex((o) => o.value === current);

  const move = (delta: number): void => {
    if (enabled.length === 0) return;
    const n = enabled.length;
    const idx = selectedIndex < 0 ? 0 : (selectedIndex + delta + n) % n;
    const next = enabled[idx];
    if (!next) return;
    if (!isControlled) setInternal(next.value);
    onChange?.(next.value);
  };

  return (
    <div
      role="radiogroup"
      aria-label={typeof label === "string" ? label : undefined}
      aria-required={undefined}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
      className={cn(
        "flex gap-3",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        className,
      )}
    >
      {label && (
        <div className="w-full text-sm font-bold text-gray-700 mb-0.5">{label}</div>
      )}
      {options.map((opt) => {
        const isChecked = current === opt.value;
        const isDisabled = opt.disabled || disabled;
        const tabindex = isChecked ? 0 : selectedIndex < 0 && options.indexOf(opt) === 0 ? 0 : -1;
        return (
          <label
            key={opt.value}
            className={cn(
              "ui-press inline-flex items-start gap-2.5 cursor-pointer select-none",
              isDisabled && "cursor-not-allowed opacity-60",
              orientation === "vertical" ? "py-1" : "",
            )}
          >
            <span className="relative inline-flex h-11 w-7 items-center justify-center -my-2.5 shrink-0">
              <input
                type="radio"
                role="radio"
                name={groupName}
                value={opt.value}
                checked={isChecked}
                disabled={isDisabled}
                tabIndex={tabindex}
                onChange={() => {
                  if (!isControlled) setInternal(opt.value);
                  onChange?.(opt.value);
                }}
                className="sr-only"
              />
              <span
                className="ui-radio-circle h-5 w-5"
                data-checked={isChecked}
              >
                <span className="ui-radio-dot" />
              </span>
            </span>
            <span className="flex flex-col gap-0.5 pt-1.5">
              {opt.label && (
                <span className="text-sm font-semibold text-gray-700 leading-tight">
                  {opt.label}
                </span>
              )}
              {opt.hint && <span className="text-xs text-gray-400">{opt.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
