/**
 * Example: Load an application onto a Ledger device
 * 
 * Usage in browser console (after including the library):
 *   1. Open sideloader.html in Chrome/Edge
 *   2. Or include this script in your own page
 * 
 * Usage in Node.js (mock/testing only):
 *   node examples/load_example.js
 */

import { 
    TransportWebHID,
    TransportMock,
    loadApp, 
    deleteApp,
    listApps,
    getMemInfo,
    TARGET_IDS,
    CURVES,
    IntelHexParser
} from '../index.js';

// Example HEX file content (minimal test app)
const EXAMPLE_HEX = `:020000040800F2
:1000000000200020ED000008F1000008F300000844
:1000100000000000000000000000000000000000E0
:10002000000000000000000000000000F500000893
:100030000000000000000000F7000008F90000086C
:04000005080000ED02
:00000001FF`;

/**
 * Load an app using WebHID (browser only)
 */
async function loadAppBrowser() {
    console.log('=== Ledger App Sideloader ===\n');
    
    // 1. Request device access
    console.log('Requesting device access...');
    const transport = await TransportWebHID.request(true); // true = debug mode
    
    try {
        // 2. Load the application
        console.log('Loading application...');
        
        const hash = await loadApp(transport, {
            // Required
            targetId: TARGET_IDS.NANO_S_PLUS,  // Change for your device
            fileName: EXAMPLE_HEX,              // Your HEX file content
            appName: 'TestApp',
            
            // Optional
            appVersion: '1.0.0',
            curves: ['secp256k1'],              // Allowed curves
            paths: ["44'/60'/0'"],              // BIP32 paths
            icon: null,                          // Hex-encoded icon
            dataSize: 0,                         // NVRAM size
            appFlags: 0,                         // 0=normal, 2=upgrade
            delete: true,                        // Delete existing first
            nocrc: false,                        // Verify CRC
            debug: true                          // Verbose output
        });
        
        console.log(`\n✅ Success! App hash: ${hash}`);
        
    } finally {
        await transport.close();
    }
}

/**
 * Delete an app
 */
async function deleteAppBrowser(appName) {
    const transport = await TransportWebHID.request(true);
    
    try {
        await deleteApp(transport, appName, TARGET_IDS.NANO_S_PLUS, null, true);
        console.log(`✅ Deleted: ${appName}`);
    } finally {
        await transport.close();
    }
}

/**
 * List installed apps
 */
async function listAppsBrowser() {
    const transport = await TransportWebHID.request(true);
    
    try {
        const apps = await listApps(transport, TARGET_IDS.NANO_S_PLUS);
        console.log('Installed apps:');
        for (const app of apps) {
            console.log(`  - ${app.name}`);
        }
    } finally {
        await transport.close();
    }
}

/**
 * Get memory info
 */
async function getMemInfoBrowser() {
    const transport = await TransportWebHID.request(true);
    
    try {
        const info = await getMemInfo(transport, TARGET_IDS.NANO_S_PLUS);
        console.log('Memory info:', info);
    } finally {
        await transport.close();
    }
}

// For Node.js testing with mock transport
async function testWithMock() {
    console.log('=== Testing with Mock Transport ===\n');
    
    // Parse HEX file
    const parser = new IntelHexParser(EXAMPLE_HEX);
    console.log(`Areas: ${parser.getAreas().length}`);
    console.log(`Boot address: 0x${parser.getBootAddr().toString(16)}`);
    console.log(`Code size: ${parser.maxAddr() - parser.minAddr()} bytes`);
    
    // Create mock that simulates basic responses
    const mock = new TransportMock(async (apdu) => {
        const cla = apdu[0];
        const ins = apdu[1];
        const p1 = apdu[2];
        
        // Identify
        if (cla === 0xe0 && ins === 0x04) {
            return new Uint8Array([0x90, 0x00]);
        }
        
        // Get nonce
        if (cla === 0xe0 && ins === 0x50) {
            return new Uint8Array([
                0x00, 0x00, 0x00, 0x01,  // Serial
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,  // Nonce
                0x90, 0x00
            ]);
        }
        
        // Default success
        return new Uint8Array([0x90, 0x00]);
    }, true); // debug mode
    
    console.log('\nMock transport ready for testing');
    console.log('Note: Full SCP won\'t work with simple mock');
}

// Detect environment and run appropriate test
if (typeof window !== 'undefined' && navigator.hid) {
    // Browser environment
    window.loadAppBrowser = loadAppBrowser;
    window.deleteAppBrowser = deleteAppBrowser;
    window.listAppsBrowser = listAppsBrowser;
    window.getMemInfoBrowser = getMemInfoBrowser;
    
    console.log('Browser environment detected.');
    console.log('Available functions:');
    console.log('  loadAppBrowser()');
    console.log('  deleteAppBrowser("AppName")');
    console.log('  listAppsBrowser()');
    console.log('  getMemInfoBrowser()');
} else {
    // Node.js environment
    testWithMock();
}

export { loadAppBrowser, deleteAppBrowser, listAppsBrowser, getMemInfoBrowser, testWithMock };
