import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to keep learning and climbing the leaderboard.">
      {/* Google Sign-In */}
      <div className="flex justify-center mb-4">
        <GoogleLogin
          onSuccess={async (cred) => {
            try {
              await loginWithGoogle(cred);
              nav('/dashboard');
            } catch (e: any) {
              setErr(e.message);
            }
          }}
          onError={() => setErr('Google sign-in failed. Please try again.')}
          useOneTap
          width="368"
          text="signin_with"
          shape="rectangular"
        />
      </div>

      <div className="relative my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10" />
        <span className="text-xs text-ink/40">or continue with email</span>
        <div className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{err}</div>}
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
          Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/60">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-brand hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: any) {
  return (
    <div className="relative overflow-hidden py-16">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/8 via-white to-go/5" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto max-w-md px-4"
      >
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-xl">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-ink/60">{subtitle}</p>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export function Field({ label, type = 'text', value, onChange, placeholder, required = true }: any) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/80">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
