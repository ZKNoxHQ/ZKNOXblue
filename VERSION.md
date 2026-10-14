# VERSION

## 1.2.0 — 2026-10-14
- Nouveau module `src/firmwareUi.js` (`FirmwareUi`, exporté dans le bundle) : toute la glu des boutons firmware (check, update, bootloader recovery, modale de reconnexion, verrouillage des boutons, rafraîchissement du panneau device) sort de la page. `official-apps.html` ne contient plus qu'une instanciation de `FirmwareUi` avec les callbacks de la page (`log`, `updateProgress`, `showProgress`, `onDeviceInfo`).
- Le script de `official-apps.html` est désormais identique à celui de la page `official-apps.html` du site zknox.com, au chemin du bundle près : une évolution du moteur arrive sur le site par un bump de submodule, sans reporter de code.
- `dist/` reconstruit.

## 1.1.1 — 2026-10-13
- Mise à jour de firmware validée sur Nano S+ (flux OSU → MCU).
- `repair()` : le SE rapporté par le bootloader peut être `x.y.z-osu` (mise à jour interrompue après l'OSU) ; `get_firmware_version` renvoyait alors 404 et la réparation échouait → nouvelle `finalFirmwareForSe()` qui retombe sur `get_osu_version` puis `firmware_final_versions/<next>`. Après sortie du bootloader, si le SE est encore en OSU, fin de la mise à jour (firmware final si l'API en fournit un, sinon attente du reboot).
- `repair()` : branche sans info SE (vieux bootloaders) comparait `majMin` à `from_bootloader_version` à 4 composantes (jamais égal, bug hérité de live-common) → comparaison sur versions normalisées.
- Page, « Bootloader Recovery » : un transport ouvert sur le dashboard est périmé une fois le device rebranché en bootloader (autre productId) ; il est sondé par GET_VERSION et ré-appairé en cas d'échec. Réponse GET_VERSION brute loggée. Message explicite quand le device n'est pas en bootloader (marche à suivre bouton gauche).
- `dist/` reconstruit.

## 1.1.0 — 2026-10-13
- Mise à jour de firmware sans Ledger Live : nouveau module `src/firmwareUpdater.js` (port de `@ledgerhq/live-common` 34.51 : `socket`, `deviceSDK/tasks/updateFirmware`, `hw/firmwareUpdate-main`, `hw/firmwareUpdate-repair`, `parseGetVersionResponse`, `getLatestFirmwareForDevice`), exporté dans le bundle.
- Séquence exacte de Ledger Live : OSU via `/update/install` (triplet OSU) → reconnexion → si `shouldFlashMCU` (MCU courant absent de `final.mcu_versions`) boucle bootloader/MCU via `/update/mcu` avec `version = mcu.name` si le bootloader est déjà `from_bootloader_version`, sinon `from_bootloader_version` tronqué à 3 composantes → firmware final via `/update/install` (triplet final) uniquement si l'API renvoie `final.firmware` non vide.
- Page : « Check Firmware » alimente désormais un contexte de mise à jour et bascule le bouton en « Update Firmware » ; l'ancien `updateFirmware` (jamais atteignable, et qui envoyait la version du bootloader comme version de MCU) est supprimé ; nouveau bouton « Bootloader Recovery » (port de la réparation Ledger Live) ; `selectDeviceType`/`parseBootloaderInfo` supprimés (le SE targetId est lu dans la réponse GET_VERSION du bootloader).
- Transport WebHID : écoute `navigator.hid` `disconnect` et échoue immédiatement l'échange en cours au lieu d'attendre le timeout ; `sendReport` qui échoue lève `CommException('Device disconnected')` ; le timeout par APDU est paramétrable (15 min pour les APDU bloqués sur une confirmation à l'écran : canal sécurisé `e051`, dernier APDU du bulk).
- Protocole scriptrunner aligné sur live-common : le socket est fermé côté client dès réception du `bulk`, les chaînes vides du bulk sont ignorées, les erreurs device sont relayées avec `response:'error'` et les données du status word, `e051` refusé → abandon.
- `dist/` reconstruit.

## 1.0.0 — 2026-09-16
- Ajout de `package.json`, `package-lock.json` et `src/index.js`, absents du dépôt : `npm ci && npm run build` fonctionne depuis un clone neuf.
- `src/index.js` reconstruit depuis les exports du bundle de prod (`bytesToHex`/`hexToBytes` exportés depuis `hexParser.js`, ordre des modules conservé).
- Dépendances épinglées sur les versions qui reproduisent le bundle de prod : `@noble/hashes` 1.8.0, `@noble/secp256k1` 2.3.0, `esbuild` 0.27.7.
- `dist/` reconstruit : seul écart avec la prod, le message d'erreur 0x5214 (Custom CA) déjà présent dans `src/commException.js`.
- `.gitignore` : `node_modules/`.
