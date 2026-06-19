# Récap — Étape 3.3b : Gestión de subproyectos

> **Date :** 2026-06-19 · Onglet **Gestión de subproyectos** (CDC §4.5) branché sur Supabase réel.
> **Aucune migration DB** : tout repose sur les tables existantes (`subproyectos`, `metricas`, `gestion_lineas`).

## Livré

**Sélecteur** groupé par sección (Aeropuertos / Hospitales / Escuelas) + bouton **« + Agregar escuela »** (nom + n° → UID `SUB-E<n>`, sinon `SUB-ESC-NNN`).

Par sous-projet, **4 sections** :
1. **Datos del edificio** — édition *par champ* (`FieldEditor`) : nombre, tipología (pastilles A/H/E), dirección, lat, lng, superficie.
2. **Datos de la faisabilidad** — métriques `escenario=faisabilidad` (energía/costos) **+ beneficiarios**.
3. **Datos de proyecto** — métriques `escenario=proyecto` (sans beneficiarios).
4. **Gestión del subproyecto** — `EditableTable` filtrée par `subproyecto_uid` : título · **orden (drag & drop)** · tipo · componente · **url grisée si `tipo_linea ≠ documento`** · estado · fecha · fase · Confidencial · Publicar · bouton **+**.

> Sections 1-3 = édition **par champ** (NULL → « — », jamais 0). Section 4 = tableau type Airtable.

## Nouveautés réutilisables
- **`FieldEditor`** (`components/admin/field-editor.tsx`) : liste « label → valeur » éditable inline (text / number nullable / select en pastilles). Format `es-AR`, unités (kWh, €, %, m²).
- **`EditableTable`** : mode **drag & drop opt-in** (`onReorder`) — HTML5 natif, **aucune dépendance**, poignée par ligne, désactivé si recherche/filtre actif.
- **`lib/constants.ts`** : référentiels `ESTADOS` (couleurs jaune/vert), `FASES`, `TIPO_LINEA` (plus aucune couleur en dur).

## Server Actions ajoutées (`app/admin/actions.ts`)
- `updateSubproyecto(uid, field, value)` — texte + numérique nullable (parsing virgule, NULL si vide).
- `updateMetrica(subUid, escenario, field, value)` — beneficiarios refusés en `proyecto` ; entiers tronqués.
- `addSchool(nombre, numero?)` — crée le sous-projet **+ ses 2 lignes `metricas`** vides.
- `addGestionLinea(subUid)` — UID `GEST-<code>-NNNN` numéroté **par sous-projet** + `orden` = max+1.
- `reorderRows(tableKey, orderedUids)` — réécrit `orden = position+1` (générique via `orderField`).
- **`deleteRow` enrichi** : nettoyage des références orphelines (voir ci-dessous).

## Nettoyage des UID orphelins (`text[]`)
- Suppression **persona** (`equipo`) → retirée de `eventos.participantes[]` **et** `capacitaciones_eventos.participantes[]`.
- Suppression **entidad** → `equipo.entidad_uid = NULL` (lève le blocage FK) **+** retirée de `capacitaciones_eventos.entidades[]`.
  ⚠️ Remplace le comportement 3.2 (où la suppression d'une entité utilisée était *bloquée*).

## Vérifié de bout en bout (base réelle, sur une école de test puis nettoyée)
| Test | Preuve |
|---|---|
| `addSchool` | `SUB-E9999` (tipología E, sección Escuelas, orden 10) **+ 2 metricas** ✅ |
| `updateSubproyecto` | dirección, lat `-31.5`, superficie `1234.5`, vidage → **NULL** ✅ |
| `updateMetrica` — 0 vs NULL | `costo_otras=0` et `benef_personal_pct_muj=0` stockés **0** ; champs intacts = **NULL** ✅ |
| `updateMetrica` — entier | `benef_usuarios` « 12.9 » → **12** (tronqué) ✅ |
| `addGestionLinea` | `GEST-E9999-0001/0002` (numéro par sous-projet, pad 4), orden 1/2 ✅ |
| Règle `url` | « — » si tipo≠documento ; éditable + persistée dès `tipo=documento` ✅ |
| Drag & drop | glisser 0002 au-dessus de 0001 → `orden` 1/2 réécrit en base ✅ |
| Orphelin persona | suppr. `EQ-TEST` → retirée de `EVT-TEST` et `CAPEVT-TEST.participantes` ✅ |
| Orphelin entidad | suppr. `ENT-TEST` → `EQ-TEST2.entidad_uid=NULL` + `CAPEVT-TEST.entidades` vidé ✅ |

*Base restaurée : 9 subproyectos, 18 metricas, 36 gestion_lineas ; 0 ligne de test résiduelle.* `tsc --noEmit` + ESLint : OK.

## Fichiers
**Nouveaux** : `components/admin/field-editor.tsx`, `components/admin/subproyectos-panel.tsx`.
**Modifiés** : `lib/constants.ts`, `lib/admin/config.ts` (config `gestion` + `orderField`), `lib/admin/read.ts` (`listSubproyectos`/`listMetricas`), `app/admin/actions.ts`, `components/admin/editable-table.tsx` (drag & drop), `components/admin/admin-tabs.tsx`, `app/admin/page.tsx`.

## Restant
- (Option) `documento_uid` (capevt) limité aux docs de la même subsección — non implémenté (non bloquant).
- **Étape 4** : Inicio (dashboard) + Mapa OSM + endpoint `/api/snapshot` (service_role, cacheable).
</content>
</invoke>
