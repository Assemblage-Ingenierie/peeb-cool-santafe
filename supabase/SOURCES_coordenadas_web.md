# Sources des coordonnées géocodées par recherche web

> **Objet :** traçabilité des coordonnées des 4 sous-projets non fournis par le CDC (aéroports + hôpitaux), pour vérification avant la carte (Étape 4).
> **Valeurs reportées = ce qui est réellement stocké** en base (`peebcoolsf_subproyectos`).
> Recherches effectuées le 2026-06-18.

---

## 1. Sous-projets géocodés par web (4)

| UID | Lieu | Lat stockée | Lng stockée | Source (valeur d'origine) | Confiance |
|---|---|--:|--:|---|:--:|
| `SUB-AIR` | Aeropuerto Internacional de Rosario « Islas Malvinas » (SAAR/ROS) | -32.90361 | -60.78444 | Wikipedia ES/EN, metar-taf — `32°54′16″S 60°47′04″W` ≈ `-32.90361, -60.78444` | **Élevée** |
| `SUB-ASV` | Aeropuerto Internacional de Sauce Viejo (SAAV/SFN) | -31.71104 | -60.81138 | Wikipedia ES/EN, metar-taf — `31°42′35″S 60°48′38″O` ≈ `-31.71104, -60.81138` | **Élevée** |
| `SUB-CENTENARIO` | Hospital Provincial del Centenario, Rosario (Urquiza 3101) | -32.93833 | -60.664 | Wikipedia EN — `32°56′18″S 60°39′53″W` = `32.93833°S 60.664°W` | **Moyenne-élevée** ⚠️ |
| `SUB-CULLEN` | Hospital Dr. José María Cullen, Santa Fe (Av. Freyre 2150) | -31.6485 | -60.71891 | hospitalby / mapcarta (OSM W1052914563) / Waze — `-31.648501…, -60.7189139` | **Élevée** |

---

## 2. Détail par sous-projet

### SUB-AIR — Aeropuerto Internacional de Rosario « Islas Malvinas »
- **Stocké :** `-32.90361, -60.78444`
- **Sources :**
  - https://es.wikipedia.org/wiki/Aeropuerto_Internacional_Rosario_Islas_Malvinas
  - https://en.wikipedia.org/wiki/Rosario_%E2%80%93_Islas_Malvinas_International_Airport
  - https://metar-taf.com/airport/SAAR-rosario-islas-malvinas-international-airport
- **Confiance : Élevée.** Aéroport majeur, lieu non ambigu. Le point tombe dans l'enceinte aéroportuaire. *Caveat :* il s'agit du point de référence de l'aéroport, pas précisément du terminal passagers (écart possible ~100-300 m à l'intérieur du site).
- **Vérifier :** https://www.openstreetmap.org/?mlat=-32.90361&mlon=-60.78444#map=15/-32.90361/-60.78444

### SUB-ASV — Aeropuerto Internacional de Sauce Viejo
- **Stocké :** `-31.71104, -60.81138`
- **Sources :**
  - https://es.wikipedia.org/wiki/Aeropuerto_Internacional_de_Sauce_Viejo
  - https://en.wikipedia.org/wiki/Sauce_Viejo_International_Airport
  - https://metar-taf.com/airport/SAAV-sauce-viejo-airport
- **Confiance : Élevée.** Aéroport, lieu non ambigu. *Caveat :* point de référence de l'aéroport (sur la piste/site), pas le terminal.
- **Vérifier :** https://www.openstreetmap.org/?mlat=-31.71104&mlon=-60.81138#map=15/-31.71104/-60.81138

### SUB-CENTENARIO — Hospital Provincial del Centenario, Rosario
- **Stocké :** `-32.93833, -60.664`
- **Sources :**
  - https://en.wikipedia.org/wiki/Hospital_Provincial_del_Centenario (adresse Urquiza 3101 ; `32°56′18″S 60°39′53″W`)
- **Confiance : Moyenne-élevée.** ⚠️ La **longitude n'a que 3 décimales** (`-60.664`, ≈ ±100 m) → le point peut tomber sur un pâté de maisons voisin. L'adresse (Urquiza 3101, à l'angle de l'Av. Francia) est fiable ; **recommandation : affiner la longitude** (géocoder l'adresse exacte) avant l'Étape 4.
- **Vérifier :** https://www.openstreetmap.org/?mlat=-32.93833&mlon=-60.664#map=16/-32.93833/-60.664

### SUB-CULLEN — Hospital Dr. José María Cullen, Santa Fe
- **Stocké :** `-31.6485, -60.71891`
- **Sources :**
  - https://mapcarta.com/W1052914563 (OpenStreetMap)
  - https://www.waze.com/live-map (Av. Freyre 2150) — valeur d'origine `-31.648501509788, -60.7189139`
- **Confiance : Élevée.** Adresse Av. Freyre 2150 conforme au nom du CDC. Arrondi à 5 décimales (≈ 1 m).
- **Vérifier :** https://www.openstreetmap.org/?mlat=-31.6485&mlon=-60.71891#map=17/-31.6485/-60.71891

---

## 3. Confirmation des coordonnées des écoles (CDC §5)

Comparaison **CDC §5 ↔ valeur stockée** (type `double precision`). Toutes négatives (S/O) → aucun changement de signe. Aucun reformatage : `double precision` ne supprime que les **zéros finaux non significatifs** (la valeur numérique est identique).

| UID | CDC §5 (lat, lng) | Stocké (lat, lng) | Identique ? |
|---|---|---|:--:|
| `SUB-E67` | -32.94461140, -60.67859581 | -32.9446114, -60.67859581 | ✅ (zéro final de la lat non significatif) |
| `SUB-E407` *(approx.)* | -32.99057, -60.69833 | -32.99057, -60.69833 | ✅ (valeur approximative du CDC) |
| `SUB-E574` | -32.96837094, -60.73702427 | -32.96837094, -60.73702427 | ✅ |
| `SUB-E1109` | -31.57111634, -60.74029039 | -31.57111634, -60.74029039 | ✅ |
| `SUB-E331` | -31.63277064, -60.70140506 | -31.63277064, -60.70140506 | ✅ |

**Conclusion :** écoles E67/E574/E1109/E331 = valeurs exactes du CDC ; E407 = valeurs approximatives du CDC (comme prévu). Le seul écart d'affichage (`-32.94461140` → `-32.9446114`) est un zéro final supprimé, sans perte de précision.

---

## 4. Synthèse / actions

- ✅ Aéroports (AIR, ASV) : fiables pour un marqueur de carte ; affinables sur le terminal si une précision bâtiment est souhaitée.
- ⚠️ **SUB-CENTENARIO : longitude à 3 décimales → à affiner avant l'Étape 4** (seul point à risque).
- ✅ SUB-CULLEN : adresse confirmée, précision bonne.
- ✅ Écoles : conformes au CDC.
