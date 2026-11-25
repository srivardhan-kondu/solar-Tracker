import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthGate } from "@/components/auth/AuthGate";

// Atkinson Hyperlegible: designed by the Braille Institute for readers with low vision.
const appFont = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-sans",
});

// Telugu letters: Atkinson has no Telugu, so the browser falls back to this font for them.
const teluguFont = Noto_Sans_Telugu({
  subsets: ["telugu"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-telugu",
});

export const metadata: Metadata = {
  title: "Solar Tracker",
  description: "Track rooftop solar installations, stock, DCR numbers and service complaints.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${appFont.variable} ${teluguFont.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-slate-50 text-slate-900">
        <LanguageProvider>
          <AuthGate>
            <AppProvider>{children}</AppProvider>
          </AuthGate>
        </LanguageProvider>
      </body>
    </html>
  );
}
