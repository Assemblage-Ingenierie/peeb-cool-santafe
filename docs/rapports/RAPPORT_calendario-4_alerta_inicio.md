# Calendario — sous-lot 4 : alerte « +N » sur Inicio

**Date :** 2026-06-22
**Périmètre :** notifier l'admin des réunions ajoutées/supprimées depuis sa dernière consultation (CDC §4.3 + décision user). Dernière pièce de la fonctionnalité Calendario.

## Ce qui a été fait

- **`components/dashboard/nuevos-eventos-badge.tsx`** (nouveau) : badge **« +N »** sous le libellé « Agenda » (Inicio). N = entrées de `actividadEventos` (créations + suppressions) postérieures à la dernière consultation (marqueur `peebcoolsf:agenda:vistos` en `localStorage`). Clic → **popup « Novedades del calendario »** listant chaque nouveauté (étiquette **Nueva** / **Eliminada** + nom + fecha), puis **remise à zéro** (`vistos = maintenant`) → le badge disparaît jusqu'à la prochaine activité. Le compteur s'incrémente tant qu'on ne clique pas. **Réservé à l'admin** (`DEV_AUTH_BYPASS` ; à l'Étape 6 = vraie session/role).
- **`agenda.tsx`** : nouveau slot `labelFooter` (rendu sous le bouton « Agenda ») ; **refactor** du recalage de défilement → helper `scrollToTarget` au niveau module (supprime un `useCallback` manuel incompatible React Compiler — règle `preserve-manual-memoization`).
- **`dashboard-client.tsx`** : passe `<NuevosEventosBadge actividad={snapshot.actividadEventos} />` en `labelFooter`.

## Vérifications (navigateur réel, serveur géré sur 3000)

Le port 3000 a été libéré (à la demande de l'utilisateur) → aperçu géré + pilotage DOM. **Toute la fonctionnalité Calendario testée de bout en bout :**
- Grille : 7 événements, couleurs de composante, jour courant surligné, lun→dom ✅
- **Fuseau** : bascule Argentine⇄France → 11:00→16:00, 09:00→14:00 (heure d'été), événements sans heure inchangés ✅
- **Détail** au clic : champs corrects, horaire dans le fuseau actif + libellé GMT ✅
- **Créer** : formulaire → EVT-0008 créé (24/06, 10:00–11:00, AyS), apparaît dans la grille, journal `creado` ✅
- **Éditer** : pré-rempli, horaire → 14:00–15:00, mise à jour sans doublon ✅
- **Supprimer** : confirmation → disparaît, supprimé en base, journal `eliminado` (nom conservé) ✅
- **Alerte « +N »** : 2 activités → badge **+2** ; popup liste *Nueva* + *Eliminada* avec dates ; clic → remise à zéro (badge disparaît, `vistos` persistant) ; +1 activité → badge **+1** au rechargement (exclut les déjà-vues) ✅
- Console sans erreur ; `tsc` + `eslint` (fichiers touchés) OK. Données de test nettoyées (journal=0, eventos=7).

## Note — cohérence à retardement (cache SWR)

Le snapshot `/api/snapshot` porte `Cache-Control: s-maxage=60, stale-while-revalidate=300` (design CDC §6). Au chargement de l'Inicio, le badge reflète donc l'activité **à ~60 s près** (un rechargement immédiat après un ajout peut afficher l'état précédent). Acceptable pour une notification ; les écritures faites depuis le Calendario, elles, sont immédiates (refetch cache-busting). Si tu veux du temps réel strict côté Inicio, on pourra faire le fetch du dashboard sans cache (décision à prendre).

## Tech debt préexistant repéré (hors périmètre)

`npm run lint` (global) signale des problèmes **antérieurs** non liés au Calendario : `use-escenario.ts` (set-state-in-effect — erreur), `bottom-band.tsx` (import `cn` inutilisé, dép useMemo), `global-blocks.tsx` (import inutilisé). À traiter séparément si souhaité.
