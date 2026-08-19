# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

CalculZéro — application d'entraînement au calcul (Première), **deux matières sur le même moteur** : maths (spécialité) + physique-chimie. **Fichier unique autonome** : `index.html` (~2600 lignes, HTML + CSS + JS, aucun build, aucune dépendance, pas de git). S'utilise en l'ouvrant dans un navigateur. C'est la seule copie — les anciennes copies citées ici (`C:\Users\acoul\apps\calculzero\index.html`, `C:\Users\acoul\Desktop\CalculZero.html`) n'existent plus sur cette machine.

## Structure d'index.html

Le fichier est un fragment (démarre par `<title>`, pas de `<!DOCTYPE>`/`<html>`/`<head>`) — ne pas le restructurer.

1. Tête — `<title>`, puis un **petit `<script>` anti-flash** (avant le premier rendu, applique le thème sauvegardé `cz_theme` sur `<html>` pour éviter le flash de thème « incorrect »), puis les `<link>` Google Fonts, puis `<style>` : CSS variables claires/sombres (`prefers-color-scheme` **et** `[data-theme="light"/"dark"]`), `.frac` (fraction empilée, utilisée dans les questions, QCM et méthodes), révélation `.boot [data-rv]` (100 % CSS **par design** : le JS ne peut pas bloquer l'animation), `prefers-reduced-motion` respecté, transition douce `.theming` (changements de thème), `.confetti-host` + `@keyframes confFall`.
2. HTML — `#home` (basculeur matière `data-mat` « Maths / Physique-Chimie », niveau, tuiles thèmes `#subGrid`, entraînement libre, sprint 60 s, stats, `#statsExtra` injecté en JS, boutons thème `data-theme-pick`) et `#play` (zone question `#qbox`).
3. `<script>` principal — sections balisées par `/* ============ */` :
   - **UTILS** — `Ri` (entier aléatoire), `pick`, `shuf`, fractions : `gcd`/`fr` (simplification), `F`/`FR` (affichage HTML empilé), `fa` (réponse `{n,d}` simplifiée).
   - **GENERATORS** — tableaux `G_DERIV`, `G_SUITES`, `G_LOGEXP`, `G_EQ2`, `G_TRIG` (+ table `TRIGV` des valeurs exactes, `ANGRAD` pour les visuels), `G_PROBA`, `G_VECT`, `G_AFF`, `G_LIM`, `G_VAR`, et, pour la matière physique-chimie, `G_COSMO`, `G_NEWTON`, `G_FORCES`, `G_ENERGIE`, `G_MOLES`, `G_STOICH`, `G_CINET`, `G_ONDES`, `G_ELECTRICITE` : chaque entrée est `{lvl, make()}` où `make()` génère la question **à l'affichage** (aucune banque de questions fixe) et retourne :
     - `{prompt, type:"number", answer, tol?}` — `tol` est une **tolérance relative** (appliquée × `max(1,|answer|)` dans `checkAnswer`) ; les décimales s'affichent avec une virgule (`fmtAns`) ;
     - `{prompt, type:"frac", answer:{n,d}}` — l'utilisateur peut répondre en `a/b` **ou** en décimal (comparé au 1e-9) ;
     - `{prompt, type:"choice", options:[], correct:<index>}` — QCM (exclus du sprint).
     Chaque question porte un `explain` (méthode de correction, HTML), et éventuellement une clé `viz` (mini-graphique SVG — voir section **GRAPH**).
   - **SUBJECTS** — **deux registres** thème → générateurs : `SUBJECTS_MATH` (10 thèmes) et `SUBJECTS_PC` (9 thèmes : les 7 du brief + ondes & lumière, électricité) ; `activeSubjects()` renvoie le registre actif selon `state.matiere` (`"maths"` | `"pc"`), et `THEME_BY_ID` réunit les deux registres (résout la fiche d'un thème — `{id, name, sym, gens}` — quel que soit son registre). Préserver le marqueur `/*GEN2C*/`.
   - **GRAPH** — moteur des mini-visuels SVG (dessinés en JS, aucune dépendance, reste hors-ligne) : `VIZdraw(spec, phase)` renvoie une chaîne SVG (ou `""`). **Règle d'or : les specs `viz` doivent être 100 % JSON-sérialisables** (nombres/chaînes/tableaux) — les questions partent en `localStorage` (liste à réviser) et doivent repartir après un rechargement. On stocke les **coefficients** (a, b, c, k…), jamais de fonctions : `vzF()` reconstruit f depuis `kind` + coefficients. **Deux phases** : `"q"` = image **neutre sans aucun nombre** (n'indique JAMAIS la réponse), `"c"` = image complète avec les éléments de la réponse (tangente, racines marquées, triangle sin/cos, flèches de variation) — affichée uniquement dans la correction (helper `vizAns()`, présent dans les 3 boîtes « Méthode » : `afterAnswer`, `revealAfterSkip`, `reviewSkip`). Exception : le type `"var"` (études de variations) ne s'affiche **jamais** en phase `"q"` — la courbe elle-même montrerait où f monte/descend. **Visuels PC** (mêmes règles : specs JSON-sérialisables, deux phases) : kind `"scale"` → `vzRatio`, `"proj"` → `vzProj`, `"force"` → `vzForce`, `"bars"` → `vzBars`, `"soln"` → `vzSoln`, `"stoich"` → `vzStoich`, `"kin"` → `vzKin`, `"onde"` → `vzOnde`, `"lentille"` → `vzLent`, `"circuit"` → `vzCircuit`, `"charges"` → `vzCharges`, `"work"` → `vzWork`. **Kinds maths** : `"tan"` → `vzTan` (tangente), `"par"` → `vzPar` (parabole), `"unit"` → `vzUnit` (cercle unité). **Ne pas confondre** : `vzScale` est un helper d'échelle maths (fonction interne qui renvoie deux fonctions d'échelle `{sx, sy}`, appelées `X(…)`, `Y(…)` dans les visuels), **pas** un visuel — le kind `"scale"` (visuel PC) est dessiné par `vzRatio`.
   - **ENGINE** — `store` (localStorage) ; **stats par matière** : deux clés `cz_stats` (maths) et `cz_stats_pc` (PC) de même forme, normalisées au chargement par `loadStats(key)` (bloc « Migration v2 »), et `activeStatsKey()` choisit la clé selon `state.matiere` — `save()` n'écrit que la clé active, l'activité PC ne doit **jamais** écrire `cz_stats` ; `state` (session, dont `matiere` : `"maths"` par défaut, persistée sous `cz_subject`, changée par `setMatiere()` appelé depuis le basculeur `data-mat`, qui échange la variable `stats` et swape **immédiatement au clic** — aucun délai ni phase de sortie : la cascade `rearmBoot()` masque elle-même le changement de contenu) ; `MAT_DATA` (textes héro/notes par matière, lus par `renderHome`) ; `stats`, `pickQ`/`renderQ`, `checkAnswer`/`submit`/`afterAnswer`, « Passer » (`passQ`/`countSkip`/`revealAfterSkip`/`reviewSkip`), sessions (`startFree`/`startSprint`/`startReview`/`endSprint`/`endReview`/`goHome`), points faibles (`weakPoints`/`trainWeak`), liste à réviser (`reviewAdd`/`reviewRemove`/`reviewRequeue`).
   - **Finitions & câblage** (avant « Révélation en cascade ») — `confetti()` (pluie de confettis, ~90 éléments DOM, sans dépendance, désactivé si `prefers-reduced-motion: reduce`), thème : `applyTheme(t, animate)` + `initTheme()` (boutons `data-theme-pick`, persistance clé `cz_theme`, classe `html.theming` pour la transition douce), écouteur clavier global.

## Règles à respecter pour ajouter une fonctionnalité

- **Trois modes de session** : `state.mode` vaut `"free"`, `"sprint"` ou `"review"` (`"done"` est transitoire, entre fin de session et retour à l'accueil). Tout nouveau code doit traiter les **trois** — le « Passer » n'a pas le même sens dans chacun (voir ci-dessous), et `pickQ` a un comportement propre à chaque mode.
- **Stats persistées** : les champs ajoutés plus tard n'existent pas chez les utilisateurs existants → toujours normaliser au chargement (bloc « Migration v2 » : `stats.skips`, `stats.streakBySub`, `stats.history`, `stats.review`) et lire avec `(x||0)`. Champs v2 :
  - `history` — 100 dernières réponses `{s, l, o}` (base des « points faibles ») ;
  - `review` — questions à refaire `{s, l, q}`, max 50 ;
  - `streakBySub` — meilleure série par thème (affichée 🔥 dans le panneau « Par thème ») ;
  - `bySub[id]` — `{ans, good, skips}` par thème (créé à la volée par `subStat`).
- **Flux « Passer »** (ne pas casser) : `passQ` (bouton ou touche Échap) compte la passe, affiche d'abord la question suivante, puis pousse la question posée dans `state.skipQueue` (max 5) ; `renderQ` consomme cette file en premier et marque `_passed=true` ; une 2ᵉ passe (ou file pleine) déclenche `revealAfterSkip` qui montre la méthode. **En mode review**, « Passer » = `reviewSkip` : la méthode s'affiche et la question **repart en fin de liste** (`reviewRequeue`) au lieu d'être retirée. Une passe ne compte jamais comme réponse (`stats.ans` inchangé) et ne casse pas la série.
- **Logique de la liste à réviser** : mauvaise réponse en free/sprint → `reviewAdd` ; bonne réponse → `reviewRemove` ; en mode review, une mauvaise réponse fait repartir la question en fin de file, une bonne réponse la retire — la session se termine quand la liste est vide (`endReview`).
- **Points faibles** : `weakPoints()` = top 5 cellules thème×niveau les moins précises sur `history` (min 5 réponses, min. seuil) ; le bouton « S'entraîner → » appelle `trainWeak(s,l)` qui verrouille thème + niveau puis lance le mode libre.
- **Scoring / sprint** : 10 pts par bonne réponse + 5 si série ≥ 3 ; sprint = tick 100 ms, chip « urgente » sous 10 s, avancement auto après 1,1 s (bon) / 1,7 s (raté) / 3 s (méthode révélée), record `stats.bestSprint`.
- **Toute l'interface est en français** (textes, placeholders, indices).
- **Mini-visuels** : toute nouvelle question qui se prête à un visuel reçoit une clé `viz` (specs JSON-sérialisables, phases `"q"`/`"c"` — jamais d'élément de réponse en phase question) ; `VIZdraw()` doit rester sans dépendance et **ne jamais planter** (renvoie `""` en cas d'erreur, le texte de la méthode doit toujours s'afficher).
- **Google Fonts** (STIX Two Text, Instrument Sans, Spline Sans Mono) : l'app doit rester fonctionnelle hors ligne grâce aux stacks de repli.
- **Thème (Auto / Clair / Sombre)** : câblé dans la section « Finitions & câblage » — `applyTheme(t, animate)` pose/retire l'attribut `data-theme` sur `<html>`, persiste le choix dans `localStorage` sous la clé `cz_theme` (valeurs `"auto"`|`"light"`|`"dark"`), met à jour la classe `.on` des boutons `data-theme-pick`, et ajoute la classe `html.theming` le temps d'une transition douce (≈ 520 ms). `"auto"` = attribut retiré → on suit le système. Un **script anti-flash** en tête de fichier réapplique le choix avant le premier rendu. Toute nouvelle animation/décoration doit rester désactivée sous `prefers-reduced-motion`.
- **Notes d'implémentation (revue finale 2026-08-19, à respecter)** :
  - Convention codebase : la plupart des QCM posent la bonne option en `correct:0` (les 2 QCM maths `G_EQ2`/`G_TRIG` mélangent via `shuf`) — le moteur n'impose aucun index fixe (`answerChoice`).
  - G_STOICH #4 : le leurre « Aucun (proportions stœchiométriques) » n'est jamais la bonne réponse — leurre conceptuel volontaire (verbatim du brief).
  - G_FORCES — satellite : la question est aujourd'hui `number` (F = G·M·m/r², tol 0.011) ; l'ancienne version QCM « 12,8 × 10⁶ m » du brief n'existe plus.
  - G_FORCES — satellite : « c'est le poids du satellite : c'est lui qui le maintient en orbite » — défendable en orbite circulaire où P est la force centripète (verbatim du brief).
  - Certains prompts PC héritent de la notation point des briefs (ex. « 2.5 mol », G_MOLES #7) — verbatim des briefs ; la saisie élève est normalisée (`checkAnswer` accepte `.` et `,`).
  - `fmtAns` affiche les très grandes réponses en notation scientifique JS (« 1,2e+24 ») — moteur pré-existant, saisie acceptée, écart cosmétique.
  - Dans `vzForce`, la flèche P est en `vz-ans-bad` (rouge) et T en `vz-ans` (vert) : code couleur de contraste du brief — P (le poids) n'est pas une « erreur ».
  - Le visuel `kin` trace une décroissance générique calée en (t95, 5 %·n₀) — illustration, non le tracé des données de l'énoncé (design du brief).
  - L'occurrence `return{prompt:prompt,` (G_CINET) est verbatim du brief T7 — ne pas « simplifier » en `{prompt,` sans re-diff.
  - Le spec `soln` de G_MOLES #7 porte une clé `V` non lue par `vzSoln` (ne lit que `n`/`c`) — verbatim du brief, inoffensive pour le round-trip JSON.
  - `tol:0.011` volontaire sur G_FORCES — brief-mandated : accepte à la fois les méthodes g = 9,8 et g = 9,77. La même valeur apparaît aussi sur d'autres tables (G_COSMO, G_ENERGIE, G_CINET, G_ONDES, et même G_DERIV/G_LOGEXP en maths) : ne pas la « nettoyer ».
  - Noms de chapitre en `var(--accent)` (et non `--ink`) — décidé 2026-08-19 : le quasi-noir était jugé difficilement lisible. Trois occurrences : `.subcard .nm` (tuiles), `.substatrow b` (stats « Par thème »), `.weaknm` (points faibles) — + elles sont dans la liste `.theming` (transition de couleur à la bascule). L'accent suit la matière (bleu maths / violet PC) et le thème (clair/sombre).
  - **Source du brief PC** (c'est le document visé par les notes « verbatim du brief » ci-dessus) : `docs/superpowers/specs/2026-08-19-physique-chimie-design.md` (7 thèmes validés section par section ; ondes/électricité ajoutés ensuite) + plan `docs/superpowers/plans/2026-08-19-physique-chimie.md`.
  - **Skills projet** (`.claude/skills/`) : `/debug-issue`, `/explore-codebase`, `/refactor-safely`, `/review-changes`.

## Tests (aucun framework)

**Vérification complète (point de contrôle principal) :**
```bash
node _cz_verify.js
```
`_cz_verify.js` compile les **deux** blocs `<script>` (anti-flash + principal) via `vm`, puis teste fonctionnellement sur un DOM factice : thème (défaut `auto`, clics Auto/Clair/Sombre, persistance `cz_theme`, rechargement) + fumigène `confetti()` + section [7] : **chaque générateur des deux registres** (`SUBJECTS_MATH` + `SUBJECTS_PC`) est lancé 25× (forme de la question, auto-cohérence `checkAnswer()` avec sa propre réponse, rendu des visuels SVG en phases `"q"` et `"c"`, et round-trip `JSON.parse(JSON.stringify(q))` qui simule le mode révision après un rechargement — c'est ce qui détecte les fonctions ou `undefined` glissés dans les specs `viz`) + section [8] : **régression de bascule** — après `setMatiere("pc")` + une bonne réponse PC : `cz_stats` (maths) reste **bit-à-bit inchangé**, `cz_stats_pc` est incrémenté (1 réponse / 1 bonne), et le retour maths restaure les stats à l'identique + section [9] : **câblage du basculeur** — page ouverte en PC (`data-mat="pc"` sur `<html>`), les listeners `click` doivent porter **uniquement** sur les deux boutons `.seg-btn` : le test asserte que `<html>` n'a **aucun** listener `click` (un sélecteur `[data-mat]` sans `.seg-btn` l'inclurait, et la bulle d'événement rebasculerait tout clic « Maths » sur PC — le DOM factice ne simule pas la bulle, d'où l'assertion sur le listener lui-même) + clic « Maths » → `state.matiere="maths"`, `data-mat` retiré, et `html.boot` **ré-armée** (la cascade d'arrivée rejoue à chaque bascule — pré-condition « boot retiré » simulée avant le clic, sinon l'assertion passerait même si `swap()` ne ré-armed rien) + section [10] : **bascule EN PLEINE cascade** — bascule alors que `boot` est encore active (état réel, **sans** la simulation de [9]), avec des timers suivis/annulables et un journal des opérations `classList` sur `<html>` : asserte que `boot` est retirée **puis** réajoutée (la seule façon de redémarrer l'animation CSS — un simple `add()` est un no-op si la classe est déjà là), qu'**un seul** timer de retrait (2800 ms) reste vivant, et que l'ancien timer du premier chargement (annulé) ne coupe pas la nouvelle cascade à T+2800 ms — le garde-fou de l'animation « unique » : seule la dernière cascade et son timer survivent, quelle que soit la cadence des bascules. Le cycle de vie classe+timer est centralisé dans `rearmBoot()` (index.html), appelé à la première visite ET depuis `setMatiere()` — ne pas ré-introduire de `setTimeout` de retrait de `boot` ailleurs + section [11] : **pas de temps mort** — sans reduced-motion (`matchMedia` par défaut `matches:false`), le clic sur « Maths » doit swaper de façon **synchrone** (`data-mat` retiré, `boot` active, aucune classe `home-out`/`home-in` sur `#home`) : l'ancienne chorégraphie de sortie 230 ms (homeOut/homeIn) est supprimée, ne pas la ré-introduire. **Il remplace l'ancienne vérification `awk`**, qui n'extrayait qu'un seul bloc `<script>` (cassée depuis l'ajout du script anti-flash).

**Vérification de syntaxe seule** (contrôle rapide des 2 blocs) :
```bash
node -e 'const fs=require("fs"),vm=require("vm");[...fs.readFileSync("index.html","utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{new vm.Script(m[1]);console.log("bloc #"+(i+1)+" OK");});'
```

**Vérification fonctionnelle plus large** : script Node avec DOM factice (`document.querySelector` renvoyant des éléments cachés dans une Map, stubs `localStorage`/`window`) + `vm.runInThisContext` sur le `<script>` principal extrait — puis appel direct des fonctions de l'app (`startFree()`, `passQ()`, `submit()`, `startReview()`, `endSprint()`, …) et assertions sur `state`/`stats`. C'est cette approche qui a détecté le bug « question posée qui revenait trop tôt ».

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

⚠️ Le serveur (`.mcp.json` : `python -m code_review_graph serve`) peut échouer à se connecter (time out de 30 s observé). Dans ce cas, **lire `index.html` directement** : c'est un unique fichier d'environ 2 600 lignes, le coût est faible.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.

### Support HTML (patch local — ne pas oublier)

`index.html` est parsé (253 fonctions, blocs `<script>` extraits et re-parsés en JS) grâce à un **patch idempotent** du paquet installé : la ligne `".html": "svelte"` est ajoutée au dictionnaire `EXTENSION_TO_LANGUAGE` de `site-packages/code_review_graph/parser.py` (le langage « svelte » sert uniquement de déclencheur vers le chemin d'extraction SFC `_parse_svelte`). Le paquet ne le fait pas nativement et `languages.toml` ne peut pas non plus y arriver (le dispatch dépend du *nom* de la langue, et les noms builtin ne sont pas réutilisables).

```bash
python _crg_patch_html.py   # appliquer / re-appliquer le patch (idempotent, auto-test inclus)
```

- **Rejouer après** `pip install --upgrade code-review-graph` (le réinstallateur écrase `parser.py`).
- Les snapshots `.superpowers/` (copies historiques d'index.html) sont exclus du graphe via **`.code-review-graphignore`** (mécanisme natif du paquet, syntaxe type `.gitignore`).
- Rebuild complet : `python -m code_review_graph build` — **dans un processus neuf** : un serveur MCP déjà lancé garde le module non patché en mémoire (le patch n'a d'effet que pour les nouveaux processus ; le graphe lui-même est partagé via SQLite).
