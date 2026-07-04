import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../lib/auth';
import { AuthShell, Field } from './Login';

export default function Signup() {
  const { signup, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', city: '', country: 'Kenya' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signup(form);
      nav('/dashboard');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Free forever. Start earning XP in seconds.">
      {/* Google Sign-Up */}
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
          width="368"
          text="signup_with"
          shape="rectangular"
        />
      </div>

      <div className="relative my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10" />
        <span className="text-xs text-ink/40">or sign up with email</span>
        <div className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{err}</div>}
        <Field label="Full name" value={form.name} onChange={set('name')} placeholder="Jane Wanjiru" />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={form.city} onChange={set('city')} placeholder="Nairobi" required={false} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink/80">Country</span>
            <select
              value={form.country}
              onChange={(e) => set('country')(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              {['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Nigeria', 'Ghana', 'South Africa', 'Other'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/60">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
