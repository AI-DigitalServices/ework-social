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

export const metadata: Metadata = {
  title: "eWork Social — Social Media Management for Agencies",
  description: "The all-in-one platform for digital agencies. Schedule posts, manage clients, track analytics, and automate responses across all social platforms.",
  keywords: "social media management, agency, scheduler, CRM, Africa, Instagram, Facebook, LinkedIn",
  openGraph: {
    title: "eWork Social — Social Media Management for Agencies",
    description: "Schedule posts, manage clients, track analytics and automate responses — all from one dashboard.",
    url: "https://app.eworksocial.com",
    siteName: "eWork Social",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "eWork Social",
    description: "The all-in-one platform for digital agencies.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
// Mon Mar  9 21:20:56 WAT 2026
