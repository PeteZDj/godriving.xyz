import { useEffect, useState } from 'react';
import { MapPin, Phone, Star, BadgeCheck, Search, X, Send, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface School {
  id: number;
  name: string;
  country: string;
  city: string;
  description: string;
  phone: string;
  email: string;
  logo: string;
  rating: number;
  price_from: number | null;
  verified: boolean;
  featured: boolean;
}

export default function Schools() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [country, setCountry] = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<School | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (search) params.set('q', search);
    api<{ schools: School[] }>(`/schools?${params}`).then((d) => setSchools(d.schools)).catch(() => {});
  };

  useEffect(load, [country]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const countries = ['', 'Kenya', 'Uganda', 'Tanzania', 'Rwanda'];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-go">Our Network</div>
        <h1 className="mb-3 font-display text-4xl font-bold text-ink">Find a trusted driving school</h1>
        <p className="text-ink/60">Verified partners ready to take you from GoDriving games to a real licence.</p>
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or city…"
            className="w-full rounded-xl border border-black/10 py-3 pl-12 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {countries.map((c) => (
            <button
              key={c || 'all'}
              onClick={() => setCountry(c)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                country === c ? 'bg-brand text-white' : 'bg-black/5 text-ink/70 hover:bg-black/10'
              }`}
            >
              {c || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {schools.map((s) => (
          <div key={s.id} className="flex flex-col rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg">
            <div className="mb-4 flex items-start gap-4">
              <img src={s.logo} alt={s.name} className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-ink">{s.name}</h3>
                  {s.verified && <BadgeCheck className="h-4 w-4 text-brand" />}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-sm text-ink/50">
                  <MapPin className="h-3.5 w-3.5" /> {s.city}, {s.country}
                </div>
              </div>
            </div>
            <p className="mb-4 flex-1 text-sm leading-relaxed text-ink/60">{s.description}</p>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 font-medium text-amber-500">
                <Star className="h-4 w-4 fill-amber-400" /> {s.rating}
              </span>
              {s.price_from && <span className="text-ink/60">from {s.price_from.toLocaleString()}/-</span>}
            </div>
            <button
              onClick={() => setActive(s)}
              className="rounded-xl bg-brand/10 py-2.5 text-sm font-semibold text-brand hover:bg-brand/15"
            >
              Get connected
            </button>
          </div>
        ))}
      </div>
      {schools.length === 0 && <p className="mt-10 text-center text-ink/50">No schools found. Try a different search.</p>}

      {active && <LeadModal school={active} user={user} onClose={() => setActive(null)} />}
    </div>
  );
}

function LeadModal({ school, user, onClose }: { school: School; user: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    message: `Hi, I'd like to enroll at ${school.name}.`,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/leads', { body: { ...form, school_id: school.id, user_id: user?.id } });
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-ink">Connect with {school.name}</h3>
            <p className="text-sm text-ink/60">{school.city}, {school.country}</p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="rounded-xl bg-go/10 p-6 text-center">
            <BadgeCheck className="mx-auto mb-2 h-10 w-10 text-go" />
            <p className="font-semibold text-ink">Request sent!</p>
            <p className="text-sm text-ink/60">{school.name} will reach out to you soon.</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-brand px-6 py-2.5 font-semibold text-white">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {err && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</div>}
            <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand" />
            <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand" />
            <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand" />
            <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand" />
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Send request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
