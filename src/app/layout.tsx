import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://clipsetu.com"),
  title: {
    default: "ClipSetu — India's Creator-Powered Clipping Marketplace",
    template: "%s | ClipSetu",
  },
  description:
    "Create. Clip. Publish. Earn. India's creator-powered clipping marketplace where brands launch campaigns and creators earn from verified views.",
  keywords: [
    "creator marketplace",
    "clipping",
    "UGC",
    "brand campaigns",
    "India",
    "creator economy",
    "reels",
    "shorts",
  ],
  authors: [{ name: "ClipSetu" }],
  openGraph: {
    title: "ClipSetu — India's Creator-Powered Clipping Marketplace",
    description: "Create. Clip. Publish. Earn.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipSetu — India's Creator-Powered Clipping Marketplace",
    description: "Create. Clip. Publish. Earn.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "ClipSetu",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink-900">
        {children}
        <Toaster richColors position="top-center" closeButton />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
