import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { Button } from './ui';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none toast-container">
      {toasts.map((toast, index) => {
        let icon = <Info className="h-5 w-5 text-blue-500" />;
        let bgClass = 'bg-blue-50/90 text-blue-800 border-blue-200/60';
        let progressColor = 'bg-blue-500';
        let iconBg = 'bg-blue-100/80';
        
        switch (toast.type) {
          case 'success':
            icon = <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            bgClass = 'bg-emerald-50/90 text-emerald-800 border-emerald-200/60';
            progressColor = 'bg-emerald-500';
            iconBg = 'bg-emerald-100/80';
            break;
          case 'error':
            icon = <XCircle className="h-5 w-5 text-rose-500" />;
            bgClass = 'bg-rose-50/90 text-rose-800 border-rose-200/60';
            progressColor = 'bg-rose-500';
            iconBg = 'bg-rose-100/80';
            break;
          case 'warning':
            icon = <AlertCircle className="h-5 w-5 text-amber-500" />;
            bgClass = 'bg-amber-50/90 text-amber-800 border-amber-200/60';
            progressColor = 'bg-amber-500';
            iconBg = 'bg-amber-100/80';
            break;
        }

        return (
          <div
            key={toast.id}
            className={`toast-item flex items-center justify-between p-3.5 rounded-2xl border shadow-lg pointer-events-auto backdrop-blur-md animate-slide-in ${bgClass}`}
            style={{ animationDelay: `${index * 50}ms` }}
            id={`toast-${toast.id}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <p className="text-sm font-semibold leading-snug">{toast.text}</p>
            </div>
            <Button
              id={`close-toast-${toast.id}`}
              variant="ghost"
              size="sm"
              onClick={() => onRemove(toast.id)}
              aria-label={t('common.ui.toastClose')}
              className="me-1 !min-w-[36px] !h-8 !px-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            {/* Animated Progress Bar */}
            <div className={`toast-progress ${progressColor} opacity-40`}></div>
          </div>
        );
      })}
    </div>
  );
};
