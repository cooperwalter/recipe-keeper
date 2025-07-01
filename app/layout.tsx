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
        {/* Critical inline CSS for splash screen to prevent white flash */}
        <style dangerouslySetInnerHTML={{
          __html: `
            #splash-screen {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              background: hsl(27 39% 97%);
              opacity: 1;
              transition: opacity 0.5s ease-out;
            }
            @media (prefers-color-scheme: dark) {
              #splash-screen {
                background: hsl(20 20% 12%);
              }
            }
            .dark #splash-screen {
              background: hsl(20 20% 12%);
            }
            #splash-screen.fade-out {
              opacity: 0;
            }
            #splash-screen .logo {
              width: 64px;
              height: 64px;
              color: hsl(19 80% 50%);
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            #splash-text {
              color: hsl(15 25% 15%);
            }
            @media (prefers-color-scheme: dark) {
              #splash-text {
                color: hsl(24 20% 95%);
              }
            }
            .dark #splash-text {
              color: hsl(24 20% 95%);
            }
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: .5;
              }
            }
          `
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Remove splash screen when page is loaded
              if (typeof window !== 'undefined') {
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    var splash = document.getElementById('splash-screen');
                    if (splash) {
                      splash.classList.add('fade-out');
                      setTimeout(function() {
                        splash.style.display = 'none';
                      }, 500);
                    }
                  }, 100);
                });
              }
            })();
          `
        }} />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        {/* Initial splash screen (removed by JavaScript) */}
        <div id="splash-screen">
          <div style={{ textAlign: 'center' }}>
            <svg className="logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" />
              <path d="M6 17h12" />
            </svg>
            <div id="splash-text" style={{ marginTop: '16px', fontSize: '24px', fontWeight: 'bold' }}>
              Recipe and Me
            </div>
          </div>
        </div>
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
