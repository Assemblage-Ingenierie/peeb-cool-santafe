# Procédure — Connexion Google sans afficher l'URL Supabase

**Objectif** : lors du « Se connecter avec Google », l'écran de Google doit afficher
le **nom / domaine de l'application** (ex. *peeb-santafe.assemblage.net*) et **non**
`…supabase.co` (ex. « Accéder à l'application grnkbnldfzdzrgleorra.supabase.co »).

Cette procédure reprend la méthode déjà utilisée pour **peeb-jordan** (même base Supabase
partagée « External » `grnkbnldfzdzrgleorra`, plan gratuit — pas de domaine custom payant).

---

## 1. Pourquoi l'URL Supabase apparaît

La méthode « classique » `supabase.auth.signInWithOAuth({ provider: 'google' })`
**redirige le navigateur** vers `https://<ref>.supabase.co/auth/v1/authorize`, puis vers
Google avec `redirect_uri = https://<ref>.supabase.co/auth/v1/callback`.
Google affiche donc le **domaine de destination = `…supabase.co`**.

## 2. La solution : Google Identity Services (GIS) + `signInWithIdToken`

Au lieu de rediriger vers Supabase, on charge le script **Google Identity Services**
(`accounts.google.com/gsi/client`) qui s'exécute **sur notre propre domaine**. Google
renvoie directement un **jeton d'identité (ID token)** au navigateur ; on l'échange ensuite
avec Supabase via `supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })`.

Comme la demande part de **notre origine** (et non d'un `redirect_uri` Supabase), Google
affiche **notre domaine / le nom de l'application**, jamais `…supabase.co`.
Aucune option payante (custom domain) requise.

> Sécurité (nonce) : Supabase attend un nonce **haché** envoyé à Google et le nonce **brut**
> passé à `signInWithIdToken`. Le composant génère les deux.

---

## 3. Configuration Google Cloud Console (une fois)

1. **Console Google Cloud** → projet contenant le client OAuth utilisé par Supabase.
2. **APIs & Services → Credentials → OAuth 2.0 Client IDs** → ouvrir le **client de type
   « Web application »** (celui déjà déclaré dans le provider Google de Supabase).
3. **Authorized JavaScript origins** → ajouter **toutes** les origines qui servent l'app :
   - `https://peeb-santafe.assemblage.net`
   - `http://localhost:3000` (développement local)
   - (option) l'URL Vercel `https://peeb-santafe.vercel.app`
   > Ce sont des **origines** (schéma + domaine, **sans** chemin), pas des redirect URIs.
4. **Authorized redirect URIs** → laisser le callback Supabase existant
   `https://grnkbnldfzdzrgleorra.supabase.co/auth/v1/callback` (utile en repli ; GIS ne
   l'utilise pas).
5. **OAuth consent screen** → le champ **App name** est **exactement le texte affiché** par
   Google (« … pour continuer vers *App name* »). Le renseigner avec un nom propre
   (ex. *Assemblage Ingeniería* ou *PEEB Cool — Santa Fe*) + logo si voulu.
6. Noter le **Client ID** (finit par `.apps.googleusercontent.com`).

### Portée : qui peut se connecter ?
Mettre `assemblage.net` (le domaine de l'app) dans **Authorized JavaScript origins**
**ne limite PAS** les comptes autorisés à `@assemblage.net` : c'est seulement l'origine
web d'où l'app appelle Google. **N'importe quel compte Google** peut se connecter.
La seule chose qui restreindrait à un domaine serait l'écran de consentement OAuth en
mode **« Internal »** (Workspace) ou un paramètre `hd` / une liste blanche ajoutée
volontairement — ce qu'on **ne fait pas**. L'écran reste **« External »**.
Chaque nouveau connecté (Assemblage ou non) reçoit un profil **`consultor`** via le
trigger de provisioning (migration 028). Pour restreindre plus tard, ajouter une
allowlist de domaine côté trigger/app.

## 4. Configuration Supabase (déjà en place, à vérifier)

- **Authentication → Providers → Google** : activé, et le **Client ID** ci-dessus présent
  (champ « Client IDs » — Supabase accepte les jetons dont l'`aud` correspond).
- Rien d'autre à changer : `signInWithIdToken` ne dépend pas des « Redirect URLs ».
- Projet partagé : **ne pas modifier** la config d'un autre projet/app.

## 5. Configuration de l'application (Next.js — peeb-santafe)

1. **Variable d'environnement** (Vercel : Production + Preview, et `.env.local` en dev) :
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
   ```
2. **Composant bouton Google** (client) qui charge GIS, génère le nonce, rend le bouton
   Google officiel et échange le jeton :
   ```tsx
   "use client";
   import { useEffect, useRef, useState } from "react";
   import { createBrowserSupabase } from "@/lib/supabase/client";

   const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
   const GIS_SRC = "https://accounts.google.com/gsi/client";

   async function makeNonce() {
     const raw = crypto.randomUUID() + crypto.randomUUID();
     const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
     const hashed = Array.from(new Uint8Array(digest))
       .map((b) => b.toString(16).padStart(2, "0")).join("");
     return { raw, hashed };
   }
   // → initialize({ client_id, nonce: hashed, callback })
   //   callback: signInWithIdToken({ provider:'google', token: response.credential, nonce: raw })
   //   puis renderButton(...) ; sur succès, router.refresh()/redirection.
   ```
   (Version complète : voir `components/google-signin-button.tsx` une fois implémenté —
   portage de `GoogleSignInButton.jsx` de peeb-jordan.)
3. **Remplacer** l'ancien bouton `signInWithOAuth` de `/login` par ce composant GIS.

## 6. Vérification

- Aller sur `https://peeb-santafe.assemblage.net/login`, cliquer le bouton Google :
  l'écran de sélection de compte affiche **le nom de l'app / notre domaine**, plus
  `…supabase.co`.
- Après sélection du compte, on est connecté (session posée par `signInWithIdToken`) et
  redirigé vers l'app.
- En cas d'erreur « origin not allowed » : l'origine exacte n'est pas dans **Authorized
  JavaScript origins** (étape 3).

---

### Résumé (mémo)
| Élément | Valeur |
|---|---|
| Méthode | GIS (`accounts.google.com/gsi/client`) + `signInWithIdToken` |
| Pourquoi | s'exécute sur notre origine → Google n'affiche pas `…supabase.co` |
| Google Cloud | Web OAuth client + **Authorized JavaScript origins** = domaines de l'app ; **App name** = texte affiché |
| Supabase | provider Google activé + Client ID autorisé (déjà fait, projet partagé) |
| App | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + composant bouton GIS à la place de `signInWithOAuth` |
