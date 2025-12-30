/**
 * Tests for ecWrapper.js
 * Run with: node test_ecWrapper.js
 */

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

function assertArrayEqual(actual, expected, message) {
    const actualArr = Array.from(actual);
    const expectedArr = Array.from(expected);
    if (JSON.stringify(actualArr) === JSON.stringify(expectedArr)) {
        console.log(`✓ ${message}`);
        passed++;
    } else {
        console.log(`✗ ${message}`);
        console.log(`  Expected: ${bytesToHex(new Uint8Array(expectedArr))}`);
        console.log(`  Got:      ${bytesToHex(new Uint8Array(actualArr))}`);
        failed++;
    }
}

// Test 1: hexToBytes and bytesToHex utilities
console.log('\n--- Testing hex utilities ---');
{
    const hex = 'deadbeef';
    const bytes = hexToBytes(hex);
    assertArrayEqual(bytes, [0xde, 0xad, 0xbe, 0xef], 'hexToBytes');
    
    const backToHex = bytesToHex(bytes);
    assertEqual(backToHex, hex, 'bytesToHex');
}

// Test 2: Generate random private key
console.log('\n--- Testing PrivateKey generation ---');
{
    const privKey = new PrivateKey();
    
    assert(privKey.serialize().length === 64, 'Private key hex should be 64 chars');
    assert(privKey.pubkey !== null, 'Should have associated public key');
    
    const pubkeyBytes = privKey.pubkey.serialize(false);
    assertEqual(pubkeyBytes.length, 65, 'Uncompressed pubkey should be 65 bytes');
    assertEqual(pubkeyBytes[0], 0x04, 'Uncompressed pubkey should start with 0x04');
    
    const compressedPubkey = privKey.pubkey.serialize(true);
    assertEqual(compressedPubkey.length, 33, 'Compressed pubkey should be 33 bytes');
    assert(compressedPubkey[0] === 0x02 || compressedPubkey[0] === 0x03, 
        'Compressed pubkey should start with 0x02 or 0x03');
    
    console.log('  Generated public key: ' + bytesToHex(pubkeyBytes).slice(0, 40) + '...');
}

// Test 3: Create private key from known bytes
console.log('\n--- Testing PrivateKey from known bytes ---');
{
    // Known test vector
    const privKeyHex = 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35';
    const privKeyBytes = hexToBytes(privKeyHex);
    
    const privKey = new PrivateKey(privKeyBytes);
    assertEqual(privKey.serialize(), privKeyHex, 'Private key serializes correctly');
}

// Test 4: PublicKey from raw bytes
console.log('\n--- Testing PublicKey from raw bytes ---');
{
    // Generate a key pair
    const privKey = new PrivateKey();
    const pubkeyBytes = privKey.pubkey.serialize(false);
    
    // Create PublicKey from bytes
    const pubKey = new PublicKey(pubkeyBytes, true);
    
    assertArrayEqual(
        pubKey.serialize(false),
        pubkeyBytes,
        'PublicKey from bytes should match original'
    );
}

// Test 5: ECDSA sign and verify
console.log('\n--- Testing ECDSA sign/verify ---');
{
    const privKey = new PrivateKey();
    const message = new TextEncoder().encode('Hello, Ledger!');
    
    // Sign
    const signature = privKey.ecdsaSign(message);
    assert(signature !== null, 'Should produce signature');
    
    // Serialize
    const sigDer = privKey.ecdsaSerialize(signature);
    assert(sigDer.length > 0, 'DER signature should have length');
    console.log('  Signature DER: ' + bytesToHex(sigDer).slice(0, 40) + '...');
    
    // Verify
    const valid = privKey.pubkey.ecdsaVerify(message, signature);
    assert(valid, 'Signature should verify');
    
    // Verify with different message should fail
    const wrongMessage = new TextEncoder().encode('Wrong message');
    const invalid = privKey.pubkey.ecdsaVerify(wrongMessage, signature);
    assert(!invalid, 'Wrong message should not verify');
}

// Test 6: ECDH key exchange
console.log('\n--- Testing ECDH key exchange ---');
{
    // Generate two key pairs
    const alice = new PrivateKey();
    const bob = new PrivateKey();
    
    // Alice computes shared secret with Bob's public key
    const alicePrivBytes = hexToBytes(alice.serialize());
    const aliceShared = bob.pubkey.ecdh(alicePrivBytes);
    
    // Bob computes shared secret with Alice's public key
    const bobPrivBytes = hexToBytes(bob.serialize());
    const bobShared = alice.pubkey.ecdh(bobPrivBytes);
    
    assertEqual(aliceShared.length, 32, 'ECDH shared secret should be 32 bytes');
    assertArrayEqual(aliceShared, bobShared, 'ECDH should produce same secret');
    
    console.log('  Shared secret: ' + bytesToHex(aliceShared));
}

// Test 7: ECDH with SCP v3 format
console.log('\n--- Testing ECDH with SCP v3 format ---');
{
    const alice = new PrivateKey();
    const bob = new PrivateKey();
    
    const alicePrivBytes = hexToBytes(alice.serialize());
    const aliceShared = bob.pubkey.ecdh(alicePrivBytes, true);
    
    const bobPrivBytes = hexToBytes(bob.serialize());
    const bobShared = alice.pubkey.ecdh(bobPrivBytes, true);
    
    assertEqual(aliceShared.length, 32, 'ECDH v3 shared secret should be 32 bytes');
    assertArrayEqual(aliceShared, bobShared, 'ECDH v3 should produce same secret');
}

// Test 8: Sign with raw (pre-hashed) message
console.log('\n--- Testing ECDSA with raw (pre-hashed) message ---');
{
    const privKey = new PrivateKey();
    
    // Pre-hash the message
    const message = new TextEncoder().encode('Test message');
    const { sha256 } = await import('@noble/hashes/sha256');
    const msgHash = sha256(message);
    
    // Sign the hash directly
    const signature = privKey.ecdsaSign(msgHash, true);
    
    // Verify with raw flag
    const valid = privKey.pubkey.ecdsaVerify(msgHash, signature, true);
    assert(valid, 'Raw signature should verify');
}

// Test 9: Multiple key generations should be unique
console.log('\n--- Testing key uniqueness ---');
{
    const key1 = new PrivateKey();
    const key2 = new PrivateKey();
    const key3 = new PrivateKey();
    
    assert(key1.serialize() !== key2.serialize(), 'Key 1 and 2 should differ');
    assert(key2.serialize() !== key3.serialize(), 'Key 2 and 3 should differ');
    assert(key1.serialize() !== key3.serialize(), 'Key 1 and 3 should differ');
}

// Test 10: Test with known test vectors (Bitcoin/secp256k1)
console.log('\n--- Testing with known test vectors ---');
{
    // Known test vector from Bitcoin
    const privKeyHex = '0000000000000000000000000000000000000000000000000000000000000001';
    const expectedPubKeyHex = '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8';
    
    const privKey = new PrivateKey(hexToBytes(privKeyHex));
    const pubKey = bytesToHex(privKey.pubkey.serialize(false));
    
    assertEqual(pubKey, expectedPubKeyHex, 'Known test vector matches');
}

// Summary
console.log('\n--- Summary ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
