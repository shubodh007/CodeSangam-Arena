/**
 * Ambient animated background with gradient mesh and floating orbs.
 * Pure CSS animations — no JS runtime cost.
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Gradient mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-[0.07] animate-gradient-shift" />

      {/* Floating orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] animate-orb-float-1" />
      <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full bg-accent/8 blur-[140px] animate-orb-float-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] animate-orb-float-3" />

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
    </div>
  );
}
