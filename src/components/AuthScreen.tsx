import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LockKeyhole, Mail, ShieldCheck, Store } from 'lucide-react';
import { supabase } from '../supabase';
import { Button, TextField } from './ui';

interface AuthScreenProps {
  configError?: string;
}

export function AuthScreen({ configError }: AuthScreenProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getLoginRedirectUrl = () => `${window.location.origin}/login`;
  const getRecoveryRedirectUrl = () => `${window.location.origin}/reset-password`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage(t('auth.errors.supabaseNotConfigured'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('auth.errors.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!supabase) {
      setErrorMessage(t('auth.errors.supabaseNotConfigured'));
      return;
    }

    if (!email.trim()) {
      setErrorMessage(t('auth.errors.emailRequiredForReset'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getRecoveryRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      setStatusMessage(t('auth.status.resetSent'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('auth.errors.resetFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!supabase) {
      setErrorMessage(t('auth.errors.supabaseNotConfigured'));
      return;
    }

    if (!email.trim()) {
      setErrorMessage(t('auth.errors.emailRequiredForResend'));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: getLoginRedirectUrl(),
        },
      });

      if (error) {
        throw error;
      }

      setStatusMessage(t('auth.status.resendSent'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('auth.errors.resendFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.16),_transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_45%,#f0f9ff_100%)] px-4 py-8 xl:px-8 xl:py-14">
      <div className="app-shell-bg" aria-hidden="true">
        <div className="app-shell-orb app-shell-orb-1" />
        <div className="app-shell-orb app-shell-orb-2" />
        <div className="app-shell-orb app-shell-orb-3" />
      </div>

      <div className="mx-auto grid max-w-[1480px] gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(430px,500px)] xl:gap-8 items-stretch relative z-10">
        <section className="glass-card-strong rounded-[32px] p-6 md:p-8 xl:p-10 text-right flex flex-col justify-between xl:min-h-[680px]">
          <div>
            <div className="inline-flex items-center gap-3 bg-white/70 border border-white/70 rounded-2xl px-4 py-3 shadow-sm">
              <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-md">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-black text-gray-950">{t('auth.brand')}</h1>
                <p className="text-xs font-bold text-indigo-600">{t('auth.loginGatewayBadge')}</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-indigo-700/80 bg-white/70 border border-white/70 px-3 py-1.5 rounded-full uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Secure Access Layer
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 leading-tight">
                {t('auth.signInHeading')}
              </h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-2xl">
                {t('auth.supabaseAuthDesc')}
              </p>
            </div>
          </div>

          <div className="grid gap-3 mt-8 sm:grid-cols-3 xl:mt-12 xl:gap-4">
            <div className="stat-card rounded-2xl p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-600 mb-3" />
              <h3 className="font-black text-sm text-gray-900">{t('auth.features.protectedAccounts')}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('auth.features.protectedAccountsDesc')}</p>
            </div>
            <div className="stat-card rounded-2xl p-4">
              <LockKeyhole className="h-5 w-5 text-indigo-600 mb-3" />
              <h3 className="font-black text-sm text-gray-900">{t('auth.features.restrictedAccess')}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('auth.features.restrictedAccessDesc')}</p>
            </div>
            <div className="stat-card rounded-2xl p-4">
              <Mail className="h-5 w-5 text-sky-600 mb-3" />
              <h3 className="font-black text-sm text-gray-900">{t('auth.features.emailLogin')}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('auth.features.emailLoginDesc')}</p>
            </div>
          </div>
        </section>

        <section className="glass-card-strong rounded-[32px] p-6 md:p-8 xl:p-10 text-right flex flex-col justify-center xl:min-h-[680px]">
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            {t('auth.accountProvisionNote')}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 xl:space-y-5 xl:max-w-[440px]">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-2">{t('auth.fields.email')}</label>
              <div className="relative">
                <TextField
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@store.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  className="text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-2">{t('auth.fields.password')}</label>
              <div className="relative">
                <TextField
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  leftIcon={<LockKeyhole className="h-4 w-4" />}
                  className="text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {configError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-xs leading-relaxed">
                {configError}
              </div>
            )}

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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={Boolean(configError)}
            >
              {t('auth.buttons.login')}
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 text-xs font-bold text-indigo-600">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={isSubmitting}
                disabled={Boolean(configError)}
                onClick={() => {
                  void handleResetPassword();
                }}
              >
                {t('auth.buttons.forgotPassword')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                loading={isSubmitting}
                disabled={Boolean(configError)}
                onClick={() => {
                  void handleResendConfirmation();
                }}
              >
                {t('auth.buttons.resendConfirmation')}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
