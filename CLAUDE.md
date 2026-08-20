# CLAUDE.md

## Projet

Quizio — application d'entraînement de Première, **trois matières sur le même moteur** : maths (spécialité) + physique-chimie + allemand (A2, QCM). **Fichier unique autonome** : `index.html` (~2900 lignes, HTML + CSS + JS, aucun build, aucune dépendance). S'utilise en l'ouvrant dans un navigateur. C'est la seule copie — les anciennes copies citées ici (`C:\Users\acoul\apps\calculzero\index.html`, `C:\Users\acoul\Desktop\CalculZero.html`) n'existent plus sur cette machine.

> **Renommé « Quizio » le 2026-08-20** (anciennement CalculZéro) : les clés localStorage sont passées de `cz_*` à `qz_*`, avec migration automatique à l'ouverture (les données existantes survivent, les anciennes clés restent en secours — bloc « Renommage » d'index.html, test section [15] de `_qz_verify.js`). Dépôt GitHub : `Cidbzh/Quizio` (l'ancien lien `Cidbzh/CalculZero` redirige).

> Le sprint est **désactivé en allemand** (`#secSprint` masqué quand `matiere==="de"`).

## Structure d'index.html

Le fichier est un fragment (démarre par `<title>`, pas de `<!DOCTYPE>`/`<html>`/`<head>`) — ne pas le restructurer.

1. **Tête** — `<title>`, puis un **petit `<script>` anti-flash** (avant le premier rendu, applique le thème sauvegardé `qz_theme` sur `<html>` pour éviter le flash de thème « incorrect »), puis les `<link>` Google Fonts, puis `<style>` : CSS variables claires/sombres (`prefers-color-scheme` **et** `[data-theme="light"/"dark"]`), `.frac` (fraction empilée, utilisée dans les questions, QCM et méthodes), révélation `.boot [data-rv]` (100 % CSS **par design** : le JS ne peut pas bloquer l'animation), `prefers-reduced-motion` respecté, transition douce `.theming`, `.confetti-host` + `@keyframes confFall`.
2. **HTML** — `#home` (hero : `h1` « Quizio » — **invariable sur les 3 matières** — + `p.slogan` « Plus tu quiz, plus tu sais. » (slogan de Cid, ne pas réécrire) avec trait de plume SVG auto-tracé sous « tu sais. » (`.slogan .sai .pen`, désactivé sous `prefers-reduced-motion`, visible statiquement sinon) + cascade mot à mot `.wr`/`.soft` partagée par h1 et slogan ; ensuite basculeur matière `data-mat` « Maths / Physique-Chimie / Allemand », niveau, tuiles thèmes `#subGrid`, entraînement libre, sprint 60 s, stats, `#statsExtra` injecté en JS, boutons thème `data-theme-pick`) et `#play` (zone question `#qbox`).
3. **`<script>` principal** — sections balisées par `/* ============ */` :
   - **UTILS** — `Ri` (entier aléatoire), `pick`, `shuf`, fractions : `gcd`/`fr` (simplification), `F`/`FR` (affichage HTML empilé), `fa` (réponse `{n,d}` simplifiée).
   - **GENERATORS** — tableaux maths `G_DERIV`, `G_SUITES`, `G_LOGEXP`, `G_EQ2`, `G_TRIG` (+ `TRIGV`, `ANGRAD`), `G_PROBA`, `G_VECT`, `G_AFF`, `G_LIM`, `G_VAR` ; physique-chimie `G_COSMO`, `G_NEWTON`, `G_FORCES`, `G_ENERGIE`, `G_MOLES`, `G_STOICH`, `G_CINET`, `G_ONDES`, `G_ELECTRICITE` ; allemand via le registre `SUBJECTS_DE` (QCM). Chaque entrée est `{lvl, make()}` — `make()` génère la question **à l'affichage** (aucune banque fixe) et retourne :
     - `{prompt, type:"number", answer, tol?}` — `tol` = **tolérance relative** (appliquée × `max(1,|answer|)` dans `checkAnswer`) ; décimales affichées avec une virgule (`fmtAns`) ;
     - `{prompt, type:"frac", answer:{n,d}}` — l'utilisateur peut répondre en `a/b` **ou** en décimal (comparé au 1e-9) ;
     - `{prompt, type:"choice", options:[], correct:<index>}` — QCM (exclu du sprint).
     Chaque question porte un `explain` (méthode de correction, HTML) et éventuellement une clé `viz` (mini-graphique SVG — voir **GRAPH**).
   - **SUBJECTS** — **trois registres** thème → générateurs : `SUBJECTS_MATH` (10 thèmes), `SUBJECTS_PC` (9 thèmes), `SUBJECTS_DE` (allemand A2) ; `activeSubjects()` renvoie le registre actif selon `state.matiere` (`"maths"`|`"pc"`|`"de"`), et `THEME_BY_ID` réunit les trois (résout la fiche d'un thème — `{id, name, sym, gens}` — quel que soit son registre). Préserver le marqueur `/*GEN2C*/`.
   - **GRAPH** — moteur des mini-visuels SVG (dessinés en JS, aucune dépendance, reste hors-ligne) : `VIZdraw(spec, phase)` renvoie une chaîne SVG (ou `""`). **Règle d'or : les specs `viz` doivent être 100 % JSON-sérialisables** (nombres/chaînes/tableaux) — les questions partent en `localStorage` (liste à réviser) et doivent repartir après un rechargement. On stocke les **coefficients** (a, b, c, k…), jamais de fonctions : `vzF()` reconstruit f depuis `kind` + coefficients. **Deux phases** : `"q"` = image **neutre sans aucun nombre** (n'indique JAMAIS la réponse), `"c"` = image complète avec les éléments de la réponse — affichée uniquement dans la correction (helper `vizAns()`, présent dans les 3 boîtes « Méthode » : `afterAnswer`, `revealAfterSkip`, `reviewSkip`). Exception : le type `"var"` ne s'affiche **jamais** en phase `"q"` — la courbe montrerait où f monte/descend. Kind → fonction : maths `"tan"`→`vzTan`, `"par"`→`vzPar`, `"unit"`→`vzUnit` ; PC `"scale"`→`vzRatio`, `"proj"`→`vzProj`, `"force"`→`vzForce`, `"bars"`→`vzBars`, `"soln"`→`vzSoln`, `"stoich"`→`vzStoich`, `"kin"`→`vzKin`, `"onde"`→`vzOnde`, `"lentille"`→`vzLent`, `"circuit"`→`vzCircuit`, `"charges"`→`vzCharges`, `"work"`→`vzWork`. **Ne pas confondre** : `vzScale` est un helper d'échelle maths (renvoie `{sx, sy}`), **pas** un visuel.
   - **ENGINE** — `store` (localStorage) ; **stats par matière** : trois clés `qz_stats` (maths) / `qz_stats_pc` (PC) / `qz_stats_de` (allemand), même forme, normalisées au chargement par `loadStats(key)` (bloc « Migration v2 »), `activeStatsKey()` choisit la clé selon `state.matiere` — `save()` n'écrit que la clé active, l'activité PC/DE ne doit **jamais** écrire `qz_stats` ; `state` (session, dont `matiere` : `"maths"` par défaut, persistée sous `qz_subject`, changée par `setMatiere()` appelé depuis le basculeur `data-mat`, qui échange la variable `stats` et swape **immédiatement au clic** — aucun délai ni phase de sortie : la cascade `rearmBoot()` masque elle-même le changement de contenu) ; `MAT_DATA` (textes héro/notes par matière) ; `pickQ`/`renderQ`, `checkAnswer`/`submit`/`afterAnswer`, « Passer » (`passQ`/`countSkip`/`revealAfterSkip`/`reviewSkip`), sessions (`startFree`/`startSprint`/`startReview`/`endSprint`/`endReview`/`goHome`), points faibles (`weakPoints`/`trainWeak`), liste à réviser (`reviewAdd`/`reviewRemove`/`reviewRequeue`).
   - **Finitions & câblage** (avant « Révélation en cascade ») — `confetti()` (pluie de confettis, ~90 éléments DOM, sans dépendance, désactivé si `prefers-reduced-motion: reduce`), thème : `applyTheme(t, animate)` + `initTheme()` (boutons `data-theme-pick`, persistance clé `qz_theme`, classe `html.theming` pour la transition douce), écouteur clavier global.

## Règles à respecter pour ajouter une fonctionnalité

- **Trois modes de session** : `state.mode` vaut `"free"`, `"sprint"` ou `"review"` (`"done"` est transitoire). Tout nouveau code doit traiter les **trois** — le « Passer » n'a pas le même sens dans chacun, et `pickQ` a un comportement propre à chaque mode.
- **Stats persistées** : les champs ajoutés plus tard n'existent pas chez les utilisateurs existants → toujours normaliser au chargement (bloc « Migration v2 » : `stats.skips`, `stats.streakBySub`, `stats.history`, `stats.review`) et lire avec `(x||0)`. Champs v2 : `history` — 100 dernières réponses `{s, l, o}` (base des « points faibles ») ; `review` — questions à refaire `{s, l, q}`, max 50 ; `streakBySub` — meilleure série par thème (🔥 panneau « Par thème ») ; `bySub[id]` — `{ans, good, skips}` (créé à la volée par `subStat`).
- **Flux « Passer »** (ne pas casser) : `passQ` (bouton ou touche Échap) compte la passe, affiche d'abord la question suivante, puis pousse la question posée dans `state.skipQueue` (max 5) ; `renderQ` consomme cette file en premier et marque `_passed=true` ; une 2ᵉ passe (ou file pleine) déclenche `revealAfterSkip` qui montre la méthode. **En mode review**, « Passer » = `reviewSkip` : la méthode s'affiche et la question **repart en fin de liste** (`reviewRequeue`). Une passe ne compte jamais comme réponse (`stats.ans` inchangé) et ne casse pas la série.
- **Logique de la liste à réviser** : mauvaise réponse en free/sprint → `reviewAdd` ; bonne réponse → `reviewRemove` ; en mode review, une mauvaise réponse fait repartir la question en fin de file, une bonne réponse la retire — la session se termine quand la liste est vide (`endReview`).
- **Points faibles** : `weakPoints()` = top 5 cellules thème×niveau les moins précises sur `history` (min 5 réponses, min. seuil) ; le bouton « S'entraîner → » appelle `trainWeak(s,l)` qui verrouille thème + niveau puis lance le mode libre.
- **Scoring / sprint** : 10 pts par bonne réponse + 5 si série ≥ 3 ; sprint = tick 100 ms, chip « urgente » sous 10 s, avancement auto après 1,1 s (bon) / 1,7 s (raté) / 3 s (méthode révélée), record `stats.bestSprint`. Sprint **masqué en allemand**.
- **Toute l'interface est en français** (textes, placeholders, indices).
- **Mini-visuels** : toute nouvelle question qui se prête à un visuel reçoit une clé `viz` (specs JSON-sérialisables, phases `"q"`/`"c"` — jamais d'élément de réponse en phase question) ; `VIZdraw()` reste sans dépendance et **ne plante jamais** (renvoie `""` en cas d'erreur, le texte de la méthode doit toujours s'afficher).
- **Google Fonts** (STIX Two Text, Instrument Sans, Spline Sans Mono) : l'app doit rester fonctionnelle hors ligne grâce aux stacks de repli.
- **Thème (Auto / Clair / Sombre)** : `applyTheme(t, animate)` pose/retire l'attribut `data-theme` sur `<html>`, persiste sous `qz_theme` (`"auto"`|`"light"`|`"dark"`), met à jour `.on` des boutons `data-theme-pick`, et ajoute `html.theming` le temps d'une transition douce (≈ 520 ms) ; `"auto"` = attribut retiré → on suit le système. Le **script anti-flash** en tête réapplique le choix avant le premier rendu. Toute nouvelle animation reste désactivée sous `prefers-reduced-motion`.
- **Notes d'implémentation (revue finale 2026-08-19 — volontaire, ne pas « corriger »)** :
  - Convention codebase : la plupart des QCM posent la bonne option en `correct:0` (les 2 QCM maths `G_EQ2`/`G_TRIG` mélangent via `shuf`) — le moteur n'impose aucun index fixe (`answerChoice`).
  - G_STOICH #4 : le leurre « Aucun (proportions stœchiométriques) » n'est jamais la bonne réponse — leurre conceptuel volontaire (verbatim du brief).
  - G_FORCES satellite : la question est aujourd'hui `number` (F = G·M·m/r², tol 0.011 — **volontaire** : accepte g = 9,8 et g = 9,77 ; la même tol apparaît sur G_COSMO, G_ENERGIE, G_CINET, G_ONDES et même G_DERIV/G_LOGEXP maths — ne pas la « nettoyer ») ; l'ancienne version QCM « 12,8 × 10⁶ m » n'existe plus. « C'est le poids du satellite : c'est lui qui le maintient en orbite » est défendable (en orbite circulaire P est la force centripète).
  - Certains prompts PC héritent de la notation point des briefs (ex. « 2.5 mol », G_MOLES #7) — verbatim des briefs ; la saisie élève est normalisée (`checkAnswer` accepte `.` et `,`).
  - `fmtAns` affiche les très grandes réponses en notation scientifique JS (« 1,2e+24 ») — moteur pré-existant, saisie acceptée, écart cosmétique.
  - Dans `vzForce`, la flèche P est en `vz-ans-bad` (rouge) et T en `vz-ans` (vert) : code couleur de contraste du brief — P (le poids) n'est pas une « erreur ».
  - Le visuel `kin` trace une décroissance générique calée en (t95, 5 %·n₀) — illustration, non le tracé des données de l'énoncé.
  - L'occurrence `return{prompt:prompt,` (G_CINET) est verbatim du brief T7 — ne pas « simplifier » en `{prompt,` sans re-diff.
  - Le spec `soln` de G_MOLES #7 porte une clé `V` non lue par `vzSoln` (ne lit que `n`/`c`) — inoffensive pour le round-trip JSON.
  - Noms de chapitre en `var(--accent)` (et non `--ink`) — décidé 2026-08-19 : le quasi-noir était jugé difficilement lisible. Trois occurrences : `.subcard .nm`, `.substatrow b`, `.weaknm` — + elles sont dans la liste `.theming`. L'accent suit la matière (bleu maths / violet PC) et le thème.
  - `bySub` est normalisé dans `loadStats` (`st.bySub={}` s'il manque) — un objet sauvegardé sans ce champ faisait planter `renderHome` (bug réel détecté par la section [15] de `_qz_verify.js`, 2026-08-20) ; ne pas retirer la normalisation.
  - **Sources briefs** : PC → `docs/superpowers/specs/2026-08-19-physique-chimie-design.md` (+ plan `docs/superpowers/plans/2026-08-19-physique-chimie.md`) — le document visé par les notes « verbatim du brief » ci-dessus ; allemand → plan `docs/superpowers/plans/2026-08-19-allemand.md`.
  - **Skills projet** (`.claude/skills/`) : `/debug-issue`, `/explore-codebase`, `/refactor-safely`, `/review-changes`.

## Tests (aucun framework)

**Vérification complète (point de contrôle principal) :**
```bash
node _qz_verify.js
```
Compile les **deux** blocs `<script>` (anti-flash + principal) via `vm`, puis teste fonctionnellement sur DOM factice : thème (défaut `auto`, clics, persistance `qz_theme`, rechargement), fumigène `confetti()`, **chaque générateur des trois registres × 25** (`SUBJECTS_MATH` + `SUBJECTS_PC` + `SUBJECTS_DE` — forme, auto-cohérence `checkAnswer()` pour les réponses saisies, **contrat QCM** pour les choix : options non vides et distinctes + bonne réponse jamais en position fixe sur les tirages, rendu SVG phases `"q"`/`"c"`, round-trip JSON qui détecte fonctions/`undefined` dans les specs `viz`), bascules matière (stabilité bit-à-bit des stats maths/PC/DE, bascule DE via le vrai chemin moteur `answerChoice()`, câblage du basculeur 3 boutons sans jamais cibler `<html>`, ré-armement de la cascade, pas de temps mort, sprint masqué en allemand) et la migration des clés historiques `cz_*` → `qz_*` (renommage Quizio). **Détail section par section → `docs/verification.md`.**

**Vérification de syntaxe seule** (contrôle rapide des 2 blocs) :
```bash
node -e 'const fs=require("fs"),vm=require("vm");[...fs.readFileSync("index.html","utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{new vm.Script(m[1]);console.log("bloc #"+(i+1)+" OK");});'
```

**Vérification fonctionnelle plus large** (ad hoc) : script Node avec DOM factice (stubs `localStorage`/`window`) + `vm.runInThisContext` sur le `<script>` principal extrait, puis appel direct des fonctions de l'app (`startFree()`, `passQ()`, `submit()`, …) et assertions sur `state`/`stats`.

## MCP Tools: code-review-graph

**IMPORTANT : ce projet a un graphe de connaissances. TOUJOURS utiliser les outils MCP code-review-graph AVANT Grep/Glob/Read pour explorer** — plus rapide, moins cher, et contexte structurel (appelants, dépendants, couverture) qu'un scan de fichiers ne donne pas.

### Protocole de session — OBLIGATOIRE (demandé par Cid, réitéré le 2026-08-19)

À **chaque** nouvelle session, avant toute exploration ou modification du code :
1. Le hook `SessionStart` affiche l'état du graphe (nodes/edges) : c'est le signal qu'il est prêt et à jour.
2. **Le premier outil d'exploration est TOUJOURS un outil du graphe** : `get_minimal_context_tool` (entrée, ~100 tokens), puis selon la tâche `semantic_search_nodes_tool` / `query_graph_tool` / `get_impact_radius_tool` — **avant** tout Grep/Glob/Read.
3. Avant toute revue ou commit : `detect_changes_tool` + `get_review_context_tool`.
4. Grep/Glob/Read = **repli uniquement**, et seulement si le graphe ne couvre pas la question — à *déclarer* dans la réponse (ex. les règles CSS de `index.html` ne sont pas des nœuds du graphe ; les fonctions JS, si).
5. Serveur MCP time out → repli direct sur la lecture de `index.html` (1 seul fichier, ~2 900 lignes, coût faible) ; réessayer le graphe à la prochaine session.

⚠️ Le serveur (`.mcp.json` : `python -m code_review_graph serve`) peut échouer à se connecter (time out de 30 s observé). Dans ce cas, **lire `index.html` directement** — c'est un unique fichier d'environ 2 900 lignes, le coût est faible.

### Support HTML (patch local — ne pas oublier)

`index.html` est parsé (253 fonctions, blocs `<script>` extraits et re-parsés en JS) grâce à un **patch idempotent** du paquet installé : la ligne `".html": "svelte"` est ajoutée au dictionnaire `EXTENSION_TO_LANGUAGE` de `site-packages/code_review_graph/parser.py` (le langage « svelte » sert uniquement de déclencheur vers le chemin d'extraction SFC `_parse_svelte`). Le paquet ne le fait pas nativement et `languages.toml` ne peut pas non plus y arriver (le dispatch dépend du *nom* de la langue, et les noms builtin ne sont pas réutilisables).

```bash
python _crg_patch_html.py   # appliquer / re-appliquer le patch (idempotent, auto-test inclus)
```

- **Rejouer après** `pip install --upgrade code-review-graph` (le réinstallateur écrase `parser.py`).
- Les snapshots `.superpowers/` (copies historiques d'index.html) sont exclus du graphe via **`.code-review-graphignore`** (mécanisme natif du paquet, syntaxe type `.gitignore`).
- Rebuild complet : `python -m code_review_graph build` — **dans un processus neuf** : un serveur MCP déjà lancé garde le module non patché en mémoire (le patch n'a d'effet que pour les nouveaux processus ; le graphe lui-même est partagé via SQLite).
