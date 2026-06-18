import { useEffect } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "./utils";
import { useFocusTrap, usePrefersReducedMotion, useScrollLock } from "./hooks";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Modal max width via tailwind max-w-* class. */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** When false, clicking the backdrop won't close. */
  closeOnBackdrop?: boolean;
  /** When false, the close (X) button is hidden. */
  showCloseButton?: boolean;
  className?: string;
  ariaLabel?: string;
}

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)]",
} as const;

/**
 * Generic accessible dialog (modal-content + modal-backdrop). Focus trap,
 * Esc to close, scroll lock, reduced-motion aware. Mobile-friendly full-width.
 * This is the primitive the existing CustomConfirm (and views) can adopt.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  showCloseButton = true,
  className,
  ariaLabel,
}: ModalProps): ReactNode {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  useScrollLock(open);
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const transition = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 30 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9800] flex items-end sm:items-center justify-center p-2 sm:p-4">
          <motion.div
            className="absolute inset-0 modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={() => closeOnBackdrop && onClose()}
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
            aria-describedby={description ? "modal-desc" : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={transition}
            className={cn(
              "relative w-full glass-card-strong rounded-2xl sm:rounded-3xl modal-content border border-white/60 max-h-[calc(100vh-1rem)] flex flex-col",
              sizeClass[size],
              className,
            )}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-100/70">
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">{title}</h2>
                  )}
                  {description && (
                    <p id="modal-desc" className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    aria-label={t('common.ui.modalClose')}
                    onClick={onClose}
                    className="ui-press shrink-0 grid place-items-center h-9 w-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-slate-100/70 bg-white/40 rounded-b-2xl sm:rounded-b-3xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
