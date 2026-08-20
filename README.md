# Quizio

Application d'entraînement de Première — **trois matières sur le même moteur** : maths (spécialité), physique-chimie et allemand (A2, QCM).

## Démarrage

Aucun build, aucune dépendance, aucun serveur : **ouvrez `index.html` dans un navigateur**. L'application fonctionne hors ligne (les Google Fonts ont des stacks de repli).

## Fonctionnalités

- **Trois matières** (basculeur Maths / Physique-Chimie / Allemand) avec stats indépendantes :
  - Maths — 10 thèmes : dérivées, suites, logarithme & exponentielle, équations du second degré, trigonométrie, probabilités, vecteurs, fonctions affines, limites, variations ;
  - Physique-chimie — 9 thèmes : cosmétrie, lois de Newton, forces, énergie, moles, stœchiométrie, cinétique chimique, ondes & lumière, électricité ;
  - Allemand (A2) — 6 thèmes, 100 % QCM : vocabulaire, conjugaison, articles, nombres/dates/heures, phrases utiles, mini-traductions (sprint désactivé).
- **Générateurs aléatoires** : chaque question est générée à l'affichage (aucune banque fixe), avec correction détaillée et mini-visuels SVG (tangente, parabole, cercle unité, forces, circuits, ondes…).
- **Trois modes** : entraînement libre, sprint 60 s (points + séries 🔥), révision (questions à refaire).
- **Points faibles** : détection des cellules thème × niveau les moins précises, avec entraînement ciblé.
- **Statistiques persistées** (localStorage) par matière : précision par thème, meilleures séries, historique des 100 dernières réponses, liste à réviser. Clés préfixées `qz_*` — les anciennes clés `cz_*` (époque CalculZéro) sont migrées automatiquement à l'ouverture.
- **Thème** Auto / Clair / Sombre, respect de `prefers-reduced-motion`, confettis de fin de session.

## Structure du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | L'application complète (~3 000 lignes : HTML + CSS + JS, sections balisées) |
| `_qz_verify.js` | Vérification fonctionnelle complète (compilation des 2 blocs `<script>` + tests sur DOM factice) |
| `_crg_patch_html.py` | Patch idempotent de `code-review-graph` pour parser le HTML (rejouer après mise à jour du paquet) |
| `CLAUDE.md` | Guide du projet (structure, conventions, règles à respecter, notes de revue) |
| `docs/superpowers/` | Spécifications et plans de conception (physique-chimie, allemand) — documents historiques |
| `.claude/skills/` | Skills projet : `/debug-issue`, `/explore-codebase`, `/refactor-safely`, `/review-changes` |

## Vérification

```bash
node _qz_verify.js
```

Compile les deux blocs `<script>` (anti-flash + principal) via `vm`, puis teste : thème et persistance (dont le fallback anti-flash sur l'ancienne clé `cz_theme`), confettis, chaque générateur des **trois** registres lancé 25× (forme de question, auto-cohérence de la correction, contrat QCM — bonne réponse jamais en position fixe, rendu des visuels en phases question/correction, round-trip JSON du mode révision), régression de bascule de matière (les stats d'une matière n'écrivent jamais la clé d'une autre — maths + PC + allemand), câblage du basculeur à 3 boutons, le cycle de vie de l'animation d'arrivée, et la migration des clés historiques `cz_*` vers `qz_*`.
