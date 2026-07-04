export function Logo({ className = '', light = false }: { className?: string; light?: boolean }) {
  const text = light ? '#ffffff' : '#1a1a1a';
  return (
    <span className={`inline-flex items-center gap-2 font-display font-extrabold ${className}`}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-lg shadow-brand/30">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path d="M4 15l1.5-6A2 2 0 0 1 7.4 7.5h9.2A2 2 0 0 1 18.5 9L20 15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="3" y="14" width="18" height="5" rx="2" fill="#fff" />
          <circle cx="7.5" cy="19" r="1.6" fill="#0071bc" />
          <circle cx="16.5" cy="19" r="1.6" fill="#0071bc" />
        </svg>
      </span>
      <span style={{ color: text }} className="text-xl tracking-tight">
        Go<span className="text-go">Driving</span>
      </span>
    </span>
  );
}
