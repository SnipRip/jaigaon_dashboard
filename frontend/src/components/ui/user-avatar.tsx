import clsx from "clsx";
import { initialsOf } from "@/lib/format";

/** Initials badge used wherever a user is shown. */
export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-success font-semibold text-white uppercase",
        className ?? "size-8 text-xs",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
