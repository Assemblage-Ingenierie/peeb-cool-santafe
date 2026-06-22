# Calendario — sous-lot 3a : backend écriture + journal d'activité

**Date :** 2026-06-22
**Périmètre :** fondation pour « créer / modifier / supprimer un événement depuis le Calendario » (CDC §4.3 + décision user : non-admins peuvent gérer les réunions ; l'admin doit être prévenu des suppressions). UI au sous-lot 3b.

## Ce qui a été fait

1. **Table `peebcoolsf_eventos_actividad`** (migration 011, via `execute_sql`, idempotente, RLS) : journal des créations/suppressions self-service du Calendario. Colonnes `tipo` (creado|eliminado), `evento_uid`, `evento_nombre`, `evento_fecha`, `creado_en`. Le nom/fecha sont **copiés** ici car la ligne `eventos` disparaît à la suppression. RLS : lecture authenticated, écriture admin (motif des autres tables ; l'app passe en `service_role`).
2. **Snapshot étendu** (`lib/snapshot.ts`) :
   - **`personas`** : liste sélectionnable (equipo + entidades, `{uid, label, tipo}`), triée équipe puis entités — pour le futur sélecteur de participants. Construite à partir des données déjà chargées (aucune requête en plus).
   - **`actividadEventos`** : 100 dernières entrées du journal (mappées camelCase).
3. **Server Actions `app/calendario/actions.ts`** (distinctes de l'Admin) : `crearEvento` (UID `EVT-NNNN` serveur + journalise « creado »), `actualizarEvento` (sans journal — édition non notifiée), `eliminarEvento` (journalise « eliminado » **avant** de supprimer). Validation serveur (nombre requis, fecha `AAAA-MM-DD`, heures `HH:MM`, componente/modalidad par liste blanche, participantes filtrés sur les UID réellement existants). Journalisation **best-effort** (n'échoue jamais l'action utilisateur).
   - **Autorisation** : `assertPuedeGestionarEventos()` — ouverte tant qu'il n'y a pas d'auth réelle (s'appuie sur le bypass dev ; l'appli n'est pas publique). À l'Étape 6 : exiger un utilisateur authentifié (tout rôle).
4. **`components/calendario/tipos.ts`** : type `EventoInput` partagé (module neutre, client + serveur).

## Vérifications

- `npx tsc --noEmit` ✅ · `npx eslint lib/snapshot.ts app/calendario components/calendario` ✅
- Table créée : RLS active, 6 colonnes, 2 policies (vérifié MCP).
- `/api/snapshot` : `personas`=27 (20 equipo + 7 entidades, triées), `actividadEventos`=0 ✅
- Mapping du journal vérifié end-to-end : insert test → snapshot (camelCase `eventoUid`/`eventoFecha`/`creadoEn` corrects) → suppression (table revenue à 0) ✅
- *Les actions elles-mêmes seront exercées par l'UI (sous-lot 3b).*

## Suite

- **Sous-lot 3b** : UI — bouton **+ Nuevo evento**, formulaire (création/édition) avec sélecteur de participants (depuis `personas`), boutons **Editar/Eliminar** (confirmation) dans le modal de détail, rafraîchissement du snapshot après écriture.
- **Sous-lot 4** : alerte **« +N »** sur Inicio (lit `actividadEventos`, compare à la dernière consultation en localStorage, popup + remise à zéro).

## Note (cache, à l'Étape déploiement)

`/api/snapshot` porte un `Cache-Control` SWR (CDN). Après une écriture, le client devra rafraîchir en contournant le cache (param anti-cache + `no-store`) — prévu au sous-lot 3b. En dev (pas de CDN), c'est immédiat.
