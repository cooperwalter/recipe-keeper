// Environment validation moved to middleware and API routes
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ReactDevToolsInit } from "@/components/dev/react-devtools-init";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Your Site Name - Your Tagline",
  description: "Your site description here. This appears in search results and social shares.",
  keywords: ["keyword1", "keyword2", "keyword3"],
  authors: [{ name: "Your Name" }],
  creator: "Your Name",
  publisher: "Your Company",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: defaultUrl,
    title: "Your Site Name - Your Tagline",
    description: "Your site description here.",
    siteName: "Your Site Name",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Your Site Name",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Site Name - Your Tagline",
    description: "Your site description here.",
    images: ["/twitter-image.png"],
    creator: "@yourtwitterhandle",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <QueryProvider>
              <ReactDevToolsInit />
              {children}
              <Toaster />
              <Analytics />
            </QueryProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
