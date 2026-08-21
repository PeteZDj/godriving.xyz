import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Schools from './pages/Schools';
import SchoolDashboard from './pages/SchoolDashboard';
import Leaderboard from './pages/Leaderboard';
import Partner from './pages/Partner';
import Affiliate from './pages/Affiliate';
import { captureReferral } from './lib/referral';
import SignMatch from './pages/games/SignMatch';
import SignQuiz from './pages/games/SignQuiz';
import RoadRun from './pages/games/RoadRun';
import SignLibrary from './pages/games/SignLibrary';
import Drive from './pages/games/Drive';
import Settings from './pages/Settings';
import { ReactNode, Suspense, lazy, useEffect } from 'react';

// three.js is heavy — load the Pro 3D mode as its own chunk.
const Pro3D = lazy(() => import('./game/Pro3DGame').then((m) => ({ default: m.Pro3DGame })));

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-brand">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  // Capture ?ref= once on first mount, before the visitor navigates anywhere.
  // Shared with goflying.xyz via the identical src/lib/referral.ts.
  useEffect(() => {
    captureReferral();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/schools" element={<Schools />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/signs" element={<SignLibrary />} />
          <Route path="/games/match" element={<Protected><SignMatch /></Protected>} />
          <Route path="/games/quiz" element={<Protected><SignQuiz /></Protected>} />
          <Route path="/games/roadrun" element={<Protected><RoadRun /></Protected>} />
          <Route path="/games/drive/:slug" element={<Drive />} />
          <Route
            path="/games/pro"
            element={
              <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1220] text-white">Loading Pro 3D…</div>}>
                <Pro3D />
              </Suspense>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/school" element={<Protected><SchoolDashboard /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
