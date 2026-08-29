import type { Metadata, Viewport } from "next";
import "@fontsource/epilogue/400.css";
import "@fontsource/epilogue/500.css";
import "@fontsource/epilogue/600.css";
import "@fontsource/epilogue/700.css";
import "@fontsource/epilogue/800.css";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { PRODUCTION_SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_SITE_URL),
  title: {
    default: "Kira Kira Michi Loyalty",
    template: "%s - Kira Kira Michi",
  },
  description: "Kumpulkan stamp, buka reward, dan lanjutkan loyalty journey-mu.",
  applicationName: "Kira Kira Michi Loyalty",
  alternates: { canonical: "/" },
  keywords: ["Kira Kira Michi", "loyalty card", "digital stamp", "reward customer"],
  authors: [{ name: "Kira Kira Michi" }],
  creator: "Kira Kira Michi",
  publisher: "Kira Kira Michi",
  formatDetection: { email: false, address: false, telephone: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/kira-kira-michi-logo.png", type: "image/png" }],
    apple: [{ url: "/kira-kira-michi-logo.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Kira Kira Michi Loyalty",
    title: "Kira Kira Michi Loyalty",
    description: "Kumpulkan stamp, buka reward, dan lanjutkan loyalty journey-mu.",
    images: [{ url: "/kira-kira-michi-logo.png", alt: "Kira Kira Michi" }],
  },
  twitter: {
    card: "summary",
    title: "Kira Kira Michi Loyalty",
    description: "Kumpulkan stamp, buka reward, dan lanjutkan loyalty journey-mu.",
    images: ["/kira-kira-michi-logo.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfaf9",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <div>{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
