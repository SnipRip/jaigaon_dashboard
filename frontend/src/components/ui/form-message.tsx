import clsx from "clsx";

interface FormMessageProps {
  tone: "success" | "error";
  children: string;
}

/** The result line under a form: saved, or what went wrong. */
export function FormMessage({ tone, children }: FormMessageProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-(--radius-tile) px-3 py-2 text-[13px] font-medium",
        tone === "error" ? "bg-danger-tint text-danger-strong" : "bg-success-tint text-success-strong",
      )}
    >
      {children}
    </p>
  );
}
