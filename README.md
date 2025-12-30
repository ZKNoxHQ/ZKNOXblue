# LedgerJS Loader

A JavaScript port of [ledgerblue](https://github.com/LedgerHQ/blue-loader-python) for loading applications onto Ledger hardware wallets.

## Features

- Load applications onto Ledger devices (Nano S, Nano S Plus, Nano X, Stax, Flex)
- Delete installed applications
- List installed applications
- Get device memory information
- WebHID support for browser-based sideloading
- Full SCP (Secure Channel Protocol) v2/v3 implementation

## Installation

```bash
npm install
```

## Usage

### Browser (WebHID)

```javascript
import { TransportWebHID, loadApp, TARGET_IDS } from 'ledgerjs-loader';

// Request device access
const transport = await TransportWebHID.request(true); // true for debug

// Load an application
const hash = await loadApp(transport, {
    targetId: TARGET_IDS.NANO_S_PLUS,
    fileName: hexFileContent, // Intel HEX format string
    appName: 'MyApp',
    appVersion: '1.0.0',
    debug: true
});

console.log('App loaded with hash:', hash);

// Close transport when done
await transport.close();
```

### Node.js (for testing)

```javascript
import { TransportMock, loadApp, TARGET_IDS } from 'ledgerjs-loader';

// Create a mock transport for testing
const mock = new TransportMock(async (apdu) => {
    // Handle APDUs...
    return new Uint8Array([0x90, 0x00]);
});

// Use same API as real transport
```

## API Reference

### loadApp(transport, options)

Load an application onto the device.

**Options:**
- `targetId` (required): Device target ID (use `TARGET_IDS` constants)
- `fileName` (required): Intel HEX file content as string
- `appName` (required): Application name
- `appVersion`: Application version string
- `icon`: Icon data (hex string or Uint8Array)
- `curves`: Array of allowed curves ('secp256k1', 'secp256r1', 'ed25519', 'bls12381g1')
- `paths`: Array of BIP32 paths (e.g., ["44'/60'/0'/0/0"])
- `appFlags`: Application flags
- `dataSize`: Data section size
- `delete`: Delete existing app first (default: false)
- `nocrc`: Skip CRC verification (default: false)
- `debug`: Enable debug output (default: false)

### deleteApp(transport, appName, targetId, rootPrivateKey?, debug?)

Delete an installed application.

### listApps(transport, targetId, rootPrivateKey?)

List all installed applications.

### getMemInfo(transport, targetId, rootPrivateKey?)

Get device memory information.

## Target IDs

```javascript
TARGET_IDS = {
    NANO_S: 0x31100004,
    NANO_S_PLUS: 0x33100004,
    NANO_X: 0x33000004,
    STAX: 0x33200004,
    FLEX: 0x33300004
}
```

## Curves

```javascript
CURVES = {
    SECP256K1: 0x01,
    SECP256R1: 0x02,
    ED25519: 0x04,
    SLIP21: 0x08,
    BLS12381G1: 0x10
}
```

## Module Structure

```
ledgerjs/
├── src/
│   ├── commException.js    - Exception handling
│   ├── hexParser.js        - Intel HEX file parsing
│   ├── ledgerWrapper.js    - HID APDU framing
│   ├── ecWrapper.js        - Elliptic curve operations (secp256k1)
│   ├── deployed.js         - Secure channel establishment
│   ├── transport.js        - WebHID transport
│   ├── hexLoader.js        - Core loader with SCP encryption
│   └── loadApp.js          - Main entry point
├── test/
│   ├── test_*.js           - Unit tests for each module
│   └── run_all_tests.js    - Test runner
├── samples/
│   └── test_app.hex        - Sample HEX file for testing
├── index.js                - Main exports
└── package.json
```

## Running Tests

```bash
# Run all tests
npm test

# Run individual test
npm run test:hexParser
npm run test:ecWrapper
npm run test:hexLoader
# etc.
```

## Protocol Overview

1. **Parse HEX file**: Extract code sections and boot address from Intel HEX format
2. **Establish Secure Channel**: ECDH key exchange with device
3. **Create App**: Send application metadata (name, version, icon, paths)
4. **Load Code**: Send encrypted code chunks
5. **Verify CRC**: Verify each segment's CRC
6. **Commit**: Finalize installation

## SCP (Secure Channel Protocol)

The library implements SCP v2 and v3:

- **Key derivation**: SHA-256 based key derivation from ECDH secret
- **Encryption**: AES-CBC with padding
- **MAC**: AES-CBC MAC (14 bytes appended)
- **IV chaining**: IVs are chained between APDU exchanges

## Browser Compatibility

WebHID is supported in:
- Chrome 89+
- Edge 89+
- Opera 76+

Note: WebHID requires HTTPS or localhost.

## License

Apache-2.0 (same as original ledgerblue)

## Credits

This is a JavaScript port of [LedgerHQ/blue-loader-python](https://github.com/LedgerHQ/blue-loader-python).
