import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "goatmode.ai — Built for How AI Thinks",
  description: "Turn any rough idea into a master-level AI prompt in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
