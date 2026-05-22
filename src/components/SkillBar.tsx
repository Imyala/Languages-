"use client";

import { cefrFor, levelFor } from "@/lib/ability";

export function SkillBar({
  label,
  ability,
  delta,
}: {
  label: string;
  ability: number;
  delta?: number;
}) {
  const { level, progress } = levelFor(ability);
  const band = cefrFor(ability);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm tracking-wide">{label}</span>
          <span className="text-xs text-[color:var(--muted)]">{band}</span>
        </div>
        <div className="flex items-baseline gap-2">
          {typeof delta === "number" && Math.abs(delta) > 0.05 ? (
            <span
              className={`text-xs ${delta > 0 ? "text-[color:var(--good)]" : "text-[color:var(--bad)]"}`}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}
            </span>
          ) : null}
          <span className="text-sm font-mono">Lv {level}</span>
        </div>
      </div>
      <div className="skill-bar">
        <div className="fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
