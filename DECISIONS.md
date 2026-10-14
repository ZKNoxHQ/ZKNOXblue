# DECISIONS

## ADR-001 — Build reproductible depuis les sources committées (2026-09-16)

**Contexte.** Le dépôt ne contenait ni `package.json`, ni lockfile, ni `src/index.js` : `dist/ledgerjs.bundle.js` n'était pas reconstructible depuis un clone neuf. Même défaut que sur ZKNOXorange.

**Décision.** `package.json` avec versions exactes, `package-lock.json` committé, installation par `npm ci`. `dist/` reste committé car servi tel quel par le site, mais doit toujours sortir de `npm ci && npm run build` sans diff. `@noble` reste en 1.x/2.x (imports `@noble/hashes/sha256` sans `.js`) ; migration vers 2.x/3.x à traiter séparément.

**Conséquence.** Tout changement de `src/` s'accompagne du rebuild et du commit de `dist/` ; un clone neuf suivi du build doit laisser `git status` vide.

## ADR-002 — Mise à jour de firmware : proxy APDU vers le scriptrunner Ledger, séquence de Ledger Live (2026-10-13)

**Contexte.** `official-apps.html` installe les apps via le scriptrunner de Ledger mais renvoyait vers Ledger Live pour le firmware. Une tentative précédente a détruit des appareils : le code envoyait `/update/mcu?version=<version du bootloader>`, n'attendait pas la ré-énumération USB entre les étapes et utilisait un timeout de 30 s sur un APDU bloqué sur la confirmation à l'écran.

**Décision.** Porter la logique de `@ledgerhq/live-common` (34.51) telle quelle, sans dépendance npm (rxjs, Buffer, semver remplacés par ~500 lignes), dans `src/firmwareUpdater.js`. Le HSM reste la seule source des blobs : la page ne fait que relayer les APDU. Choix de MCU calqué sur `retrieveMcuVersion`/`getFlashMcuOrBootloaderDetails` (filtre provider + `from_bootloader_version !== 'none'` + `final.mcu_versions`, meilleur par semver ; bootloader flashé d'abord s'il ne correspond pas). Reconnexion : polling silencieux de `navigator.hid.getDevices()` puis modale avec geste utilisateur (le bootloader/OSU change de productId, WebHID exige un nouveau `requestDevice`). La réparation suit `firmwareUpdate-repair` (branche `seVersion`/`seTargetId`), avec la version de bootloader tronquée à 3 composantes comme dans le flux de mise à jour.

**Conséquence.** Le code est testé en boucle fermée (faux scriptrunner ws + `TransportMock`) mais pas encore sur matériel : premier essai à faire sur un Nano S+ sacrifiable, avec `DEBUG` de `ledger-live deviceSDKFirmwareUpdate` comme référence si l'HSM répond `error`. Toute divergence de protocole se corrige dans `firmwareUpdater.js`, jamais dans la page.

## ADR-003 — Une seule page, la logique dans le bundle (2026-10-14)

**Contexte.** `official-apps.html` existait en deux versions divergentes : celle de ce dépôt (autonome) et celle du site zknox.com (re-stylée avec `styles.css`/`nav.js`). La mise à jour de firmware (ADR-002) n'était que dans la première ; chaque évolution devait être reportée à la main.

**Décision.** Le dépôt moteur fournit tout le comportement via le bundle (`FirmwareUpdater` pour la logique, `FirmwareUi` pour la glu DOM), paramétré par des callbacks et des ids de boutons. Les pages ne gardent que le HTML, le style et le branchement. Le site consomme ce dépôt en submodule `zknox-blue/` et sa page diffère uniquement par le chemin du bundle. Même règle à appliquer à ZKNOXorange / `sideloader.html`.

**Conséquence.** Toute logique ajoutée dans une page est un défaut : elle va dans `src/` et est exportée. Le diff entre les scripts des deux pages doit rester limité à la ligne d'import.

## ADR-004 — Firmware chez Orange, Blue reste l'installeur d'apps (2026-10-14)

**Contexte.** ADR-002/003 avaient mis la mise à jour de firmware dans Blue. Demande de la déplacer vers Orange, l'outil « développeur » du site, qui a déjà le transport Bluetooth et la sélection USB/Bluetooth.

**Décision.** Blue ne fait que ce que son nom dit : apps officielles via le HSM, en USB ou en Bluetooth. Le moteur firmware (updater + glu UI, ADR-002/003) vit dans ZKNOXorange et la page `sideloader.html` du site. `transportBle.js` est copié d'Orange, comme le sont déjà `transport.js`, `hexParser.js`, `ledgerWrapper.js` : les deux dépôts restent indépendants, la synchronisation de ces modules partagés se fait par copie.

**Conséquence.** Toute correction sur un module partagé doit être reportée dans l'autre dépôt dans la même journée. Une factorisation en paquet commun reste possible si la liste des modules copiés s'allonge.
