// Seeded fictional clips only. Captured coach observations have no video attached.
export function demoMediaFor(evidenceId: string) {
  return /^e[1-8]$/.test(evidenceId)
    ? { src: "/demo/receiving-practice.mp4", poster: "/demo/field.png" }
    : null;
}
export function formatMediaTime(seconds: number) {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
