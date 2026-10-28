import { useState } from "react";

export interface FormResult {
  tone: "success" | "error";
  text: string;
}

// The saved / failed line under a settings form. `run` performs the request
// and turns its outcome into that line, so each form does not repeat the
// try/catch.
export function useFormResult() {
  const [result, setResult] = useState<FormResult | null>(null);

  async function run(request: () => Promise<unknown>, successText: string): Promise<boolean> {
    setResult(null);
    try {
      await request();
      setResult({ tone: "success", text: successText });
      return true;
    } catch (error) {
      setResult({
        tone: "error",
        text: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
      return false;
    }
  }

  return { result, run };
}
