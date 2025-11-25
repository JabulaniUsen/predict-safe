import type { Metadata } from "next";
import { Inter, Oswald, Ubuntu } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
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
        className={`${inter.variable} ${oswald.variable} font-ubuntu antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
