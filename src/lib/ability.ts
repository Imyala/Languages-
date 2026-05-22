// Ability is stored on a 0..100 scale loosely aligned with CEFR:
//   A1 ≈ 10–25, A2 ≈ 25–40, B1 ≈ 40–55, B2 ≈ 55–70, C1 ≈ 70–85, C2 ≈ 85–100.
// We also expose a "level" (1..50) so the UI can show RPG-style progression.

export type SkillKey = "reading" | "writing" | "grammar" | "vocab";

export const CEFR_BANDS: Array<{ band: string; min: number; max: number }> = [
  { band: "A1", min: 0, max: 25 },
  { band: "A2", min: 25, max: 40 },
  { band: "B1", min: 40, max: 55 },
  { band: "B2", min: 55, max: 70 },
  { band: "C1", min: 70, max: 85 },
  { band: "C2", min: 85, max: 100 },
];

export function cefrFor(ability: number): string {
  for (const b of CEFR_BANDS) if (ability >= b.min && ability < b.max) return b.band;
  return "C2";
}

// 100 ability = level 50. Levels feel chunky but motion is visible.
export function levelFor(ability: number): { level: number; progress: number } {
  const clamped = Math.max(0, Math.min(100, ability));
  const raw = clamped / 2; // 0..50
  const level = Math.max(1, Math.floor(raw) + 1);
  const progress = raw - Math.floor(raw); // 0..1 within current level
  return { level, progress };
}

// Update ability via a simple Bayesian-flavored EMA.
//   - higher uncertainty → larger step
//   - difficulty matters: getting an item right above your level is worth more
export function updateAbility(
  current: number,
  uncertainty: number,
  difficulty: number,
  correct: boolean,
): { ability: number; uncertainty: number } {
  const surprise = (difficulty - current) / 50; // -2..2 ish
  const direction = correct ? 1 : -1;
  const lr = Math.max(0.08, Math.min(0.4, uncertainty * 0.5));
  const delta = direction * lr * (1 + Math.max(0, surprise * direction));
  const ability = Math.max(0, Math.min(100, current + delta * 5));
  const newUncertainty = Math.max(0.1, uncertainty * 0.92);
  return { ability, uncertainty: newUncertainty };
}

export function difficultyForNextItem(ability: number, asked: number[]): number {
  // Aim near current ability with small jitter for exploration.
  const jitter = (Math.random() - 0.5) * 8;
  const target = ability + jitter;
  // Avoid repeating exact same difficulty bucket back-to-back.
  const recent = new Set(asked.slice(-3).map((d) => Math.round(d / 10)));
  let candidate = target;
  for (let i = 0; i < 5 && recent.has(Math.round(candidate / 10)); i++) {
    candidate += 5;
  }
  return Math.max(5, Math.min(95, candidate));
}
