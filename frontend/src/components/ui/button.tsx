import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "success" | "outline" | "neutral" | "danger";

const BASE =
  "inline-flex h-11 items-center justify-center gap-2 glass-press rounded-full px-5 text-sm font-bold tracking-[-0.005em] disabled:cursor-not-allowed disabled:opacity-55";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "glass-tinted bg-brand text-white hover:bg-brand-strong",
  success: "glass-tinted bg-success text-white hover:bg-success-strong",
  outline: "glass-control border-brand/60 text-brand hover:border-brand hover:bg-brand-tint/80",
  neutral: "glass-control text-ink hover:bg-white/80",
  danger: "glass-control border-danger/60 text-danger-strong hover:border-danger hover:bg-danger-tint/80",
};

/** Button styling for elements that are not a <button>, such as a <Link>. */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return clsx(BASE, VARIANTS[variant], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
