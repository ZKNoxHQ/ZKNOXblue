# VERSION

## 1.0.0 — 2026-09-16
- Ajout de `package.json`, `package-lock.json` et `src/index.js`, absents du dépôt : `npm ci && npm run build` fonctionne depuis un clone neuf.
- `src/index.js` reconstruit depuis les exports du bundle de prod (`bytesToHex`/`hexToBytes` exportés depuis `hexParser.js`, ordre des modules conservé).
- Dépendances épinglées sur les versions qui reproduisent le bundle de prod : `@noble/hashes` 1.8.0, `@noble/secp256k1` 2.3.0, `esbuild` 0.27.7.
- `dist/` reconstruit : seul écart avec la prod, le message d'erreur 0x5214 (Custom CA) déjà présent dans `src/commException.js`.
- `.gitignore` : `node_modules/`.
