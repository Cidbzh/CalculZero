# Quizio — vérification détaillée (`_qz_verify.js`)

Fiche de référence de la section « Tests » du `CLAUDE.md` projet. À lire avant de toucher au moteur (bascule matière, boot cascade, stats) ou d'ajouter un générateur.

## Vérification complète

```bash
node _qz_verify.js
```

Le script compile les **deux** blocs `<script>` (anti-flash + principal) via `vm`, puis teste fonctionnellement sur un DOM factice :

- **Thème** : défaut `auto`, clics Auto/Clair/Sombre, persistance `qz_theme`, rechargement (+ le fallback du script anti-flash sur l'ancienne clé `cz_theme` — section [2]).
- **Fumigène** `confetti()`.
- **Section [7] — générateurs** : chaque générateur des **trois** registres (`SUBJECTS_MATH` + `SUBJECTS_PC` + `SUBJECTS_DE`) est lancé **25×** :
  - forme de la question ;
  - auto-cohérence `checkAnswer()` avec sa propre réponse (réponses saisies) ;
  - **contrat QCM** (tous les générateurs choice, maths + PC + DE) : options non vides et deux à deux distinctes, et l'index de la bonne réponse **non constant** sur les 25 tirages — la preuve des options mélangées via `shuf()` : avec ≥2 options, un index constant sur 25 tirages a une probabilité ~(1/n)²⁴, c'est la signature d'un générateur non converti au helper `qcm()`, pas de la chance ;
  - rendu des visuels SVG en phases `"q"` et `"c"` ;
  - round-trip `JSON.parse(JSON.stringify(q))` qui simule le mode révision après un rechargement — c'est ce qui détecte les fonctions ou `undefined` glissés dans les specs `viz`.
- **Section [8] — régression de bascule** : après `setMatiere("pc")` + une bonne réponse PC :
  - `qz_stats` (maths) reste **bit-à-bit inchangé** ;
  - `qz_stats_pc` est incrémenté (1 réponse / 1 bonne) ;
  - le retour maths restaure les stats à l'identique.
- **Section [9] — câblage du basculeur** : page ouverte en PC (`data-mat="pc"` sur `<html>`), les listeners `click` doivent porter **uniquement** sur les deux boutons `.seg-btn` : le test asserte que `<html>` n'a **aucun** listener `click` (un sélecteur `[data-mat]` sans `.seg-btn` l'inclurait, et la bulle d'événement rebasculerait tout clic « Maths » sur PC — le DOM factice ne simule pas la bulle, d'où l'assertion sur le listener lui-même). Puis clic « Maths » → `state.matiere="maths"`, `data-mat` retiré, et `html.boot` **ré-armée** (la cascade d'arrivée rejoue à chaque bascule — la pré-condition « boot retiré » est simulée avant le clic, sinon l'assertion passerait même si `swap()` ne ré-armed rien).
- **Section [10] — bascule EN PLEINE cascade** : bascule alors que `boot` est encore active (état réel, **sans** la simulation de [9]), avec des timers suivis/annulables et un journal des opérations `classList` sur `<html>` : asserte que `boot` est retirée **puis** réajoutée (la seule façon de redémarrer l'animation CSS — un simple `add()` est un no-op si la classe est déjà là), qu'**un seul** timer de retrait (2800 ms) reste vivant, et que l'ancien timer du premier chargement (annulé) ne coupe pas la nouvelle cascade à T+2800 ms — le garde-fou de l'animation « unique » : seule la dernière cascade et son timer survivent, quelle que soit la cadence des bascules. Le cycle de vie classe+timer est centralisé dans `rearmBoot()` (index.html), appelé à la première visite **ET** depuis `setMatiere()` — ne pas ré-introduire de `setTimeout` de retrait de `boot` ailleurs.
- **Section [11] — pas de temps mort** : sans reduced-motion (`matchMedia` par défaut `matches:false`), le clic sur « Maths » doit swaper de façon **synchrone** (`data-mat` retiré, `boot` active, aucune classe `home-out`/`home-in` sur `#home`) : l'ancienne chorégraphie de sortie 230 ms (homeOut/homeIn) est supprimée, ne pas la ré-introduire. Les délais de la cascade doivent aussi être **compressés au clic** (`--boot-k=.45` posé sur `<html>`, absent à la première visite) : le premier mouvement part quasi immédiatement après le clic, la chorégraphie complète (×1) reste réservée au premier chargement.

- **Section [12] — bascule DE** : miroir de [8] pour la 3e matière, avec deux renforcements : `qz_stats_pc` **aussi** doit rester bit-à-bit inchangé après une réponse allemande, et — l'allemand étant 100 % QCM — la bonne réponse passe par le **vrai chemin moteur** `answerChoice(state.q.correct, …)` (et non `afterAnswer()` direct) : l'option `q.correct` doit être acceptée, `qz_stats_de` incrémentée (1 réponse / 1 bonne), `qz_stats` et `qz_stats_pc` intacts, et le retour maths restaure les stats au bit près. `#secSprint` doit être masqué dès la bascule.
- **Section [13] — basculeur 3 matières** : page ouverte en allemand (`data-mat="de"` sur `<html>`), les listeners `click` doivent porter sur les **trois** boutons `.seg-btn` (Maths / Physique-Chimie / Allemand) et `<html>` doit en avoir **aucun** (même garde-fou que [9] : le sélecteur câblé doit être `.seg-btn[data-mat]`, jamais `[data-mat]` seul — le DOM factice ne simule pas la bulle, l'assertion porte donc sur le listener lui-même). Clic « Maths » → `state.matiere="maths"`, `data-mat` retiré, cascade réarmée ; clic « Allemand » → `data-mat="de"` reposé (accent vert) et bouton « Allemand » seul marqué `.on`.
- **Section [14] — sprint masqué en allemand** : `renderHome()` pose `hidden=true` sur `#secSprint` quand `matiere==="de"` (matière 100 % QCM, exclue du sprint) et `hidden=false` en maths comme en PC — seule l'entrée est cachée, la mécanique moteur (`startSprint`/`pickQ`) reste telle quelle.
- **Section [15] — renommage Quizio, migration des clés** : un « utilisateur CalculZéro » (données seulement sous `cz_theme`, `cz_subject`, `cz_stats`, `cz_stats_pc`, `cz_stats_de`) ouvre l'app : les cinq clés `qz_*` sont créées avec les mêmes valeurs, les anciennes restent en secours (aucune donnée supprimée), le thème et la matière migrés sont réellement appliqués, et les stats allemandes sont bien chargées — et si une clé `qz_*` existe déjà, elle gagne (la migration ne l'écrase pas). Cette section a aussi fait remonter un bug réel (corrigé) : `bySub` n'était pas normalisé dans `loadStats`, un objet sauvegardé sans ce champ faisait planter `renderHome`.

**Historique** : ce script remplace l'ancienne vérification `awk`, qui n'extrayait qu'un seul bloc `<script>` (cassée depuis l'ajout du script anti-flash).

## Vérification de syntaxe seule

Contrôle rapide des 2 blocs (cf. `CLAUDE.md`) :

```bash
node -e 'const fs=require("fs"),vm=require("vm");[...fs.readFileSync("index.html","utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{new vm.Script(m[1]);console.log("bloc #"+(i+1)+" OK");});'
```

## Vérification fonctionnelle plus large (ad hoc)

Pattern des tests ponctuels : script Node avec DOM factice (`document.querySelector` renvoyant des éléments cachés dans une Map, stubs `localStorage`/`window`) + `vm.runInThisContext` sur le `<script>` principal extrait — puis appel direct des fonctions de l'app (`startFree()`, `passQ()`, `submit()`, `startReview()`, `endSprint()`, …) et assertions sur `state`/`stats`. C'est cette approche qui a détecté le bug « question posée qui revenait trop tôt ».
