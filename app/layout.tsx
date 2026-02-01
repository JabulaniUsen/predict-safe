import type { Metadata } from "next";
import { Skranji } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PWAHead } from "@/components/pwa/pwa-head";
import { CustomerCareChatButton } from "@/components/layout/customer-care-chat-button";

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
        {/* <script
          src="https://nordan-backend-production.up.railway.app/public/widget.js"
          defer
          {...({ nordankey: "drsQsq8VSVOimI" } as any)}
        /> */}
        <PWAHead />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7KDF121W18"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-7KDF121W18');
            `,
          }}
        />
        {children}
        <Toaster />
        <InstallPrompt />
        <CustomerCareChatButton />
        {/* Tawk.to Chat Widget */}
        {/* <Script
          id="tawk-to-script"
          strategy="afterInteractive" 
          dangerouslySetInnerHTML={{
            __html: `
              var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
              (function(){
              var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/692cff132e3bec197df70f89/1jbbs8q3a';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
              })();
            `,
          }}
        /> */}
      </body>
    </html>
  );
}
