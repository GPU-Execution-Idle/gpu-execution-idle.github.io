// The poster's one decorative motif: GPU power that runs, drops while waiting, and is woken
// just before work returns. Schematic only, not data.
export function PowerTrace({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
      <path className="trace-run" d="M0,30 C20,18 40,42 60,28 S100,16 120,30 S160,40 180,26 L196,26" />
      <path className="trace-wait" d="M196,26 L210,96 L700,96" />
      <path className="trace-wake" d="M700,96 L716,26" />
      <path className="trace-run" d="M716,26 C740,16 760,40 780,28 S820,18 840,32 S880,40 900,26 S960,18 1000,30" />
      <line className="trace-floor" x1="196" x2="716" y1="26" y2="26" />
      <circle className="trace-dot" cx="700" cy="96" r="7" />
    </svg>
  );
}
