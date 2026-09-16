# DECISIONS

## ADR-001 — Build reproductible depuis les sources committées (2026-09-16)

**Contexte.** Le dépôt ne contenait ni `package.json`, ni lockfile, ni `src/index.js` : `dist/ledgerjs.bundle.js` n'était pas reconstructible depuis un clone neuf. Même défaut que sur ZKNOXorange.

**Décision.** `package.json` avec versions exactes, `package-lock.json` committé, installation par `npm ci`. `dist/` reste committé car servi tel quel par le site, mais doit toujours sortir de `npm ci && npm run build` sans diff. `@noble` reste en 1.x/2.x (imports `@noble/hashes/sha256` sans `.js`) ; migration vers 2.x/3.x à traiter séparément.

**Conséquence.** Tout changement de `src/` s'accompagne du rebuild et du commit de `dist/` ; un clone neuf suivi du build doit laisser `git status` vide.
