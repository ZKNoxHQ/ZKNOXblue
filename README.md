# ZKNOX Blue

**Secure Ledger App Installer** - Install official Ledger applications using ZKNOX's HSM infrastructure.

## Overview

ZKNOX Blue provides a web-based interface for installing official Ledger applications on your hardware wallet. It uses ZKNOX's secure HSM (Hardware Security Module) to sign and deploy apps, providing an alternative to Ledger Live.

## Supported Devices

- Ledger Nano S Plus
- Ledger Nano X
- Ledger Flex
- Ledger Stax

## Features

- 📱 **WebHID Support** - Works directly in Chrome/Edge browsers
- 🔐 **HSM-Backed Security** - Apps are signed using ZKNOX's secure infrastructure
- ⚡ **Fast Installation** - Streamlined installation process
- 🔍 **Firmware Check / Update** - Check and install firmware updates through Ledger's HSM, without Ledger Live
- 🛠️ **Bootloader Recovery** - Repair a device stuck on "Bootloader" (plug it holding the left button)

## Usage

1. Open `official-apps.html` in Chrome or Edge
2. Click **Connect Device**
3. Select your Ledger device
4. Choose an application to install
5. Confirm on your device

### Firmware update

1. **Check Firmware**: the page asks Ledger's manager API for the next firmware and whether the MCU must be flashed.
2. **Update Firmware**: OSU install (confirm on the device), reboot, optional bootloader/MCU flashes, final firmware. The device re-enumerates after each reboot; when the page cannot re-open it silently it asks you to click **Reconnect Ledger** (WebHID needs a user gesture). Never unplug the device during a flash.
3. If the device ends up on "Bootloader": unplug it, plug it back while holding the left button, then **Bootloader Recovery**.

Same endpoints and same sequence as Ledger Live (`@ledgerhq/live-common` `updateFirmwareTask` / `firmwareUpdate-repair`), see `src/firmwareUpdater.js`.

## Requirements

- Chrome 89+ or Edge 89+ (WebHID support)
- Ledger device with recent firmware
- Device unlocked and on dashboard

## Files

```
zknox-blue/
├── official-apps.html    # Main application
├── dist/
│   └── ledgerjs.bundle.js
├── src/                  # Source modules
├── zknox-logo.png
├── zknox-blue.jpg
└── README.md
```

## Security

ZKNOX Blue installs **official Ledger applications** only. All apps are verified and signed through Ledger's HSM infrastructure, ensuring the same security level as Ledger Live.

## Links

- Website: [zknox.com](https://zknox.com)
- ZKNOX Orange (Sideloader): For development/custom apps

## License

© 2025 ZKNOX. All rights reserved.
