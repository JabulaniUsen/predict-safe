import type { Metadata } from "next";
import { Skranji } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PWAHead } from "@/components/pwa/pwa-head";

const skranji = Skranji({
  variable: "--font-skranji",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "PredictSafe - Accurate Football Predictions & Betting Tips",
    template: "%s | PredictSafe"
  },
  description: "Get accurate football predictions, betting tips, and expert analysis. Free daily predictions, VIP packages, correct score tips, and live scores. Trusted by thousands of bettors worldwide.",
  keywords: [
    "football predictions",
    "betting tips",
    "soccer predictions",
    "football betting",
    "sports betting tips",
    "accurate predictions",
    "VIP predictions",
    "correct score predictions",
    "free football tips",
    "daily predictions",
    "betting advice",
    "football analysis"
  ],
  authors: [{ name: "PredictSafe" }],
  creator: "PredictSafe",
  publisher: "PredictSafe",
  manifest: "/manifest.json",
  themeColor: "#1e40af",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PredictSafe",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://predictsafe.com",
    siteName: "PredictSafe",
    title: "PredictSafe - Accurate Football Predictions & Betting Tips",
    description: "Get accurate football predictions, betting tips, and expert analysis. Free daily predictions, VIP packages, and correct score tips.",
  },
  twitter: {
    card: "summary_large_image",
  title: "PredictSafe - Accurate Football Predictions",
    description: "Get accurate football predictions, betting tips, and expert analysis.",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://predictsafe.com'),
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${skranji.variable} font-skranji antialiased`}
      >
        <script
          src="https://nordan-backend-production.up.railway.app/public/widget.js"
          defer
          {...({ nordankey: "drQsq8VSVOimI" } as any)}
        />
        <PWAHead />
        {children}
        <Toaster />
        <InstallPrompt />
      </body>
    </html>
  );
}
