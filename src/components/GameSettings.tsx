import { Gamepad2, Vibrate, Volume2, Maximize2 } from 'lucide-react';
import { usePrefs, ControlsMode, isTouchDevice } from '../lib/prefs';

const CONTROL_OPTIONS: { id: ControlsMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Show on touch devices' },
  { id: 'on', label: 'Always on', hint: 'Show on-screen pad everywhere' },
  { id: 'off', label: 'Off', hint: 'Keyboard only' },
];

export function GameSettings({ compact = false }: { compact?: boolean }) {
  const { prefs, setPref } = usePrefs();

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* On-screen controls */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-ink">On-screen controls</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CONTROL_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => setPref('controls', o.id)}
              className={`rounded-xl px-2 py-2.5 text-center transition-colors ${
                prefs.controls === o.id ? 'bg-brand text-white shadow-sm shadow-brand/25' : 'bg-black/5 text-ink/70 hover:bg-black/10'
              }`}
            >
              <div className="text-sm font-semibold">{o.label}</div>
              <div className={`mt-0.5 text-[10px] leading-tight ${prefs.controls === o.id ? 'text-white/80' : 'text-ink/45'}`}>{o.hint}</div>
            </button>
          ))}
        </div>
        {!isTouchDevice() && prefs.controls === 'auto' && (
          <p className="mt-2 text-xs text-ink/45">Tip: on a computer choose <b>Always on</b> to try the touch pad with your mouse.</p>
        )}
      </div>

      <ToggleRow
        icon={<Maximize2 className="h-4 w-4 text-brand" />}
        label="Bigger buttons"
        hint="Larger, easier-to-hit controls"
        value={prefs.bigControls}
        onChange={(v) => setPref('bigControls', v)}
      />
      <ToggleRow
        icon={<Vibrate className="h-4 w-4 text-brand" />}
        label="Haptic feedback"
        hint="Vibrate on taps (supported phones)"
        value={prefs.haptics}
        onChange={(v) => setPref('haptics', v)}
      />
      <ToggleRow
        icon={<Volume2 className="h-4 w-4 text-brand" />}
        label="Sound"
        hint="Engine & game sound effects"
        value={prefs.sound}
        onChange={(v) => setPref('sound', v)}
      />
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/10">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-ink">{label}</div>
          <div className="text-xs text-ink/45">{hint}</div>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-go' : 'bg-black/15'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
