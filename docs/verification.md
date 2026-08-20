# CalculZéro — vérification détaillée (`_cz_verify.js`)

Fiche de référence de la section « Tests » du `CLAUDE.md` projet. À lire avant de toucher au moteur (bascule matière, boot cascade, stats) ou d'ajouter un générateur.

## Vérification complète

```bash
node _cz_verify.js
```

Le script compile les **deux** blocs `<script>` (anti-flash + principal) via `vm`, puis teste fonctionnellement sur un DOM factice :

- **Thème** : défaut `auto`, clics Auto/Clair/Sombre, persistance `cz_theme`, rechargement.
- **Fumigène** `confetti()`.
- **Section [7] — générateurs** : chaque générateur des deux registres (`SUBJECTS_MATH` + `SUBJECTS_PC`) est lancé **25×** :
  - forme de la question ;
  - auto-cohérence `checkAnswer()` avec sa propre réponse ;
  - rendu des visuels SVG en phases `"q"` et `"c"` ;
  - round-trip `JSON.parse(JSON.stringify(q))` qui simule le mode révision après un rechargement — c'est ce qui détecte les fonctions ou `undefined` glissés dans les specs `viz`.
- **Section [8] — régression de bascule** : après `setMatiere("pc")` + une bonne réponse PC :
  - `cz_stats` (maths) reste **bit-à-bit inchangé** ;
  - `cz_stats_pc` est incrémenté (1 réponse / 1 bonne) ;
  - le retour maths restaure les stats à l'identique.
- **Section [9] — câblage du basculeur** : page ouverte en PC (`data-mat="pc"` sur `<html>`), les listeners `click` doivent porter **uniquement** sur les deux boutons `.seg-btn` : le test asserte que `<html>` n'a **aucun** listener `click` (un sélecteur `[data-mat]` sans `.seg-btn` l'inclurait, et la bulle d'événement rebasculerait tout clic « Maths » sur PC — le DOM factice ne simule pas la bulle, d'où l'assertion sur le listener lui-même). Puis clic « Maths » → `state.matiere="maths"`, `data-mat` retiré, et `html.boot` **ré-armée** (la cascade d'arrivée rejoue à chaque bascule — la pré-condition « boot retiré » est simulée avant le clic, sinon l'assertion passerait même si `swap()` ne ré-armed rien).
- **Section [10] — bascule EN PLEINE cascade** : bascule alors que `boot` est encore active (état réel, **sans** la simulation de [9]), avec des timers suivis/annulables et un journal des opérations `classList` sur `<html>` : asserte que `boot` est retirée **puis** réajoutée (la seule façon de redémarrer l'animation CSS — un simple `add()` est un no-op si la classe est déjà là), qu'**un seul** timer de retrait (2800 ms) reste vivant, et que l'ancien timer du premier chargement (annulé) ne coupe pas la nouvelle cascade à T+2800 ms — le garde-fou de l'animation « unique » : seule la dernière cascade et son timer survivent, quelle que soit la cadence des bascules. Le cycle de vie classe+timer est centralisé dans `rearmBoot()` (index.html), appelé à la première visite **ET** depuis `setMatiere()` — ne pas ré-introduire de `setTimeout` de retrait de `boot` ailleurs.
- **Section [11] — pas de temps mort** : sans reduced-motion (`matchMedia` par défaut `matches:false`), le clic sur « Maths » doit swaper de façon **synchrone** (`data-mat` retiré, `boot` active, aucune classe `home-out`/`home-in` sur `#home`) : l'ancienne chorégraphie de sortie 230 ms (homeOut/homeIn) est supprimée, ne pas la ré-introduire.

**Historique** : ce script remplace l'ancienne vérification `awk`, qui n'extrayait qu'un seul bloc `<script>` (cassée depuis l'ajout du script anti-flash).

## ⚠️ Lacune connue (constatée le 2026-08-20)

La section [7] itère uniquement `SUBJECTS_MATH` + `SUBJECTS_PC` (`_cz_verify.js` ligne 167 : `const REGISTERS=[].concat(probe.SUBJECTS_MATH||[],probe.SUBJECTS_PC||[])`) — **les générateurs allemands (`SUBJECTS_DE`) ne sont pas couverts** : ni forme de question, ni auto-cohérence `checkAnswer`, ni round-trip JSON. À combler en ajoutant `SUBJECTS_DE` dans la sonde et dans `REGISTERS`.

## Vérification de syntaxe seule

Contrôle rapide des 2 blocs (cf. `CLAUDE.md`) :

```bash
node -e 'const fs=require("fs"),vm=require("vm");[...fs.readFileSync("index.html","utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{new vm.Script(m[1]);console.log("bloc #"+(i+1)+" OK");});'
```

## Vérification fonctionnelle plus large (ad hoc)

Pattern des tests ponctuels : script Node avec DOM factice (`document.querySelector` renvoyant des éléments cachés dans une Map, stubs `localStorage`/`window`) + `vm.runInThisContext` sur le `<script>` principal extrait — puis appel direct des fonctions de l'app (`startFree()`, `passQ()`, `submit()`, `startReview()`, `endSprint()`, …) et assertions sur `state`/`stats`. C'est cette approche qui a détecté le bug « question posée qui revenait trop tôt ».
