# Calendario — sous-lot 3b : UI de gestion des événements (créer / éditer / supprimer)

**Date :** 2026-06-22
**Périmètre :** UI au-dessus du backend 3a — créer/éditer/supprimer un événement depuis le Calendario, pour tous (CDC §4.3 + décision user).

## Ce qui a été fait

- **Bouton « + Nuevo evento »** dans la barre supérieure (à côté du sélecteur de fuseau).
- **`components/calendario/evento-form.tsx`** : modal de formulaire (création **et** édition). Champs : nombre*, fecha*, **horario (hora de Argentina)** début–fin, componente (GP/EE/AyS/G), modalidad (Presencial/Virtual → URL de conexión si Virtual ; sinon Lugar), participantes, case **Formación**, URL del documento. Validation client légère + appel des Server Actions ; gestion `Guardando…`/erreur. **Les horaires sont saisis et stockés en heure d'Argentine** (valeur canonique, libellé explicite) — indépendant du fuseau d'affichage.
- **`components/calendario/participantes-picker.tsx`** : multi-sélection avec recherche, groupée **Equipo / Entidades** (depuis `snapshot.personas`), chips retirables. Panneau en flux (non rogné par le modal).
- **`evento-modal.tsx`** (détail) : pied avec **Editar** (ouvre le formulaire pré-rempli) et **Eliminar** (confirmation en ligne → `eliminarEvento`).
- **`use-snapshot.ts`** : paramètre `refreshKey` → recharge le snapshot après une écriture en **contournant le cache** (`?t=` + `no-store`) ; la donnée courante reste affichée (pas de retour à « Cargando… »). Rétro-compatible (le dashboard appelle `useSnapshot()` sans argument).
- **`calendario-client.tsx`** : états `formMode` (crear/editar) + `refreshKey` ; câblage bouton +, modal détail (Editar/Eliminar), formulaire ; `bumpRefresh()` après création/édition/suppression.

## Décisions

- Édition **toujours en heure d'Argentine** (évite tout bug de conversion à l'enregistrement) ; libellé « hora de Argentina » sur le champ.
- Suppression avec **confirmation en ligne** dans le modal (pas de `window.confirm`).
- `url_conexion` envoyée seulement si modalidad = Virtual ; sinon `null`.
- Rafraîchissement par `refreshKey` plutôt que de changer la signature de `useSnapshot` (non cassant).

## Vérifications

- `npx tsc --noEmit` ✅ · `npx eslint components/calendario components/dashboard/use-snapshot.ts` ✅ · `/calendario` → HTTP 200 (imports d'actions serveur dans des composants client compris) ✅
- ⚠️ **Flux create/edit/delete NON cliqué** : pas de navigateur connecté, et l'aperçu géré entrerait en conflit avec le `next dev` déjà sur le port 3000. Backend exercé de bout en bout en 3a (table, journal, snapshot). **À tester dans le navigateur** : créer un evento → apparaît dans la grille ; l'éditer ; le supprimer (confirmation) → disparaît ; le journal d'activité enregistre création/suppression (visible via le sous-lot 4).

## Suite

- **Sous-lot 4** : alerte **« +N »** sur Inicio sous « Agenda » — lit `actividadEventos`, compare à la dernière consultation (localStorage), popup listant créations/suppressions, remise à zéro au clic ; visible pour l'admin (dev bypass = admin).
