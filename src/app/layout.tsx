import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Splitline",
  description: "Design where the machine ends and judgment begins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="border-t border-border px-6 py-4 text-sm text-muted">
          <p>Indicative triage, not legal advice.</p>
          <p>All organizations and people in this demo are fictional.</p>
        </footer>
      </body>
    </html>
  );
}
