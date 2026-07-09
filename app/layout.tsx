import type { Metadata } from "next";
import "./globals.css";
import { themeVars } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "PEEB Cool — Santa Fe",
  description:
    "Seguimiento del proyecto de rehabilitación energética de edificios públicos — Provincia de Santa Fe",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className="h-full">
      <body className="min-h-full" style={themeVars}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
