import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "eWork Social — All-in-One Social Media Management Platform",
  description: "eWork Social is an all-in-one social media management platform designed for agencies, creators, and brands — schedule posts, manage clients, analyze performance, and run CRM workflows from a single dashboard.",
  keywords: "social media management, social media scheduler, agency dashboard, CRM, Instagram, Facebook, TikTok, LinkedIn, YouTube, X, Twitter, content scheduling, analytics, client management",
  openGraph: {
    title: "eWork Social — All-in-One Social Media Management Platform",
    description: "Schedule posts across Instagram, Facebook, TikTok, LinkedIn, X, YouTube and more. Manage clients, track analytics, and automate engagement — all from one dashboard.",
    url: "https://www.eworksocial.com",
    siteName: "eWork Social",
    type: "website",
    images: [
      {
        url: "https://www.eworksocial.com/og-image.png",
        width: 512,
        height: 512,
        alt: "eWork Social — Social Media Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "eWork Social — All-in-One Social Media Management Platform",
    description: "Schedule posts, manage clients, track analytics and automate responses — all from one dashboard. Built for agencies, creators and brands worldwide.",
    images: ["https://www.eworksocial.com/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon.png",
  },
};

import { PostHogProvider } from "@/lib/posthog-provider";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');`,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
              height={0}
              width={0}
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script id="clarity-script" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");`}
          </Script>
        )}
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
// Mon Mar  9 21:20:56 WAT 2026
