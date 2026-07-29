# Emails d'authentification — lien de confirmation qui pointe vers la mauvaise app

## Symptôme

Le mail « ¡Bienvenido/a! » d'inscription à **peeb-santafe** contient un bouton
« Confirmar mi correo » dont le lien se termine par :

```
&redirect_to=https://peeb-jordan.vercel.app
```

Le clic aboutit à une erreur Vercel **404 `DEPLOYMENT_NOT_FOUND`** : l'utilisateur est
renvoyé vers **l'autre application** du projet Supabase partagé, pas vers peeb-santafe.

## Cause

Le code passe pourtant la bonne URL (`components/login-form.tsx`) :

```ts
await supabase.auth.signUp({
  email, password,
  options: {
    data: { app: APP_TAG, ... },
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

Mais **Supabase ignore silencieusement `emailRedirectTo` si l'URL n'est pas dans la liste
blanche « Redirect URLs »** et retombe alors sur la **Site URL** du projet
([doc](https://supabase.com/docs/guides/auth/redirect-urls)) :

> The URL in `redirectTo` should match the Redirect URLs list configuration.
> The Site URL […] defines the **default redirect URL** when no `redirectTo` is specified.

Or **peeb-santafe et peeb-jordan partagent le projet Supabase EXTERNAL**
(`grnkbnldfzdzrgleorra`, cf. `paragraphe.md`), et la Site URL — **unique par projet** —
est celle de peeb-jordan. D'où le mauvais domaine.

## Correction — Supabase Dashboard (aucun changement de code)

*Authentication → URL Configuration → **Redirect URLs*** → ajouter :

```
https://peeb-santafe.assemblage.net/**
https://peeb-santafe.vercel.app/**
https://peeb-santafe-*-malo-4406s-projects.vercel.app/**
http://localhost:3000/**
```

- Les 2 premières = production (domaine custom + domaine Vercel).
- La 3e = déploiements **preview** Vercel (branches), sinon le même bug s'y reproduit.
- La 4e = développement local.
- Le glob `**` couvre `/auth/callback` et `/auth/callback?next=/reset-password`
  (utilisé par « mot de passe oublié »).

**Ne pas toucher à la Site URL** : elle appartient à peeb-jordan, et la liste blanche
suffit — c'est justement le mécanisme prévu pour faire cohabiter deux apps sur un projet.

## Vérification

1. Créer un compte de test sur `https://peeb-santafe.assemblage.net/login`.
2. Dans le mail reçu, le lien doit contenir
   `redirect_to=https://peeb-santafe.assemblage.net/auth/callback`.
3. Le clic doit aboutir sur l'app (écran « Solicitud de acceso pendiente », cf. migration 029).

## À corriger aussi : le texte du template d'email

Le template « Confirm sign up » annonce encore :

> Después de confirmar, tendrás acceso como **consultor** a la plataforma.

C'est **faux depuis la migration 029** : la confirmation de l'email ne donne plus accès —
un administrateur doit valider la demande. Remplacer, dans la branche
`{{ if eq .Data.app "peeb-santafe" }}` du template, par :

> Después de confirmar tu correo, un administrador debe validar tu solicitud
> antes de que puedas acceder a la plataforma. Te avisaremos cuando esté aprobada.
