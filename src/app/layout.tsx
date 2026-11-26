import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { DisclaimerFooter, FOOTER_LINKS } from "@/components/splitline/chrome";
import { SiteHeader, SiteHeaderView } from "@/components/splitline/site-header";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Splitline", template: "%s · Splitline" },
  description: "Design where the machine ends and judgment begins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={cn("h-full", plexSans.variable, plexMono.variable)}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          <div className="contents print:hidden">
            {/* Dynamic routes (/case/[id]) learn the path only at request time; the fallback has no active item. */}
            <Suspense fallback={<SiteHeaderView pathname="" />}>
              <SiteHeader />
            </Suspense>
          </div>
          {children}
          <div className="contents print:hidden">
            <DisclaimerFooter links={FOOTER_LINKS} credit="Built by Julius Wölki." />
          </div>
          <Toaster />
          <Analytics />
        </TooltipProvider>
      </body>
    </html>
  );
}
