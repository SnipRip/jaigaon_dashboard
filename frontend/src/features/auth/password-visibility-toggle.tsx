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
      className="flex size-11 items-center justify-center rounded-full text-muted hover:text-ink"
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
