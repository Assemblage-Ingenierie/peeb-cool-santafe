import type { Metadata } from "next";
import "./globals.css";
import { themeVars } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-context";
import { PendingApproval } from "@/components/pending-approval";
import { getCurrentUser } from "@/lib/auth-server";
import { isPendiente } from "@/lib/auth";

export const metadata: Metadata = {
  title: "PEEB Cool — Santa Fe",
  description:
    "Seguimiento del proyecto de rehabilitación energética de edificios públicos — Provincia de Santa Fe",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="es-AR" className="h-full">
      <body className="min-h-full" style={themeVars}>
        <AuthProvider user={user}>
          {/* Accès pas encore validé par un admin → écran d'attente sur toutes les
              routes (pas de redirection : aucune boucle possible). La RLS reste le
              rempart réel côté données. */}
          {isPendiente(user) ? (
            <PendingApproval email={user!.email} />
          ) : (
            <AppShell>{children}</AppShell>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
