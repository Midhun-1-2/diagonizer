import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { DEMO_ACCOUNTS } from '../data/seed'
import { setSession, useLab, useSession } from '../data/store'
import { SplitWords } from '../components/ui/Common'
import { Field, Input } from '../components/ui/Field'
import { HOME_FOR_ROLE, ROLE_LABEL } from '../components/layout/nav'
import { LogoMark, Wordmark } from '../components/layout/Logo'
import { ThemeMenu } from '../components/layout/ThemePicker'
import { initials } from '../utils/format'

const schema = z.object({
  email: z.email('Enter the email address for your lab account'),
  password: z.string().min(1, 'Enter your password'),
})
type LoginValues = z.infer<typeof schema>

const AUTH_DELAY = 620

const SCOPE: Record<string, string> = {
  owner: 'Everything, including reports and settings',
  billing: 'Patients, billing, payments and invoices',
  technical: 'Lab results and patients',
}

export default function Login() {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const labName = useLab((state) => state.settings.labName)
  const [reveal, setReveal] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [failure, setFailure] = useState('')
  const [shake, setShake] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  if (session && !signingIn) return <Navigate to={HOME_FOR_ROLE[session.role]} replace />

  const submit = (values: LoginValues) => {
    setFailure('')
    const account = DEMO_ACCOUNTS.find((a) => a.email === values.email.trim().toLowerCase() && a.password === values.password)
    if (!account) {
      setFailure('That email and password do not match. Use one of the demo accounts below.')
      setShake(true)
      return
    }
    setSigningIn(true)
    window.setTimeout(() => {
      setSession({ email: account.email, name: account.name, role: account.role })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/' ? from : HOME_FOR_ROLE[account.role], { replace: true })
    }, AUTH_DELAY)
  }

  return (
    <div className="relative flex min-h-dvh flex-col px-4 py-4 md:px-8 md:py-6">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <LogoMark className="size-8" onStage />
          <Wordmark onStage />
        </span>
        <div className="slab-stage fixed top-3 right-3 z-40 rounded-full p-1 md:top-5 md:right-7">
          <ThemeMenu />
        </div>
      </header>

      <div className="grid flex-1 items-center gap-x-10 gap-y-6 py-6 lg:grid-cols-[minmax(380px,460px)_1fr]">
        <div className="deal order-2 lg:order-1">
          <main className={`slab scan p-5 sm:p-7 ${shake ? 'shake' : ''}`} onAnimationEnd={() => setShake(false)}>
            <h2 className="font-display text-[22px] font-bold tracking-[-0.025em] text-ink">Sign in</h2>
            <p className="mt-0.5 text-ink-2">{labName}</p>

            <form onSubmit={handleSubmit(submit)} noValidate className="mt-5 space-y-3.5">
              <Field label="Email" error={errors.email?.message}>
                {(field) => <Input type="email" autoComplete="username" placeholder="name@yourlab.com" {...field} {...register('email')} />}
              </Field>
              <Field label="Password" error={errors.password?.message}>
                {(field) => (
                  <span className="relative block">
                    <Input type={reveal ? 'text' : 'password'} autoComplete="current-password" className="pr-11" {...field} {...register('password')} />
                    <button type="button" onClick={() => setReveal((value) => !value)} aria-label={reveal ? 'Hide password' : 'Show password'} className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:text-ink">
                      {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                )}
              </Field>

              {failure && (
                <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
                  {failure}
                </p>
              )}

              <button type="submit" data-magnetic="" disabled={signingIn} className="key key-primary flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl font-display font-semibold">
                {signingIn ? 'Opening the lab' : 'Sign in'}
                {!signingIn && <ArrowRight size={17} aria-hidden />}
              </button>
            </form>

            <section aria-label="Demo accounts" className="mt-5 border-t border-line pt-4">
              <p className="text-[13px] font-semibold text-ink">Prototype accounts</p>
              <p className="text-[13px] text-ink-2">Pick a role to fill in the form.</p>
              <ul className="mt-2 grid gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('email', account.email, { shouldValidate: true })
                        setValue('password', account.password, { shouldValidate: true })
                        setFailure('')
                      }}
                      className="key flex min-h-13 w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-text" aria-hidden>
                        {initials(account.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink">{ROLE_LABEL[account.role]}</span>
                        <span className="block truncate text-xs text-ink-3">{SCOPE[account.role]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        </div>

        <div className="hero-scroll stage-title order-1 min-w-0 lg:order-2 lg:self-end lg:pb-8 lg:text-right">
          <p className="mb-3 font-mono text-[11px] tracking-[0.28em] text-on-stage-2 uppercase">C₆H₁₂O₆ · Fasting blood sugar · 70 – 100 mg/dL</p>
          <h1 className="font-display text-[clamp(2.4rem,6.6vw,6rem)] leading-[1.02] font-bold tracking-[-0.04em] text-on-stage">
            <SplitWords text="Every sample, billed in seconds." />
          </h1>
        </div>
      </div>
    </div>
  )
}
