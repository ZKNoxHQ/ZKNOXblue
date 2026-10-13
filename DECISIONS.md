# DECISIONS

## ADR-001 — Build reproductible depuis les sources committées (2026-09-16)

**Contexte.** Le dépôt ne contenait ni `package.json`, ni lockfile, ni `src/index.js` : `dist/ledgerjs.bundle.js` n'était pas reconstructible depuis un clone neuf. Même défaut que sur ZKNOXorange.

**Décision.** `package.json` avec versions exactes, `package-lock.json` committé, installation par `npm ci`. `dist/` reste committé car servi tel quel par le site, mais doit toujours sortir de `npm ci && npm run build` sans diff. `@noble` reste en 1.x/2.x (imports `@noble/hashes/sha256` sans `.js`) ; migration vers 2.x/3.x à traiter séparément.

**Conséquence.** Tout changement de `src/` s'accompagne du rebuild et du commit de `dist/` ; un clone neuf suivi du build doit laisser `git status` vide.

## ADR-002 — Mise à jour de firmware : proxy APDU vers le scriptrunner Ledger, séquence de Ledger Live (2026-10-13)

**Contexte.** `official-apps.html` installe les apps via le scriptrunner de Ledger mais renvoyait vers Ledger Live pour le firmware. Une tentative précédente a détruit des appareils : le code envoyait `/update/mcu?version=<version du bootloader>`, n'attendait pas la ré-énumération USB entre les étapes et utilisait un timeout de 30 s sur un APDU bloqué sur la confirmation à l'écran.

**Décision.** Porter la logique de `@ledgerhq/live-common` (34.51) telle quelle, sans dépendance npm (rxjs, Buffer, semver remplacés par ~500 lignes), dans `src/firmwareUpdater.js`. Le HSM reste la seule source des blobs : la page ne fait que relayer les APDU. Choix de MCU calqué sur `retrieveMcuVersion`/`getFlashMcuOrBootloaderDetails` (filtre provider + `from_bootloader_version !== 'none'` + `final.mcu_versions`, meilleur par semver ; bootloader flashé d'abord s'il ne correspond pas). Reconnexion : polling silencieux de `navigator.hid.getDevices()` puis modale avec geste utilisateur (le bootloader/OSU change de productId, WebHID exige un nouveau `requestDevice`). La réparation suit `firmwareUpdate-repair` (branche `seVersion`/`seTargetId`), avec la version de bootloader tronquée à 3 composantes comme dans le flux de mise à jour.

**Conséquence.** Le code est testé en boucle fermée (faux scriptrunner ws + `TransportMock`) mais pas encore sur matériel : premier essai à faire sur un Nano S+ sacrifiable, avec `DEBUG` de `ledger-live deviceSDKFirmwareUpdate` comme référence si l'HSM répond `error`. Toute divergence de protocole se corrige dans `firmwareUpdater.js`, jamais dans la page.
