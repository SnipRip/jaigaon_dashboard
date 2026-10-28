import { Eye, EyeOff } from "lucide-react";

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
}

/** The eye button inside a password field. Used by login and change-password. */
export function PasswordVisibilityToggle({ visible, onToggle }: PasswordVisibilityToggleProps) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      className="flex h-full w-10 items-center justify-center rounded-(--radius-control) text-muted hover:text-ink"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
