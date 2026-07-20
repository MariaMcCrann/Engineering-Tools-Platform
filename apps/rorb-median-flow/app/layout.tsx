import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Engineering Tools",
  description: "Personal civil engineering calculation and workflow tools.",
  icons: {
    icon: "/brand-mark.svg",
    shortcut: "/brand-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
