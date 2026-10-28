import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "success" | "outline" | "neutral" | "danger";
/** `md` for most buttons; `lg` for the one main action of a page or form. */
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-1.5 glass-press rounded-(--radius-control) text-[13px] font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-[15px] [&_svg]:shrink-0";

const SIZES: Record<ButtonSize, string> = {
  md: "h-8 px-3",
  lg: "h-9 px-3.5",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border border-brand-strong/70 bg-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(11_77_187/0.3)] hover:bg-brand-strong",
  success: "border border-success-strong/70 bg-success text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(27_122_69/0.3)] hover:bg-success-strong",
  outline: "glass-control text-brand hover:border-brand/50 hover:bg-brand-tint/60",
  neutral: "glass-control text-ink hover:bg-neutral-tint/60",
  danger: "glass-control border-danger/35 text-danger-strong hover:border-danger/60 hover:bg-danger-tint/60",
};

/** Button styling for elements that are not a <button>, such as a <Link>. */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string, size: ButtonSize = "md") {
  return clsx(BASE, SIZES[size], VARIANTS[variant], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className, size)} {...props} />;
}
