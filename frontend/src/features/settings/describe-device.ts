import Bowser from "bowser";

/** Turns a User-Agent string into "Chrome on Windows". */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const parsed = Bowser.parse(userAgent);
  const browser = parsed.browser.name;
  const os = parsed.os.name;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}
