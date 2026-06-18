import { forwardRef, useId, useState } from "react";
import type { ReactNode } from "react";
import { cn, getDirection } from "./utils";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  label?: ReactNode;
  onChange?: (checked: boolean) => void;
  id?: string;
  name?: string;
  value?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const dims = {
  sm: { track: "w-9 h-5", thumb: "h-4 w-4", travel: 16 },
  md: { track: "w-11 h-6", thumb: "h-5 w-5", travel: 20 },
  lg: { track: "w-13 h-7", thumb: "h-6 w-6", travel: 24 },
} as const;

/**
 * Animated toggle switch (role=switch). On/off colors drawn from the palette
 * (indigo gradient on, slate off). Thumb slides via logical inset property so
 * it mirrors correctly under RTL/LTR.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    checked,
    defaultChecked = false,
    disabled,
    required,
    label,
    onChange,
    id,
    name,
    value,
    size = "md",
    className,
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [internal, setInternal] = useState<boolean>(defaultChecked);
  const isControlled = checked !== undefined;
  const isOn = isControlled ? (checked as boolean) : internal;
  const d = dims[size];
  // In RTL the visual "on" position is to the left, so invert the travel sign.
  const sign = typeof document !== "undefined" && getDirection(document.documentElement) === "rtl" ? -1 : 1;

  return (
    <label
      htmlFor={fieldId}
      className={cn(
        "inline-flex items-center gap-2.5 cursor-pointer select-none",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="relative inline-flex h-11 w-auto items-center justify-center -my-2.5 px-1 shrink-0">
        <input
          ref={ref}
          id={fieldId}
          type="checkbox"
          role="switch"
          name={name}
          value={value}
          checked={isOn}
          required={required}
          disabled={disabled}
          onChange={(e) => {
            if (!isControlled) setInternal(e.target.checked);
            onChange?.(e.target.checked);
          }}
          className="sr-only peer"
        />
        <span
          className={cn(
            "relative inline-flex items-center rounded-full transition-colors duration-200",
            d.track,
            isOn
              ? "gradient-primary"
              : "bg-slate-300",
          )}
        >
          <span
            className={cn("ui-switch-thumb absolute", d.thumb)}
            style={{
              insetInlineStart: 2,
              transform: isOn
                ? `translateX(${sign * d.travel}px)`
                : "translateX(0)",
            }}
          />
        </span>
      </span>
      {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
    </label>
  );
});
