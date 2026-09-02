import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AI Bounty Judge",
  description: "Create a bounty, define success, and let independent GenLayer validators judge the result.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f3ed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
