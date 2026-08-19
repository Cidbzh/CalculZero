"""Rend ``.html`` parsable par code-review-graph.

Le paquet ``code-review-graph`` sait extraire les blocs ``<script>`` d'un
fichier (chemin Vue/Svelte : ``parser.py -> _parse_svelte``), mais
``.html`` n'est pas dans sa carte d'extensions. Ce script ajoute la ligne

    ".html": "svelte",

au dictionnaire ``EXTENSION_TO_LANGUAGE`` de
``site-packages/code_review_graph/parser.py`` (le langage "svelte" est là
uniquement pour déclencher l'extraction des blocs <script> ; le JS est
re-parsé avec le vrai parser JavaScript).

Le script est **idempotent** : le rejouer après un
``pip install --upgrade code-review-graph`` ré-applique le patch si le
réinstallateur l'a écrasé, et se tait si c'est déjà fait.

Usage :
    python _crg_patch_html.py
"""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

try:
    import code_review_graph.parser as crg_parser
except ImportError:
    sys.exit("code-review-graph n'est pas installé (pip install code-review-graph)")

PATCH = '    ".html": "svelte",'
ANCHOR = re.compile(r'("(\.svelte|\.vue)": "(svelte|vue)",)')

src_path = Path(crg_parser.__file__).resolve()
src = src_path.read_text(encoding="utf-8")

if PATCH.strip() in src:
    print("déjà patché — rien à faire.")
else:
    m = ANCHOR.search(src)
    if m is None:
        sys.exit(
            "point d'ancrage introuvable (\".svelte\": \"svelte\", dans "
            "EXTENSION_TO_LANGUAGE) — la structure a peut-être changé avec "
            "la nouvelle version ; vérifier parser.py à la main."
        )
    src = src[: m.end()] + "\n" + PATCH + src[m.end():]
    src_path.write_text(src, encoding="utf-8")
    print(f"patch appliqué : {src_path}")

# --- auto-vérification -----------------------------------------------------
# index.html (fragment : <script> au niveau racine) doit produire de
# nombreuses fonctions JS une fois le patch actif.
root = Path(__file__).resolve().parent
index = root / "index.html"
if not index.exists():
    print("index.html absent — vérification de syntaxe uniquement.")
    sys.exit(0)

# Reload du module pour être sûr d'utiliser le patch (processus neuf ici,
# mais la ligne sert de garde-fou si le script est lancé dans un
# interpréteur qui avait déjà importé le module).
import importlib  # noqa: E402

importlib.reload(crg_parser)
parser = crg_parser.CodeParser(root)
nodes, edges = parser.parse_file(index)
kinds = Counter(n.kind for n in nodes)
print(f"auto-test : {len(nodes)} nœuds, {len(edges)} arêtes ({dict(kinds)})")
fns = [n.name for n in nodes if n.kind == "Function"]
for probe in ("checkAnswer", "startFree", "renderQ"):
    print(f"  fonction {probe!r} : {'trouvée' if probe in fns else 'ABSENTE'}")
if kinds.get("Function", 0) < 100 or "checkAnswer" not in fns:
    sys.exit("⚠️  extraction anormalement faible — le patch ne passe pas le test.")
print("OK — index.html est maintenant parsé (blocs <script> -> fonctions JS).")
