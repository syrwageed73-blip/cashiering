import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldX, ArrowRight } from 'lucide-react';
import { Button } from './ui';

interface AccessDeniedProps {
  fallbackPath?: string;
}

export function AccessDenied({ fallbackPath = '/app/pos' }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(239,68,68,0.12),_transparent_35%),linear-gradient(135deg,#f8fafc_0%,#fef2f2_50%,#fff1f2_100%)] flex items-center justify-center p-6 dark:bg-[#0f0f1a]">
      {/* Animated background orbs */}
      <div className="app-shell-bg" aria-hidden="true">
        <div className="app-shell-orb app-shell-orb-1" />
        <div className="app-shell-orb app-shell-orb-2" />
        <div className="app-shell-orb app-shell-orb-3" />
      </div>

      <div className="glass-card-strong rounded-[28px] p-8 md:p-10 text-center relative z-10 max-w-lg w-full animate-fade-in-up">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-200/50 dark:shadow-rose-900/30 mb-6">
          <ShieldX className="h-10 w-10 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-black text-gray-950 dark:text-slate-100 leading-tight">
          {t('accessDenied.title')}
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-4 leading-relaxed max-w-sm mx-auto">
          {t('accessDenied.description')}
        </p>

        {/* Decorative separator */}
        <div className="flex items-center justify-center gap-2 my-6">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-rose-200 dark:to-rose-800" />
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-rose-200 dark:to-rose-800" />
        </div>

        {/* Info badge */}
        <div className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50/80 px-4 py-2 rounded-xl border border-rose-100/50 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          {t('accessDenied.roleNotice')}
        </div>

        {/* Action */}
        <div className="flex justify-center">
          <Button
            id="access-denied-go-back"
            variant="dark"
            size="lg"
            onClick={() => navigate(fallbackPath, { replace: true })}
            leftIcon={<ArrowRight className="h-4 w-4" />}
            className="text-sm"
          >
            {t('accessDenied.goBack')}
          </Button>
        </div>
      </div>
    </div>
  );
}
