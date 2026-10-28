import type { Metadata } from "next";
import { PasswordForm } from "@/features/settings/password-form";
import { ProfileForm } from "@/features/settings/profile-form";
import { SessionsList } from "@/features/settings/sessions-list";

export const metadata: Metadata = { title: "Settings" };

// The signed-in user's own account. Everything here reads and writes real
// data through /api/users/me and /api/auth/sessions.
export default function SettingsPage() {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <ProfileForm />
      <div className="flex min-w-0 flex-col gap-4">
        <PasswordForm />
        <SessionsList />
      </div>
    </div>
  );
}
