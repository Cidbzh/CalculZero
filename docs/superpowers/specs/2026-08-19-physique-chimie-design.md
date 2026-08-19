# Spec — CalculZéro : physique-chimie (Première spécialité)

**Date** : 2026-08-19 · **Statut** : design validé section par section par l'utilisateur
**Périmètre** : ajouter la spécialité physique-chimie à CalculZéro, « la même chose que les maths visuellement et dans le fonctionnement », dans le même fichier `index.html`.

## 1. Contexte

CalculZéro est un fichier unique autonome (`index.html`, ~1 560 lignes, HTML+CSS+JS, aucun build, hors-ligne) pour s'entraîner au calcul en Première spécialité maths. Il se compose de 4 couches :

1. **Contrat de question** — `{prompt, type:"number"|"frac"|"choice", answer|options+correct, tol?, explain, viz?}`.
2. **Générateurs** — tableaux `{lvl:"facile"|"moyen"|"difficile", make()}`, la question est générée à l'affichage (aucune banque fixe).
3. **Registre des thèmes** — `SUBJECTS = [{id, name, sym, gens}]`, lu par l'accueil, le sprint, les stats, les points faibles.
4. **Moteur + VIZ** — 3 modes (`free`/`sprint`/`review`), « Passer », stats `localStorage` (`cz_stats`), mini-visuels SVG à deux phases (`"q"` neutre sans nombres / `"c"` complet, affiché en correction seulement), `VIZdraw()` qui ne plante jamais.

Le moteur ne connaît pas « les maths » : il ne connaît que le contrat de question et le registre. C'est cette couture que la présente spec exploite.

## 2. Décisions validées

| Décision | Choix |
|---|---|
| Coexistence | **A** — un seul accueil, bascule « Maths / Physique-Chimie » ; pas de 2ᵉ fichier, pas de refactor multi-matières |
| Thèmes | **Les 7** : grandeurs cosmiques, mécanique & Newton, forces & champs, énergie, quantités de matière, stœchiométrie & état final, cinétique |
| Stats | **Séparées par matière** : `cz_stats` (maths, jamais migré) et `cz_stats_pc` (PC) ; points faibles, liste à réviser, record sprint → par matière |
| Habillage | Bascule sur l'accueil seulement (invisible en session) ; textes héro par matière ; titre et marque inchangés |
| Visuels | 7 nouveaux kinds SVG PC, mêmes règles q/c que les maths |
| Tests | Extension de `_cz_verify.js` + régression de bascule + checklist manuelle |

## 3. Architecture

### 3.1 Bascule de matière

- `state.matiere` ∈ `"maths" | "pc"`, valeur par défaut `"maths"`.
- Choix persisté sous la clé `cz_subject` (JSON string) — l'app rouvre sur la dernière matière (même expérience que le thème clair/sombre). Valeur absente ou illisible → `"maths"`.
- Le sélecteur est une ligne `.seg` (style existant) placée sur l'accueil, sous le titre, avec deux boutons : `Maths` et `Physique-Chimie`. **Il n'existe pas sur l'écran de jeu** : impossible de basculer en session.
- Bascule = changer `state.matiere`, persister, recharger les stats actives, `renderHome()`. Aucune session en cours n'est concernée (le sélecteur n'est visible qu'à l'accueil).

### 3.2 Registres

- `SUBJECTS` est renommé `SUBJECTS_MATH` — **contenu inchangé** (mêmes ids, même ordre).
- Nouveau `SUBJECTS_PC` avec les 7 thèmes (section 5).
- Helper `activeSubjects()` → le registre de `state.matiere`.
- Map globale `THEME_BY_ID` (les deux registres) pour tout lookup de nom de thème (points faibles, chips, « par thème ») — robuste même si un id apparaît dans un contexte hors registre actif.

### 3.3 Statistiques — deux emplacements, zéro migration

- Maths : clé `cz_stats` — **inchangée, jamais touchée, zéro migration** (les utilisateurs existants ne perdent rien).
- PC : clé `cz_stats_pc` — même forme que `cz_stats` (y compris les champs v2 : `skips`, `streakBySub`, `history`, `review`), normalisée au chargement par le **même** bloc « Migration v2 ».
- `stats` reste la variable d'état du moteur ; `save()` écrit sur la clé active (`activeStatsKey()`). La bascule fait : `stats = loadStats(activeStatsKey())` — **une seule variable échangée**, toutes les fonctions (`subStat`, `pushHistory`, `reviewAdd`, …) passent déjà par `stats`.
- Conséquence acceptée et voulue : points faibles, « par thème », liste à réviser, record sprint, meilleure série → **par matière**.

### 3.4 Points de contact du moteur (liste exhaustive)

1. `state.matiere` + chargement de `cz_subject` + sélecteur DOM (2 boutons `.seg-btn` `data-mat`).
2. `SUBJECTS` → `SUBJECTS_MATH` ; références remplacées par `activeSubjects()` / `THEME_BY_ID` dans : `pickQ`, `renderHome` (tuiles, « par thème », points faibles, « à réviser »), `trainWeak`.
3. Initialisation de `stats` + `save()` → clé active ; `loadStats(key)` ; bascule.
4. Bloc « Migration v2 » appliqué dans `loadStats` (donc aux deux clés).
5. Textes héro par matière (section 4).
6. VIZ : 7 nouveaux kinds + cases dans `VIZdraw` (section 6).
7. `_cz_verify.js` (section 7).

**Inchangés** : contrat de question, `checkAnswer`, `fmtAns`, les 3 modes, `passQ`/file de passes, `reviewAdd/Remove/Requeue`, `confetti`, thème clair/sombre, touche Échap, CSS existant (uniquement des éléments réutilisés).

## 4. Interface — textes et tuiles

Marque « Calcul**Zéro** » et titre « Le calcul sans erreur, chaque jour. » : **invariables** (les deux matières).

| Élément | `maths` (inchangé) | `pc` |
|---|---|---|
| Eyebrow | `Première · spécialité maths` | `Première · spécialité physique-chimie` |
| Lede | inchangée | « Deux minutes de calculs ciblés — Newton, énergie, champs, moles, stœchiométrie, cinétique — avec une correction détaillée (et des mini-visuels) à chaque question, et un bouton *Passer* pour mettre de côté ce qui te bloque. » |
| Gribouillis haut | `e^iπ + 1 = 0` | `F = m·a — 2ᵉ loi de Newton` |
| Gribouillis bas | `Δ = b² − 4ac — à connaître par cœur ✎` | `Eₖ + Eₚ = Eₘ — l'énergie mécanique ✎` |

Les textes sont des **données** (objet `{eyebrow, lede, noteTop, noteBottom}` par matière) lues par `renderHome()` — aucune duplication de HTML.

Tuiles PC (design `.subcard` existant : `sym` + `nm` + progression) :

| `id` | `name` | `sym` |
|---|---|---|
| `cosmo` | Grandeurs cosmiques | `10ⁿ` |
| `newton` | Mécanique & Newton | `F=ma` |
| `forces` | Forces & champs | `G` |
| `energie` | Énergie | `E` |
| `moles` | Quantités de matière | `n` |
| `stoich` | Stœchiométrie & état final | `τ` |
| `cinet` | Cinétique | `v` |

## 5. Contenu — les 7 thèmes

Règles transverses (mêmes que les maths) :
- Interface 100 % français ; unités **dans le prompt**, réponse = nombre (ou `{n,d}` pour les fractions naturelles).
- `g` toujours explicité dans le prompt (`9,8 N/kg` pour les poids ; `10 m/s²` pour la chute libre quand le résultat est propre).
- Réponses décimales : `tol` relative comme existante ; entiers/fractions : sans `tol`.
- **1 calcul dominant par question** — tenable dans un sprint 60 s.
- QCM (`type:"choice"`) réservés aux questions conceptuelles (exclus du sprint, comme les maths).
- Chaque thème couvre les 3 niveaux ; 4 à 8 familles par thème ; ~45–55 générateurs PC au total.
- `explain` = méthode complète HTML, comme les maths.

### 5.1 `cosmo` — Grandeurs cosmiques
| # | lvl | Famille | Type |
|---|---|---|---|
| 1 | facile | Convertir une donnée (UA, rayon…) en notation scientifique (km→m, m→km) | number tol |
| 2 | facile | Ratio de deux rayons donnés (arrondi entier) | number tol |
| 3 | moyen | Distance en années-lumière → m (d = N × 9,46×10¹⁵, N petit) | number tol |
| 4 | moyen | Temps de parcours lumière d/c (d et c donnés, résultat à 0,1 s) | number tol |
| 5 | difficile | Ordre de grandeur d'un volume (ratio de volumes) → réponse = exposant | number |
| 6 | difficile | Parallaxe p (en ″) → distance en pc (d = 1/p) ; variante : cette même distance en années-lumière (× 3,26) | number tol |

### 5.2 `newton` — Mécanique & Newton
| # | lvl | Famille | Type |
|---|---|---|---|
| 1 | facile | 2ᵉ loi : a = F/m | number |
| 2 | facile | Chute libre depuis l'origine : v = g·t (g = 10) | number |
| 3 | facile | 1ʳᵉ loi : mouvement rectiligne uniforme → ΣF = 0 | choice |
| 4 | moyen | h = ½·g·t² (g = 10) | number |
| 5 | moyen | Résultante : a = (T − P)/m | number |
| 6 | moyen | Projectile : temps de vol t = √(2h/g) (h et g choisis pour t entier) | number |
| 7 | difficile | Projectile : portée x = v₀·t | number |
| 8 | difficile | 3ᵉ loi : identifier la force de réaction (livre sur table) | choice |

### 5.3 `forces` — Forces & champs
| # | lvl | Famille | Type |
|---|---|---|---|
| 1 | facile | Poids P = m·g (g = 9,8) | number tol |
| 2 | facile | Le poids est une force de champ (action à distance) | choice |
| 3 | moyen | Intensité du champ de gravitation G = GM/d² (valeurs données → ≈ 9,8) | number tol |
| 4 | moyen | Force de gravitation F = GMm/d² (G, M, m, d donnés) | number tol |
| 5 | moyen | Force électrostatique F = q·E | number tol |
| 6 | difficile | Satellite : F = GMm/r² (m satellite, r donnés) | number tol |
| 7 | difficile | Sens de la force sur une charge négative (opposé au champ) | choice |

### 5.4 `energie` — Énergie
| # | lvl | Famille | Type |
|---|---|---|---|
| 1 | facile | Eₖ = ½·m·v² | number |
| 2 | facile | Eₚ = m·g·h | number |
| 3 | facile | Quelle énergie augmente lors d'une chute ? | choice |
| 4 | moyen | Élastique : E = ½·k·x² | number |
| 5 | moyen | Conversion : v = √(2·g·h) (résultat entier) | number |
| 6 | moyen | Extraire v de Eₖ (Eₖ, m donnés → v entier) | number |
| 7 | difficile | Avec dissipation : Eₖ fin = Eₘ − E_dissipée | number |
| 8 | difficile | Lancement par ressort : v = x·√(k/m) | number tol |

### 5.5 `moles` — Quantités de matière
| # | lvl | Famille | Type |
|---|---|---|---|
| 1 | facile | n = m/M | frac ou number |
| 2 | facile | m = n·M | number |
| 3 | facile | c = n/V | number |
| 4 | moyen | n = c·V (avec conversion mL → L) | number |
| 5 | moyen | N = n·Nₐ (Nₐ = 6×10²³) | number tol |
| 6 | difficile | Dilution c₁V₁ = c₂V₂ | number |
| 7 | difficile | Volume molaire : V = n·Vm (Vm = 24 L/mol) | number tol |

### 5.6 `stoich` — Stœchiométrie & état final
Réactions simples à coefficients petits (2H₂ + O₂ → 2H₂O, A + 2B → C, CH₄ + 2O₂ → CO₂ + 2H₂O) :
| # | lvl | Famille | Type |
|---|---|---|---|
| 1 | facile | Ratio molaire : n(B) pour n(A) données | number |
| 2 | facile | Identifier le réactif limitant | choice |
| 3 | moyen | Quantité de produit à l'état final | frac ou number |
| 4 | moyen | Avancement maximal τ | frac ou number |
| 5 | difficile | Quantité restante d'un réactif à l'état final | frac ou number |
| 6 | difficile | Lecture d'état final (quel couple n_A, n_B est correct) | choice |

### 5.7 `cinet` — Cinétique
| # | lvl | Famille | Type |
|---|---|---|---|
| 1 | facile | Vitesse moyenne v = \|Δn\|/Δt | number |
| 2 | facile | n(t95) = 0,05·n₀ | number |
| 3 | moyen | « t(95 %) est-il atteint ? » (n₀ et n(t) donnés) | choice |
| 4 | moyen | Rôle du catalyseur (modifie la vitesse, pas l'état final) | choice |
| 5 | moyen | Vitesse moyenne sur un intervalle | number |
| 6 | difficile | t(95 %) à partir d'un tableau n(t) | number |
| 7 | difficile | v = k·c (cinétique du 1er ordre) | number tol |

## 6. Visuels SVG (PC)

Règles (identiques aux maths) : specs **100 % JSON-sérialisables** (coefficients, jamais de fonctions) ; `VIZdraw` renvoie `""` en cas d'erreur, **ne plante jamais** ; phase `"q"` = image neutre **sans aucun élément de la réponse** ; phase `"c"` = image complète, affichée uniquement dans la correction.

| `kind` | Thème(s) | Phase `"q"` (neutre) | Phase `"c"` (correction) |
|---|---|---|---|
| `proj` | newton (chute, projectile) | point de départ + sol, **pas** de trajectoire, pas de portée | parabole, sommet, point d'impact, flèche v₀ |
| `force` | forces, newton (résultante) | masse ponctuelle sur support, **sans** flèches | flèches P (↓) et T (↑) à l'échelle + résultante |
| `bars` | energie | 3 barres vides libellées Eₖ / Eₚ / Eₘ | barres remplies + valeurs en J |
| `scale` | cosmo | règle log **sans** marqueurs | marqueurs (ex. Terre/Soleil) + bracket de ratio |
| `soln` | moles | récipient neutre | ménisque au repère de volume + c, n |
| `stoich` | stoich | emplacements vides A / B / C | barres à l'état final + réactif limitant marqué |
| `kin` | cinet | axes + courbe de décroissance neutre | n₀, ligne des 5 %, point t(95 %) en pointillés |

Attributs à stocker dans les specs (exemples) : `proj` → `{h, v0, g}` ; `force` → `{P, T}` ; `bars` → `{ek, ep, em}` ; `scale` → `{r1, r2, lab1, lab2}` ; `soln` → `{n, V, c}` ; `stoich` → `{nA, nB, nC, limitant}` ; `kin` → `{n0, t95}`. (Détails précis fixés à l'implémentation, sous réserve du test round-trip.)

`VIZdraw` : 7 nouveaux `case` + 7 fonctions de dessin (`vzProj`, `vzForce`, `vzBars`, `vzScale`, `vzSoln`, `vzStoich`, `vzKin`), même squelette que les existants (`vzWrap`, clipPath, `pathLength="1"` pour l'animation de tracé, classes `.vz-*` existantes).

## 7. Tests

`node _cz_verify.js` doit rester **le point de contrôle unique**. Extensions :

1. **Double registre** : la boucle de génération (25×/générateur, forme, auto-correctif `checkAnswer`, rendu SVG q/c, round-trip `localStorage`) itère `SUBJECTS_MATH` **et** `SUBJECTS_PC`.
2. **Régression de bascule** (nouvelle section) :
   - démarrer avec des stats maths pré-établies dans `cz_stats` ;
   - basculer sur PC, répondre à une question PC → `cz_stats` **inchangé**, `cz_stats_pc` incrémenté ;
   - basculer sur maths → stats maths restaurées à l'identique (deep-compare).
3. **Checklist manuelle** (avant livraison) : ouvrir `index.html` ; basculer Maths↔PC ; session libre/sprint/révision dans les deux matières ; « Passer » + points faibles + « à réviser » par matière ; record sprint indépendant ; rechargement de page → matière et choix de thème restaurés ; `prefers-reduced-motion` respecté.
4. **Syntaxe** : les 2 blocs `<script>` restent compilables (déjà couvert par [1]).

## 8. Hors périmètre (YAGNI)

- Pas de statistique croisée maths+PC, pas de sprint mélangé.
- Pas de contenu Terminale, pas de chimie organique, pas de noyaux/radioactivité.
- Pas de multi-utilisateurs, pas de serveur, pas de build.
- Pas de changement de marque au-delà des textes héro par matière.

## 9. Contraintes héritées (CLAUDE.md du projet)

- Fichier unique autonome, aucune dépendance, fonctionnel hors-ligne.
- Tout l'interface en français.
- Les specs `viz` restent JSON-sérialisables (round-trip testé).
- `VIZdraw` ne plante jamais (try/catch, `""` en échec).
- Nouveaux champs de stats normalisés au chargement (bloc « Migration v2 »).
- Toute nouvelle animation reste désactivée sous `prefers-reduced-motion`.
- Le fragment `index.html` conserve sa forme (pas de restructuration HTML).
- Le marqueur `/*GEN2C*/` est préservé.

## 10. Critères d'acceptation

1. `node _cz_verify.js` : **tous les tests passent**, dont les nouveaux (double registre + régression de bascule).
2. L'accueil s'ouvre sur la matière persistée (défaut maths) avec ses textes héro, tuiles, stats propres.
3. Les 3 modes fonctionnent dans les deux matières, avec « Passer », file de passes, points faibles, « à réviser », confettis.
4. `cz_stats` (maths) est bit-à-bit inchangé par toute activité PC.
5. Aucun asset externe nouveau ; l'app reste utilisable hors-ligne.
6. Les 7 thèmes PC affichent leurs visuels en phases q et c (aucun `""` inexpliqué hors cas « var »).
7. `CLAUDE.md` du projet mis à jour pour refléter les nouvelles sections (après implémentation).
