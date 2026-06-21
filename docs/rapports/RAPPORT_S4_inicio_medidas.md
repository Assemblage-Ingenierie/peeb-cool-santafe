# S4 — Mesures sur l'Inicio (mode Subproyectos)

> **Date :** 2026-06-20 · Dernier sous-lot du paquet d'ajustes post-Étape 4 (S1→S4). Fait suite à S3 (interface, commit `e5284f1`). **Aucune migration.**

## Objectif (CDC §4.1, mode Subproyectos, un bâtiment sélectionné)
- **Logos des mesures cochées** en haut à droite du bloc **Datos**.
- Sous les 3 blocs (Datos / Documentos / Progreso) : **Medidas EE**, **Medidas género**, **Otras medidas**, **Especificidades AyS** (logo + nom + texte + kWh/año ; **AyS sans kWh**).
- **N'afficher que les mesures cochées** (`activa`) — décision client.

## Code
- **`lib/snapshot.ts`** : type **`SnapshotMedida`** + lecture `peebcoolsf_medidas` ajoutée au snapshot (`medidas`, ordonné `subproyecto_uid` → `orden`). Projection fidèle (NULL conservés). `/api/snapshot` l'expose sans changement (pas de donnée confidentielle).
- **`components/dashboard/medidas-blocks.tsx`** *(nouveau)* :
  - `MedidaLogos` : bande de logos (ordre MEDIDAS) des mesures **cochées** — pour le coin haut-droit du bloc Datos.
  - `MedidasBlocks` : 4 blocs groupés par composante (EE / G / null=Otras / AyS), **mesures cochées uniquement** ; chaque ligne = `MedidaIcon` + nom + (kWh/año si `tieneKwh`) + texte. **Blocs vides masqués** ; si aucune mesure cochée → rien.
- **`components/dashboard/bottom-band.tsx`** : `medidasBySub` (Map) ; `BlockCard` accepte un `headerRight` (logos sur Datos quand un bâtiment est sélectionné) ; `MedidasBlocks` rendu **sous** la bande des 3 blocs (uniquement pour un bâtiment sélectionné — pas en vue groupe).
- **Réutilise** `components/medida-icons.tsx` et `MEDIDAS` (lib/constants) de S3 — couleurs/pictos identiques à l'Admin.

## Ajuste S3 inclus ici
- **`medidas-editor.tsx`** : la case **« Activa » cochée prend la couleur de la mesure** (`accentColor: m.color`) au lieu du bleu — sur demande client.

## Vérification
| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **exit 0** ✅ |
| `/api/snapshot` | **200** ; **81 medidas**, 9 codes présents ; structure `{activa, texto, kwh_anual, componente, orden}` ✅ |
| Données réelles | **1 mesure activée** (`SUB-AIR/aislacion`) par l'utilisateur via l'éditeur S3 → confirme que **le toggle persiste en base** et que le bloc s'affiche ✅ |
| `/` (dashboard) | **200** ; bundle client contient `Medidas EE`, `Medidas género`, `Otras medidas`, `Especificidades AyS`, `kWh/año` ✅ |
| Pictos / disposition | aperçu fourni au client ✅ |

> Capture automatisée non réalisée (serveur dev déjà sur le port 3000 → conflit `.next` entre deux instances `next dev` sous Windows). Visible en direct : **Inicio → Gestión → Subproyectos → SUB-AIR**.

## Reste (hors lot S1–S4)
- 3ᵉ bloc du mode **Proyecto global** (contenu à définir).
- **Câblage des 4 filtres GP/EE/AyS/G** du header (Agenda + sections Documentos).
- **Étape 5** : PWA offline (lecture). **Étape 6** : Auth Supabase + RLS productif + page Roles.
