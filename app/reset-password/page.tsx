import { ResetPasswordForm } from "@/components/reset-password-form";

// Écran de définition d'un nouveau mot de passe (après clic sur le lien de récupération).
// L'utilisateur arrive ici avec une session « recovery » (posée par /auth/callback).
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
