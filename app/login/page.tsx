import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

// Page de connexion (email + mot de passe, comptes provisionnés dans Supabase).
// Rendue sans le chrome applicatif (AppShell détecte user==null).
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
