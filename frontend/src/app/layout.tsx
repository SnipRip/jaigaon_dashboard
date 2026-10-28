import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Jaigaon Quality Enterprise",
    template: "%s · Jaigaon Quality Enterprise",
  },
  description:
    "Trading, export, inventory and business management for Jaigaon Quality Enterprise.",
  // An internal tool: keep it out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
