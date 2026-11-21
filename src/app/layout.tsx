import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { DisclaimerFooter } from "@/components/splitline/chrome";
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
  title: "Splitline",
  description: "Design where the machine ends and judgment begins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={cn("h-full", plexSans.variable, plexMono.variable)}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>
          {children}
          <DisclaimerFooter />
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
