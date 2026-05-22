"use client";

import { SkillBar } from "./SkillBar";

export type Profile = {
  reading: number;
  writing: number;
  grammar: number;
  vocab: number;
  placed?: boolean;
};

export function StatusPanel({
  profile,
  deltas,
  title = "Status",
  subtitle,
}: {
  profile: Profile;
  deltas?: Partial<Profile>;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="panel panel-accent p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="kicker">{title}</div>
          {subtitle ? (
            <div className="text-sm text-[color:var(--muted)] mt-0.5">{subtitle}</div>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4">
        <SkillBar label="Writing" ability={profile.writing} delta={deltas?.writing} />
        <SkillBar label="Grammar" ability={profile.grammar} delta={deltas?.grammar} />
        <SkillBar label="Vocabulary" ability={profile.vocab} delta={deltas?.vocab} />
        <SkillBar label="Reading" ability={profile.reading} delta={deltas?.reading} />
      </div>
    </div>
  );
}
