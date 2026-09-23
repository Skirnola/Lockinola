import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lockinola",
  description: "Your personal space for coding, cloud, and Japanese. One focused session at a time.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
