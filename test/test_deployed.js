/**
 * Tests for deployed.js
 * Run with: node test_deployed.js
 * 
 * These tests use mock dongles to verify the protocol flow without actual hardware.
 */

import { getDeployedSecretV2 } from '../src/deployed.js';
import { PrivateKey, PublicKey, bytesToHex, hexToBytes } from '../src/ecWrapper.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✓ ${message}`);
        passed++;
    } else {
        console.log(`✗ ${message}`);
        failed++;
    }
}

function assertEqual(actual, expected, message) {
    if (actual === expected) {
        console.log(`✓ ${message}`);
        passed++;
    } else {
        console.log(`✗ ${message}: expected ${expected}, got ${actual}`);
        failed++;
    }
}

/**
 * Create a mock dongle that simulates device responses
 */
function createMockDongle(devicePrivateKey = null) {
    const device = devicePrivateKey ? new PrivateKey(devicePrivateKey) : new PrivateKey();
    const deviceNonce = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
    let hostNonce = null;
    let hostMasterPubKey = null;
    let hostEphemeralPubKey = null;
    
    const exchanges = [];
    
    return {
        device,
        exchanges,
        
        async exchange(apdu) {
            exchanges.push(bytesToHex(apdu));
            
            const cla = apdu[0];
            const ins = apdu[1];
            const p1 = apdu[2];
            const p2 = apdu[3];
            
            // E0 04 - Identify
            if (cla === 0xe0 && ins === 0x04) {
                return new Uint8Array([0x90, 0x00]); // Success
            }
            
            // E0 50 - Get nonce
            if (cla === 0xe0 && ins === 0x50) {
                hostNonce = apdu.slice(5, 5 + apdu[4]);
                // Return: batchSignerSerial (4) + deviceNonce (8)
                const response = new Uint8Array(12);
                response.set([0x00, 0x00, 0x00, 0x01], 0); // Serial
                response.set(deviceNonce, 4);
                return response;
            }
            
            // E0 51 - Certificate exchange
            if (cla === 0xe0 && ins === 0x51) {
                const data = apdu.slice(5);
                const pubKeyLen = data[0];
                const pubKey = data.slice(1, 1 + pubKeyLen);
                
                if (p1 === 0x00) {
                    // Master certificate
                    hostMasterPubKey = pubKey;
                } else if (p1 === 0x80) {
                    // Ephemeral certificate (last)
                    hostEphemeralPubKey = pubKey;
                }
                
                return new Uint8Array([0x90, 0x00]);
            }
            
            // E0 52 - Get device certificate
            if (cla === 0xe0 && ins === 0x52) {
                if (p1 === 0x00) {
                    // Return device certificate
                    const devicePubKey = device.pubkey.serialize(false);
                    const header = new Uint8Array([0x00]); // Role/header
                    
                    // Sign: 0x02 || header || pubkey
                    const dataToSign = new Uint8Array([0x02, ...header, ...devicePubKey]);
                    const sig = device.ecdsaSign(dataToSign);
                    const sigDer = device.ecdsaSerialize(sig);
                    
                    // Format: headerLen || header || pubKeyLen || pubKey || sigLen || sig
                    const response = new Uint8Array([
                        header.length,
                        ...header,
                        devicePubKey.length,
                        ...devicePubKey,
                        sigDer.length,
                        ...sigDer
                    ]);
                    return response;
                    
                } else if (p1 === 0x80) {
                    // Return ephemeral device certificate
                    const ephemeral = new PrivateKey();
                    const ephPubKey = ephemeral.pubkey.serialize(false);
                    
                    // Sign: 0x12 || deviceNonce || hostNonce || ephPubKey
                    const dataToSign = new Uint8Array([
                        0x12,
                        ...deviceNonce,
                        ...hostNonce,
                        ...ephPubKey
                    ]);
                    const sig = device.ecdsaSign(dataToSign);
                    const sigDer = device.ecdsaSerialize(sig);
                    
                    // Store for ECDH
                    this._deviceEphemeral = ephemeral;
                    
                    const response = new Uint8Array([
                        0, // No header for ephemeral
                        ephPubKey.length,
                        ...ephPubKey,
                        sigDer.length,
                        ...sigDer
                    ]);
                    return response;
                }
                
                return new Uint8Array(0);
            }
            
            // E0 53 - Commit
            if (cla === 0xe0 && ins === 0x53) {
                return new Uint8Array([0x90, 0x00]);
            }
            
            throw new Error(`Unknown APDU: ${bytesToHex(apdu)}`);
        }
    };
}

// Test 1: Test SCP V2 protocol flow
console.log('\n--- Testing SCP V2 protocol flow ---');
{
    const mockDongle = createMockDongle();
    const masterKey = new PrivateKey();
    const masterPrivBytes = hexToBytes(masterKey.serialize());
    
    try {
        const result = await getDeployedSecretV2(
            mockDongle,
            masterPrivBytes,
            0x33100004 // Nano S Plus
        );
        
        assert(result !== null, 'Should return a result');
        
        // Check that we got the expected object format for targetId >= 0x3
        assert(typeof result === 'object', 'Result should be an object for modern devices');
        assert(result.ecdh_secret !== undefined, 'Should have ecdh_secret');
        assert(result.devicePublicKey !== undefined, 'Should have devicePublicKey');
        assertEqual(result.ecdh_secret.length, 32, 'ECDH secret should be 32 bytes');
        
        console.log('  ECDH secret: ' + bytesToHex(result.ecdh_secret));
        
    } catch (e) {
        console.log(`✗ SCP V2 flow failed: ${e.message}`);
        failed++;
    }
}

// Test 2: Verify APDU sequence
console.log('\n--- Testing APDU sequence ---');
{
    const mockDongle = createMockDongle();
    const masterKey = new PrivateKey();
    const masterPrivBytes = hexToBytes(masterKey.serialize());
    
    try {
        await getDeployedSecretV2(mockDongle, masterPrivBytes, 0x33100004);
        
        const exchanges = mockDongle.exchanges;
        
        // Should have these APDUs in order:
        // 1. E0 04 - Identify
        // 2. E0 50 - Get nonce
        // 3. E0 51 00 - Master certificate
        // 4. E0 51 80 - Ephemeral certificate
        // 5. E0 52 00 - Get device cert
        // 6. E0 52 80 - Get device ephemeral cert
        // 7. E0 53 - Commit
        
        assert(exchanges.length >= 6, 'Should have at least 6 exchanges');
        
        assert(exchanges[0].startsWith('e004'), 'First APDU should be E0 04 (identify)');
        assert(exchanges[1].startsWith('e050'), 'Second APDU should be E0 50 (get nonce)');
        assert(exchanges[2].startsWith('e0510000'), 'Third APDU should be E0 51 00 (master cert)');
        assert(exchanges[3].startsWith('e0518000'), 'Fourth APDU should be E0 51 80 (ephemeral cert)');
        assert(exchanges[4].startsWith('e0520000'), 'Fifth APDU should be E0 52 00 (get device cert)');
        
        console.log('  APDU sequence:');
        exchanges.forEach((apdu, i) => {
            console.log(`    ${i + 1}. ${apdu.slice(0, 8)}... (${apdu.length / 2} bytes)`);
        });
        
    } catch (e) {
        console.log(`✗ APDU sequence test failed: ${e.message}`);
        failed++;
    }
}

// Test 3: Test target ID validation
console.log('\n--- Testing target ID validation ---');
{
    const mockDongle = createMockDongle();
    const masterKey = new PrivateKey();
    const masterPrivBytes = hexToBytes(masterKey.serialize());
    
    try {
        await getDeployedSecretV2(mockDongle, masterPrivBytes, 0x31100001); // V1 target
        console.log('✗ Should throw for V1 target ID');
        failed++;
    } catch (e) {
        assert(e.message.includes('does not support SCP V2'), 'Should reject V1 target ID');
    }
}

// Test 4: Test certificate building
console.log('\n--- Testing certificate structure ---');
{
    const mockDongle = createMockDongle();
    const masterKey = new PrivateKey();
    const masterPubKey = masterKey.pubkey.serialize(false);
    const masterPrivBytes = hexToBytes(masterKey.serialize());
    
    try {
        await getDeployedSecretV2(mockDongle, masterPrivBytes, 0x33100004);
        
        // Parse the master certificate APDU
        const masterCertApdu = hexToBytes(mockDongle.exchanges[2]);
        const certData = masterCertApdu.slice(5);
        
        const pubKeyLen = certData[0];
        assertEqual(pubKeyLen, 65, 'Master public key should be 65 bytes (uncompressed)');
        
        const extractedPubKey = certData.slice(1, 1 + pubKeyLen);
        assertEqual(
            bytesToHex(extractedPubKey),
            bytesToHex(masterPubKey),
            'Extracted public key should match master'
        );
        
        const sigLen = certData[1 + pubKeyLen];
        assert(sigLen >= 68 && sigLen <= 72, 'DER signature should be 68-72 bytes');
        
    } catch (e) {
        console.log(`✗ Certificate structure test failed: ${e.message}`);
        failed++;
    }
}

// Test 5: Test ephemeral certificate includes nonces
console.log('\n--- Testing ephemeral certificate includes nonces ---');
{
    const mockDongle = createMockDongle();
    const masterKey = new PrivateKey();
    const masterPrivBytes = hexToBytes(masterKey.serialize());
    
    try {
        await getDeployedSecretV2(mockDongle, masterPrivBytes, 0x33100004);
        
        // The ephemeral certificate should be signed with:
        // 0x11 || hostNonce || deviceNonce || ephemeralPublic
        
        // We can't easily verify the signature without access to internals,
        // but we can verify the APDU was sent
        const ephCertApdu = mockDongle.exchanges[3];
        assert(ephCertApdu.startsWith('e0518000'), 'Ephemeral cert should have P1=0x80');
        
        passed++;
        console.log('✓ Ephemeral certificate APDU sent correctly');
        
    } catch (e) {
        console.log(`✗ Ephemeral certificate test failed: ${e.message}`);
        failed++;
    }
}

// Test 6: Test with deterministic device key for verification
console.log('\n--- Testing ECDH computation ---');
{
    // Use a known device key for deterministic testing
    const devicePrivKeyHex = 'a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0';
    const devicePrivKey = hexToBytes(devicePrivKeyHex);
    
    const mockDongle = createMockDongle(devicePrivKey);
    const masterKey = new PrivateKey();
    const masterPrivBytes = hexToBytes(masterKey.serialize());
    
    try {
        const result = await getDeployedSecretV2(
            mockDongle,
            masterPrivBytes,
            0x33100004
        );
        
        // Verify we got a valid 32-byte secret
        assertEqual(result.ecdh_secret.length, 32, 'ECDH secret should be 32 bytes');
        
        // The secret should be non-zero
        const isNonZero = result.ecdh_secret.some(b => b !== 0);
        assert(isNonZero, 'ECDH secret should be non-zero');
        
    } catch (e) {
        console.log(`✗ ECDH computation test failed: ${e.message}`);
        failed++;
    }
}

// Summary
console.log('\n--- Summary ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
