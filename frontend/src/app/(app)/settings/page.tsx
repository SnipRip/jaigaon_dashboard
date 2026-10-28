import type { Metadata } from "next";
import { PasswordForm } from "@/features/settings/password-form";
import { ProfileForm } from "@/features/settings/profile-form";
import { SessionsList } from "@/features/settings/sessions-list";
import { SettingsSectionNav } from "@/features/settings/settings-section-nav";

export const metadata: Metadata = { title: "Settings" };

// The signed-in user's own account. Everything here reads and writes real
// data through /api/users/me and /api/auth/sessions.
export default function SettingsPage() {
  return (
    <div className="flex flex-wrap items-start gap-3.5">
      <div className="flex-[1_1_180px] lg:sticky lg:top-3.5 lg:max-w-[210px]">
        <SettingsSectionNav />
      </div>
      <div className="flex max-w-[760px] min-w-0 flex-[999_1_560px] flex-col gap-3.5">
        <ProfileForm />
        <PasswordForm />
        <SessionsList />
      </div>
    </div>
  );
}
