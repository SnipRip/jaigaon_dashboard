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
        "rounded-[18px] px-4 py-2 text-sm font-bold",
        tone === "error" ? "bg-danger-tint text-danger-strong" : "bg-success-tint text-success-strong",
      )}
    >
      {children}
    </p>
  );
}
