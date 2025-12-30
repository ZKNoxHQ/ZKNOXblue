# Ledger App Sideloader

A web-based tool for loading custom applications onto Ledger hardware wallets without using Ledger Live.

## Requirements

- **Browser**: Chrome 89+, Edge 89+, or Opera 76+ (WebHID required)
- **Device**: Ledger Nano S, Nano S Plus, Nano X*, Stax, or Flex
- **Mode**: Device must be in **Dashboard mode** (main menu, no app open)

> ⚠️ *Nano X has sideloading restrictions in recent firmware versions

## Quick Start

### 1. Setup

```bash
# Extract the archive
unzip ledgerjs.zip -d ledgerjs
cd ledgerjs

# Install dependencies
npm install

# Start local server (choose one)
npx serve .
# or
python3 -m http.server 8080
# or
php -S localhost:8080
```

### 2. Open Sideloader

Navigate to: `http://localhost:8080/sideloader.html`

> ⚠️ **HTTPS or localhost required** - WebHID only works on secure origins

### 3. Connect Your Device

1. Connect your Ledger via USB
2. Unlock with PIN
3. Stay on the **Dashboard** (main menu) - don't open any app
4. Select your device type in the dropdown
5. Click **Connect Device**
6. Approve the browser popup to select your Ledger

### 4. Load Your Application

1. **App Name**: Enter the name to display on device (e.g., "MyApp")
2. **App Version**: Optional version string (e.g., "1.0.0")
3. **HEX File**: Upload your `.hex` file or paste the content directly
4. **Curves**: Comma-separated list of allowed curves:
   - `secp256k1` - Bitcoin, Ethereum
   - `secp256r1` - FIDO, some altcoins
   - `ed25519` - Solana, Cardano, etc.
   - `bls12381g1` - Ethereum 2.0
5. **BIP32 Paths**: Comma-separated derivation paths (e.g., `44'/60'/0'`)
6. Click **Load Application**
7. **Confirm on your device** when prompted

## Interface Overview

```
┌─────────────────────────────────────────────────────────┐
│  🔧 Ledger App Sideloader                               │
├─────────────────────────────────────────────────────────┤
│  1. Connect Device                                      │
│     [Device Type ▼]  [Connect] [Disconnect]             │
├─────────────────────────────────────────────────────────┤
│  2. Application Details                                 │
│     App Name: [____________]  Version: [______]         │
│     HEX File: [Choose File]                             │
│     Curves:   [secp256k1__]   Paths: [44'/60'/0']       │
│     ☑ Delete existing app first                         │
├─────────────────────────────────────────────────────────┤
│  3. Load Application                                    │
│     [📦 Load App]  [🗑️ Delete]  [📋 List Apps]          │
├─────────────────────────────────────────────────────────┤
│  Log                                                    │
│  [09:15:32] WebHID supported ✓                          │
│  [09:15:45] Device connected!                           │
│  [09:15:50] Loading application...                      │
│  [09:15:55] ✅ Application loaded successfully!         │
└─────────────────────────────────────────────────────────┘
```

## Building Your App

Your application must be compiled to Intel HEX format. The typical build output from the Ledger SDK is a `.hex` file.

### Example HEX File Structure

```
:020000040800F2           <- Extended address (0x0800xxxx)
:1000000000200020ED00...  <- Code data
:04000005080000ED02       <- Boot address (0x080000ED)
:00000001FF               <- End of file
```

### From Ledger SDK

```bash
# Build your app
make

# The output is in bin/app.hex
cat bin/app.hex
```

## Common Operations

### Load a New App

1. Connect device
2. Fill in app details
3. Check "Delete existing app first"
4. Click **Load Application**
5. Confirm on device

### Update an Existing App

1. Connect device
2. Use the same app name
3. Check "Delete existing app first"
4. Click **Load Application**
5. Confirm deletion, then installation

### Delete an App

1. Connect device
2. Enter the app name to delete
3. Click **Delete App**
4. Confirm on device

### List Installed Apps

1. Connect device
2. Click **List Apps**
3. View the list in the log

## Parameters Reference

| Parameter | Required | Description |
|-----------|----------|-------------|
| Device Type | Yes | Select your Ledger model |
| App Name | Yes | Name displayed on device (max ~32 chars) |
| App Version | No | Version string (e.g., "1.0.0") |
| HEX File | Yes | Intel HEX format application binary |
| Curves | No | Allowed elliptic curves (default: all) |
| BIP32 Paths | No | Allowed derivation paths |
| Icon | No | Hex-encoded icon data |
| Data Size | No | NVRAM storage size in bytes |
| App Flags | No | 0=normal install, 2=upgrade |

## Target Device IDs

| Device | Target ID | Notes |
|--------|-----------|-------|
| Nano S | `0x31100004` | Legacy, limited memory |
| Nano S Plus | `0x33100004` | Recommended for development |
| Nano X | `0x33000004` | May have sideload restrictions |
| Stax | `0x33200004` | Touchscreen device |
| Flex | `0x33300004` | Latest touchscreen device |

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `6985` | Conditions not satisfied / Denied | User rejected on device - try again and approve |
| `6982` | Security status not satisfied | Re-establish secure channel |
| `6a84` | Not enough memory | Delete other apps to free space |
| `6a85` | Not enough memory | Delete other apps to free space |
| `6e01` | CLA not supported | Device not in dashboard mode |
| `5515` | Device locked | Unlock device with PIN |
| `5501` | App not found | App doesn't exist (for delete) |
| `5120` | Sideload disabled | Nano X firmware restriction |

## Troubleshooting

### "WebHID not supported"
- Use Chrome, Edge, or Opera (Firefox doesn't support WebHID)
- Ensure you're on HTTPS or localhost

### "No device found"
- Check USB connection
- Unlock device with PIN
- Stay on dashboard (don't open any app)
- Try a different USB port/cable

### "Connection failed"
- Close Ledger Live (it may be using the device)
- Disconnect and reconnect the device
- Refresh the page and try again

### "6e01 - CLA not supported"
- Return to dashboard mode
- Don't have any app open
- The device must show the main menu

### "6985 - Conditions not satisfied"
- Approve the action on your device
- Check the device screen for prompts

### "Not enough memory"
- Delete unused apps via Ledger Live or the Delete button
- Some apps are large; check available space

### Load succeeds but app doesn't appear
- The app may need specific permissions
- Try disconnecting and reconnecting
- Check if the app name is correct

## Security Notes

- **Sideloaded apps are not signed by Ledger** - The device will show a warning
- **Development mode**: Some devices need developer mode enabled
- **No warranty**: Sideloaded apps are at your own risk
- **Secure channel**: All communication is encrypted with ECDH

## Programmatic API

```javascript
import { TransportWebHID, loadApp, TARGET_IDS } from './index.js';

// Connect to device
const transport = await TransportWebHID.request(true);

try {
    // Load application
    const hash = await loadApp(transport, {
        targetId: TARGET_IDS.NANO_S_PLUS,
        fileName: hexContent,
        appName: 'MyApp',
        appVersion: '1.0.0',
        curves: ['secp256k1'],
        paths: ["44'/60'/0'"],
        delete: true,
        debug: true
    });
    
    console.log('Success! Hash:', hash);
} finally {
    await transport.close();
}
```

## File Structure

```
ledgerjs/
├── sideloader.html      # Web UI
├── index.js             # Main exports
├── src/
│   ├── transport.js     # WebHID communication
│   ├── deployed.js      # Secure channel (SCP)
│   ├── hexLoader.js     # App loading protocol
│   ├── hexParser.js     # Intel HEX parser
│   ├── loadApp.js       # High-level API
│   ├── ecWrapper.js     # ECDSA/ECDH crypto
│   └── ...
├── examples/
│   └── load_example.js  # Usage examples
└── test/
    └── ...              # Unit tests
```

## License

Apache-2.0 (same as original ledgerblue)

## Credits

JavaScript port of [LedgerHQ/blue-loader-python](https://github.com/LedgerHQ/blue-loader-python)
