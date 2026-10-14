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

- 📱 **WebHID / Web Bluetooth** - Works directly in Chrome/Edge browsers
- 🔐 **HSM-Backed Security** - Apps are signed using ZKNOX's secure infrastructure
- ⚡ **Fast Installation** - Streamlined installation process
- 📶 **Bluetooth** - Connect a Nano X, Stax or Flex over Web Bluetooth (USB by default)
- 🔍 **Firmware Check** - Shows the device firmware; updates are done with ZKNOX Orange (zknox.com/sideloader.html)

## Usage

1. Open `official-apps.html` in Chrome or Edge
2. Click **Connect Device**
3. Select your Ledger device
4. Choose an application to install
5. Confirm on your device

### Bluetooth

Click **Connect Bluetooth** instead of **Connect Ledger (USB)**: device on the dashboard, Bluetooth on, confirm the pairing on the device. Chrome/Edge only, https or localhost; on Linux BlueZ must be running.

### Firmware

Firmware update and bootloader recovery live in ZKNOX Orange (`sideloader.html`, section Firmware).

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
