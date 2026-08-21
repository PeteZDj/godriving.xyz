import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Share2, Wallet, ShieldAlert, Plane } from 'lucide-react';
import {
  SITE,
  TIERS,
  activeReferral,
  affiliateLink,
  normaliseCode,
  suggestCode,
} from '../lib/referral';

const SHARE_TARGETS = [
  { path: '/', label: 'Home' },
  { path: '/games', label: 'Games hub' },
  { path: '/games/signs', label: 'Sign Library' },
  { path: '/schools', label: 'Driving schools' },
];

const STEPS = [
  ['Apply and get a code', 'Tell us who you are and who follows you. Codes are 3–24 characters, uppercase.'],
  ['Share your link', `Any page on ${SITE} works. The code rides in the query string as ?ref=YOURCODE.`],
  ['We attribute for 90 days', 'Last click wins. The code is stored on the learner’s device and attached to every enquiry they send.'],
  ['They enrol at a partner school', 'When a referred learner enrols and the school pays its commission, your share is calculated from it.'],
  ['You get paid monthly', 'M-Pesa or bank transfer, monthly in arrears, once the balance passes KES 2,000.'],
];

export default function Affiliate() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [target, setTarget] = useState('/');
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const active = useMemo(() => activeReferral(), []);
  const effective = normaliseCode(code) ?? suggestCode(name);
  const link = affiliateLink(effective || 'YOURCODE', target);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const body = [
      `Name: ${d.get('aname')}`,
      `Email/phone: ${d.get('acontact')}`,
      `Requested code: ${normaliseCode(String(d.get('acode') ?? '')) ?? '(none — please assign)'}`,
      `Audience: ${d.get('aaudience')}`,
      '',
      String(d.get('anotes') ?? ''),
    ].join('\n');
    window.location.href = `mailto:affiliates@godriving.xyz?subject=${encodeURIComponent(
      `Affiliate application — ${d.get('aname')}`,
    )}&body=${encodeURIComponent(body)}`;
    setApplied(true);
  };

  const field = 'w-full rounded-xl border border-black/10 px-4 py-3 text-ink outline-none focus:border-brand';

  return (
    <div>
      <section className="relative overflow-hidden py-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/8 via-white to-go/5" />
        <div className="container mx-auto px-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-5 py-2.5 text-sm text-brand">
            <Share2 className="h-4 w-4" /> Affiliate programme
          </div>
          <h1 className="mb-5 max-w-3xl font-display text-4xl font-bold text-ink md:text-5xl">
            Get paid for sending learners.
          </h1>
          <p className="max-w-2xl text-lg text-ink/70">
            Instructors, colleges, community groups and creators. Share a link, and when somebody you
            sent enrols at a partner driving school, you take a cut of the commission.
          </p>

          {active && (
            <div className="mt-6 max-w-2xl rounded-2xl border-l-4 border-brand bg-brand/5 p-4 text-sm text-ink/80">
              You arrived on a referral link — code <b>{active.code}</b>, captured{' '}
              {new Date(active.at).toLocaleDateString()}. It will be attached to any enquiry you send
              from this device for 90 days.
            </div>
          )}
        </div>
      </section>

      {/* link builder */}
      <section className="pb-4">
        <div className="container mx-auto px-4">
          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-xl">
            <h2 className="mb-1 font-display text-2xl font-bold text-ink">Build your link</h2>
            <p className="mb-6 text-sm text-ink/60">
              Try it now — your code is confirmed on approval, but the link format never changes.
            </p>

            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink/60">Your name or brand</span>
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nairobi Driving Club" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink/60">Preferred code</span>
                <input className={field} value={code} onChange={(e) => setCode(e.target.value)} placeholder={suggestCode(name) || 'NAIROBICLUB'} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink/60">Send them to</span>
                <select className={field} value={target} onChange={(e) => setTarget(e.target.value)}>
                  {SHARE_TARGETS.map((s) => (
                    <option key={s.path} value={s.path}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/5 p-4">
              <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm text-brand">{link}</code>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* tiers */}
      <section className="py-14">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 font-display text-3xl font-bold text-ink">What it pays</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {TIERS.map((t, i) => (
              <div
                key={t.name}
                className={`rounded-3xl border bg-white p-7 shadow-sm ${i === 1 ? 'border-brand shadow-lg' : 'border-black/5'}`}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-ink/50">{t.range}</div>
                <h3 className="mt-2 font-display text-xl font-bold text-ink">{t.name}</h3>
                <div className="my-2 font-display text-4xl font-bold text-brand">{t.rate}</div>
                <p className="text-sm text-ink/60">{t.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works + rules */}
      <section className="bg-ink/[0.03] py-14">
        <div className="container mx-auto grid gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="mb-6 font-display text-3xl font-bold text-ink">How it works</h2>
            <ol className="space-y-4">
              {STEPS.map(([t, b], i) => (
                <li key={t} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5">
                  <span className="font-display text-sm font-bold text-brand">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-semibold text-ink">{t}</h3>
                    <p className="mt-1 text-sm text-ink/60">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-black/5 bg-white p-7">
              <h3 className="mb-2 inline-flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Plane className="h-5 w-5 text-brand" /> Works across both sites
              </h3>
              <p className="text-sm text-ink/60">
                One code covers GoDriving and{' '}
                <a className="text-brand underline" href="https://goflying.xyz">GoFlying</a>. Send a
                learner to either and it counts to the same balance.
              </p>
              <p className="mt-3 break-all text-xs text-ink/50">
                https://goflying.xyz/?ref={effective || 'YOURCODE'}
              </p>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white p-7">
              <h3 className="mb-3 inline-flex items-center gap-2 font-display text-lg font-bold text-ink">
                <ShieldAlert className="h-5 w-5 text-brand" /> Rules, briefly
              </h3>
              <ul className="space-y-2 text-sm text-ink/60">
                <li>• No paid search on our brand names</li>
                <li>• No spam, and no posting your link where it is off-topic</li>
                <li>• Do not imply you are us, or that we issue licences</li>
                <li>• Self-referrals and fake enrolments void the balance</li>
              </ul>
            </div>

            <div className="rounded-2xl border-l-4 border-brand bg-brand/5 p-5 text-sm text-ink/75">
              <b>Being straight about the current state:</b> referrals are tracked on the learner’s
              device and proven when they reach us inside an enquiry. There is no affiliate dashboard
              and no automatic counting yet — we reconcile by hand, and you can ask for your numbers
              any time.
            </div>
          </div>
        </div>
      </section>

      {/* apply */}
      <section className="py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-3xl border border-black/5 bg-white p-8 shadow-xl">
            <h2 className="mb-1 inline-flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Wallet className="h-6 w-6 text-brand" /> Apply
            </h2>
            <p className="mb-6 text-sm text-ink/60">
              We reply to every application, including the ones we cannot take.
            </p>
            <form onSubmit={apply} className="grid gap-4">
              <input className={field} name="aname" placeholder="Name or brand" required defaultValue={name} />
              <input className={field} name="acontact" placeholder="Email or phone" required />
              <input className={field} name="acode" placeholder="Preferred code" defaultValue={effective} />
              <input className={field} name="aaudience" placeholder="Who follows you, and roughly how many" required />
              <textarea className={`${field} min-h-28`} name="anotes" placeholder="Where you would share it" />
              <button className="justify-self-start rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:opacity-90" type="submit">
                Send application
              </button>
              <p className="text-xs text-ink/50">
                {applied
                  ? 'Your mail app should have opened with the application filled in. If nothing happened, email affiliates@godriving.xyz directly.'
                  : 'This opens your own mail app with the details filled in — nothing is stored on this site.'}
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-ink/50">
            Running a driving school instead?{' '}
            <Link className="text-brand underline" to="/partner">List your school here</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
