import type { Metadata } from "next";
import { BrandLogo } from "@/components/layout/brand-logo";
import { PageBackdrop } from "@/components/layout/page-backdrop";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

// One compact card on the wallpaper: the logo, the form and the lockout rule.
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <PageBackdrop />
      <main className="glass relative flex w-full max-w-[380px] flex-col gap-5 px-7 pt-7 pb-6 [--glass-radius:14px]" data-elevation="floating">
        <BrandLogo height={48} priority />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl leading-tight font-semibold tracking-[-0.01em]">Sign in</h1>
          <p className="text-[13px] text-muted">Use the email your administrator set up for you.</p>
        </div>
        <LoginForm />
        <p className="text-xs leading-relaxed text-muted">
          Accounts are created by the administrator. After 5 failed attempts sign-in is locked for 15 minutes.
        </p>
      </main>
    </div>
  );
}
