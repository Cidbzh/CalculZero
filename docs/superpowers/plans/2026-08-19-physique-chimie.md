# Plan d'implémentation — Physique-chimie (reste : T2 → T8)

> **Pour l'exécutant** : ce plan s'exécute tâche par tâche, chaque tâche se termine par la porte de test `node _cz_verify.js` qui doit être VERT. Il n'y a pas de git sur ce projet : **la porte de test remplace le commit**. Les étapes sont des cases à cocher (`- [ ]`).

## État actuel (vérifié dans `index.html`)

- **T1 est FAITE et VERTE** : bascule Maths↔PC (`state.matiere`, `cz_subject`, `setMatiere`@1223), stats séparées (`cz_stats` / `cz_stats_pc`, `loadStats(key)`, `activeStatsKey`, `save()`), textes héro (`MAT_DATA`), registre `SUBJECTS_PC`, helper `activeSubjects()` / `THEME_BY_ID`, **thème `cosmo`** (6 générateurs, `G_COSMO`@889) et visuel `scale` → `vzRatio`@1141 + `case"scale"`@1175. Le test [8] (régression de bascule) est en place et passe.
- Ce plan couvre **les 6 tâches restantes** (T2→T8).

**Objectif** : ajouter les 6 thèmes PC restants — `newton`, `forces`, `energie`, `moles`, `stoich`, `cinet` (≈ 43 générateurs) — et leurs visuels SVG (`proj`, `force`, `bars`, `soln`, `stoich`, `kin`), **sans aucune régression maths**.

**Architecture** : le moteur ne connaît que le « contrat de question » et le registre. Chaque thème = (a) un tableau de générateurs `G_X` au même motif que `G_COSMO`, (b) une entrée dans `SUBJECTS_PC`, (c) 1 à 2 fonctions de dessin `vz*` + un `case` dans `VIZdraw`. Le test [7] couvre **automatiquement** chaque nouveau thème (il itère `SUBJECTS_PC` × 25 : forme, auto-correction `checkAnswer`, rendu SVG q/c, round-trip `localStorage`).

**Stack** : HTML/CSS/JS vanilla dans `index.html` (fragment, pas de build), Node `vm` pour les tests.

**Spec** : `docs/superpowers/specs/2026-08-19-physique-chimie-design.md` (contractuelle — les tables §5.2–§5.7 des 6 thèmes font foi pour le contenu ; §6 pour les visuels).

## Ancres réelles (état actuel du fichier — s'en servir à la lettre)

| Élément | Emplacement |
|---|---|
| Tableau `G_COSMO` (motif à imiter) | lignes 889–934 |
| `SUBJECTS_PC=[…]` (y ajouter les entrées) | ligne 936–938 |
| Marqueur `/*GEN2C*/` (à préserver) | ligne 943 (après registres, avant GRAPH) |
| Dernier visuel PC `vzRatio` | lignes 1141–1160 |
| Commentaire « Point d'entrée unique » | ligne 1161 (insérer les nouveaux `vz*` **avant** elle) |
| `switch` de `VIZdraw` (y ajouter les `case`) | lignes 1170–1176 |

**Helpers GRAPH disponibles** (déjà définis, à réutiliser tels quels) :
- `VZ={W:360,H:210,L:40,R:346,T:18,B:186}`
- `vzScale(x0,x1,y0,y1)` → `{sx, sy}` (deux fonctions de coordonnées)
- `vzCurve(f,x0,x1,n,X,Y,y0,y1)` → chaîne `d` de `<path>` (découpe aux pôles)
- `vzRange(f,x0,x1,extra?)` → `{y0,y1}` ; `vzAxes(x0,x1,y0,y1,X,Y)` → grille+axes
- `vzClip(id)` → `<clipPath>` ; `vzWrap(inner,label)` → `<svg class="vz" …>inner</svg>`

**Classes CSS `.vz-*` disponibles** (lignes 318–329) : `.vz-grid .vz-axis .vz-curve .vz-pt .vz-ans .vz-ans-bad .vz-anspt .vz-leg .vz-circ .vz-ray .vz-lbl .vz-lbl-ans`. Variables : `--accent --accent-soft --line --muted --ink --surface --good --bad`.

**Helpers fractions/affichage** : `gcd` (434), `fr(n,d)` (435), `F(n,d)` (439, affichage simplifié), `fa(n,d)` (441 → `{n,d}` simplifié pour les réponses `frac`), `fmtAns` (1424), `checkAnswer` (1405). **Utilitaires aléatoires** : `pick([...])`, `Ri(a,b)`.

## Contraintes globales (rappelées à chaque tâche implicitement)

- Fichier unique autonome, **aucune dépendance**, fonctionnel hors-ligne, **aucun asset externe nouveau**.
- Interface **100 % français** ; unités **dans le prompt** ; la réponse = un nombre (ou fraction).
- `g` toujours explicité dans le prompt (`9,8 N/kg` poids ; `10 m/s²` quand le résultat est propre).
- Réponses décimales : `tol` relative (`tol:0.011` type) ; entiers/fractions : sans `tol`.
- **1 calcul dominant par question** — tenable dans un sprint 60 s.
- QCM (`type:"choice"`) réservés aux questions conceptuelles (exclus du sprint).
- Chaque thème couvre les 3 niveaux ; `explain` = méthode complète HTML (réponse en `<b>`, `<br>` pour le multi-ligne).
- Specs `viz` **100 % JSON-sérialisables** (nombres/chaînes/tableaux, jamais de fonction ni d'`undefined`) — le round-trip `JSON.parse(JSON.stringify(q))` est testé.
- Phase `"q"` = image neutre **sans aucun élément de la réponse** ; phase `"c"` = complète, correction seulement.
- `VIZdraw` **ne plante jamais** (try/catch existant, renvoie `""`).
- `cz_stats` (maths) **jamais écrit** par l'activité PC — zéro migration.
- Préservation du marqueur `/*GEN2C*/`. `index.html` garde sa forme de fragment (pas de `<!DOCTYPE>`).
- **Aucune nouvelle animation CSS** : les figures sont du SVG statique + classes `.vz-*` existantes (l'animation de tracé `.vz-curve` existante reste inerte sous `prefers-reduced-motion`).
- Porte de test à chaque tâche : `node _cz_verify.js` → **VERT**.

---

### Tâche 2 — Thème `newton` (Mécanique & Newton, 8 générateurs) + visuels `proj` / `force`

**Fichiers :** `index.html` (GENERATORS après `G_COSMO`, GRAPH, registre `SUBJECTS_PC`, `VIZdraw`).
**Interfaces produites :** `SUBJECTS_PC += {id:"newton",name:"Mécanique & Newton",sym:"F=ma",gens:G_NEWTON}` ; kinds `proj` `{h,v0,g}` et `force` `{P,T}` (le kind `force` sera **réutilisé** par `forces` en T3).
**Consomme :** tout de T1 (le test [7] couvre automatiquement le nouveau thème).

- [ ] **Étape 2.1 — Familles** (contractuel — spec §5.2)

| # | lvl | Famille | Réponse | viz |
|---|---|---|---|---|
| 1 | facile | 2ᵉ loi : a = F/m (F multiple de m → entier) | number | — |
| 2 | facile | Chute libre depuis l'origine : v = g·t (g = 10) | number | — |
| 3 | facile | 1ʳᵉ loi : mouvement rectiligne uniforme → ΣF = 0 | choice | — |
| 4 | moyen | h = ½·g·t² (g = 10, t ∈ {1,2,3,4}) | number | — |
| 5 | moyen | Résultante : a = (T − P)/m (T > P) | number | `force` {P,T} |
| 6 | moyen | Projectile : temps de vol t = √(2h/g), h = 5t² | number | `proj` {h,v0,g} |
| 7 | difficile | Projectile : portée x = v₀·t (t entier) | number | `proj` {h,v0,g} |
| 8 | difficile | 3ᵉ loi : identifier la force de réaction (livre sur table) | choice | — |

Exemple type — **famille #1** (a = F/m) :

```js
 {lvl:"facile",make(){
   const m=pick([2,4,5,10]),F=m*pick([2,3,4,5,6,8,10]);
   return{prompt:`Une force résultante de ${F} N s'exerce sur un objet de masse ${m} kg. Quelle est l'accélération ? (en m/s²)`,
     type:"number",answer:F/m,
     explain:`2ᵉ loi de Newton : a = F/m = ${F} / ${m} = <b>${F/m} m/s²</b>.`};
 }}
```

Les familles #2–#8 suivent le même motif (valeurs choisies pour que la réponse soit entière, `explain` = méthode HTML complète). #3 et #8 sont des QCM (`type:"choice"`, `options[]` + `correct:<index>`).

- [ ] **Étape 2.2 — Déclarer `G_NEWTON`** juste après le bloc `G_COSMO` (après la ligne 934, avant le commentaire « REGISTRE PC ») : `const G_NEWTON=[ …8 familles… ];`

- [ ] **Étape 2.3 — `vzProj`** (GRAPH, insérer **après** `vzRatio` (ligne 1160), **avant** le commentaire « Point d'entrée unique » (ligne 1161))

```js
/* ---------- PC (newton) : lancer horizontal — point de départ + sol (q), trajectoire + impact (c) ---------- */
function vzProj(spec,phase){
  const h=Math.max(1,spec.h||5),v0=Math.max(0,spec.v0||3),g=Math.max(1,spec.g||10);
  const xi=v0>0?v0*Math.sqrt(2*h/g):0;
  const x1=Math.max(xi,1)*1.15,y1=h*1.3;
  const {sx:X,sy:Y}=vzScale(0,x1,0,y1);
  const id="vzclip-"+phase;
  let s=`<line x1="${VZ.L}" y1="${Y(0).toFixed(1)}" x2="${VZ.R}" y2="${Y(0).toFixed(1)}" class="vz-axis"/>`;
  s+=`<circle cx="${X(0).toFixed(1)}" cy="${Y(h).toFixed(1)}" r="4.5" class="vz-pt"/>`;
  if(phase==="c"){
    if(v0>0){
      const f=x=>h-(g/(2*v0*v0))*x*x;
      s+=`<g clip-path="url(#${id})"><path d="${vzCurve(f,0,xi,60,X,Y,0,y1)}" class="vz-curve" pathLength="1"/></g>`;
      s+=`<line x1="${X(0).toFixed(1)}" y1="${Y(h).toFixed(1)}" x2="${(X(0)+40).toFixed(1)}" y2="${Y(h).toFixed(1)}" class="vz-ray"/>`;
      s+=`<text x="${(X(0)+44).toFixed(1)}" y="${(Y(h)+4).toFixed(1)}" class="vz-lbl-ans">v₀</text>`;
    }else{
      s+=`<line x1="${X(0).toFixed(1)}" y1="${Y(h).toFixed(1)}" x2="${X(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" class="vz-curve" pathLength="1"/>`;
    }
    s+=`<circle cx="${X(xi).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="4.5" class="vz-anspt"/>`;
    s+=`<text x="${X(xi).toFixed(1)}" y="${(Y(0)+18).toFixed(1)}" text-anchor="middle" class="vz-lbl-ans">impact</text>`;
  }
  return vzWrap(vzClip(id)+s,"Lancer horizontal"+(phase==="c"?" avec la trajectoire":" — point de départ et sol"));
}
```

- [ ] **Étape 2.4 — `vzForce`** (id., juste après `vzProj`)

```js
/* ---------- PC (forces/newton) : masse sur support — flèches P ↓ / T ↑ à l'échelle en correction ---------- */
function vzForce(spec,phase){
  const P=Math.max(0,spec.P||0),T=Math.max(0,spec.T||0);
  const cx=180,cy=112,mx=Math.max(P,T,1);
  const len=v=>Math.max(12,56*v/mx);
  let s=`<line x1="90" y1="168" x2="270" y2="168" class="vz-axis"/>`;
  s+=`<rect x="${cx-16}" y="${cy-12}" width="32" height="24" rx="5" fill="var(--accent-soft)" stroke="var(--line)"/>`;
  if(phase==="c"){
    if(P>0){
      const L=len(P);
      s+=`<line x1="${cx}" y1="${cy+12}" x2="${cx}" y2="${cy+12+L}" class="vz-ans-bad"/>`;
      s+=`<path d="M ${cx} ${cy+12+L+8} L ${cx-5} ${cy+12+L-2} L ${cx+5} ${cy+12+L-2} Z" fill="var(--bad)"/>`;
      s+=`<text x="${cx+9}" y="${cy+12+L+4}" class="vz-lbl">P</text>`;
    }
    if(T>0){
      const L=len(T);
      s+=`<line x1="${cx}" y1="${cy-12}" x2="${cx}" y2="${cy-12-L}" class="vz-ans"/>`;
      s+=`<path d="M ${cx} ${cy-12-L-8} L ${cx-5} ${cy-12-L+2} L ${cx+5} ${cy-12-L+2} Z" fill="var(--good)"/>`;
      s+=`<text x="${cx+9}" y="${cy-12-L+4}" class="vz-lbl">T</text>`;
    }
  }
  return vzWrap(s,"Masse sur un support"+(phase==="c"?" avec les forces à l'échelle":""));
}
```

- [ ] **Étape 2.5 — Registre + cases** : dans `SUBJECTS_PC` (après l'entrée `cosmo`), ajouter `{id:"newton",name:"Mécanique & Newton",sym:"F=ma",gens:G_NEWTON},` ; dans le `switch` de `VIZdraw` (après `case"scale"`, ligne 1175) : `case"proj":return vzProj(spec,phase);` et `case"force":return vzForce(spec,phase);`

- [ ] **Étape 2.6 — Porte** : `node _cz_verify.js` → **VERT** (newton ×25 inclus en [7]).

---

### Tâche 3 — Thème `forces` (Forces & champs, 7 générateurs)

**Fichiers :** `index.html` (GENERATORS, registre). **Réutilise** le kind `force` de T2 (aucun nouveau visuel).
**Interfaces :** `SUBJECTS_PC += {id:"forces",name:"Forces & champs",sym:"G",gens:G_FORCES}`.

- [ ] **Étape 3.1 — Familles** (contractuel — spec §5.3)

| # | lvl | Famille | Réponse | viz |
|---|---|---|---|---|
| 1 | facile | Poids P = m·g (g = 9,8) | number tol | `force` {P:m*9.8, T:0} |
| 2 | facile | Le poids est une force de champ (action à distance) | choice | — |
| 3 | moyen | G = GM/d² (M = 6×10²⁴, d = 6,4×10⁶ → ≈ 9,8) | number tol | — |
| 4 | moyen | F = GMm/d² (G, M, m, d donnés) | number tol | — |
| 5 | moyen | Force électrostatique F = q·E | number tol | — |
| 6 | difficile | Satellite : F = GMm/r² (m satellite, r donnés) | number tol | `force` {P:F, T:0} |
| 7 | difficile | Sens de la force sur une charge négative (opposé au champ) | choice | — |

Exemple type — **famille #1** (P = m·g) :

```js
 {lvl:"facile",make(){
   const m=pick([10,20,50,100]),g=9.8,P=Math.round(m*g*100)/100;
   return{prompt:`La masse d'un objet vaut ${m} kg. Sachant que g = ${String(g).replace(".",",")} N/kg, quel est son poids ? (en N)`,
     type:"number",answer:P,tol:0.011,
     viz:{kind:"force",P:P,T:0},
     explain:`P = m·g = ${m} × ${String(g).replace(".",",")} = <b>${String(P).replace(".",",")} N</b>.`};
 }}
```

Les familles #3–#6 sont des nombres (valeurs données dans le prompt, `tol:0.011`) ; #2 et #7 des QCM.

- [ ] **Étape 3.2 — Déclarer `G_FORCES`** après `G_NEWTON`, **avant** « REGISTRE PC ».
- [ ] **Étape 3.3 — Registre** : entrée `forces` dans `SUBJECTS_PC`.
- [ ] **Étape 3.4 — Porte** : `node _cz_verify.js` → **VERT**.

---

### Tâche 4 — Thème `energie` (Énergie, 8 générateurs) + visuel `bars`

**Fichiers :** `index.html` (GENERATORS, GRAPH, registre, `VIZdraw`).
**Interfaces :** `SUBJECTS_PC += {id:"energie",name:"Énergie",sym:"E",gens:G_ENERGIE}` ; kind `bars` `{ek,ep,em}` (en J).

- [ ] **Étape 4.1 — Familles** (contractuel — spec §5.4)

| # | lvl | Famille | Réponse | viz |
|---|---|---|---|---|
| 1 | facile | Eₖ = ½·m·v² (m, v → entier) | number | `bars` {ek, ep:0, em:ek} |
| 2 | facile | Eₚ = m·g·h | number | `bars` {ek:0, ep, em:ep} |
| 3 | facile | Quelle énergie augmente lors d'une chute ? | choice | — |
| 4 | moyen | Élastique : E = ½·k·x² | number | — |
| 5 | moyen | Conversion : v = √(2·g·h) (g = 10, h = v²/20) | number | — |
| 6 | moyen | Extraire v de Eₖ (Eₖ, m donnés → v entier) | number | — |
| 7 | difficile | Avec dissipation : Eₖ fin = Eₘ − E_dissipée | number | `bars` {ek, ep:0, em} |
| 8 | difficile | Lancement par ressort : v = x·√(k/m) | number tol | — |

Exemple type — **famille #1** (Eₖ) :

```js
 {lvl:"facile",make(){
   const m=pick([2,4,8,10]),v=pick([2,3,5,10]),ek=m*v*v/2;
   return{prompt:`Un objet de masse ${m} kg se déplace à ${v} m/s. Quelle est son énergie cinétique ? (en J)`,
     type:"number",answer:ek,
     viz:{kind:"bars",ek:ek,ep:0,em:ek},
     explain:`E꜀ = ½·m·v² = ½ × ${m} × ${v}² = <b>${ek} J</b>.`};
 }}
```

Les valeurs sont choisies pour des réponses entières (sauf #8, `tol:0.011`) ; #3 est un QCM.

- [ ] **Étape 4.2 — `vzBars`** (GRAPH, après les visuels PC précédents, avant « Point d'entrée unique »)

```js
/* ---------- PC (energie) : bilans d'énergie — barres E꜀ / Eₚ / Eₘ, valeurs en correction ---------- */
function vzBars(spec,phase){
  const vals=[["E꜀",spec.ek||0],["Eₚ",spec.ep||0],["Eₘ",spec.em||0]];
  const mx=Math.max(1,Math.max.apply(null,vals.map(v=>v[1])));
  const base=172,top=30,bw=54,gap=30;
  let s="";
  vals.forEach((v,i)=>{
    const x=52+i*(bw+gap);
    s+=`<rect x="${x}" y="${top}" width="${bw}" height="${base-top}" fill="none" stroke="var(--line)"/>`;
    if(phase==="c"&&v[1]>0){
      const h=(base-top)*v[1]/mx;
      s+=`<rect x="${x}" y="${(base-h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="var(--accent-soft)" stroke="var(--accent)"/>`;
      s+=`<text x="${x+bw/2}" y="${(base-h-6).toFixed(1)}" text-anchor="middle" class="vz-lbl-ans">${v[1]} J</text>`;
    }
    s+=`<text x="${x+bw/2}" y="${base+16}" text-anchor="middle" class="vz-lbl">${v[0]}</text>`;
  });
  s+=`<line x1="40" y1="${base}" x2="330" y2="${base}" class="vz-axis"/>`;
  return vzWrap(s,"Bilan d'énergie"+(phase==="c"?" avec les valeurs":" — barres vides"));
}
```

- [ ] **Étape 4.3 — Déclarer `G_ENERGIE`** (après `G_FORCES`), **registre** (entrée `energie`), **case** `case"bars":return vzBars(spec,phase);`
- [ ] **Étape 4.4 — Porte** : `node _cz_verify.js` → **VERT**.

---

### Tâche 5 — Thème `moles` (Quantités de matière, 7 générateurs) + visuel `soln`

**Fichiers :** `index.html` (GENERATORS, GRAPH, registre, `VIZdraw`).
**Interfaces :** `SUBJECTS_PC += {id:"moles",name:"Quantités de matière",sym:"n",gens:G_MOLES}` ; kind `soln` `{n,c?,V?}`.

- [ ] **Étape 5.1 — Familles** (contractuel — spec §5.5)

| # | lvl | Famille | Réponse | viz |
|---|---|---|---|---|
| 1 | facile | n = m/M (M ∈ {16,28,32,44,58,64,80}, n ∈ {0.5,1,2,3,4}) | number | `soln` {n} |
| 2 | facile | m = n·M | number | `soln` {n} |
| 3 | facile | c = n/V (V en L, résultat propre) | number | `soln` {n,c} |
| 4 | moyen | n = c·V (conversion mL → L) | number | `soln` {n,c} |
| 5 | moyen | N = n·Nₐ (Nₐ = 6×10²³) | number tol | — |
| 6 | difficile | Dilution c₁V₁ = c₂V₂ (valeurs propres) | number | `soln` {n,c} |
| 7 | difficile | Volume molaire : V = n·24 L/mol (n ∈ {0.5,1,2,2.5,4,5}) | number | `soln` {n,V} |

Exemple type — **famille #1** (n = m/M) :

```js
 {lvl:"facile",make(){
   const M=pick([16,28,32,44,58,64,80]),n=pick([0.5,1,2,3,4]),m=n*M;
   return{prompt:`Quelle quantité de matière (en mol) contient ${m} g de substance, sachant que M = ${M} g/mol ?`,
     type:"number",answer:n,
     viz:{kind:"soln",n:n},
     explain:`n = m/M = ${m}/${M} = <b>${String(n).replace(".",",")} mol</b>.`};
 }}
```

Toutes les réponses sont des nombres décimaux propres (0,5 / 1 / 2 …) → sans `tol`, sauf #5 (`tol:0.011`, réponse en `3e23` accepté par `checkAnswer`).

- [ ] **Étape 5.2 — `vzSoln`** (GRAPH, après les visuels précédents, avant « Point d'entrée unique »)

```js
/* ---------- PC (moles) : récipient — ménisque + c, n en correction ---------- */
function vzSoln(spec,phase){
  const cx=180,top=40,bot=170,hw=45;
  let s=`<path d="M ${cx-hw} ${top} L ${cx-hw} ${bot-14} Q ${cx-hw} ${bot} ${cx-hw+14} ${bot} L ${cx+hw-14} ${bot} Q ${cx+hw} ${bot} ${cx+hw} ${bot-14} L ${cx+hw} ${top}" fill="none" stroke="var(--muted)" stroke-width="1.6"/>`;
  if(phase==="c"){
    const h=30+0.4*Math.min(80,(spec.n||1)*10);
    const y=bot-14-h;
    s+=`<path d="M ${cx-hw+2} ${y} L ${cx+hw-2} ${y} L ${cx+hw-2} ${bot-14} Q ${cx+hw-2} ${bot-2} ${cx+hw-14} ${bot-2} L ${cx-hw+14} ${bot-2} Q ${cx-hw+2} ${bot-2} ${cx-hw+2} ${bot-14} Z" fill="var(--accent-soft)" opacity="0.8"/>`;
    s+=`<line x1="${cx-hw-6}" y1="${y.toFixed(1)}" x2="${cx-hw+2}" y2="${y.toFixed(1)}" class="vz-ans"/>`;
    if(spec.c!=null)s+=`<text x="${cx+hw+10}" y="${(y+4).toFixed(1)}" class="vz-lbl-ans">${spec.c} mol/L</text>`;
    if(spec.n!=null)s+=`<text x="${cx}" y="${bot+16}" text-anchor="middle" class="vz-lbl">n = ${spec.n} mol</text>`;
  }
  return vzWrap(s,"Solution"+(phase==="c"?" avec la concentration":" — récipient"));
}
```

- [ ] **Étape 5.3 — Déclarer `G_MOLES`** (après `G_ENERGIE`), **registre** (entrée `moles`), **case** `case"soln":return vzSoln(spec,phase);`
- [ ] **Étape 5.4 — Porte** : `node _cz_verify.js` → **VERT**.

---

### Tâche 6 — Thème `stoich` (Stœchiométrie & état final, 6 générateurs) + visuel `stoich`

**Fichiers :** `index.html` (GENERATORS, GRAPH, registre, `VIZdraw`).
**Interfaces :** `SUBJECTS_PC += {id:"stoich",name:"Stœchiométrie & état final",sym:"τ",gens:G_STOICH}` ; kind `stoich` `{a,b,c,nA,nB,limitant}` (coefficients entiers petits, quantités initiales, nom du réactif limitant).

- [ ] **Étape 6.1 — Familles** (contractuel — spec §5.6). Réactions simples à coefficients petits : `A + bB → C`, `2H₂ + O₂ → 2H₂O`, `CH₄ + 2O₂ → CO₂ + 2H₂O`.

| # | lvl | Famille | Réponse | viz |
|---|---|---|---|---|
| 1 | facile | Ratio molaire : n(B) pour n(A) donnée | number | `stoich` |
| 2 | facile | Identifier le réactif limitant | choice | — |
| 3 | moyen | Quantité de produit à l'état final | frac/number | `stoich` |
| 4 | moyen | Avancement maximal τ | frac/number | `stoich` |
| 5 | difficile | Quantité restante d'un réactif à l'état final | frac/number | `stoich` |
| 6 | difficile | Lecture d'état final (quel couple (n_A, n_B) correct) | choice | — |

Exemple type — **famille #4** (avancement maximal τ, réponse `frac` via `fa`) :

```js
 {lvl:"moyen",make(){
   const b=pick([2,3]),t=pick([0.5,1,1.5,2]);
   const nA=t,nB=b*t+pick([1,2,3]); /* B en excès strict */
   return{prompt:`Réaction : A + ${b}B → C. On mélange n(A) = ${String(nA).replace(".",",")} mol et n(B) = ${nB} mol. Quel est l'avancement maximal τ ? (en mol)`,
     type:"frac",answer:fa(t,1),
     viz:{kind:"stoich",a:1,b:b,c:1,nA:nA,nB:nB,limitant:"A"},
     explain:`A est limitant : n(A)/1 = ${String(nA).replace(".",",")} < n(B)/${b} = ${nB}/${b}.<br>Donc τ = <b>${F(t,1)} mol</b>.`};
 }}
```

Les familles #3–#5 utilisent `type:"frac"` avec `answer:fa(n,d)` (l'utilisateur peut répondre `a/b` **ou** décimal — `checkAnswer` compare au 1e-9) ; #1 un nombre ; #2 et #6 des QCM.

- [ ] **Étape 6.2 — `vzStoich`** (GRAPH, après les visuels précédents, avant « Point d'entrée unique ») — calcule les quantités FINALES depuis les coefficients (specs restent 100 % JSON) :

```js
/* ---------- PC (stoich) : emplacements A/B/C — barres à l'état final + réactif limitant (c) ---------- */
function vzStoich(spec,phase){
  const a=Math.max(1,spec.a||1),b=Math.max(1,spec.b||1),c=Math.max(1,spec.c||1);
  const nA=Math.max(0,spec.nA||0),nB=Math.max(0,spec.nB||0);
  const t=Math.min(nA/a,nB/b),fA=Math.max(0,nA-a*t),fB=Math.max(0,nB-b*t),fC=c*t;
  const mx=Math.max(1,nA,nB,fC);
  const base=158,top=38,bw=54,gap=34;
  let s=`<line x1="44" y1="${base}" x2="330" y2="${base}" class="vz-axis"/>`;
  const items=[["A",fA],["B",fB],["C",fC]];
  items.forEach((it,i)=>{
    const x=56+i*(bw+gap);
    s+=`<rect x="${x}" y="${top}" width="${bw}" height="${base-top}" fill="none" stroke="var(--line)"/>`;
    if(phase==="c"&&it[1]>0){
      const h=(base-top)*it[1]/mx;
      s+=`<rect x="${x}" y="${(base-h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" fill="var(--accent-soft)" stroke="var(--accent)"/>`;
      s+=`<text x="${x+bw/2}" y="${(base-h-6).toFixed(1)}" text-anchor="middle" class="vz-lbl-ans">${it[1]}</text>`;
    }
    s+=`<text x="${x+bw/2}" y="${base+16}" text-anchor="middle" class="vz-lbl">${it[0]}</text>`;
  });
  if(phase==="c"&&spec.limitant){
    const i=spec.limitant==="B"?1:(spec.limitant==="C"?2:0);
    const x=56+i*(bw+gap);
    s+=`<text x="${x+bw/2}" y="${top-8}" text-anchor="middle" class="vz-lbl-ans">limitant</text>`;
  }
  return vzWrap(s,"État final de la réaction"+(phase==="c"?" quantités restantes":" — emplacements A, B, C"));
}
```

- [ ] **Étape 6.3 — Déclarer `G_STOICH`** (après `G_MOLES`), **registre** (entrée `stoich`), **case** `case"stoich":return vzStoich(spec,phase);`
- [ ] **Étape 6.4 — Porte** : `node _cz_verify.js` → **VERT**.

---

### Tâche 7 — Thème `cinet` (Cinétique, 7 générateurs) + visuel `kin`

**Fichiers :** `index.html` (GENERATORS, GRAPH, registre, `VIZdraw`).
**Interfaces :** `SUBJECTS_PC += {id:"cinet",name:"Cinétique",sym:"v",gens:G_CINET}` ; kind `kin` `{n0,t95}`.
**Conventions** : n en **mmol**, t en **min** (chiffres lisibles).

- [ ] **Étape 7.1 — Familles** (contractuel — spec §5.7)

| # | lvl | Famille | Réponse | viz |
|---|---|---|---|---|
| 1 | facile | Vitesse moyenne v = \|Δn\|/Δt (valeurs propres) | number | `kin` {n0,t95} |
| 2 | facile | n(t95) = 0,05·n₀ (n₀ ∈ {2,4,5,8,10,20}) | number | — |
| 3 | moyen | « t(95 %) est-il atteint ? » (n₀ et n(t) donnés) | choice | — |
| 4 | moyen | Rôle du catalyseur (modifie la vitesse, pas l'état final) | choice | — |
| 5 | moyen | Vitesse moyenne sur un intervalle [t₁ ; t₂] | number | `kin` {n0,t95} |
| 6 | difficile | t(95 %) à partir d'une série n(t) dans le prompt | number | `kin` {n0,t95} |
| 7 | difficile | v = k·c (cinétique du 1ᵉʳ ordre, k et c propres) | number tol | — |

Exemple type — **famille #2** (n(t95)) :

```js
 {lvl:"facile",make(){
   const n0=pick([2,4,5,8,10,20]),ans=Math.round(n0*0.05*100)/100;
   return{prompt:`À l'initiale, n(A) = ${n0} mmol. Quelle est la quantité de matière n(A) à t(95 %) ? (en mmol)`,
     type:"number",answer:ans,
     explain:`À t(95 %), 95 % a réagi : il reste 5 % → n = 0,05 × ${n0} = <b>${String(ans).replace(".",",")} mmol</b>.`};
 }}
```

Les autres familles : nombres propres (sans `tol`) sauf #7 (`tol:0.011`) ; #3 et #4 des QCM.

- [ ] **Étape 7.2 — `vzKin`** (GRAPH, après les visuels précédents, avant « Point d'entrée unique »)

```js
/* ---------- PC (cinet) : décroissance — n₀, ligne 5 %, point t(95 %) en correction ---------- */
function vzKin(spec,phase){
  const n0=Math.max(0.1,spec.n0||1),t95=Math.max(0.5,spec.t95||4);
  const t1=t95*1.25,y1=n0*1.2;
  const {sx:X,sy:Y}=vzScale(0,t1,0,y1);
  const id="vzclip-"+phase;
  let s=vzAxes(0,t1,0,y1,X,Y);
  const f=t=>n0*Math.exp(-2.996*t/t95); /* n(t95) ≈ 0,05·n0 (−ln 20) */
  s+=`<g clip-path="url(#${id})"><path d="${vzCurve(f,0,t1,70,X,Y,0,y1)}" class="vz-curve" pathLength="1"/></g>`;
  if(phase==="c"){
    const y5=Y(0.05*n0);
    s+=`<line x1="${VZ.L}" y1="${y5.toFixed(1)}" x2="${VZ.R}" y2="${y5.toFixed(1)}" class="vz-leg"/>`;
    s+=`<text x="${VZ.R-4}" y="${(y5-5).toFixed(1)}" text-anchor="end" class="vz-lbl-ans">5 %</text>`;
    s+=`<line x1="${X(t95).toFixed(1)}" y1="${Y(0).toFixed(1)}" x2="${X(t95).toFixed(1)}" y2="${y5.toFixed(1)}" class="vz-leg"/>`;
    s+=`<circle cx="${X(t95).toFixed(1)}" cy="${y5.toFixed(1)}" r="4.5" class="vz-anspt"/>`;
    s+=`<text x="${X(t95).toFixed(1)}" y="${(Y(0)+18).toFixed(1)}" text-anchor="middle" class="vz-lbl-ans">t(95 %)</text>`;
    s+=`<text x="${VZ.L+4}" y="${(Y(n0)+14).toFixed(1)}" class="vz-lbl-ans">n₀</text>`;
  }
  return vzWrap(vzClip(id)+s,"Cinétique"+(phase==="c"?" avec t(95 %)":" — décroissance"));
}
```

- [ ] **Étape 7.3 — Déclarer `G_CINET`** (après `G_STOICH`), **registre** (entrée `cinet`), **case** `case"kin":return vzKin(spec,phase);`
- [ ] **Étape 7.4 — Porte** : `node _cz_verify.js` → **VERT** (les 7 thèmes PC complets).

---

### Tâche 8 — Finitions : doc projet + portes finales + checklist manuelle

**Fichiers :** `CLAUDE.md` (projet). `index.html` **ne doit plus changer** (tout bug détecté ici se corrige d'abord).

- [ ] **Étape 8.1 — `CLAUDE.md` du projet** : mettre à jour
  - « Projet » → l'app couvre **deux matières** (maths + physique-chimie) sur le même moteur.
  - « Structure d'index.html » → mentionner `SUBJECTS_MATH` / `SUBJECTS_PC`, `activeSubjects()`, `THEME_BY_ID`, `state.matiere` + `cz_subject`, `loadStats(key)` / `activeStatsKey()` / `cz_stats_pc`, `MAT_DATA`, le basculeur `data-mat`, et les 7 visuels PC (`vzRatio`/`vzProj`/`vzForce`/`vzBars`/`vzSoln`/`vzStoich`/`vzKin`) — en précisant que `vzScale` (helper maths, fonction) ≠ le kind `scale` (visuel PC → `vzRatio`).
  - « Tests » → sections [7] double registre + [8] régression de bascule.
  - **Garder** le reste (règles de Passer, stats, scoring, thème, fonts…).

- [ ] **Étape 8.2 — Portes finales** :

```bash
node _cz_verify.js
node -e 'const fs=require("fs"),vm=require("vm");[...fs.readFileSync("index.html","utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{new vm.Script(m[1]);console.log("bloc #"+(i+1)+" OK");});'
```

Attendu : tous verts + « bloc #1 OK » / « bloc #2 OK ».

- [ ] **Étape 8.3 — Checklist manuelle (navigateur, ~5 min)** — ouvrir `index.html` :
  1. Bascule Maths ↔ Physique-Chimie : textes héro, tuiles et stats changent bien ;
  2. Une session libre + un sprint + une révision dans **chacune** des deux matières ;
  3. « Passer » (Échap) dans les 3 modes ; points faibles et « À réviser » bien séparés par matière ;
  4. Record sprint maths ≠ record sprint PC ;
  5. Recharger la page → matière **et** thème restaurés ;
  6. Visuels PC : question (image neutre, sans réponse) et correction (complète) ;
  7. `prefers-reduced-motion` respecté (aucune animation parasite).

---

## Auto-revue du plan (faite à la rédaction)

- **Couverture spec** : §5.2 newton ✓ (T2) · §5.3 forces ✓ (T3) · §5.4 energie ✓ (T4) · §5.5 moles ✓ (T5) · §5.6 stoich ✓ (T6) · §5.7 cinet ✓ (T7) · §6 visuels proj/force/bars/soln/stoich/kin ✓ (T2–T7, `scale` déjà en T1) · §7 tests ✓ (portes + [7]/[8]) · §9 contraintes ✓ (contraintes globales) · §10 critères ✓ (8.2, 8.3).
- **Ancre réelle vérifiée** : helpers GRAPH (`vzScale`/`vzCurve`/`vzAxes`/`vzClip`/`vzWrap`/`VZ`), classes `.vz-*`, variables CSS, et helpers `F`/`fa`/`fr`/`gcd` existent avec les signatures utilisées par le code du plan.
- **Placeholders** : aucun « à faire plus tard » — chaque famille a sa formule, son type, sa réponse ; chaque visuel a son code complet.
- **Cohérence des noms** : `G_NEWTON`/`G_FORCES`/`G_ENERGIE`/`G_MOLES`/`G_STOICH`/`G_CINET`, `vzProj`/`vzForce`/`vzBars`/`vzSoln`/`vzStoich`/`vzKin`, ids `newton`/`forces`/`energie`/`moles`/`stoich`/`cinet`, kinds `proj`/`force`/`bars`/`soln`/`stoich`/`kin` — utilisés identiquement dans le code, le registre et le `switch` de `VIZdraw`.
- **Zéro régression maths** : aucune modification du moteur ni de `SUBJECTS_MATH` ; le test [8] (stats maths bit-à-bit inchangées) reste la garde.
