# CalculZéro

Application d'entraînement au calcul mental de Première — **deux matières sur le même moteur** : maths (spécialité) et physique-chimie.

## Démarrage

Aucun build, aucune dépendance, aucun serveur : **ouvrez `index.html` dans un navigateur**. L'application fonctionne hors ligne (les Google Fonts ont des stacks de repli).

## Fonctionnalités

- **Deux matières** (basculeur Maths / Physique-Chimie) avec stats indépendantes :
  - Maths — 10 thèmes : dérivées, suites, logarithme & exponentielle, équations du second degré, trigonométrie, probabilités, vecteurs, fonctions affines, limites, variations ;
  - Physique-chimie — 9 thèmes : cosmétrie, lois de Newton, forces, énergie, moles, stœchiométrie, cinétique chimique, ondes & lumière, électricité.
- **Générateurs aléatoires** : chaque question est générée à l'affichage (aucune banque fixe), avec correction détaillée et mini-visuels SVG (tangente, parabole, cercle unité, forces, circuits, ondes…).
- **Trois modes** : entraînement libre, sprint 60 s (points + séries 🔥), révision (questions à refaire).
- **Points faibles** : détection des cellules thème × niveau les moins précises, avec entraînement ciblé.
- **Statistiques persistées** (localStorage) par matière : précision par thème, meilleures séries, historique des 100 dernières réponses, liste à réviser.
- **Thème** Auto / Clair / Sombre, respect de `prefers-reduced-motion`, confettis de fin de session.

## Structure du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | L'application complète (~2 600 lignes : HTML + CSS + JS, sections balisées) |
| `_cz_verify.js` | Vérification fonctionnelle complète (compilation des 2 blocs `<script>` + tests sur DOM factice) |
| `_crg_patch_html.py` | Patch idempotent de `code-review-graph` pour parser le HTML (rejouer après mise à jour du paquet) |
| `CLAUDE.md` | Guide du projet (structure, conventions, règles à respecter, notes de revue) |
| `docs/superpowers/` | Spécification et plan de conception de la matière physique-chimie |
| `.claude/skills/` | Skills projet : `/debug-issue`, `/explore-codebase`, `/refactor-safely`, `/review-changes` |

## Vérification

```bash
node _cz_verify.js
```

Compile les deux blocs `<script>` (anti-flash + principal) via `vm`, puis teste : thème et persistance, confettis, chaque générateur des deux registres lancé 25× (forme de question, auto-cohérence de la correction, rendu des visuels en phases question/correction, round-trip JSON du mode révision), régression de bascule de matière (les stats PC n'écrivent jamais la clé maths), câblage du basculeur, et le cycle de vie de l'animation d'arrivée.
