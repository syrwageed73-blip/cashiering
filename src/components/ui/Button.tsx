import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "./utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "dark"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** When provided, renders an <a> styled as a button. */
  href?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-xs gap-1.5 rounded-xl min-w-[44px]",
  md: "h-11 px-5 text-sm gap-2 rounded-xl min-w-[44px]",
  lg: "h-13 px-7 text-base gap-2.5 rounded-2xl min-w-[48px] py-3.5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary-gradient text-white",
  secondary:
    "bg-white text-gray-700 border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 glass-card",
  ghost: "bg-transparent text-gray-600 hover:bg-indigo-50 hover:text-indigo-700",
  dark: "btn-dark-gradient text-white",
  danger: "gradient-danger text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)] hover:shadow-[0_4px_16px_rgba(220,38,38,0.4)] hover:-translate-y-px",
  success: "gradient-success text-white shadow-[0_2px_8px_rgba(5,150,105,0.3)] hover:shadow-[0_4px_16px_rgba(5,150,105,0.4)] hover:-translate-y-px",
};

/**
 * Premium glass button. Matches btn-primary-gradient / btn-dark-gradient tokens.
 * Variants map to the established palette; loading injects a spinner and disables.
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      href,
      className,
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    const classes = cn(
      "ui-press inline-flex items-center justify-center font-bold select-none cursor-pointer",
      "focus-visible:outline-2 focus-visible:outline-offset-2",
      sizeClasses[size],
      variantClasses[variant],
      fullWidth && "w-full",
      isDisabled && "opacity-55 cursor-not-allowed pointer-events-none",
      className,
    );

    const content = (
      <>
        {loading && (
          <span
            className={cn(
              "ui-spinner",
              variant === "secondary" || variant === "ghost" ? "ui-spinner-dark" : "",
            )}
            aria-hidden="true"
          />
        )}
        {!loading && leftIcon && <span className="shrink-0 inline-flex">{leftIcon}</span>}
        {children != null && <span className="truncate">{children}</span>}
        {!loading && rightIcon && <span className="shrink-0 inline-flex">{rightIcon}</span>}
      </>
    );

    if (href && !isDisabled) {
      return (
        <a ref={ref as Ref<HTMLAnchorElement>} href={href} className={classes}>
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        className={classes}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...rest}
      >
        {content}
      </button>
    );
  },
);
