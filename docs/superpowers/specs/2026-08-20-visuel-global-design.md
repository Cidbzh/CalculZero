# Quizio — Visuel global : « le cahier, et sa marge qui travaille »

- **Date** : 2026-08-20
- **Statut** : design validé par Cid (conversation du 2026-08-20)
- **Périmètre** : réorganisation visuelle + finition. **Aucune nouvelle fonctionnalité, aucune logique JS modifiée.**
- **Fichier concerné** : `index.html` (seul fichier applicatif).

## 1. Contexte

Audit visuel de l'accueil et de l'écran d'exercice (captures Edge, 2 thèmes, 3 matières) a identifié :

1. la moitié droite de l'accueil est vide — contenu aligné à gauche, pleine largeur ;
2. les lignes « MATIÈRE » et « NIVEAU » flottent entre le héro et les panneaux ;
3. les 3 panneaux (Entraînement libre / Sprint / Mes statistiques) pèsent pareil — pas de hiérarchie ;
4. les états vides (stats à zéro, pas encore de points faibles) font des boîtes mortes.

**Priorités de Cid (confirmées)** : remplir les vides · hiérarchie & rythme · peaufiner les détails.
**Exprimément hors périmètre** : « plus de caractère » — pas de nouveaux éléments décoratifs.

### Décisions arrêtées avec Cid

| Décision | Choix |
|---|---|
| Structure d'accueil | « Cahier avec marge » — colonne principale à gauche + colonne marge à droite (stats compactes, à réviser, points faibles, par thème, notes de marge) |
| Basculeur matière | Déplacé dans la **topbar**, regroupé avec le sélecteur de thème (réglages globaux) |
| Écran d'exercice | Passe de cohérence seulement (espacements, boutons, chips) — pas de refonte, zéro changement de flux |

## 2. Invariants (sacré — ne pas toucher)

- Slogan « Plus tu quiz, plus tu sais. » + trait de plume SVG sous « tu sais. »
- h1 « Quizio » inchangé sur les 3 matières
- Cascade de révélation **100 % CSS** (`html.boot [data-rv]`, `--boot-k`), réarmée par `rearmBoot()` — **zéro nouvelle animation**
- `prefers-reduced-motion: reduce` : tout éteint, affichage statique conservé
- Interface 100 % français
- Sprint masqué en allemand (`#secSprint`)
- 3 accents par matière (`[data-mat]` sur `<html>` : bleu maths / violet PC / vert DE) — **aucune nouvelle couleur, aucune nouvelle police, aucune nouvelle dépendance**
- Moteur inchangé : flux « Passer », liste à réviser, points faibles, scoring, sprint, stats par matière (`qz_stats` / `qz_stats_pc` / `qz_stats_de`), migration `cz_*` → `qz_*`
- Fichier fragment (pas de `<!DOCTYPE>`/`<html>`), marqueur `/*GEN2C*/`, specs VIZ JSON-sérialisables
- **Tous les IDs et `data-*` existants sont conservés** — seuls les nœuds changent de place dans le DOM

## 3. Design détaillé

### 3.1 Topbar — réglages globaux regroupés

**Avant** : `Quizio` … `Auto Clair Sombre` … chips de session.
**Après** (desktop) :

```
Quizio          [ Maths | Physique-Chimie | Allemand ]   │   Auto  Clair  Sombre
Quizio          (chips de session pendant les exercices : score · série · ↷ passées · ⏱)
```

- Le bloc `.seg` des matières (3 × `.seg-btn[data-mat]`) est **déplacé** du héro dans la topbar, à gauche du sélecteur de thème, séparé d'un fine divider vertical (1 px `--line`, hauteur ~20 px).
- Le label « MATIÈRE » (actuel dans le héro) est retiré : les 3 boutons sont autosuffisants, comme Auto/Clair/Sombre.
- Style inchangé : mêmes classes `.seg` / `.seg-btn` ; l'état actif suit l'accent de la matière courante (déjà géré par `[data-mat]` sur `<html>`).
- `#topStats` (chips) : comportement inchangé — visibles pendant la session, cachés à l'accueil.
- **Mobile (≤ 720 px)** : la topbar passe sur deux lignes (`flex-wrap`, `row-gap: 10 px`) — jamais de défilement horizontal.

**Sécurité JS vérifiée** : le câblage est `document.querySelectorAll(".seg-btn[data-mat]")` (indépendant de la position dans le DOM) ; `renderHome()` commutent le `.on` par `dataset` ; `setMatiere()` écrit sur `<html>`. Le déplacement du nœud est sans effet sur le JS.

### 3.2 Accueil — deux colonnes

```
┌─────────────────────────────────────────────────────────────────┐
│  Quizio        [ Maths | Phys-Chimie | Allemand ]  │  Auto Clair Sombre │
├──────────────────────────────────────┬──────────────────────────┤
│  PREMIÈRE · SPÉCIALITÉ MATHS         │      eⁱᵖ + 1 = 0          │
│  Quizio                              │                          │
│  Plus tu quiz, plus tu sais. ─~      │   🔥 Série · Score       │
│  L'entraînement...                    │   Sprint record · ↷      │
│                                      │   ─────────────────      │
│  ┌─ ENTRAÎNEMENT LIBRE ────────────┐ │   À réviser (3)          │
│  │ NIVEAU  (facile | moyen | diff) │ │   [ Reprendre → ]        │
│  │ THÈMES  [d1][d2][d3]...         │ │   ─────────────────      │
│  │ [ Lancer l'entraînement ]       │ │   Points faibles         │
│  │ astuce : Échap = passer         │ │   Probabilités 52% ▓▓▓░░ │
│  └─────────────────────────────────┘ │   Trigonométrie 61% ▓▓▓▓░│
│  ┌─ SPRINT 60 s ──────────────────┐  │   (bouton « S'entraîner → »)│
│  │ [ Sprint ]   record : 23       │  │   ─────────────────      │
│  └─────────────────────────────────┘  │   Par thème — lignes…    │
│                                      │                          │
│                                      │      Δ = b² − 4ac        │
└──────────────────────────────────────┴──────────────────────────┘
```

- **Grille** (≥ 1025 px) : `main` passe en `display:grid; grid-template-columns: minmax(0,1fr) 320px; gap: 40px`. Colonne gauche : héro → « Entraînement libre » → « Sprint ». Colonne droite : la **marge** (§ 3.3).
- **Marge sticky** : l'intérieur de la marge fait `position:sticky; top: 88px` (topbar + respiration) — pure CSS, pas de JS. Si elle gêne, elle se retire d'une ligne.
- **Repli ≤ 1024 px** : la marge passe sous le contenu principal ; ses blocs se disposent en `repeat(auto-fit, minmax(240px, 1fr))` — sur tablette, 2 colonnes de blocs.
- **Repli ≤ 600 px** : tout en une colonne ; topbar sur deux lignes.
- **Cascade** : les blocs de la marge portent `data-rv` comme les autres, avec des retards successifs (`--cd`, même mécanisme que `.subcard`) après le héro et le premier panneau. 100 % CSS ; réarmée par `rearmBoot()` au changement de matière ; éteinte sous `prefers-reduced-motion`.

### 3.3 La marge — ordre des blocs (haut → bas)

| # | Bloc | Contenu | Source (existant) |
|---|---|---|---|
| 1 | Note de marge | formule par matière, italique, rotation −2° | `#noteTop` (texte `MAT_DATA[mat].noteTop`) |
| 2 | Stats compactes | les tuiles de `#statGrid` (score, série, ↷ passées, record), 2 × 2 mini-grille, valeur 18 px mono | `#statGrid` (panneau « Mes statistiques ») |
| 3 | À réviser | compteur + CTA gradient + bouton (label existant) | `#hRev` + `.revcta` + `#btnReview` |
| 4 | Points faibles | jusqu'à 5 lignes thème × niveau : % + barre + bouton « S'entraîner → » | `#hWeak` + `[data-weak]` |
| 5 | Par thème | lignes compactes thème → précision | `#hBySub` |
| 6 | Note de marge | formule par matière, rotation +1.6° | `#noteBottom` (texte `MAT_DATA[mat].noteBottom`) |

- Le contenu de `#statsExtra` (blocs 3–5) est injecté par JS dans le conteneur existant : **on place simplement `#statsExtra` dans la marge**, aucun JS modifié.
- Le panneau « Mes statistiques » disparaît tel quel : ses tuiles (bloc 2) vivent dans la marge. **Rien n'est supprimé.**
- **États vides domptés** :
  - blocs Points faibles / Par thème sans données → une ligne courte en italique, teinte `--muted` (« Lance quelques entraînements : tes points faibles apparaîtront ici »), au lieu d'une boîte vide ;
  - À réviser vide → le bloc est masqué (pas de CTA vers une liste nulle).
- **Mobile** : la marge devient la suite naturelle du contenu — mêmes blocs, pleine largeur.

### 3.4 Panneaux & hiérarchie (colonne principale)

- **« Entraînement libre » = l'action principale de la page** : premier panneau, padding 28 px, CTA `.btn-primary` (inchangé).
- **NIVEAU / THÈME dé-floatés** : le label est collé à son contrôle (espacement 8 px, plus de ligne flottante entre le héro et le panneau). Mêmes segments `.seg-btn[data-lvl]`, mêmes tuiles `#subGrid` — classes non modifiées.
- **Astuce** (« Échap = passer ») reste en pied de ce panneau.
- **« Sprint 60 s » = second rang** : padding 20 px, bouton passe `.btn-ghost` (toujours bien visible), record `#bestSprint` en chip mono. Toujours **masqué en allemand**.
- Le héro (eyebrow, h1, slogan + plume, lede) est **inchangé** — seule la ligne « MATIÈRE » en sort (§ 3.1).

### 3.5 Écran d'exercice — passe de cohérence

Ce qui est vu sur les captures est bon : **aucun changement de flux** (Passer, correction, sprint, Échap), aucune fonction modifiée. Passe de finition CSS :

- espacements de `.qcard` sur la grille 8 pt ;
- trio « saisie / Valider / Passer » : même hauteur (40 px), même rayon (12 px), gap 10 px, alignement baseline ;
- chips `#chipSub` / `#chipLvl` strictement identiques aux chips de l'accueil (même hauteur, même typo mono) ;
- ligne d'astuce sous le trio au style `.note` existant.

### 3.6 Finitions (le « peaufiner »)

- **Grille d'espacement 8 pt** appliquée dans tous les panneaux (remplace le mélange 24/20/16 actuel).
- **Échelle typo respectée** : 60 px (h1 clamp) / 20 px (h2 panneaux) / 16.5 px (corps) / 12.5 px (labels) / 11–12 px (micro) — aucune taille intermédiaire introduite.
- **Pas de nouvelle couleur** : tokens existants uniquement ; si un texte `--muted` passe mal en thème clair, on l'assombrit (ajustement de token, pas de nouvelle couleur).
- **`:focus-visible`** net et cohérent sur `.btn`, `.seg-btn`, `.theme-btn`, `.opt` (anneau accent, offset 2 px).
- **Zéro nouvelle keyframe** : les 12 animations existantes restent les seules.

## 4. Hors périmètre (ne pas faire)

- Aucune nouvelle fonctionnalité, aucune logique JS, aucun nouvel état dans `state`/`stats`.
- Aucune nouvelle animation, couleur, police, dépendance.
- Aucun changement de contenu des 3 registres (questions, corrections, visuels).
- Pas de refonte de l'écran d'exercice, pas de nouveau thème, pas de mode additionnel.

## 5. Contraintes techniques & risques connus

- `renderHome()` écrit par **ID** (`#heroEyebrow`, `#heroLede`, `#noteTop`, `#noteBottom`, `#statGrid`, `#bestSprint`, enfants de `#statsExtra`) → tout déplacement de nœuds est transparent pour le JS.
- `#statsExtra` est un conteneur injecté par JS : il change de position dans le DOM seulement.
- `.seg-btn[data-mat]` est câblé globalement (`querySelectorAll`), **sans jamais cibler `<html>`** → le déplacement dans la topbar est sûr (commentaire existant à cet effet).
- `rearmBoot()` réarme tous les `data-rv` → la marge entre dans la cascade automatiquement si elle porte l'attribut.
- **`_qz_verify.js`** : si une assertion vérifie la *position* du basculeur matière dans `#home`, mettre l'assertion à jour (documenter le changement). Toutes les autres sections (bascules stats bit-à-bit, re-arm de la cascade, pas de temps mort, sprint masqué en DE, migration `cz_*`) ne doivent pas être affectées.

## 6. Vérification

1. **Syntaxe** des 2 blocs `<script>` (commande one-liner du CLAUDE.md).
2. **`node _qz_verify.js`** intégral — toutes les sections passent (thème, confetti, 3 registres × 25, bascules matière, ré-armement, pas de temps mort, migration).
3. **Captures Edge avant/après** : accueil clair / sombre / auto × maths / PC / DE + écran d'exercice — comparaison visuelle (recette : `msedge --headless=new`, chemin absolu pour `--screenshot`).
4. **Vérifs manuelles** : bascule de matière depuis la topbar (accent + cascade + stats de la bonne matière, instantané) ; resize 1440 → 1024 → 600 px ; navigation clavier (Tab → focus net ; Échap en jeu) ; `prefers-reduced-motion` (affichage statique complet).

## 7. Commits (groupes logiques, branche `main`)

1. `Topbar : basculeur matière à côté du thème`
2. `Accueil : colonne marge — stats compactes, à réviser, points faibles, par thème`
3. `Panneaux : hiérarchie entraînement/sprint, labels dé-floatés, états vides`
4. `Écran d'exercice + finition : grille 8 pt, focus-visible`
5. `Tests : mise à jour _qz_verify.js` — **uniquement si** une assertion de position doit bouger

> Les artefacts d'investigation (`.shots/tmp-*.html`, captures dans `%TEMP%\qzshots`) sont des supports de conception locaux — ils ne font pas partie du livrable et ne sont pas commités.
