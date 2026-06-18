import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, AlertTriangle, CheckSquare, ShieldAlert } from 'lucide-react';

interface CustomConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const CustomConfirm: React.FC<CustomConfirmProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const resolvedConfirmText = confirmText ?? t('common.actions.confirm');
  const resolvedCancelText = cancelText ?? t('common.actions.cancel');
  if (!isOpen) return null;

  let icon = <AlertTriangle className="h-7 w-7 text-amber-500" />;
  let iconBg = 'bg-amber-50 border-amber-100';
  let btnClass = 'gradient-warning';
  let accentColor = 'border-amber-200/30';

  if (type === 'danger') {
    icon = <ShieldAlert className="h-7 w-7 text-rose-500" />;
    iconBg = 'bg-rose-50 border-rose-100';
    btnClass = 'gradient-danger';
    accentColor = 'border-rose-200/30';
  } else if (type === 'success') {
    icon = <CheckSquare className="h-7 w-7 text-emerald-500" />;
    iconBg = 'bg-emerald-50 border-emerald-100';
    btnClass = 'gradient-success';
    accentColor = 'border-emerald-200/30';
  } else if (type === 'info') {
    icon = <HelpCircle className="h-7 w-7 text-indigo-500" />;
    iconBg = 'bg-indigo-50 border-indigo-100';
    btnClass = 'gradient-primary';
    accentColor = 'border-indigo-200/30';
  }

  return (
    <div className="fixed inset-0 z-[9900] flex items-center justify-center p-4 modal-backdrop">
      <div 
        className={`w-full max-w-md glass-card-strong rounded-2xl p-6 modal-content border ${accentColor}`}
        style={{ direction: 'rtl' }}
      >
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-2xl ${iconBg} border shrink-0`}>
            {icon}
          </div>
          <div className="space-y-1.5 pt-1">
            <h3 className="text-base font-black text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100/50">
          <button
            id="confirm-dialog-cancel"
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            {resolvedCancelText}
          </button>
          
          <button
            id="confirm-dialog-btn"
            type="button"
            onClick={onConfirm}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${btnClass}`}
          >
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
