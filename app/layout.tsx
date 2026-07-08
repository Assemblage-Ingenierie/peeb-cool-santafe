import type { Metadata } from "next";
import "./globals.css";
import { themeVars } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "PEEB Cool — Santa Fe",
  description:
    "Seguimiento del proyecto de rehabilitación energética de edificios públicos — Provincia de Santa Fe",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Session résolue une fois côté serveur → injectée dans le contexte client.
  const user = await getCurrentUser();

  return (
    <html lang="es-AR" className="h-full">
      <body className="min-h-full" style={themeVars}>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
