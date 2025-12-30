# Ledger App Sideloader

A web-based tool for loading custom applications onto Ledger hardware wallets without going through Ledger Live.

## Requirements

- **Browser**: Chrome 89+, Edge 89+, or Opera 76+ (WebHID support required)
- **Device**: Ledger Nano S, Nano S Plus, Nano X*, Stax, or Flex
- **Mode**: Device must be in **Dashboard mode** (main menu, no app open)
- **Connection**: USB cable (not Bluetooth)

> *Note: Nano X has restrictions on sideloading in recent firmware versions.

## Quick Start

### 1. Setup

```bash
# Extract the archive
unzip ledgerjs.zip -d ledgerjs
cd ledgerjs

# Install dependencies
npm install

# Start a local web server (choose one)
npx serve .
# or
python3 -m http.server 8080
# or
php -S localhost:8080
```

### 2. Open the Sideloader

Navigate to:
```
http://localhost:8080/sideloader.html
```

> ⚠️ **Important**: WebHID requires either `localhost` or `https://`. It won't work on `file://` URLs.

### 3. Prepare Your Device

1. Connect your Ledger via USB
2. Enter your PIN
3. Stay on the **Dashboard** (main menu with app icons)
4. Do NOT open any app

### 4. Load Your Application

1. **Select Device Type** - Choose your Ledger model from the dropdown
2. **Connect** - Click "Connect Device" and select your Ledger in the browser popup
3. **Enter App Details**:
   - **App Name**: The name shown on device (e.g., "MyApp")
   - **App Version**: Version string (e.g., "1.0.0")
   - **HEX File**: Upload your compiled `.hex` file or paste content directly
4. **Configure Options** (optional):
   - **Curves**: Cryptographic curves your app uses
   - **BIP32 Paths**: Derivation paths your app can access
   - **Icon**: Hex-encoded icon data
5. **Load** - Click "Load Application"
6. **Confirm on Device** - Your Ledger will ask you to confirm the installation

## Application Parameters

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| App Name | Name displayed on device | `MyWallet` |
| HEX File | Intel HEX format binary | Upload `.hex` file |

### Optional Fields

| Field | Description | Default |
|-------|-------------|---------|
| App Version | Version string | `1.0.0` |
| Curves | Allowed cryptographic curves | All curves |
| BIP32 Paths | Derivation paths app can access | None (unrestricted) |
| Icon | NBGL icon in hex format | None |
| Data Size | NVRAM storage size in bytes | `0` |
| App Flags | `0`=normal install, `2`=upgrade | `0` |
| Delete First | Remove existing app before install | Checked |

### Supported Curves

| Curve | Value | Use Case |
|-------|-------|----------|
| `secp256k1` | Bitcoin/Ethereum curve | BTC, ETH, most chains |
| `secp256r1` | NIST P-256 | WebAuthn, some chains |
| `ed25519` | Edwards curve | Solana, Cardano, etc. |
| `bls12381g1` | BLS curve | Ethereum 2.0 |

### BIP32 Path Format

Paths use standard BIP32 notation:
- `44'` = hardened derivation at index 44
- `60'` = hardened derivation at index 60 (Ethereum coin type)
- `0` = non-hardened derivation

Examples:
```
44'/60'/0'/0/0     # Ethereum default
44'/501'/0'/0'     # Solana
44'/0'/0'          # Bitcoin
```

Multiple paths can be specified comma-separated:
```
44'/60'/0', 44'/137'/0'
```

## Device Types

| Device | Target ID | Sideload Support |
|--------|-----------|------------------|
| Nano S | `0x31100004` | ✅ Full |
| Nano S Plus | `0x33100004` | ✅ Full |
| Nano X | `0x33000004` | ⚠️ Limited* |
| Stax | `0x33200004` | ✅ Full |
| Flex | `0x33300004` | ✅ Full |

> *Nano X may reject sideloading on recent firmware versions.

## HEX File Format

The sideloader accepts Intel HEX format files (`.hex`). This is the standard output from the Ledger SDK build process.

Example HEX content:
```
:020000040800F2
:1000000000200020ED000008F1000008F300000844
:1000100000000000000000000000000000000000E0
:04000005080000ED02
:00000001FF
```

### Getting Your HEX File

When building a Ledger app with the SDK:

```bash
# Build your app
make

# The HEX file is in the build output
ls bin/app.hex
```

## Troubleshooting

### Connection Issues

| Problem | Solution |
|---------|----------|
| Device not detected | Ensure USB connection (not Bluetooth) |
| "No device selected" | Click the device in the browser popup |
| WebHID not supported | Use Chrome/Edge 89+ |
| Permission denied | Allow HID access in browser settings |

### Loading Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `6985` | User denied | Confirm installation on device |
| `6a84` | Not enough space | Delete unused apps |
| `6a85` | Not enough space | Delete unused apps |
| `6e01` | Invalid state | Return to dashboard, restart |
| `5515` | Device locked | Unlock with PIN |
| `5120` | Sideload blocked | Device doesn't allow sideloading |
| `6982` | Security status | Re-establish connection |
| `6d00` | Invalid command | Check device is in dashboard |

### Common Issues

**"Application is already installed"**
- Check "Delete existing app first" option
- Or manually delete via Ledger Live first

**"Not enough space"**
- Delete unused apps from your device
- Use Ledger Live to manage installed apps

**"Invalid HEX file"**
- Ensure file is Intel HEX format
- Check file isn't corrupted
- Verify it's the correct build output

**Device shows nothing after clicking Load**
- Device might be processing - wait a few seconds
- Check the log panel for errors
- Ensure you're on dashboard, not in an app

## Programmatic Usage

### Browser JavaScript

```javascript
import { TransportWebHID, loadApp, TARGET_IDS } from './index.js';

async function sideload() {
    // Connect to device
    const transport = await TransportWebHID.request(true);
    
    try {
        // Load your app
        const hash = await loadApp(transport, {
            targetId: TARGET_IDS.NANO_S_PLUS,
            fileName: hexFileContent,
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
}
```

### Delete an App

```javascript
import { TransportWebHID, deleteApp, TARGET_IDS } from './index.js';

async function removeApp() {
    const transport = await TransportWebHID.request(true);
    
    try {
        await deleteApp(transport, 'MyApp', TARGET_IDS.NANO_S_PLUS);
        console.log('App deleted');
    } finally {
        await transport.close();
    }
}
```

### List Installed Apps

```javascript
import { TransportWebHID, listApps, TARGET_IDS } from './index.js';

async function showApps() {
    const transport = await TransportWebHID.request(true);
    
    try {
        const apps = await listApps(transport, TARGET_IDS.NANO_S_PLUS);
        console.log('Installed:', apps.map(a => a.name));
    } finally {
        await transport.close();
    }
}
```

## Security Considerations

### What Sideloading Does

- Loads unsigned applications onto your Ledger
- Bypasses Ledger's app review process
- Gives the app access to specified derivation paths

### Risks

- **Malicious apps** could steal funds if given access to your keys
- **Buggy apps** could corrupt device state
- **Untested apps** may behave unexpectedly

### Best Practices

1. **Only sideload apps you trust** - review source code
2. **Use a test device** - don't sideload on your main wallet
3. **Limit derivation paths** - only grant necessary access
4. **Use separate accounts** - don't share paths with production apps
5. **Verify the source** - ensure HEX matches the source code

## Technical Details

### Protocol Overview

1. **Device identification** - Query device type and version
2. **Secure channel** - ECDH key exchange for encrypted communication
3. **Delete existing** - Remove old version if present
4. **Create app** - Register app metadata
5. **Load code** - Transfer encrypted code segments
6. **Verify CRC** - Confirm data integrity
7. **Commit** - Finalize installation

### SCP (Secure Channel Protocol)

The sideloader implements SCP v2/v3:
- ECDH key exchange using secp256k1
- AES-CBC encryption for all payloads
- MAC authentication for integrity
- IV chaining between APDUs

## Files Reference

```
ledgerjs/
├── sideloader.html      # Web UI
├── index.js             # Main exports
├── src/
│   ├── transport.js     # WebHID communication
│   ├── deployed.js      # Secure channel setup
│   ├── hexLoader.js     # App loading protocol
│   ├── hexParser.js     # Intel HEX parsing
│   ├── loadApp.js       # High-level API
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
