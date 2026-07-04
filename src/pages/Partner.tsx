import { useState } from 'react';
import { Handshake, BadgeCheck, Loader2, TrendingUp, Users, MapPin } from 'lucide-react';
import { api } from '../lib/api';

export default function Partner() {
  const [form, setForm] = useState({
    name: '', country: 'Kenya', city: '', description: '', phone: '', email: '', website: '', price_from: '',
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/schools', { body: { ...form, price_from: form.price_from ? Number(form.price_from) : null } });
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden py-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/8 via-white to-go/5" />
        <div className="container mx-auto grid items-center gap-12 px-4 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-5 py-2.5 text-sm text-brand">
              <Handshake className="h-4 w-4" /> For Driving Schools
            </div>
            <h1 className="mb-5 font-display text-4xl font-bold text-ink md:text-5xl">Grow your driving school with GoDriving</h1>
            <p className="mb-8 max-w-md text-lg text-ink/70">
              We turn learners into enrolled students and share revenue fairly. List your school,
              get a verified badge, and receive qualified leads from your city.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Perk icon={Users} title="Qualified leads" />
              <Perk icon={TrendingUp} title="Revenue share" />
              <Perk icon={MapPin} title="Local visibility" />
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-xl">
            {done ? (
              <div className="py-8 text-center">
                <BadgeCheck className="mx-auto mb-3 h-14 w-14 text-go" />
                <h3 className="font-display text-2xl font-bold text-ink">Application received!</h3>
                <p className="mt-2 text-ink/60">
                  Thanks for applying to partner with GoDriving. Our team will verify your school and get in touch shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <h3 className="font-display text-xl font-bold text-ink">Apply to partner</h3>
                {err && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</div>}
                <input required placeholder="School name" value={form.name} onChange={set('name')} className={inp} />
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="City" value={form.city} onChange={set('city')} className={inp} />
                  <select value={form.country} onChange={set('country')} className={inp}>
                    {['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Nigeria', 'Ghana', 'Other'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Phone" value={form.phone} onChange={set('phone')} className={inp} />
                  <input type="email" placeholder="Email" value={form.email} onChange={set('email')} className={inp} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Website" value={form.website} onChange={set('website')} className={inp} />
                  <input placeholder="Price from (e.g. 12000)" value={form.price_from} onChange={set('price_from')} className={inp} />
                </div>
                <textarea rows={3} placeholder="Tell us about your school…" value={form.description} onChange={set('description')} className={inp} />
                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark disabled:opacity-60">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Handshake className="h-5 w-5" />} Submit application
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const inp = 'w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

function Perk({ icon: Icon, title }: any) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 text-center shadow-sm">
      <Icon className="mx-auto mb-2 h-6 w-6 text-brand" />
      <div className="text-sm font-medium text-ink">{title}</div>
    </div>
  );
}
