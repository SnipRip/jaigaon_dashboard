import type { Metadata } from "next";
import Image from "next/image";
import { BrandLogo } from "@/components/layout/brand-logo";
import { PageBackdrop } from "@/components/layout/page-backdrop";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

const WORKFLOW_STEPS = [
  "Search stock and customer rates, build a quotation and send it on WhatsApp.",
  "Invoice, ship to Bhutan and keep Shipping Bill, LEO and E-Way Bill linked.",
  "Track payments and see profit by invoice, shipment, product and customer.",
];

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <PageBackdrop />
      <div className="relative flex w-full max-w-[1080px] flex-wrap items-stretch gap-5">
        <main className="glass flex flex-[1_1_380px] flex-col gap-5 p-6 [--glass-radius:32px] sm:p-10">
          <BrandLogo height={84} priority />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] leading-tight font-bold tracking-tight">Sign in to your workspace</h1>
            <p className="text-sm font-medium text-muted">
              Trading, export and inventory management for staff of Jaigaon Quality Enterprise.
            </p>
          </div>
          <LoginForm />
          <p className="border-t border-line pt-4 text-[13px] font-medium text-muted">
            Accounts are created by the administrator. After 5 failed attempts sign-in is locked for 15 minutes.
          </p>
        </main>

        <aside className="glass flex flex-[1_1_380px] flex-col gap-3.5 p-3.5 [--glass-radius:32px] max-md:hidden">
          <Image
            src="/images/steel-angles.jpg"
            alt="Stacked mild steel angles"
            width={770}
            height={471}
            priority
            className="h-[300px] w-full rounded-[20px] object-cover"
          />
          <div className="flex flex-col gap-4 px-4 pt-3 pb-4">
            <h2 className="text-xl font-extrabold tracking-tight">From rate enquiry to actual profit, in one place</h2>
            <ol className="flex flex-col gap-3 text-sm font-semibold text-ink-soft">
              {WORKFLOW_STEPS.map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
