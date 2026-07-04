import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight, Gamepad2, MapPin, ShieldCheck, Trophy, Brain,
  Car, GraduationCap, Sparkles, Star, Handshake,
} from 'lucide-react';
import { api } from '../lib/api';
import { SIGNS } from '../data/signs';
import { Sign } from '../components/Sign';

const rotatingWords = ['Driving Test', 'Road Signs', 'Highway Code', 'Confidence'];

export default function Home() {
  const [word, setWord] = useState(0);
  const [stats, setStats] = useState({ learners: 0, schools: 8, gamesPlayed: 0 });

  useEffect(() => {
    const t = setInterval(() => setWord((w) => (w + 1) % rotatingWords.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api('/stats').then(setStats).catch(() => {});
  }, []);

  const heroSigns = SIGNS.filter((s) => ['stop', 'yield', 'roundabout', 'children', 'speed-50', 'no-entry'].includes(s.id));

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/8 via-white to-go/5" />
          <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-brand/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-go/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4">
          <div className="grid items-center gap-16 md:grid-cols-2">
            {/* Left copy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <motion.div
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-5 py-2.5"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <MapPin className="h-4 w-4 text-brand" />
                <span className="text-sm text-brand">Made in Kenya · Growing across Africa</span>
              </motion.div>

              <h1 className="mb-6 font-display" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', lineHeight: 1.1 }}>
                <span className="text-ink">Master your </span>
                <span className="relative inline-block text-brand">
                  <motion.span key={word} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
                    {rotatingWords[word]}
                  </motion.span>
                </span>
                <span className="text-ink"> — by playing.</span>
              </h1>

              <div className="mb-6 rounded-r-lg border-l-4 border-go bg-go/5 px-6 py-4">
                <p className="text-xl text-go-dark">Learn. Play. Pass. Drive.</p>
              </div>

              <p className="mb-10 max-w-lg text-lg leading-relaxed text-ink/70">
                GoDriving turns learning to drive into an addictive game. Memorize road signs,
                ace the highway code, and get matched with a trusted driving school near you.
              </p>

              <div className="mb-14 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/signup"
                  className="group flex items-center justify-center gap-2 rounded-xl bg-brand px-9 py-4 text-lg font-semibold text-white shadow-xl shadow-brand/25 transition-transform hover:-translate-y-0.5"
                >
                  Start Playing Free
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/games/signs"
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-brand px-9 py-4 text-lg font-semibold text-brand hover:bg-brand/5"
                >
                  Explore Signs
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-8">
                <Stat value={`${stats.schools}+`} label="Partner Schools" />
                <Stat value={`${SIGNS.length}`} label="Road Signs" accent />
                <Stat value="4 Games" label="& counting" />
              </div>
            </motion.div>

            {/* Right visual — floating signs */}
            <motion.div
              className="relative hidden items-center justify-center md:flex"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="absolute h-[360px] w-[360px] rounded-full bg-gradient-to-br from-brand/20 to-go/20 blur-2xl" />
              <div className="grid grid-cols-3 gap-5">
                {heroSigns.map((s, i) => (
                  <motion.div
                    key={s.id}
                    className="animate-float rounded-2xl bg-white p-3 shadow-xl shadow-brand/10 ring-1 ring-black/5"
                    style={{ animationDelay: `${i * 0.4}s` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                  >
                    <Sign sign={s} className="h-24 w-24" />
                  </motion.div>
                ))}
              </div>
              <motion.div
                className="absolute -bottom-4 -left-6 flex items-center gap-3 rounded-2xl border border-brand/10 bg-white p-4 shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-go text-white">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-ink/50">Earn XP & climb the</div>
                  <div className="font-bold text-ink">Leaderboard</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* animated road strip */}
      <div className="h-3 w-full bg-ink">
        <div className="road-dashes mx-auto h-1 translate-y-1" />
      </div>

      {/* ---------- FEATURES ---------- */}
      <section className="container mx-auto px-4 py-20">
        <SectionHead
          eyebrow="Why GoDriving"
          title="A driving school in your pocket"
          sub="Everything a new driver needs to go from nervous beginner to confident, licensed driver."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Brain, title: 'Learn by playing', text: 'Bite-sized games make road signs and rules actually stick.' },
            { icon: Trophy, title: 'Earn & compete', text: 'Collect XP and coins, level up and top the national leaderboard.' },
            { icon: GraduationCap, title: 'Real school match', text: 'Get connected with verified driving schools near you.' },
            { icon: ShieldCheck, title: 'Test ready', text: 'Practice with content aligned to the local highway code.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold text-ink">{f.title}</h3>
              <p className="text-sm leading-relaxed text-ink/60">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- GAMES ---------- */}
      <section className="bg-gradient-to-b from-white to-brand/5 py-20">
        <div className="container mx-auto px-4">
          <SectionHead eyebrow="The Arcade" title="Games that teach you to drive" sub="Pick a game, beat your high score, and learn something real every round." />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <GameCard to="/games/match" icon={Gamepad2} color="#0071bc" title="Sign Match" text="Flip-and-match memory game to lock in road signs fast." tag="Memory" />
            <GameCard to="/games/quiz" icon={Brain} color="#4caf50" title="Highway Code Quiz" text="Beat the clock answering real driving-test questions." tag="Quiz" />
            <GameCard to="/games/roadrun" icon={Car} color="#d21e2b" title="Road Run" text="Steer, dodge and obey the signs in this arcade drive." tag="Arcade" />
          </div>
          <div className="mt-8 text-center">
            <Link to="/games" className="inline-flex items-center gap-2 font-semibold text-brand hover:gap-3 transition-all">
              See all games <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- PARTNER CTA ---------- */}
      <section className="container mx-auto px-4 py-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-10 text-white md:p-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm">
                <Handshake className="h-4 w-4" /> For Driving Schools
              </div>
              <h2 className="mb-4 font-display text-3xl font-bold md:text-4xl">Partner with GoDriving & grow your enrollment</h2>
              <p className="mb-8 max-w-md text-white/80">
                We send you motivated, test-ready students and share revenue fairly. Join our
                network of driving schools across Kenya and East Africa.
              </p>
              <Link to="/partner" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-brand hover:bg-white/90">
                Become a Partner <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Sparkles, t: 'Qualified leads', s: 'Students ready to enroll' },
                { icon: Trophy, t: 'Revenue share', s: 'Fair, transparent splits' },
                { icon: MapPin, t: 'Local reach', s: 'Featured in your city' },
                { icon: Star, t: 'Verified badge', s: 'Build trust instantly' },
              ].map((b) => (
                <div key={b.t} className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
                  <b.icon className="mb-3 h-6 w-6" />
                  <div className="font-semibold">{b.t}</div>
                  <div className="text-sm text-white/70">{b.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="relative">
      <div className={`absolute -left-2 -top-2 -z-10 h-12 w-12 rounded-lg ${accent ? 'bg-go/10' : 'bg-brand/10'}`} />
      <div className="text-3xl font-bold text-brand">{value}</div>
      <div className="mt-1 text-sm text-ink/60">{label}</div>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-go">{eyebrow}</div>
      <h2 className="mb-3 font-display text-3xl font-bold text-ink md:text-4xl">{title}</h2>
      <p className="text-ink/60">{sub}</p>
    </div>
  );
}

function GameCard({ to, icon: Icon, color, title, text, tag }: any) {
  return (
    <Link to={to} className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: color }}>
        <Icon className="h-7 w-7" />
      </div>
      <span className="mb-3 inline-block rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-ink/60">{tag}</span>
      <h3 className="mb-2 font-display text-xl font-bold text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink/60">{text}</p>
      <div className="mt-5 flex items-center gap-2 font-semibold text-brand">
        Play now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
