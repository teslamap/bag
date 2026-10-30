import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Checkbox, FormError, Input } from '@/components/ui/Input';
import { InlineNotice } from '@/components/ui/Feedback';
import { SafeImage } from '@/components/ui/SafeImage';
import { Seo } from '@/components/system/Seo';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { errorMessage } from '@/lib/errors';
import { loginSchema, registerSchema, passwordSchema } from '@/lib/validation';
import { DEMO_ACCOUNTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from '@/state/toast';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const MODE_COPY: Record<Mode, { eyebrow: string; title: string; subtitle: string }> = {
  login: { eyebrow: 'კეთილი იყოს თქვენი დაბრუნება', title: 'შესვლა', subtitle: 'გაიარეთ ავტორიზაცია შეკვეთების, რჩეულებისა და მისამართების სამართავად.' },
  register: { eyebrow: 'შექმენით ანგარიში', title: 'რეგისტრაცია', subtitle: 'შეინახეთ რჩეულები, თვალყური ადევნეთ შეკვეთებს და ისარგებლეთ სწრაფი გადახდით.' },
  forgot: { eyebrow: 'პაროლის აღდგენა', title: 'დაგავიწყდათ პაროლი?', subtitle: 'შეიყვანეთ ელფოსტა და გამოგიგზავნით პაროლის აღდგენის ბმულს.' },
  reset: { eyebrow: 'ბოლო ნაბიჯი', title: 'ახალი პაროლი', subtitle: 'შეიყვანეთ ელფოსტაზე მიღებული კოდი და აირჩიეთ ახალი პაროლი.' },
};

function roleHome(role: string | undefined) {
  if (role === 'admin') return '/admin';
  if (role === 'manager') return '/manager';
  return '/account';
}

export function AuthPage() {
  const [params, setParams] = useSearchParams();
  const mode = (params.get('mode') === 'resetPassword' ? 'reset' : params.get('mode') as Mode) || 'login';
  const next = params.get('next') ?? '';
  const snapshot = useBackendSnapshot();
  const navigate = useNavigate();
  const copy = MODE_COPY[mode] ?? MODE_COPY.login;

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [code, setCode] = useState(params.get('oobCode') ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [deliveredEmail, setDeliveredEmail] = useState('');

  const setMode = (nextMode: Mode) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('mode', nextMode);
    if (nextMode !== 'reset') nextParams.delete('email');
    setParams(nextParams);
    setErrors({});
    setFormError('');
  };

  const destination = useMemo(() => {
    if (next && next.startsWith('/')) return next;
    return roleHome(snapshot.session?.role);
  }, [next, snapshot.session?.role]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setErrors({});

    if (mode === 'login') {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
        setErrors(nextErrors);
        return;
      }
      setLoading(true);
      try {
        const session = await backend.login(email, password);
        toast('კეთილი იყოს თქვენი დაბრუნება', { message: `${session.firstName}, წარმატებით შეხვედით.` });
        navigate(next && next.startsWith('/') ? next : roleHome(session.role), { replace: true });
      } catch (error) {
        setFormError(errorMessage(error));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      const parsed = registerSchema.safeParse({ firstName, lastName, email, phone, password, acceptTerms });
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
        setErrors(nextErrors);
        return;
      }
      setLoading(true);
      try {
        const session = await backend.register({ firstName, lastName, email, phone, password });
        toast('ანგარიში შექმნილია', { message: 'კეთილი იყოს თქვენი მობრძანება MAKU-ში.' });
        navigate(next && next.startsWith('/') ? next : roleHome(session.role), { replace: true });
      } catch (error) {
        setFormError(errorMessage(error));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'forgot') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
        setErrors({ email: 'ელფოსტა არასწორია.' });
        return;
      }
      setLoading(true);
      try {
        const result = await backend.requestPasswordReset(email.trim());
        setDeliveredEmail(email.trim());
        if (snapshot.backendMode === 'firebase') {
          toast('ბმული გამოგზავნილია', { message: 'პაროლი შეცვალეთ ელფოსტაზე მიღებული ბმულით.' });
          return;
        }
        if (result.demoCode) setDemoCode(result.demoCode);
        setMode('reset');
        const nextParams = new URLSearchParams(params);
        nextParams.set('mode', 'reset');
        nextParams.set('email', email.trim());
        setParams(nextParams);
        toast('კოდი გამოგზავნილია', { message: 'შეამოწმეთ ელფოსტა.' });
      } catch (error) {
        setFormError(errorMessage(error));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'reset') {
      const errors: Record<string, string> = {};
      if (!email.trim()) errors.email = 'შეიყვანეთ ელფოსტა.';
      if (snapshot.backendMode === 'demo' ? !/^\d{6}$/.test(code.trim()) : !code.trim()) errors.code = 'აღდგენის კოდი არასწორია.';
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) errors.password = passwordResult.error.issues[0]?.message ?? 'პაროლი არასწორია.';
      if (password !== confirmPassword) errors.confirmPassword = 'პაროლები არ ემთხვევა.';
      if (Object.keys(errors).length) {
        setErrors(errors);
        return;
      }
      setLoading(true);
      try {
        await backend.resetPassword(email.trim(), code.trim(), password);
        toast('პაროლი შეიცვალა', { message: 'ახლა შეგიძლიათ შეხვიდეთ ახალი პაროლით.' });
        setPassword('');
        setConfirmPassword('');
        setCode('');
        setDemoCode('');
        setMode('login');
      } catch (error) {
        setFormError(errorMessage(error));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="storefront-theme grid min-h-[100dvh] bg-ivory lg:grid-cols-[1fr_0.9fr]">
      <Seo title={copy.title} noIndex description={copy.subtitle} />
      <div className="relative hidden overflow-hidden bg-forest lg:block">
        <SafeImage source="editorial-brand" alt="MAKU ატელიე" wrapperClassName="absolute inset-0" className="opacity-80" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/10 to-forest/30" />
        <div className="relative flex h-full flex-col justify-between p-10 text-ivory xl:p-14">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-ivory/70 transition-colors hover:text-ivory">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            მაღაზიაში დაბრუნება
          </Link>
          <div>
            <p className="text-[9px] uppercase tracking-[0.26em] text-champagne">ატელიე · თბილისი</p>
            <p className="mt-5 max-w-md font-display text-5xl font-light leading-[1.05] tracking-display">
              ობიექტები,<br />რომლებიც<br />დროს უძლებს
            </p>
            <p className="mt-6 max-w-sm text-[12px] leading-relaxed text-ivory/65">
              თქვენი ანგარიში ინახავს რჩეულებს, მისამართებს, შეკვეთების ისტორიას და ატელიეს შეტყობინებებს.
            </p>
          </div>
          <p className="text-[8px] uppercase tracking-[0.2em] text-ivory/65">© MAKU {new Date().getFullYear()}</p>
        </div>
      </div>

      <div className="flex flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <BrandMark />
          <Link to="/" className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-ink/65 hover:text-ink lg:hidden">
            <ArrowLeft className="h-3 w-3" aria-hidden /> უკან
          </Link>
          <span className="hidden text-[9px] uppercase tracking-[0.16em] text-ink/65 sm:block">უსაფრთხო ანგარიში</span>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-8 md:px-10">
          <div className="w-full max-w-md">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="mt-3 font-display text-5xl font-light tracking-display">{copy.title}</h1>
            <p className="mt-4 text-[12px] leading-relaxed text-ink/65">{copy.subtitle}</p>

            {snapshot.backendMode === 'firebase' && deliveredEmail && <div className="mt-6"><InlineNotice tone="success">პაროლის აღდგენის ბმული გაიგზავნა {deliveredEmail}-ზე. გახსენით მიღებული ბმული.</InlineNotice></div>}
            {snapshot.backendMode === 'demo' && mode === 'reset' && (demoCode || deliveredEmail) && (
              <div className="mt-6">
                <InlineNotice tone="warning">
                  დემო რეჟიმი: პაროლის აღდგენის კოდია <strong className="font-semibold tracking-[0.2em]">{demoCode || '—'}</strong>.
                  რეალურ გარემოში კოდი გაიგზავნება {deliveredEmail || email}-ზე.
                </InlineNotice>
              </div>
            )}

            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
              {mode === 'register' && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="სახელი" value={firstName} onChange={(event) => setFirstName(event.target.value)} error={errors.firstName} autoComplete="given-name" required />
                  <Input label="გვარი" value={lastName} onChange={(event) => setLastName(event.target.value)} error={errors.lastName} autoComplete="family-name" required />
                </div>
              )}

              {mode !== 'reset' && (
                <Input
                  label="ელფოსტა"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={errors.email}
                  autoComplete="email"
                  leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
                  required
                />
              )}

              {mode === 'reset' && (
                <>
                  <Input label="ელფოსტა" type="email" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} autoComplete="email" required />
                  <Input label="აღდგენის კოდი" value={code} onChange={(event) => setCode(snapshot.backendMode === 'demo' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)} error={errors.code} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" required />
                </>
              )}

              {mode === 'register' && (
                <Input label="ტელეფონი" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} error={errors.phone} autoComplete="tel" placeholder="+995 5xx xx xx xx" required />
              )}

              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <div className="relative">
                  <Input
                    label={mode === 'reset' ? 'ახალი პაროლი' : 'პაროლი'}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    error={errors.password}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    leadingIcon={<LockKeyhole className="h-4 w-4" aria-hidden />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'}
                    className="absolute right-0 top-[26px] text-ink/65 transition-colors hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                  {mode === 'register' && <p className="mt-2 text-[9px] text-ink/65">მინიმუმ 8 სიმბოლო, ერთი ლათინური ასო და ციფრი.</p>}
                </div>
              )}

              {mode === 'reset' && (
                <Input
                  label="გაიმეორეთ პაროლი"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  error={errors.confirmPassword}
                  autoComplete="new-password"
                  required
                />
              )}

              {mode === 'register' && (
                <Checkbox
                  label={<>ვეთანხმები <Link to="/terms" className="underline underline-offset-2">წესებსა და პირობებს</Link> და <Link to="/privacy" className="underline underline-offset-2">კონფიდენციალურობის პოლიტიკას</Link>.</>}
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  error={errors.acceptTerms}
                />
              )}

              {formError && <FormError>{formError}</FormError>}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode('forgot')} className="text-[10px] text-ink/65 underline underline-offset-2 hover:text-ink">
                    პაროლი დაგავიწყდათ?
                  </button>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                {mode === 'login' ? 'შესვლა' : mode === 'register' ? 'ანგარიშის შექმნა' : mode === 'forgot' ? (snapshot.backendMode === 'firebase' ? 'ბმულის გაგზავნა' : 'კოდის გაგზავნა') : 'პაროლის შეცვლა'}
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[10px] text-ink/65">
              {mode === 'login' ? (
                <p>ანგარიში არ გაქვთ?{' '}
                  <button type="button" onClick={() => setMode('register')} className="text-ink underline underline-offset-2">დარეგისტრირდით</button>
                </p>
              ) : (
                <p>უკვე გაქვთ ანგარიში?{' '}
                  <button type="button" onClick={() => setMode('login')} className="text-ink underline underline-offset-2">შესვლა</button>
                </p>
              )}
              {mode !== 'login' && (
                <button type="button" onClick={() => setMode('login')} className="inline-flex items-center gap-1 hover:text-ink">
                  <ArrowLeft className="h-3 w-3" aria-hidden /> უკან
                </button>
              )}
            </div>

            {DEMO_ACCOUNTS.length > 0 && snapshot.backendMode === 'demo' && mode === 'login' && (
              <div className="mt-10 border-t border-ink/10 pt-6">
                <p className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-ink/65">
                  <Sparkles className="h-3.5 w-3.5 text-champagne" aria-hidden />
                  დემო ანგარიშები
                </p>
                <div className="mt-3 grid gap-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(account.password);
                        setErrors({});
                      }}
                      className="flex items-center justify-between gap-3 border border-ink/10 px-3.5 py-2.5 text-left transition-colors hover:border-ink/30 hover:bg-warmwhite/60"
                    >
                      <div>
                        <p className="text-[10px] font-medium">{account.role}</p>
                        <p className="mt-0.5 text-[9px] text-ink/65">{account.email}</p>
                      </div>
                      <span className="text-[8px] uppercase tracking-[0.14em] text-ink/65">შევსება</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[9px] leading-relaxed text-ink/65">
                  დემო რეჟიმში ყველა მონაცემი ინახება მხოლოდ ამ ბრაუზერში. პაროლები: Admin123! · Manager123! · Customer123!
                </p>
              </div>
            )}

            <p className="mt-8 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.14em] text-ink/65">
              <LockKeyhole className="h-3 w-3" aria-hidden />
              დაშიფრული სესია · 7 დღე
            </p>
          </div>
        </div>
        <footer className="px-6 py-5 text-center text-[9px] uppercase tracking-[0.14em] text-ink/65 md:px-10">
          <Link to="/privacy" className="hover:text-ink">კონფიდენციალურობა</Link>
          <span className="mx-2">·</span>
          <Link to="/terms" className="hover:text-ink">პირობები</Link>
          <span className="mx-2">·</span>
          <Link to="/contact" className="hover:text-ink">დახმარება</Link>
        </footer>
      </div>
    </div>
  );
}
