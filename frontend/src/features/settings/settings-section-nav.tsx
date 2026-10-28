import { GlassCard } from "@/components/ui/glass-card";

// The headings of the settings cards (their CardTitle ids), so a section is
// one click away on a long page or a phone.
const SECTIONS = [
  { id: "settings-profile", label: "Profile" },
  { id: "settings-password", label: "Password" },
  { id: "settings-sessions", label: "Signed-in devices" },
];

export function SettingsSectionNav() {
  return (
    <GlassCard as="nav" aria-label="Settings sections" className="flex flex-col gap-0.5 p-2 sm:px-2">
      {SECTIONS.map((section) => (
        <a key={section.id} href={`#${section.id}`} className="rounded-md px-2.5 py-1.5 text-[13px] text-ink-soft transition-colors hover:bg-white/60 hover:text-ink">
          {section.label}
        </a>
      ))}
    </GlassCard>
  );
}
