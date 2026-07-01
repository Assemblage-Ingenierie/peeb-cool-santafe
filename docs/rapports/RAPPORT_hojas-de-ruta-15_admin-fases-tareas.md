# Hojas de ruta ↔ Admin — sous-lot 15 : Fases + tâches (durée + planification)

Second lot du lien Hojas de ruta ⇄ Admin / Gestión de subproyectos / Fases.
(Lot 1 = planification sur les cartes, cf. RAPPORT 14.)

## Demande
- Fases : colonne **« Duración estimada »** (número + menu día/semana/mes) entre
  *Fecha inicio* et *Fecha fin*.
- Sous chaque fase (repliable) : **liste des tâches** (cartes de la hoja de ruta,
  synchronisées création/déplacement/suppression), chacune avec inicio / durée / fin.

## Modèle partagé — `lib/roadmap.ts` (nouveau)
Source unique de la logique « cartes d'une feuille par colonne (fila × composante) » :
`cartasBaseSubproyecto` (constantes + tâches dynamiques AyS) + `construirCartasPorFila`
(merge des overrides : masquées / créées / position). Utilisé par **Hojas de ruta**
ET **Admin** → tâches synchronisées (même DB, même logique).
- `hojas-de-ruta-client.tsx` refactoré : `construirColumnas` traduit l'état local
  (ocultas/creadas/posiciones/ediciones) en overrides et appelle le module partagé
  (comportement identique — vérifié : 44 cartes SUB-AIR inchangées).

## Admin
- `lib/admin/read.ts` : `listRoadmapEstado()` + type `RoadmapEstadoRow`.
- `lib/admin/config.ts` : `dur_valor` / `dur_unidad` ajoutés au select `gestion`.
- `app/admin/page.tsx` + `admin-tabs.tsx` : chargement + passage de `roadmapEstado`.
- `app/admin/actions.ts` : `gestionSetDuracion(uid, valor, unidad)` (fase).
- `components/admin/fases-editor.tsx` (nouveau) : table Fases dédiée — chaque fase
  (estado / inicio / **duración** / fin) + sous-lignes de tâches **repliables**
  (point de couleur composante + nombre, puis inicio / durée / fin). Tâches issues
  du modèle partagé ; cartes-note (placeholders) exclues.
- `subproyectos-panel.tsx` : remplace la table Fases par `<FasesEditor>` ; état
  `roadmap` optimiste ; `onFaseDuracion` → `gestionSetDuracion`, `onTaskPlan` →
  `roadmapSetPlan` (feuille = uid du sous-projet).

Pas de migration (colonnes déjà posées en 016 au Lot 1).

## Vérification (aperçu réel :3000)
- Admin / Gestión de subproyectos : colonne « Duración estimada » présente ; 8 fases.
- Fase *estudios preliminares* dépliée : **6 tâches** (= 1 AyS + 2 Género + 3 EE),
  chacune avec inicio / durée / fin ; ligne de fase avec estado / inicio / durée / fin.
- Écriture : durée de fase → `gestion_lineas` (4 meses) ; plan de tâche →
  `roadmap_estado` (inicio 2026-10-01, 2 semanas). Champs indépendants (fin nulle).
- Hoja de ruta : 44 cartes SUB-AIR (aucune régression du refactor).
- Données de test supprimées ; `npm run lint` + `tsc --noEmit` verts.

## Reste (hors demande)
- Contenu GP ; PWA offline ; Auth/RLS productif.
