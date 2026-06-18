import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase';

interface PasswordRecoveryScreenProps {
  onDone: () => void;
}

export function PasswordRecoveryScreen({ onDone }: PasswordRecoveryScreenProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage(t('passwordRecovery.errors.supabaseNotConfigured'));
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t('passwordRecovery.errors.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('passwordRecovery.errors.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      setStatusMessage(t('passwordRecovery.status.success'));
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        onDone();
      }, 800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('passwordRecovery.errors.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.16),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_45%,#f0f9ff_100%)] flex items-center justify-center p-4">
      <div className="app-shell-bg" aria-hidden="true">
        <div className="app-shell-orb app-shell-orb-1" />
        <div className="app-shell-orb app-shell-orb-2" />
        <div className="app-shell-orb app-shell-orb-3" />
      </div>

      <div className="glass-card-strong rounded-[32px] p-6 md:p-8 w-full max-w-lg relative z-10 text-right">
        <div className="inline-flex items-center gap-3 bg-white/70 border border-white/70 rounded-2xl px-4 py-3 shadow-sm">
          <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-md">
            <KeyRound className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black text-gray-950">{t('passwordRecovery.title')}</h1>
            <p className="text-xs font-bold text-indigo-600">{t('passwordRecovery.supabaseDesc')}</p>
          </div>
        </div>

        <div className="mt-6 mb-6 space-y-2">
          <h2 className="text-2xl font-black text-gray-950">{t('passwordRecovery.heading')}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('passwordRecovery.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">{t('passwordRecovery.fields.newPassword')}</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full glass-card rounded-2xl py-3 pr-11 pl-4 text-sm text-left input-premium"
                dir="ltr"
              />
              <LockKeyhole className="absolute right-4 top-3.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">{t('passwordRecovery.fields.confirmPassword')}</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full glass-card rounded-2xl py-3 pr-11 pl-4 text-sm text-left input-premium"
                dir="ltr"
              />
              <ShieldCheck className="absolute right-4 top-3.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-xs leading-relaxed">
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary-gradient rounded-2xl py-3.5 text-sm font-black disabled:opacity-50"
          >
            {isSubmitting ? t('passwordRecovery.buttons.submitting') : t('passwordRecovery.buttons.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
