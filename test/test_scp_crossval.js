/**
 * SCP v3 Protocol Test - JavaScript Implementation
 * Verifies against Python reference implementation
 */

// Import the AES functions from hexLoader
import { 
    aesEncryptBlock, 
    aesCbcEncryptNoPadding,
    AES_SBOX,
    AES_RCON
} from '../src/hexLoader.js';

// Helper functions
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// SCP v3 key derivation
function scpDeriveKeys(ecdhSecret) {
    // ENC key = AES-256-ECB(ecdh_secret, 0x02 * 16)
    const encBlock = new Uint8Array(16).fill(0x02);
    const encKey = aesEncryptBlock(ecdhSecret, encBlock);
    
    // MAC key = AES-256-ECB(ecdh_secret, 0x01 * 16)
    const macBlock = new Uint8Array(16).fill(0x01);
    const macKey = aesEncryptBlock(ecdhSecret, macBlock);
    
    return { encKey, macKey };
}

// SCP v3 wrap
function scpWrap(data, encKey, macKey, encIv, macIv) {
    // Pad to 16-byte boundary with 0x80 padding
    let paddedLen = data.length + 1;
    while (paddedLen % 16 !== 0) paddedLen++;
    
    const padded = new Uint8Array(paddedLen);
    padded.set(data);
    padded[data.length] = 0x80;
    // Rest is already 0x00
    
    // Encrypt with AES-CBC
    const encrypted = aesCbcEncryptNoPadding(encKey, encIv, padded);
    const newEncIv = encrypted.slice(-16);
    
    // Compute MAC using AES-CBC-MAC over encrypted data
    const macResult = aesCbcEncryptNoPadding(macKey, macIv, encrypted);
    const newMacIv = macResult.slice(-16);
    
    // Append first 14 bytes of MAC IV
    const result = new Uint8Array(encrypted.length + 14);
    result.set(encrypted);
    result.set(newMacIv.slice(0, 14), encrypted.length);
    
    return {
        padded,
        encrypted,
        mac: newMacIv.slice(0, 14),
        newEncIv,
        newMacIv,
        result
    };
}

// Run a test vector
function runTestVector(testCase) {
    const { name, inputs, outputs: expected } = testCase;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test: ${name}`);
    console.log(`${'='.repeat(60)}`);
    
    const ecdhSecret = hexToBytes(inputs.ecdh_secret);
    const data = hexToBytes(inputs.data);
    const encIv = hexToBytes(inputs.enc_iv);
    const macIv = hexToBytes(inputs.mac_iv);
    
    // Derive keys
    const { encKey, macKey } = scpDeriveKeys(ecdhSecret);
    
    console.log('\nKey Derivation:');
    console.log(`  ENC Key: ${bytesToHex(encKey)}`);
    console.log(`  Expected: ${expected.enc_key}`);
    console.log(`  Match: ${bytesToHex(encKey) === expected.enc_key ? '✓' : '✗'}`);
    
    console.log(`  MAC Key: ${bytesToHex(macKey)}`);
    console.log(`  Expected: ${expected.mac_key}`);
    console.log(`  Match: ${bytesToHex(macKey) === expected.mac_key ? '✓' : '✗'}`);
    
    // Wrap data
    const wrapped = scpWrap(data, encKey, macKey, encIv, macIv);
    
    console.log('\nEncryption:');
    console.log(`  Padded:   ${bytesToHex(wrapped.padded)}`);
    console.log(`  Expected: ${expected.padded}`);
    console.log(`  Match: ${bytesToHex(wrapped.padded) === expected.padded ? '✓' : '✗'}`);
    
    console.log(`  Encrypted: ${bytesToHex(wrapped.encrypted)}`);
    console.log(`  Expected:  ${expected.encrypted}`);
    console.log(`  Match: ${bytesToHex(wrapped.encrypted) === expected.encrypted ? '✓' : '✗'}`);
    
    console.log('\nMAC:');
    console.log(`  MAC (14b): ${bytesToHex(wrapped.mac)}`);
    console.log(`  Expected:  ${expected.mac}`);
    console.log(`  Match: ${bytesToHex(wrapped.mac) === expected.mac ? '✓' : '✗'}`);
    
    console.log('\nFinal Result:');
    console.log(`  Result:   ${bytesToHex(wrapped.result)}`);
    console.log(`  Expected: ${expected.result}`);
    console.log(`  Match: ${bytesToHex(wrapped.result) === expected.result ? '✓' : '✗'}`);
    
    // Check all matches
    const allMatch = 
        bytesToHex(encKey) === expected.enc_key &&
        bytesToHex(macKey) === expected.mac_key &&
        bytesToHex(wrapped.padded) === expected.padded &&
        bytesToHex(wrapped.encrypted) === expected.encrypted &&
        bytesToHex(wrapped.mac) === expected.mac &&
        bytesToHex(wrapped.result) === expected.result;
    
    return allMatch;
}

// Main test runner
async function main() {
    console.log('SCP v3 Protocol Cross-Validation Test');
    console.log('JavaScript vs Python Reference Implementation');
    console.log('='.repeat(60));
    
    // Test vectors from Python
    const testVectors = [
        {
            "name": "Delete FROSTGUN (from logs)",
            "inputs": {
                "ecdh_secret": "d9ab04ec2e19fe4e0a3ff7767cc38d7b6962de3001472995426b97dabc7a1378",
                "data": "0c0846524f535447554e",
                "enc_iv": "00000000000000000000000000000000",
                "mac_iv": "00000000000000000000000000000000"
            },
            "outputs": {
                "enc_key": "29c4c5bd78e4a1b18b4f4334d5013bc3",
                "mac_key": "d0e0009f0d4aeb0ef28dd9d90d61e4a6",
                "padded": "0c0846524f535447554e800000000000",
                "encrypted": "69f8c7c31eaeff48c0075f8a48c1455e",
                "mac": "2f6b9993493de3de9599e18a99bb",
                "new_enc_iv": "69f8c7c31eaeff48c0075f8a48c1455e",
                "new_mac_iv": "2f6b9993493de3de9599e18a99bb9f35",
                "result": "69f8c7c31eaeff48c0075f8a48c1455e2f6b9993493de3de9599e18a99bb"
            }
        },
        {
            "name": "Simple test data",
            "inputs": {
                "ecdh_secret": "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
                "data": "48656c6c6f",
                "enc_iv": "00000000000000000000000000000000",
                "mac_iv": "00000000000000000000000000000000"
            },
            "outputs": {
                // Will be filled by Python
                "enc_key": "",
                "mac_key": "",
                "padded": "",
                "encrypted": "",
                "mac": "",
                "new_enc_iv": "",
                "new_mac_iv": "",
                "result": ""
            }
        }
    ];
    
    // Try to load test vectors from JSON file generated by Python
    let vectors = testVectors;
    try {
        const fs = await import('fs');
        const data = fs.readFileSync('test/scp_test_vectors.json', 'utf8');
        vectors = JSON.parse(data);
        console.log('Loaded test vectors from Python output');
    } catch (e) {
        console.log('Using embedded test vectors (run Python script first for full test)');
        // Just use the first vector which has expected values
        vectors = [testVectors[0]];
    }
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of vectors) {
        if (testCase.outputs.enc_key === "") {
            console.log(`\nSkipping ${testCase.name} (no expected values)`);
            continue;
        }
        
        const result = runTestVector(testCase);
        if (result) {
            passed++;
            console.log(`\n✓ TEST PASSED`);
        } else {
            failed++;
            console.log(`\n✗ TEST FAILED`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(60));
    
    if (failed > 0) {
        process.exit(1);
    }
}

main().catch(console.error);
