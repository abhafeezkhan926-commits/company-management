import type React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { api, apiError } from '@/services/api';
import { connectSocket } from '@/services/socket';
import { useAuthStore } from '@/stores/auth';
import { Logo } from '@/components/Logo';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

export function EntryPage() {
  return (
    <div className="entry-page">
      <div className="entry-card">
        <Logo />
        <div className="entry-copy">
          <span className="eyebrow">Internal operations platform</span>
          <h1>Choose how you want to enter.</h1>
          <p>Secure company workspace for projects, tasks, attendance, leave and approvals.</p>
        </div>
        <div className="entry-actions">
          <Link className="entry-btn primary" to="/login/worker">
            <span>Login as Worker</span>
            <small>Employee workspace</small>
          </Link>
          <Link className="entry-btn secondary" to="/login/admin">
            <span>Login as Admin</span>
            <small>Management workspace</small>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LoginPage({ role }: { role: 'worker' | 'admin' }) {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginValues) {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post(`/auth/login/${role}`, values);
      setSession(data.token, data.user);
      connectSocket(data.token);
      navigate(data.user.role === 'admin' ? '/admin' : '/worker');
    } catch (error) {
      setError(await apiError(error));
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = role === 'admin';

  return (
    <AuthLayout
      title={isAdmin ? 'Admin sign in' : 'Worker sign in'}
      subtitle="Use your company account to continue."
    >
      <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)}>
        <Field
          label="Email"
          type="email"
          placeholder="name@company.com"
          autoComplete="email"
          {...form.register('email')}
        />
        {form.formState.errors.email ? <small className="error-text">{form.formState.errors.email.message}</small> : null}

        <Field
          label="Password"
          type="password"
          placeholder="Your password"
          autoComplete="current-password"
          {...form.register('password')}
        />
        {form.formState.errors.password ? <small className="error-text">{form.formState.errors.password.message}</small> : null}

        {error ? <div className="alert danger">{error}</div> : null}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {!isAdmin ? (
        <div className="auth-foot">
          <span>New employee?</span>
          <Link to="/signup">Create worker account</Link>
        </div>
      ) : (
        <div className="auth-note">Administrator access is restricted to the admin role.</div>
      )}

      <Link className="back-link" to="/">← Back</Link>
    </AuthLayout>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      jobTitle: '',
      department: '',
    },
  });

  async function onSubmit(values: SignupValues) {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/signup', values);
      setSession(data.token, data.user);
      connectSocket(data.token);
      navigate('/worker');
    } catch (error) {
      setError(await apiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create worker account"
      subtitle="Your account will be stored in MongoDB and available for company workflows."
    >
      <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)}>
        <Field label="Full name" placeholder="Full name" autoComplete="name" {...form.register('name')} />
        {form.formState.errors.name ? <small className="error-text">{form.formState.errors.name.message}</small> : null}

        <Field label="Work email" type="email" placeholder="name@company.com" autoComplete="email" {...form.register('email')} />
        {form.formState.errors.email ? <small className="error-text">{form.formState.errors.email.message}</small> : null}

        <Field label="Job title" placeholder="Job title" {...form.register('jobTitle')} />
        <Field label="Department" placeholder="Department" {...form.register('department')} />

        <Field label="Password" type="password" placeholder="Minimum 8 characters" autoComplete="new-password" {...form.register('password')} />
        {form.formState.errors.password ? <small className="error-text">{form.formState.errors.password.message}</small> : null}

        {error ? <div className="alert danger">{error}</div> : null}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <div className="auth-foot">
        <span>Already have an account?</span>
        <Link to="/login/worker">Worker sign in</Link>
      </div>

      <Link className="back-link" to="/">← Back</Link>
    </AuthLayout>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><Logo /></div>
        <div className="auth-heading">
          <span className="eyebrow">Raven Operations</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
