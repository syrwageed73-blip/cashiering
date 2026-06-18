import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckSquare, HelpCircle, ShieldAlert } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { cn } from "./utils";

export type ConfirmType = "danger" | "warning" | "info" | "success";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
  onConfirm: () => void;
  onCancel: () => void;
  /** Disable the confirm button (e.g. while a destructive op runs). */
  loading?: boolean;
}

const config: Record<
  ConfirmType,
  { icon: ReactNode; iconWrap: string; variant: "danger" | "success" | "primary" }
> = {
  danger: {
    icon: <ShieldAlert className="h-7 w-7 text-rose-500" />,
    iconWrap: "bg-rose-50 border-rose-100 text-rose-500",
    variant: "danger",
  },
  warning: {
    icon: <AlertTriangle className="h-7 w-7 text-amber-500" />,
    iconWrap: "bg-amber-50 border-amber-100 text-amber-500",
    variant: "primary",
  },
  info: {
    icon: <HelpCircle className="h-7 w-7 text-indigo-500" />,
    iconWrap: "bg-indigo-50 border-indigo-100 text-indigo-500",
    variant: "primary",
  },
  success: {
    icon: <CheckSquare className="h-7 w-7 text-emerald-500" />,
    iconWrap: "bg-emerald-50 border-emerald-100 text-emerald-500",
    variant: "success",
  },
};

/**
 * ConfirmDialog built on the generic Modal primitive. Mirrors the existing
 * CustomConfirm API (type, onConfirm/onCancel) so views can adopt it without
 * churn. CustomConfirm.tsx continues to work unchanged.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  type = "warning",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps): ReactNode {
  const { t } = useTranslation();
  const resolvedConfirmText = confirmText ?? t('common.actions.confirm');
  const resolvedCancelText = cancelText ?? t('common.actions.cancel');
  const c = config[type];
  return (
    <Modal open={open} onClose={onCancel} size="sm" showCloseButton={false} closeOnBackdrop={!loading}>
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-2xl border shrink-0", c.iconWrap)} aria-hidden>
          {c.icon}
        </div>
        <div className="space-y-1.5 pt-1 min-w-0">
          <h3 className="text-base font-black text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {resolvedCancelText}
        </Button>
        <Button variant={c.variant} onClick={onConfirm} loading={loading}>
          {resolvedConfirmText}
        </Button>
      </div>
    </Modal>
  );
}
