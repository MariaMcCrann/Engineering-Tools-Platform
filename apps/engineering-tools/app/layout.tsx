import type { Metadata } from "next";
import "./globals.css";
import "./report-tools.css";
import "./dashboard.css";
import "./hydraulic-diagrams.css";
import ReportExportTools from "./ReportExportTools";
import HydraulicToolDiagrams from "./HydraulicToolDiagrams";

export const metadata: Metadata = {
  title: "Engineering Tools",
  description: "Personal civil engineering calculation and workflow tools.",
  icons: { icon: "/brand-mark.svg", shortcut: "/brand-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<HydraulicToolDiagrams/><ReportExportTools /></body></html>;
}
