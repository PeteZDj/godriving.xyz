import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Logo } from './Logo';
import { api } from '../lib/api';

export function Footer() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/newsletter', { body: { email } });
      setDone(true);
      setEmail('');
    } catch {
      setDone(true);
    }
  };

  return (
    <footer className="mt-20 border-t border-black/5 bg-[#0b1b2b] text-white/80">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Learn to drive the fun way. GoDriving turns the highway code into games and puzzles,
            and connects new drivers with trusted local driving schools — starting in Kenya and
            growing across Africa.
          </p>
          <form onSubmit={subscribe} className="mt-6 flex max-w-sm gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="w-full rounded-full bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:bg-white/15"
            />
            <button className="rounded-full bg-go px-5 py-2.5 text-sm font-semibold text-white hover:bg-go-dark">
              {done ? 'Thanks!' : 'Notify me'}
            </button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/downloads/godriving.apk"
              download
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Download className="h-4 w-4" />
              Download Android app
            </a>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Our React Native build — faster, with Sign Library, quizzes, Sign Match &amp; Road Run.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">Learn</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/games" className="hover:text-white">All Games</Link></li>
            <li><Link to="/games/signs" className="hover:text-white">Sign Library</Link></li>
            <li><Link to="/games/quiz" className="hover:text-white">Highway Code Quiz</Link></li>
            <li><Link to="/leaderboard" className="hover:text-white">Leaderboard</Link></li>
            <li><a href="/downloads/godriving.apk" download className="hover:text-white">Android App</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/schools" className="hover:text-white">Driving Schools</Link></li>
            <li><Link to="/partner" className="hover:text-white">Become a Partner</Link></li>
            <li><Link to="/signup" className="hover:text-white">Create Account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} GoDriving.xyz — Drive smart, drive safe. Built for Africa 🌍
      </div>
    </footer>
  );
}
