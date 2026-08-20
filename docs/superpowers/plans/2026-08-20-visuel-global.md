# Quizio — Visuel global « cahier avec marge » : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réorganiser visuellement Quizio — topbar regroupant matière + thème, accueil en deux colonnes avec une « marge » qui regroupe stats / à réviser / points faibles / par thème, hiérarchie des panneaux, passe de cohérence de l'écran d'exercice — sans aucune nouvelle fonctionnalité ni logique JS moteur.

**Architecture:** Un seul fichier applicatif (`index.html`, fragment HTML + CSS + JS, sans build). Chaque tâche = mouvement de nœuds DOM existants + CSS ciblée + (2 tâches) réordre de chaînes HTML dans `renderHome()`. Les IDs et `data-*` sont tous conservés ; le JS écrit par ID/`dataset`, indépendant de la position.

**Tech Stack:** HTML/CSS/JS vanilla, Node.js (vérification, pas de framework), captures headless Edge (aucun Playwright sur cette machine).

**Spec:** `docs/superpowers/specs/2026-08-20-visuel-global-design.md`

## Global Constraints (spécification §2/§4 — s'appliquent à chaque tâche)

- **Zéro** nouvelle animation, couleur, police, dépendance ; zéro nouvelle `keyframe`.
- Cascade de révélation 100 % CSS (`html.boot [data-rv]`, `--d`, `--boot-k`, `rearmBoot()`) — aucune animation JS.
- `prefers-reduced-motion: reduce` continue de tout éteindre (affichage statique conservé).
- Interface 100 % français. Sprint masqué en allemand (`#secSprint`).
- **Tous les IDs et `data-*` existants conservés** : `#noteTop`, `#noteBottom`, `#statGrid`, `#statsExtra`, `#bestSprint`, `#btnFree`, `#btnSprint`, `#btnReview`, `#subGrid`, `data-mat`, `data-lvl`, `data-weak`, `data-theme-pick`.
- Logique moteur JS inchangée : flux « Passer », liste à réviser, `weakPoints()`, `trainWeak()`, scoring, sprint, stats par matière (`qz_stats*`), migration `cz_*` → `qz_*`.
- `index.html` reste un **fragment** (pas de `<!DOCTYPE>`/`<html>`), marqueur `/*GEN2C*/` préservé, specs VIZ JSON-sérialisables.
- Racine du dépôt / cwd des commandes : `C:\Users\acoul\Documents\Quizio`.
- Les captures temporelles vont dans `C:\Users\acoul\AppData\Local\Temp\qzshots\` (chemin **absolu** Windows obligatoire pour `--screenshot`, sinon « Accès refusé 0x5 ») et les copies tmp dans `.shots/` — **jamais commités**.

## Infra de test (utilisée par toutes les tâches)

- **Syntaxe (2 blocs `<script>`)** — après chaque modification :
  ```bash
  node -e 'const fs=require("fs"),vm=require("vm");[...fs.readFileSync("index.html","utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{new vm.Script(m[1]);console.log("bloc #"+(i+1)+" OK");});'
  ```
  Attendu : `bloc #1 OK` puis `bloc #2 OK`, aucun traceback.
- **Fonctionnel (point de contrôle)** — `node _qz_verify.js` : doit passer **toutes** les sections (thème, confetti, 3 registres × 25, bascules matière, ré-armement cascade, pas de temps mort, sprint masqué en DE, migration). Le fake DOM sert le sélecteur `.seg-btn[data-mat]` génériquement → le déplacement du basculeur ne casse **aucune** assertion (vérifié : `_qz_verify.js` référence `#home` une seule fois — l.381, assertion d'**absence** des classes `home-out`/`home-in`, sans effet car l'ID est conservé — et `bestSprint` uniquement comme **champ de stats** dans les seeds (l.240/398), jamais comme ID DOM ; il ne référence ni `#statGrid` ni `#hStats` ni la topbar). Bonus : les tests « bascule matière » s'exécutent avec des stats fraîches → ils **exercent les états vides** (blocs 3–5 masqués ou `margeline`) après la tâche 3.
- **Structurel** — petites assertions `node -e` par tâche (données ci-dessous).
- **Visuel** — capture Edge (recette éprouvée ; une capture à la fois, budget ≥ 90 s ou en background) :
  ```bash
  EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
  "$EDGE" --headless=new --disable-gpu --no-first-run --virtual-time-budget=6000 \
    --window-size=1440,1500 \
    --screenshot="C:\Users\acoul\AppData\Local\Temp\qzshots\APRES-home-maths.png" \
    "file:///C:/Users/acoul/Documents/Quizio/index.html"
  ```
  Pour forcer thème/matière : copier `index.html` dans `.shots/tmp-<nom>.html` et appender :
  ```html
  <script>addEventListener("DOMContentLoaded",()=>{document.documentElement.setAttribute("data-theme","light");try{setMatiere("de")}catch(e){console.log(e)}})</script>
  ```
  puis pointer `file:///C:/Users/acoul/Documents/Quizio/.shots/tmp-<nom>.html`.

---

### Task 1 : Topbar — basculeur matière à côté du thème

**Files:**
- Modify: `index.html` (bloc CSS topbar ~l.140-152, bloc CSS `.lbl`/`.seg` ~l.226-240, HTML topbar l.437-454, HTML héro l.472-479)

**Interfaces:**
- Consumes: rien (état initial du fichier).
- Produces: le `.seg` de matière vit dans la topbar (classe `.seg` + boutons `.seg-btn[data-mat]` — câblage JS `querySelectorAll(".seg-btn[data-mat]")` inchangé) ; un séparateur `<span class="divider">` ; plus de label « Matière » ni de ligne flottante dans le héro.

- [ ] **Step 1.1 : Captures baseline manquantes (avant tout code)**

Les baselines existantes dans `%TEMP%\qzshots` : `home-clair.png` (home maths clair), `ecran-exercice.png` (exercice sombre). Capturer les 4 manquantes (PC et DE × clair et sombre) avec la recette « tmp » de l'infra (forçage `setMatiere("pc")` / `setMatiere("de")` et `data-theme`). Attendu : 4 fichiers PNG créés, visuellement conformes à l'état actuel.

- [ ] **Step 1.2 : CSS du séparateur + topbar responsive**

Dans `index.html`, juste après la ligne `.grow{flex:1}` (l.139), insérer :

```css
.topbar .divider{width:1px;height:20px;background:var(--line);flex:none}
@media (max-width:720px){
  .topbar .wrap{flex-wrap:wrap;row-gap:10px}
}
```

- [ ] **Step 1.3 : Déplacer le basculeur dans la topbar**

Remplacer le début de la topbar (l.440) — ancien :

```html
    <div class="row" style="gap:12px">
      <div class="theme-seg" role="group" aria-label="Thème">
```

par :

```html
    <div class="row wrap-row" style="gap:12px">
      <div class="seg" role="group" aria-label="Matière">
        <button type="button" class="seg-btn on" data-mat="maths">Maths</button>
        <button type="button" class="seg-btn" data-mat="pc">Physique-Chimie</button>
        <button type="button" class="seg-btn" data-mat="de">Allemand</button>
      </div>
      <span class="divider" aria-hidden="true"></span>
      <div class="theme-seg" role="group" aria-label="Thème">
```

Puis supprimer la ligne « Matière » du héro — bloc entier à retirer (l.472-480) :

```html
    <div class="row space-between wrap-row" data-rv style="--d:.88s;margin-bottom:22px">
      <span class="lbl">Matière</span>
      <div class="seg" role="group" aria-label="Matière">
        <button type="button" class="seg-btn on" data-mat="maths">Maths</button>
        <button type="button" class="seg-btn" data-mat="pc">Physique-Chimie</button>
        <button type="button" class="seg-btn" data-mat="de">Allemand</button>
      </div>
    </div>
```

- [ ] **Step 1.4 : Tester**

```bash
node -e 'const h=require("fs").readFileSync("index.html","utf8");const tb=h.slice(h.indexOf("<header class=\"topbar\">"),h.indexOf("</header>"));if(!tb.includes("data-mat=\"de\"")||!tb.includes("class=\"divider\""))throw new Error("basculeur/separator absents de la topbar");if(h.includes("<span class=\"lbl\">Matière</span>"))throw new Error("label Matière toujours présent");if((h.match(/class="seg-btn" data-mat="pc"/g)||[]).length!==1)throw new Error("un seul bouton pc attendu");if((h.match(/class="seg-btn" data-mat="de"/g)||[]).length!==1)throw new Error("un seul bouton de attendu");if(!/class="seg-btn on" data-mat="maths"/.test(h))throw new Error("bouton maths on absent");console.log("topbar structure OK");'
```
> **Note (corrigée à l'exécution 2026-08-20)** : compter `data-mat="pc"` en occurrences brutes échoue (6 au lieu de 1) — 3 sélecteurs CSS `:root[data-mat="pc"]` et 2 commentaires comptent aussi. L'assertion compte les **boutons** `class="seg-btn" data-mat="pc"` : 1 attendu (0 = double-suppression, 2 = oubli de suppression du héro).

Attendu : `topbar structure OK`.

Puis : syntaxe (infra) → `bloc #1 OK` / `bloc #2 OK`, et `node _qz_verify.js` → **toutes les sections passent** (la bascule matière est exercée via le sélecteur `.seg-btn[data-mat]` — prouve que le câblage survit au déplacement).

- [ ] **Step 1.5 : Capture visuelle**

Capture Edge home maths (recette infra, nom `APRES-task1-topbar.png`) + ouvrir la capture : les 3 boutons matière sont bien à côté de Auto/Clair/Sombre, séparés d'un filet, et le héro n'a plus la ligne flottante.

- [ ] **Step 1.6 : Commit**

```bash
git add index.html
git commit -m "Topbar : basculeur matière à côté du thème

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2 : Accueil — colonne « marge » (stats, à réviser, points faibles, par thème)

**Files:**
- Modify: `index.html` (CSS après `.revcta p b{color:var(--ink)}` — l.292 ; HTML accueil l.456-522 : noteTop, panneau « Mes statistiques », `#statsExtra`, noteBottom ; JS `renderHome()` — bloc `const extra=$("#statsExtra")` l.2579-2614)

**Interfaces:**
- Consumes: Task 1 (la ligne « Matière » n'est plus dans le héro).
- Produces: `#home` en 2 colonnes (`.home-main` + `aside.marge > .margewrap`) ; ordre de la marge : `#noteTop` → `#statGrid` (2×2 compact) → `#statsExtra` (À réviser → Points faibles → Par thème) → `#noteBottom` ; le panneau « Mes statistiques » est absorbé (tuiles conservées, wrapper et `#hStats` supprimés — **rien d'autre n'est supprimé**) ; repli tablette ≤ 1024 px (marge sous le contenu, blocs en `auto-fit`) et mobile ≤ 600 px (1 colonne) ; sticky `top:88px` ≥ 1025 px.

- [ ] **Step 2.1 : CSS de la 2ᵉ colonne + marge**

Vérifier d'abord qu'aucune règle de base `#home{…}` n'existe (seules `#home.screen-in` et règles classées existent — vérifié) : aucune collision possible.

Dans `index.html`, juste après la ligne `.revcta p b{color:var(--ink)}` (l.292), insérer :

```css
/* ---------- « cahier avec marge » : accueil en 2 colonnes (spec §3.2) ---------- */
#home{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:40px}
.home-main{min-width:0}
.marge{min-width:0}
.margewrap{position:sticky;top:88px;display:grid;gap:16px}
.margewrap .margin-note{margin:0;margin-left:auto}
.marge .statgrid{grid-template-columns:repeat(2,1fr);gap:8px;margin-top:0}
.marge .stat{padding:12px}
.marge .stat .v{font-size:18px}
.marge .panel{padding:16px;margin-bottom:0}
#statsExtra{display:contents}
.marge .weakrow{flex-wrap:wrap;row-gap:8px}
.marge .weakrow .weakbar{width:auto;flex:1 1 120px}
@media (max-width:1024px){
  #home{display:block}
  .margewrap{position:static;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;align-items:start}
}
@media (max-width:600px){
  .margewrap{grid-template-columns:1fr}
}
```

Notes d'implémentation (déjà validées au design) :
- **Ne pas** mettre `align-items:start` sur `#home` : le stretch par défaut rend `.marge` aussi haute que la ligne, ce qui donne à `.margewrap` sticky sa course.
- `#statsExtra{display:contents}` (toujours actif) → ses panneaux enfants deviennent des items directs de `.margewrap` (gap 16 px uniforme). Le DOM est intact : `extra.innerHTML` et `querySelectorAll` de `renderHome` fonctionnent.
- `.margewrap .margin-note` (spécificité 0-2-0, **postérieure** en source à `.margin-note.end` l.210) gagne pour `margin` ; la rotation `transform` de `.end` est préservée.
- `.marge .weakrow{flex-wrap:wrap}` : une `weakrow` (nom + barre 96 px + % + bouton ≈ 390 px) ne tient pas en 320 px → ligne 1 nom + %, ligne 2 barre (grands `flex:1 1 120px`) + bouton.

- [ ] **Step 2.2 : HTML — 2 mouvements de nœuds**

Lecture préalable : `index.html` l.456-522 (région accueil) pour confirmer les chaînes exactes ci-dessous.

**Édit A** — ouvrir `.home-main` et sortir `#noteTop` du héro. Ancien :

```html
  <section id="home">
    <p class="margin-note" aria-hidden="true" data-rv style="--d:.15s" id="noteTop">e<sup>iπ</sup> + 1 = 0</p>
    <p class="eyebrow" data-rv style="--d:.24s" id="heroEyebrow">Première · spécialité maths</p>
```

Nouveau :

```html
  <section id="home">
    <div class="home-main">
    <p class="eyebrow" data-rv style="--d:.24s" id="heroEyebrow">Première · spécialité maths</p>
```

**Édit B** — fermer `.home-main` et créer la marge (panneau « Mes statistiques » absorbé, `#hStats` supprimé, rien d'autre supprimé). Ancien :

```html
    <section class="panel" aria-labelledby="hStats" data-rv style="--d:1.14s">
      <h2 id="hStats">Mes statistiques</h2>
      <div class="statgrid" id="statGrid"></div>
    </section>

    <div id="statsExtra"></div>

    <p class="margin-note end" aria-hidden="true" data-rv style="--d:1.26s" id="noteBottom">Δ = b² − 4ac — à connaître par cœur ✎</p>
  </section>
```

Nouveau :

```html
    </div>

    <aside class="marge">
      <div class="margewrap">
        <p class="margin-note" aria-hidden="true" data-rv style="--d:.15s" id="noteTop">e<sup>iπ</sup> + 1 = 0</p>
        <div class="statgrid" id="statGrid" data-rv style="--d:1.14s"></div>
        <div id="statsExtra"></div>
        <p class="margin-note end" aria-hidden="true" data-rv style="--d:1.62s" id="noteBottom">Δ = b² − 4ac — à connaître par cœur ✎</p>
      </div>
    </aside>
  </section>
```

(`--d` de `#noteBottom` : 1.26 s → **1.62 s** — la marge se révèle strictement après le dernier bloc du héro/premier panneau ; tous les autres `--d` sont conservés. `#statGrid` hérite de `data-rv --d:1.14s` — même retard que l'ancien panneau, donc la cascade globale est inchangée.)

- [ ] **Step 2.3 : Ordre de la marge dans `renderHome()` — À réviser → Points faibles → Par thème (spec §3.3)**

Lecture préalable : la région `const extra=$("#statsExtra");` de `renderHome()` (l.~2579-2614) pour confirmer les chaînes exactes.

Remplacer le bloc de construction (de `let html="";` jusqu'à la fin du `if(stats.review.length>0){…}`) — ancien :

```js
    let html="";
    const weak=weakPoints();
    if(weak.length){
      html+=`<section class="panel" aria-labelledby="hWeak" data-rv style="--d:1.32s">`+
        `<h2 id="hWeak">Tes points faibles</h2>`+
        `<p class="muted" style="margin:0 0 6px">Les thèmes qui résistent le plus, sur tes 100 dernières réponses.</p>`+
        weak.map(w=>{
          const nm=THEME_BY_ID[w.s];const pct=Math.round(100*w.acc);
          return `<div class="weakrow">`+
            `<span class="weaknm">${nm?nm.name:w.s}<small>${w.l}</small></span>`+
            `<span class="weakbar"><i style="width:${Math.max(6,Math.min(100,pct))}%"></i></span>`+
            `<span class="weakpct" style="color:${pct<60?"var(--bad)":"var(--accent)"}">${pct}%</span>`+
            `<button type="button" class="btn btn-primary small" data-weak="${w.s}:${w.l}">S'entraîner →</button>`+
            `</div>`;
        }).join("")+
        `</section>`;
    }
    if(activeSubjects().some(s=>{const st=stats.bySub[s.id];return st&&st.ans>0;})){
      html+=`<section class="panel" aria-labelledby="hBySub" data-rv style="--d:1.42s">`+
        `<h2 id="hBySub">Par thème</h2>`+
        `<div class="substathead"><span>thème</span><span>q</span><span>précision</span><span>série</span></div>`+
        activeSubjects().map(s=>{
          const st=stats.bySub[s.id]||{ans:0,good:0};
          const pct=st.ans?Math.round(100*st.good/st.ans)+"%":"—";
          const stk=stats.streakBySub[s.id]||0;
          return `<div class="substatrow"><b>${s.name}</b><span>${st.ans||0}</span><span>${pct}</span><span>${stk>0?"🔥"+stk:"—"}</span></div>`;
        }).join("")+
        `</section>`;
    }
    if(stats.review.length>0){
      html+=`<section class="panel revcta" aria-labelledby="hRev" data-rv style="--d:1.52s">`+
        `<h2 id="hRev">À réviser</h2>`+
        `<p class="muted" style="margin:0 0 16px"><b>${stats.review.length} question${stats.review.length>1?"s":""}</b> à refaire — celles que tu as ratées (et, en révision, celles que tu as passées).</p>`+
        `<button type="button" class="btn btn-primary" id="btnReview">Reviser maintenant →</button>`+
        `</section>`;
    }
```

par le même code **réordonné** (À réviser `--d:1.32s` → Points faibles `--d:1.42s` → Par thème `--d:1.52s`) ; les corps de bloc sont identiques, seules la position et les valeurs `--d` changent :

```js
    let html="";
    if(stats.review.length>0){
      html+=`<section class="panel revcta" aria-labelledby="hRev" data-rv style="--d:1.32s">`+
        `<h2 id="hRev">À réviser</h2>`+
        `<p class="muted" style="margin:0 0 16px"><b>${stats.review.length} question${stats.review.length>1?"s":""}</b> à refaire — celles que tu as ratées (et, en révision, celles que tu as passées).</p>`+
        `<button type="button" class="btn btn-primary" id="btnReview">Reviser maintenant →</button>`+
        `</section>`;
    }
    const weak=weakPoints();
    if(weak.length){
      html+=`<section class="panel" aria-labelledby="hWeak" data-rv style="--d:1.42s">`+
        `<h2 id="hWeak">Tes points faibles</h2>`+
        `<p class="muted" style="margin:0 0 6px">Les thèmes qui résistent le plus, sur tes 100 dernières réponses.</p>`+
        weak.map(w=>{
          const nm=THEME_BY_ID[w.s];const pct=Math.round(100*w.acc);
          return `<div class="weakrow">`+
            `<span class="weaknm">${nm?nm.name:w.s}<small>${w.l}</small></span>`+
            `<span class="weakbar"><i style="width:${Math.max(6,Math.min(100,pct))}%"></i></span>`+
            `<span class="weakpct" style="color:${pct<60?"var(--bad)":"var(--accent)"}">${pct}%</span>`+
            `<button type="button" class="btn btn-primary small" data-weak="${w.s}:${w.l}">S'entraîner →</button>`+
            `</div>`;
        }).join("")+
        `</section>`;
    }
    if(activeSubjects().some(s=>{const st=stats.bySub[s.id];return st&&st.ans>0;})){
      html+=`<section class="panel" aria-labelledby="hBySub" data-rv style="--d:1.52s">`+
        `<h2 id="hBySub">Par thème</h2>`+
        `<div class="substathead"><span>thème</span><span>q</span><span>précision</span><span>série</span></div>`+
        activeSubjects().map(s=>{
          const st=stats.bySub[s.id]||{ans:0,good:0};
          const pct=st.ans?Math.round(100*st.good/st.ans)+"%":"—";
          const stk=stats.streakBySub[s.id]||0;
          return `<div class="substatrow"><b>${s.name}</b><span>${st.ans||0}</span><span>${pct}</span><span>${stk>0?"🔥"+stk:"—"}</span></div>`;
        }).join("")+
        `</section>`;
    }
```

Le reste du bloc (`extra.innerHTML=html;`, écouteurs `[data-weak]` et `#btnReview`) est **inchangé** et reste juste après.

- [ ] **Step 2.4 : Tester**

Structurel :

```bash
node -e 'const h=require("fs").readFileSync("index.html","utf8");if(!h.includes("<div class=\"home-main\">"))throw new Error("home-main absente");if(!h.includes("<aside class=\"marge\">"))throw new Error("marge absente");if(!h.includes("#home{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:40px}"))throw new Error("grille #home absente");if(!h.includes("#statsExtra{display:contents}"))throw new Error("statsExtra display:contents absent");if(!h.includes(".margewrap{position:sticky;top:88px;"))throw new Error("margewrap sticky absent");if(h.includes("id=\"hStats\""))throw new Error("hStats doit avoir disparu");const iHome=h.indexOf("<section id=\"home\">"),iPlay=h.indexOf("<section id=\"play\"");if(iHome<0||iPlay<0)throw new Error("sections introuvables");const home=h.slice(iHome,iPlay);const order=["id=\"noteTop\"","id=\"statGrid\"","id=\"statsExtra\"","id=\"noteBottom\""];let last=-1;for(const id of order){const i=home.indexOf(id);if(i===-1||i<last)throw new Error("ordre marge cassé: "+id);last=i;}const j=h.indexOf("let html=\"\"");if(j<0)throw new Error("renderHome introuvable");const seg=h.slice(j,j+4000);const iRev=seg.indexOf("id=\"hRev\""),iWeak=seg.indexOf("id=\"hWeak\""),iBy=seg.indexOf("id=\"hBySub\"");if(!(iRev>-1&&iRev<iWeak&&iWeak<iBy))throw new Error("ordre d\'injection cassé");console.log("marge structure OK");'
```

Attendu : `marge structure OK`.

Puis : syntaxe (infra) → `bloc #1 OK` / `bloc #2 OK`, et `node _qz_verify.js` → **toutes les sections passent** (les bascules matière rendent l'accueil dans la nouvelle structure ; les seeds de stats par matière prouvent que `#statGrid`/`#statsExtra` reçoivent encore les bonnes valeurs).

- [ ] **Step 2.5 : Captures visuelles**

- `APRES-task2-home-maths.png` (recette infra, home maths, thème par défaut) — vérifier : 2 colonnes, marge à droite avec note de marge, stats 2×2 compactes, héro/panneaux à gauche ;
- `APRES-task2-home-de-clair.png` (copie tmp + forçage `data-theme` `light` + `setMatiere("de")`) — vérifier : marge présente en allemand, **pas** de panneau Sprint dans la colonne gauche (`#secSprint.hidden`), stats allemandes.

- [ ] **Step 2.6 : Commit**

```bash
git add index.html
git commit -m "Accueil : colonne marge — stats compactes, à réviser, points faibles, par thème

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3 : Panneaux — hiérarchie entraînement/sprint, labels dé-floatés, états vides

**Files:**
- Modify: `index.html` (CSS `.panel`/`.panel h2` l.213-218, `.subgrid` l.241, HTML panneaux l.481-506, JS `renderHome()` — blocs Points faibles / Par thème issus de la Task 2, liste `html.theming :is(…)` l.~389)

**Interfaces:**
- Consumes: Task 2 (la marge existe — les états vides y vivent).
- Produces: `.panel.lead` (padding 28 px, « Entraînement libre ») / `.panel.second` (padding 20 px, « Sprint 60 s ») ; `.btn-ghost` sur `#btnSprint` + `#bestSprint` en `.chip` mono ; espacements 8 pt de la colonne principale ; `.margeline` (lignes d'état vide, italique `--muted`) ; À réviser reste masqué quand vide.

- [ ] **Step 3.1 : Hiérarchie des panneaux + `.margeline` (CSS)**

Ancien (l.213-218) :

```css
.panel{
  background:var(--surface);border:1px solid var(--line);
  border-radius:var(--radius);box-shadow:var(--shadow);
  padding:24px 26px;margin-bottom:20px;
}
.panel h2{margin:0 0 14px;font:600 20px var(--f-display)}
```

Nouveau :

```css
.panel{
  background:var(--surface);border:1px solid var(--line);
  border-radius:var(--radius);box-shadow:var(--shadow);
  padding:24px;margin-bottom:16px;
}
.panel.lead{padding:28px}
.panel.second{padding:20px}
.panel h2{margin:0 0 16px;font:600 20px var(--f-display)}
.margeline{font:italic 500 12.5px/1.5 var(--f-body);color:var(--muted);margin:0}
```

(12.5 px = palier « labels » existant de l'échelle typo spec §3.6 — aucune taille intermédiaire introduite. `.marge .panel{padding:16px}` de la Task 2 reste inchangé et n'interfère pas — aucun panneau de marge ne porte `.lead`/`.second`.)

- [ ] **Step 3.2 : Labels dé-floatés (HTML + `.subgrid`)**

- `<div class="row space-between wrap-row" style="margin-bottom:14px">` → `<div class="row space-between wrap-row" style="margin-bottom:16px">` (ligne « Niveau », chaîne unique).
- `<p class="lbl" style="margin:0 0 4px">Thème</p>` → `<p class="lbl" style="margin:0 0 8px">Thème</p>`.
- `.subgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:10px;margin:10px 0 16px}` → `margin:8px 0 16px` (le reste de la règle est identique).

- [ ] **Step 3.3 : Sprint = second rang (HTML)**

- `<section class="panel" aria-labelledby="hFree" data-rv style="--d:.9s">` → `<section class="panel lead" aria-labelledby="hFree" data-rv style="--d:.9s">`.
- `<section id="secSprint" class="panel" aria-labelledby="hSprint" data-rv style="--d:1.02s">` → `<section id="secSprint" class="panel second" aria-labelledby="hSprint" data-rv style="--d:1.02s">`.
- `<button class="btn btn-primary" id="btnSprint">Lancer le sprint</button>` → `<button class="btn btn-ghost" id="btnSprint">Lancer le sprint</button>` (`.btn-ghost` existe déjà — l.272).
- `<span class="muted mono" id="bestSprint" style="font-size:13.5px">Record : —</span>` → `<span class="chip" id="bestSprint">Record : —</span>` (`.chip` existe déjà — l.154 ; `renderHome` écrit toujours `.textContent` sur cet ID → compatible).

- [ ] **Step 3.4 : États vides (JS `renderHome()`)**

Le code ci-dessous est celui issu de la Task 2 (ordre rev → weak → bySub). Deux ajouts de branches `else` :

**Édit A** — après la clôture du bloc Points faibles. Ancien (chaîne unique) :

```js
        }).join("")+
        `</section>`;
    }
    if(activeSubjects().some(s=>{const st=stats.bySub[s.id];return st&&st.ans>0;})){
```

Nouveau :

```js
        }).join("")+
        `</section>`;
    }else{
      html+=`<p class="margeline" data-rv style="--d:1.42s">Lance quelques entraînements : tes points faibles apparaîtront ici.</p>`;
    }
    if(activeSubjects().some(s=>{const st=stats.bySub[s.id];return st&&st.ans>0;})){
```

**Édit B** — après la clôture du bloc Par thème. Ancien (chaîne unique) :

```js
        }).join("")+
        `</section>`;
    }
    extra.innerHTML=html;
```

Nouveau :

```js
        }).join("")+
        `</section>`;
    }else{
      html+=`<p class="margeline" data-rv style="--d:1.52s">Tes résultats par thème apparaîtront ici.</p>`;
    }
    extra.innerHTML=html;
```

(À réviser : déjà masqué quand `stats.review.length===0` — aucun `else` à ajouter, conforme spec §3.3.)

- [ ] **Step 3.5 : Transition douce (liste theming)**

Dans `index.html`, dans la ligne `html.theming :is(…)` (bloc `@media (prefers-reduced-motion: no-preference)`, l.~389), remplacer :

```
,.lede,.slogan,.note,.brand,.margin-note)
```

par :

```
,.lede,.slogan,.margeline,.note,.brand,.margin-note)
```

- [ ] **Step 3.6 : Tester**

Structurel :

```bash
node -e 'const h=require("fs").readFileSync("index.html","utf8");if(!h.includes(".panel.lead{padding:28px}"))throw new Error(".lead absent");if(!h.includes(".panel.second{padding:20px}"))throw new Error(".second absent");if(!h.includes("class=\"panel lead\""))throw new Error("panneau free non .lead");if(!h.includes("class=\"panel second\""))throw new Error("panneau sprint non .second");if(!h.includes("class=\"btn btn-ghost\" id=\"btnSprint\""))throw new Error("#btnSprint pas en ghost");if(!h.includes("class=\"chip\" id=\"bestSprint\""))throw new Error("#bestSprint pas en chip");if(!h.includes(".margeline{"))throw new Error(".margeline CSS absente");if(!h.includes(".margeline,.note"))throw new Error(".margeline hors liste theming");if(!h.includes("Lance quelques entraînements"))throw new Error("état vide points faibles absent");if(!h.includes("Tes résultats par thème apparaîtront ici"))throw new Error("état vide par thème absent");console.log("panneaux OK");'
```

Attendu : `panneaux OK`.

Puis : syntaxe (infra) → `bloc #1 OK` / `bloc #2 OK`, et `node _qz_verify.js` → **toutes les sections passent** (les tests de bascule s'exécutent avec stats fraîches → les deux branches `else` `margeline` s'exécutent réellement ; les seeds → le chemin peuplé).

- [ ] **Step 3.7 : Captures visuelles**

- `APRES-task3-home-maths.png` — vérifier : « Entraînement libre » plus dense (padding 28 px) que « Sprint » (20 px), bouton Sprint discret (ghost) avec le record en chip mono, labels « Niveau »/« Thème » collés à leurs contrôles ;
- `APRES-task3-home-de-clair.png` (tmp + `light` + `setMatiere("de")`) — profil frais : **les deux lignes d'état vide** apparaissent dans la marge (points faibles + par thème), Sprint absent.

- [ ] **Step 3.8 : Commit**

```bash
git add index.html
git commit -m "Panneaux : hiérarchie entraînement/sprint, labels dé-floatés, états vides

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4 : Écran d'exercice + finition (grille 8 pt, `:focus-visible`)

**Files:**
- Modify: `index.html` (CSS `.lbl` l.226, `.playhead` l.293, `.qcard` l.294-298, `.qeyebrow` l.300, `.prompt` l.301, `.ans`/`.ans input`/`.ans input:focus`/`.ans .hint` l.312-319, `.opts`/`.opt` l.320-326, `.nextrow` l.342, `:focus-visible` l.~377)

**Interfaces:**
- Consumes: Tasks 1-3 (état final du fichier).
- Produces: trio « saisie / Valider / Passer » aligné (hauteur 40 px, rayon 12 px, gap 10 px existant) ; astuce au style `.note` (filet de plume) ; espacements de l'écran d'exercice sur la grille 8 pt ; vérification (sans changement) des chips `#chipSub`/`#chipLvl` et de `:focus-visible` global.

- [ ] **Step 4.1 : qcard, trio, astuce (CSS)**

Lecture préalable : `index.html` l.290-345 (bloc CSS exercice) pour confirmer les chaînes exactes.

Remplacements (chaque « ancien » est unique dans le fichier) :

- `.playhead{margin:22px 0 14px}` → `.playhead{margin:24px 0 16px}`
- Dans la règle `.qcard{…}` (l.294-298, multi-lignes) : `padding:24px 24px 22px` → `padding:24px` (le reste de la règle est identique).
- `.qeyebrow{font:700 13.5px` → `.qeyebrow{font:700 12.5px` (12.5 px = palier labels spec §3.6).
- `.prompt{margin:0 0 20px` → `.prompt{margin:0 0 24px` (le reste de la règle est identique).
- Règle complète `.ans input{…}` — ancien :

```css
.ans input{
  font:500 17px var(--f-mono);color:var(--ink);
  background:var(--surface);border:1.5px solid var(--line);border-radius:9px;
  padding:11px 14px;width:min(250px,100%);
}
```

nouveau :

```css
.ans input{
  font:500 17px var(--f-mono);color:var(--ink);
  background:var(--surface);border:1.5px solid var(--line);border-radius:12px;
  height:40px;padding:0 14px;width:min(250px,100%);
}
```

(`*{box-sizing:border-box}` l.124 → `height:40px` avec `padding:0` est exact.)

- `.ans input:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent)}` → `outline-offset:2px` (le reste est identique).
- Juste après la ligne `.ans{display:flex;gap:10px;flex-wrap:wrap;align-items:center}` (l.312), insérer :

```css
.ans .btn{height:40px;padding:0 18px;border-radius:12px;display:inline-flex;align-items:center}
```

(scope strict : seuls `#ansBtn` et `#passBtn`, qui vivent dans `.ans`, sont touchés — la règle (0-2-0) gagne sur `.btn` (0-1-0) et `.btn-primary` (0-1-0) ; `display:inline-flex;align-items:center` centre le texte dans la hauteur fixe.)

- `.ans .hint{font:500 13px var(--f-body);color:var(--muted);width:100%}` →

```css
.ans .hint{font:500 13px/1.5 var(--f-body);color:var(--muted);width:100%;padding-left:11px;border-left:2.5px solid var(--pen)}
```

(même recette de filet que `.note` l.212 — l'astuce rejoint le style `.note` de la spec §3.5. Attention : garder le shorthand `font:` complet — 13 px sans `font-weight:500`/`var(--f-body)` changerait la typo.)

- `.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px}` → `gap:10px`.
- Dans la règle `.opt{…}` (l.321-326) : `border-radius:10px;padding:13px 15px` → `border-radius:12px;padding:12px 16px` (le reste est identique).
- `.nextrow{margin-top:18px;display:flex;justify-content:flex-end}` → `.nextrow{margin-top:16px;display:flex;justify-content:flex-end}`.

- [ ] **Step 4.2 : Échelle typo — `.lbl`**

- `.lbl{font:700 13px var(--f-body);text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}` → `.lbl{font:700 12.5px var(--f-body);text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}` (palier « labels » 12.5 px spec §3.6 — `.chip` 13.5 px et `.note` 13 px sont des tailles existantes, conservées).

- [ ] **Step 4.3 : Vérifier les invariants (sans changement)**

- `#chipSub` / `#chipLvl` portent déjà la classe `.chip` (identique aux chips topbar) et **aucune** règle `.playhead .chip` n'existe (vérifié) → rien à faire, l'assertion Step 4.4 le verrouille.
- `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}` (l.~377) est déjà global et couvre `.btn`, `.seg-btn`, `.theme-btn`, `.opt` → rien à faire, l'assertion le verrouille.

- [ ] **Step 4.4 : Tester**

Structurel :

```bash
node -e 'const h=require("fs").readFileSync("index.html","utf8");if(!h.match(/\.qcard\{[\s\S]*?padding:24px;/))throw new Error("qcard padding 24px");if(!h.includes(".ans .btn{height:40px;padding:0 18px;border-radius:12px;display:inline-flex;align-items:center}"))throw new Error("trio 40px");if(!h.match(/\.ans input\{[\s\S]*?height:40px[\s\S]*?border-radius:12px/))throw new Error("input 40px/12px");if(!h.includes(".ans input:focus{outline:2px solid var(--accent);outline-offset:2px;"))throw new Error("focus input offset 2px");if(!h.includes("<span class=\"chip\" id=\"chipSub\"></span>"))throw new Error("#chipSub");if(!h.includes("<span class=\"chip\" id=\"chipLvl\"></span>"))throw new Error("#chipLvl");if(/\.playhead \.chip/.test(h))throw new Error("override .playhead .chip");if(!h.match(/\.lbl\{font:700 12\.5px/))throw new Error(".lbl 12.5px");if(!h.match(/\.qeyebrow\{font:700 12\.5px/))throw new Error(".qeyebrow 12.5px");if(!h.match(/\.playhead\{margin:24px 0 16px\}/))throw new Error(".playhead 8pt");if(!h.match(/\.prompt\{margin:0 0 24px/))throw new Error(".prompt 24px");if(!h.match(/\.nextrow\{margin-top:16px/))throw new Error(".nextrow 16px");if(!h.includes(":focus-visible{outline:2px solid var(--accent);outline-offset:2px}"))throw new Error(":focus-visible global");console.log("exercice + finition OK");'
```

Attendu : `exercice + finition OK`.

Puis : syntaxe (infra) → `bloc #1 OK` / `bloc #2 OK`, et `node _qz_verify.js` → **toutes les sections passent** (le rendu des questions exerce `.ans`/`.opt`/`.nextrow` dans les trois registres).

- [ ] **Step 4.5 : Capture visuelle**

Copie tmp + forçage :

```html
<script>addEventListener("DOMContentLoaded",()=>{try{startFree()}catch(e){console.log(e)}})</script>
```

Capture → `APRES-task4-exercice.png` (comparer avec la baseline `ecran-exercice.png`) — vérifier : trio aligné à 40 px, astuce avec filet de plume, espacements multiples de 8, focus net (clavier).

- [ ] **Step 4.6 : Commit**

```bash
git add index.html
git commit -m "Écran d'exercice + finition : grille 8 pt, focus-visible

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 4.7 : Régression finale + clôture**

- `node _qz_verify.js` → toutes les sections passent (dernière passe complète).
- Set de captures final dans `%TEMP%\qzshots` : home maths / PC / DE × clair + sombre, écran d'exercice — comparaison avant/après (`home-clair.png`, `ecran-exercice.png` et les 4 baselines de la Task 1).
- Vérifier le `git log` : 4 commits au-dessus de `a6d8d7f` (Topbar / Marge / Panneaux / Exercice), aucun artefact `.shots/` ou capture commité.
- **Commit 5 de la spec §7 (« Tests : mise à jour _qz_verify.js ») — non requis** : aucune assertion de position n'a bougé (vérifié, infra) ; `_qz_verify.js` reste tel quel.
