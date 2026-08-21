import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Users, Loader2, Search, BadgeCheck, Phone, Mail, Globe,
  MapPin, Plus, Save, StickyNote, TrendingUp, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface School {
  id: number;
  name: string;
  country: string;
  city: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo: string;
  rating: number;
  price_from?: number | null;
  verified: boolean;
}

interface Student {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
  xp?: number | null;
  level?: number | null;
  user_city?: string | null;
}

const STATUSES = ['new', 'contacted', 'enrolled', 'archived'] as const;
const STATUS_STYLE: Record<string, string> = {
  new: 'bg-brand/10 text-brand',
  contacted: 'bg-amber-400/15 text-amber-600',
  enrolled: 'bg-go/15 text-go-dark',
  archived: 'bg-black/5 text-ink/50',
};

export default function SchoolDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);

  const loadSchool = async () => {
    setLoading(true);
    try {
      const { school } = await api<{ school: School | null }>('/school/me');
      setSchool(school);
    } catch {
      setSchool(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchool();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-brand">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">School dashboard</h1>
          <p className="text-sm text-ink/60">Manage your listing and the students who want to enrol.</p>
        </div>
      </div>

      {school ? (
        <ManageSchool school={school} onUpdated={setSchool} />
      ) : (
        <Onboard user={user} onLinked={setSchool} />
      )}
    </div>
  );
}

/* ---------------- Onboarding: claim or register ---------------- */
function Onboard({ user, onLinked }: { user: any; onLinked: (s: School) => void }) {
  const [mode, setMode] = useState<'claim' | 'new'>('claim');

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <p className="mb-6 text-ink/70">
        Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! Connect your driving school to start
        receiving and managing students from GoDriving.
      </p>

      <div className="mb-6 inline-flex rounded-xl bg-black/5 p-1">
        <button
          onClick={() => setMode('claim')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === 'claim' ? 'bg-white text-brand shadow-sm' : 'text-ink/60'}`}
        >
          Claim a listed school
        </button>
        <button
          onClick={() => setMode('new')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === 'new' ? 'bg-white text-brand shadow-sm' : 'text-ink/60'}`}
        >
          Add a new school
        </button>
      </div>

      {mode === 'claim' ? <ClaimSchool onLinked={onLinked} /> : <NewSchool onLinked={onLinked} />}
    </div>
  );
}

function ClaimSchool({ onLinked }: { onLinked: (s: School) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      api<{ schools: School[] }>(`/school/claimable?${p}`).then((d) => setResults(d.schools)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const claim = async (id: number) => {
    setBusyId(id);
    setErr('');
    try {
      const { school } = await api<{ school: School }>('/school/claim', { body: { school_id: id } });
      onLinked(school);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your school by name or city…"
          className="w-full rounded-xl border border-black/10 py-3 pl-12 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>
      {err && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {results.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-black/5 p-3">
            <img src={s.logo} alt={s.name} className="h-10 w-10 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 truncate text-sm font-semibold text-ink">
                {s.name} {s.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" />}
              </div>
              <div className="truncate text-xs text-ink/50">{s.city}, {s.country}</div>
            </div>
            <button
              onClick={() => claim(s.id)}
              disabled={busyId === s.id}
              className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Claim'}
            </button>
          </div>
        ))}
        {results.length === 0 && <p className="text-sm text-ink/50">No unclaimed schools match. Try “Add a new school”.</p>}
      </div>
    </div>
  );
}

function NewSchool({ onLinked }: { onLinked: (s: School) => void }) {
  const [form, setForm] = useState({ name: '', city: '', country: 'Kenya', phone: '', email: '', website: '', price_from: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { school } = await api<{ school: School }>('/school/register', {
        body: { ...form, price_from: form.price_from ? parseInt(form.price_from, 10) : null },
      });
      onLinked(school);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {err && <p className="sm:col-span-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{err}</p>}
      <input required placeholder="School name" value={form.name} onChange={(e) => set('name', e.target.value)} className={field} />
      <input required placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} className={field} />
      <input placeholder="Country" value={form.country} onChange={(e) => set('country', e.target.value)} className={field} />
      <input placeholder="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={field} />
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} className={field} />
      <input placeholder="Website (https://…)" value={form.website} onChange={(e) => set('website', e.target.value)} className={field} />
      <input placeholder="Price from (e.g. 12000)" value={form.price_from} onChange={(e) => set('price_from', e.target.value)} className={field} />
      <input placeholder="Short description" value={form.description} onChange={(e) => set('description', e.target.value)} className={`${field} sm:col-span-2`} />
      <button disabled={busy} className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Create my school
      </button>
    </form>
  );
}

/* ---------------- Manage: profile + students ---------------- */
function ManageSchool({ school, onUpdated }: { school: School; onUpdated: (s: School) => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<{ status: string; c: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Student | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await api<{ students: Student[]; stats: { status: string; c: number }[] }>('/school/students');
      setStudents(d.students);
      setStats(d.stats);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = { new: 0, contacted: 0, enrolled: 0, archived: 0 };
    stats.forEach((s) => (m[s.status] = s.c));
    return m;
  }, [stats]);

  const shown = filter === 'all' ? students : students.filter((s) => s.status === filter);

  const patch = async (id: number, body: { status?: string; notes?: string }) => {
    const { student } = await api<{ student: Student }>(`/school/students/${id}`, { method: 'PATCH', body });
    setStudents((list) => list.map((s) => (s.id === id ? { ...s, ...student } : s)));
    load();
  };

  return (
    <div className="space-y-6">
      {/* School header card */}
      <div className="flex flex-col gap-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <img src={school.logo} alt={school.name} className="h-16 w-16 rounded-2xl object-cover" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ink">{school.name}</h2>
            {school.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand"><BadgeCheck className="h-3.5 w-3.5" /> Verified</span>
            ) : (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-600">Pending review</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink/50">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {school.city}, {school.country}</span>
            {school.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {school.phone}</span>}
            {school.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {school.email}</span>}
            {school.website && <a href={school.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline"><Globe className="h-3.5 w-3.5" /> Website</a>}
          </div>
        </div>
        <Link to="/schools" className="rounded-xl bg-black/5 px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-black/10">View public listing</Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total students" value={students.length} icon={Users} tone="text-ink" />
        <StatCard label="New" value={counts.new} icon={TrendingUp} tone="text-brand" />
        <StatCard label="Contacted" value={counts.contacted} icon={Phone} tone="text-amber-600" />
        <StatCard label="Enrolled" value={counts.enrolled} icon={GraduationCap} tone="text-go-dark" />
      </div>

      {/* Filter + list */}
      <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-ink">Students</h3>
          <div className="flex flex-wrap gap-1.5">
            {['all', ...STATUSES].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-brand text-white' : 'bg-black/5 text-ink/60 hover:bg-black/10'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10 text-brand"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl bg-black/[0.02] py-12 text-center text-sm text-ink/50">
            No students yet. Students who request to connect from your listing will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {shown.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-black/5 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{s.name}</span>
                    {s.level != null && (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">Lv{s.level} · {s.xp} XP</span>
                    )}
                    {s.notes && <StickyNote className="h-3.5 w-3.5 text-amber-500" />}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink/50">
                    <a href={`mailto:${s.email}`} className="hover:text-brand">{s.email}</a>
                    {s.phone && <a href={`tel:${s.phone}`} className="hover:text-brand">{s.phone}</a>}
                    <span>{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  {s.message && <p className="mt-1 line-clamp-1 text-xs italic text-ink/50">“{s.message}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={s.status}
                    onChange={(e) => patch(s.id, { status: e.target.value })}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize outline-none ${STATUS_STYLE[s.status] || 'bg-black/5'}`}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setEditing(s)}
                    className="rounded-lg bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-ink/70 hover:bg-black/10"
                  >
                    Notes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <NotesModal
          student={editing}
          onClose={() => setEditing(null)}
          onSave={async (notes) => {
            await patch(editing.id, { notes });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <Icon className={`mb-2 h-5 w-5 ${tone}`} />
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-ink/50">{label}</div>
    </div>
  );
}

function NotesModal({ student, onClose, onSave }: { student: Student; onClose: () => void; onSave: (notes: string) => Promise<void> }) {
  const [notes, setNotes] = useState(student.notes || '');
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">{student.name}</h3>
            <p className="text-sm text-ink/50">{student.email}</p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        {student.message && <p className="mb-3 rounded-xl bg-black/[0.03] p-3 text-sm italic text-ink/60">“{student.message}”</p>}
        <textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add private notes about this student — call outcomes, schedule, follow-ups…"
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          onClick={async () => { setBusy(true); await onSave(notes); setBusy(false); }}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Save notes
        </button>
      </div>
    </div>
  );
}
