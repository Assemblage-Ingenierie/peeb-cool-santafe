# Récap — Ajustes 3.3b (retours utilisateur)

> **Date :** 2026-06-19 · Suite du sous-lot 3.3b, retours utilisateur successifs.

## Changements

| # | Demande | Nature | Détail |
|---|---|---|---|
| 1 | Retirer le champ **N.º** des nouvelles écoles | UI + action | Formulaire « Agregar escuela » réduit à *Nombre*. UID désormais **auto** `SUB-ESC-NNN` (param `numero` retiré de `addSchool`). |
| 2 | Remplacer **« faisabilidad » → « factibilidad »** | UI (affichage) | Titre « Datos de la **factibilidad** » + texte d'aide. Le mot ne figure plus à l'écran. **Valeur technique `escenario='faisabilidad'` conservée** (clé d'enum invisible ; migration B *non retenue* par l'utilisateur → CDC §3.3 inchangé). |
| 3 | « Costo otras » → **« Costo otras medidas »** | UI (libellé) | Champ `costo_otras_eur`, label seul modifié. |
| 4 | Ajouter fases **Anteproyecto** et **Redacción de pliegos** | **Migration DB** | Voir ci-dessous. |
| 5 | **Indiquer les unités** sur les champs numériques | UI | Unité dans le **libellé** (toujours visible, même quand « — ») : Demanda (kWh), GEI (tCO₂), Costo (€), Superficie (m²) ; retirée de la valeur (anti-redondance). Les champs `% mujeres` gardent « % » dans le libellé. |
| 6 | **Calendario** : autoriser les **entidades** comme participantes d'un evento | UI + action | Dropdown « Participantes » des eventos = personas **+ entidades** (marquées « (entidad) »). `capacitaciones_eventos` inchangé (personas + champ entidades dédié). Nettoyage étendu : suppression d'une entidad → retirée aussi de `eventos.participantes[]`. |
| 7 | **Recherche** en haut des dropdowns multiselect | UI | `MultiSelectCell` : champ de recherche (filtre par libellé) — utile quand la liste est longue (participantes). |
| 8 | **Suppression d'écoles** dans Gestión de subproyectos | UI + action | Bouton « Eliminar escuela » + **confirmation inline**. `deleteSubproyecto` (garde-fou : `seccion='Escuelas'` uniquement) supprime metricas + gestion_lineas + sous-projet. Aéroports/hôpitaux non supprimables. |
| 9 | Champ **« Notas »** (texto libre, gras + rojo) après Superficie | **Migration DB** | `NotasEditor` (contentEditable + barre N/Negro/Rojo). HTML restreint assaini (`<strong>`, `<span style="color:#E30513">`, `<br>`). Rouge = accent Assemblage. Voir migration 006. |

## Migration DB (005) — fases
`gestion_lineas.fase` étant une **FK vers `peebcoolsf_fases`**, ajouter une fase passe par le référentiel (sinon le select casse à la sélection). Diff proposé puis validé avant exécution.

Ordre chronologique obtenu (`orden`) :
1. Estudios preliminares · 2. **Anteproyecto** · 3. Proyecto ejecutivo · 4. **Redacción de pliegos** · 5. Licitación · 6. Obra · 7. General

- SQL : `supabase/migrations/20260619000005_fases_anteproyecto_redaccion.sql` (exécuté via `execute_sql`, idempotent).
- `lib/constants.ts` : `FASES` mis au même ordre.

## Migration DB (006) — notas
`alter table peebcoolsf_subproyectos add column if not exists notas text;` (additive, nullable). Diff proposé puis validé avant exécution. SQL : `supabase/migrations/20260619000006_subproyectos_notas.sql`.
- Stockage = HTML **restreint** (`<strong>` / `<span style="color:#E30513">` / `<br>`), assaini **à la saisie ET à l'affichage** (client) + **backstop serveur** (`sanitizeNotasServer` : retire script/img/iframe/on*/javascript et tout tag hors `strong|b|br|span`).

## Vérifié (base réelle, école de test puis nettoyée)
| Test | Preuve |
|---|---|
| UID auto | `addSchool` → `SUB-ESC-001` (sans n°) ✅ |
| Libellés | « Datos de la factibilidad », « Costo otras medidas » ; **0 occurrence visible de « faisabilidad »** ✅ |
| Dropdown Fase | 7 fases dans l'ordre chronologique ✅ |
| FK nouvelle fase | sélection « Anteproyecto » → `gestion_lineas.fase='anteproyecto'` persiste ✅ |
| Unités | libellés « Demanda antes (kWh) », « GEI antes (tCO₂) », « Costo EE (€) », « Superficie (m²) » ✅ |
| Entidades en participantes | dropdown evento = personas + 6 entidades « (entidad) » (vérif lecture seule, données réelles non modifiées) ✅ |
| Recherche multiselect | dropdown evento : « energ » filtre 10 → 1 option ✅ |
| Suppression d'école | bouton absent sur aéroport ; confirmation puis suppression d'une école de test (cascade metricas), autres sous-projets intacts ✅ |
| Notas | gras + rojo → DB `<strong>Nota</strong> importante <span style="color:#E30513">roja</span>` (assaini) ✅ |

`tsc --noEmit` + ESLint : OK.

## Note
Pendant les tests, un clic « + Agregar línea » avait visé par erreur le vrai SUB-AIR (timing du harnais) → ligne vide `GEST-AIR-0005`. **Résolu** : supprimée par l'utilisateur via l'UI → SUB-AIR de retour à 4 lignes. (La donnée école `SUB-ESC-001 « er »` créée par l'utilisateur est conservée.)
