import type { Metadata } from "next";
import "./globals.css";
import "./report-tools.css";
import ReportExportTools from "./ReportExportTools";

export const metadata: Metadata = {
  title: "Engineering Tools",
  description: "Personal civil engineering calculation and workflow tools.",
  icons: { icon: "/brand-mark.svg", shortcut: "/brand-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<ReportExportTools /></body></html>;
}
