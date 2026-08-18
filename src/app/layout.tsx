import type { Metadata, Viewport } from "next";
import "@fontsource/epilogue/400.css";
import "@fontsource/epilogue/500.css";
import "@fontsource/epilogue/600.css";
import "@fontsource/epilogue/700.css";
import "@fontsource/epilogue/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kira Kira Michi Loyalty",
    template: "%s · Kira Kira Michi",
  },
  description: "Kumpulkan stamp, buka reward, dan lanjutkan loyalty journey-mu.",
  applicationName: "Kira Kira Michi Loyalty",
  icons: { icon: "/kira-kira-michi-logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbfaf9",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
