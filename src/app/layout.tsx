import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Splitline",
  description: "Design where the machine ends and judgment begins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="border-t border-border px-6 py-4 text-sm text-muted-foreground">
          <p>Indicative triage, not legal advice.</p>
          <p>All organizations and people in this demo are fictional.</p>
        </footer>
      </body>
    </html>
  );
}
