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
  title: "Recipe and Me - Preserve Family Recipes for Generations",
  description:
    "Recipe and Me helps you digitize, preserve, and share cherished family recipes. Transform handwritten recipe cards, photos, and voice recordings into a beautiful digital cookbook that captures your family's culinary heritage.",
  keywords: ["family recipes", "recipe preservation", "digital cookbook", "recipe keeper", "family cookbook", "recipe digitization", "culinary heritage", "recipe inheritance", "handwritten recipes", "recipe photos"],
  authors: [{ name: "Recipe and Me" }],
  creator: "Recipe and Me",
  publisher: "Recipe and Me",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: defaultUrl,
    title: "Recipe and Me - Preserve Family Recipes for Generations",
    description: "Digitize, preserve, and share cherished family recipes. Transform handwritten cards into a beautiful digital cookbook.",
    siteName: "Recipe and Me",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Recipe and Me - Family Recipe Preservation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recipe and Me - Preserve Family Recipes",
    description: "Digitize, preserve, and share cherished family recipes. Transform handwritten cards into a beautiful digital cookbook.",
    images: ["/twitter-image.png"],
    creator: "@recipeandme",
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
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Recipe And Me" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
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
