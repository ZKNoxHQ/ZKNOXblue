/**
 * Tests for ledgerWrapper.js
 * Run with: node test_ledgerWrapper.js
 */

import { 
    wrapCommandAPDU, 
    unwrapResponseAPDU, 
    splitIntoPackets,
    combinePackets 
} from '../src/ledgerWrapper.js';
import { CommException } from '../src/commException.js';

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
        console.log(`  Expected: [${expectedArr.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', ')}]`);
        console.log(`  Got:      [${actualArr.map(x => '0x' + x.toString(16).padStart(2, '0')).join(', ')}]`);
        failed++;
    }
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const CHANNEL = 0x0101;
const PACKET_SIZE = 64;

// Test 1: Wrap a simple short APDU
console.log('\n--- Testing wrapCommandAPDU with short APDU ---');
{
    // Simple GetVersion APDU: E0 C4 00 00 00
    const apdu = new Uint8Array([0xe0, 0xc4, 0x00, 0x00, 0x00]);
    const wrapped = wrapCommandAPDU(CHANNEL, apdu, PACKET_SIZE);
    
    assertEqual(wrapped.length, 64, 'Wrapped should be padded to 64 bytes');
    assertEqual(wrapped[0], 0x01, 'Channel high byte');
    assertEqual(wrapped[1], 0x01, 'Channel low byte');
    assertEqual(wrapped[2], 0x05, 'Tag should be 0x05');
    assertEqual(wrapped[3], 0x00, 'Sequence high byte');
    assertEqual(wrapped[4], 0x00, 'Sequence low byte');
    assertEqual(wrapped[5], 0x00, 'Length high byte');
    assertEqual(wrapped[6], 0x05, 'Length low byte (5 bytes)');
    assertEqual(wrapped[7], 0xe0, 'First APDU byte');
    assertEqual(wrapped[8], 0xc4, 'Second APDU byte');
    
    console.log('  Wrapped: ' + bytesToHex(wrapped.slice(0, 16)) + '...');
}

// Test 2: Wrap APDU that needs multiple packets
console.log('\n--- Testing wrapCommandAPDU with long APDU ---');
{
    // Create APDU larger than one packet can hold
    // First packet: 2 (channel) + 1 (tag) + 2 (seq) + 2 (len) = 7 header bytes
    // So first packet holds 64 - 7 = 57 data bytes
    // Subsequent packets: 2 (channel) + 1 (tag) + 2 (seq) = 5 header bytes
    // So each holds 64 - 5 = 59 data bytes
    
    const apdu = new Uint8Array(100); // 100 bytes
    for (let i = 0; i < 100; i++) {
        apdu[i] = i & 0xff;
    }
    
    const wrapped = wrapCommandAPDU(CHANNEL, apdu, PACKET_SIZE);
    
    // Should need 2 packets: 57 + 59 = 116 capacity, we need 100
    assertEqual(wrapped.length, 128, 'Should be 2 packets (128 bytes)');
    
    // Check first packet header
    assertEqual(wrapped[0], 0x01, 'Packet 1: Channel high');
    assertEqual(wrapped[1], 0x01, 'Packet 1: Channel low');
    assertEqual(wrapped[2], 0x05, 'Packet 1: Tag');
    assertEqual(wrapped[3], 0x00, 'Packet 1: Seq high');
    assertEqual(wrapped[4], 0x00, 'Packet 1: Seq low');
    assertEqual(wrapped[5], 0x00, 'Packet 1: Len high');
    assertEqual(wrapped[6], 0x64, 'Packet 1: Len low (100)');
    
    // Check second packet header
    assertEqual(wrapped[64], 0x01, 'Packet 2: Channel high');
    assertEqual(wrapped[65], 0x01, 'Packet 2: Channel low');
    assertEqual(wrapped[66], 0x05, 'Packet 2: Tag');
    assertEqual(wrapped[67], 0x00, 'Packet 2: Seq high');
    assertEqual(wrapped[68], 0x01, 'Packet 2: Seq low (sequence = 1)');
}

// Test 3: Unwrap a simple response
console.log('\n--- Testing unwrapResponseAPDU with short response ---');
{
    // Simulate a response: channel + tag + seq + length + data
    const response = new Uint8Array(64);
    response[0] = 0x01; // Channel high
    response[1] = 0x01; // Channel low
    response[2] = 0x05; // Tag
    response[3] = 0x00; // Seq high
    response[4] = 0x00; // Seq low
    response[5] = 0x00; // Length high
    response[6] = 0x04; // Length low (4 bytes)
    response[7] = 0xde; // Data byte 1
    response[8] = 0xad; // Data byte 2
    response[9] = 0xbe; // Data byte 3
    response[10] = 0xef; // Data byte 4
    
    const unwrapped = unwrapResponseAPDU(CHANNEL, response, PACKET_SIZE);
    
    assert(unwrapped !== null, 'Should successfully unwrap');
    assertEqual(unwrapped.length, 4, 'Unwrapped length should be 4');
    assertArrayEqual(unwrapped, [0xde, 0xad, 0xbe, 0xef], 'Unwrapped data');
}

// Test 4: Unwrap multi-packet response
console.log('\n--- Testing unwrapResponseAPDU with long response ---');
{
    // Create a response that spans 2 packets
    const responseData = new Uint8Array(70);
    for (let i = 0; i < 70; i++) {
        responseData[i] = (i + 0x10) & 0xff;
    }
    
    // Manually construct the wrapped response
    const wrapped = new Uint8Array(128);
    
    // First packet header
    wrapped[0] = 0x01; // Channel high
    wrapped[1] = 0x01; // Channel low
    wrapped[2] = 0x05; // Tag
    wrapped[3] = 0x00; // Seq high
    wrapped[4] = 0x00; // Seq low
    wrapped[5] = 0x00; // Length high
    wrapped[6] = 70;   // Length low
    
    // First packet data (57 bytes)
    for (let i = 0; i < 57; i++) {
        wrapped[7 + i] = responseData[i];
    }
    
    // Second packet header
    wrapped[64] = 0x01; // Channel high
    wrapped[65] = 0x01; // Channel low
    wrapped[66] = 0x05; // Tag
    wrapped[67] = 0x00; // Seq high
    wrapped[68] = 0x01; // Seq low (sequence = 1)
    
    // Second packet data (remaining 13 bytes)
    for (let i = 0; i < 13; i++) {
        wrapped[69 + i] = responseData[57 + i];
    }
    
    const unwrapped = unwrapResponseAPDU(CHANNEL, wrapped, PACKET_SIZE);
    
    assert(unwrapped !== null, 'Should successfully unwrap multi-packet');
    assertEqual(unwrapped.length, 70, 'Unwrapped length should be 70');
    assertArrayEqual(unwrapped, responseData, 'Unwrapped data should match');
}

// Test 5: Round-trip test
console.log('\n--- Testing round-trip (wrap -> unwrap) ---');
{
    const original = new Uint8Array([0xe0, 0x04, 0x00, 0x00, 0x04, 0x33, 0x10, 0x00, 0x04]);
    const wrapped = wrapCommandAPDU(CHANNEL, original, PACKET_SIZE);
    const unwrapped = unwrapResponseAPDU(CHANNEL, wrapped, PACKET_SIZE);
    
    assertArrayEqual(unwrapped, original, 'Round-trip preserves data');
}

// Test 6: Split into packets
console.log('\n--- Testing splitIntoPackets ---');
{
    const data = new Uint8Array(128);
    const packets = splitIntoPackets(data, 64);
    
    assertEqual(packets.length, 2, 'Should split into 2 packets');
    assertEqual(packets[0].length, 64, 'First packet size');
    assertEqual(packets[1].length, 64, 'Second packet size');
}

// Test 7: Combine packets
console.log('\n--- Testing combinePackets ---');
{
    const packet1 = new Uint8Array([1, 2, 3]);
    const packet2 = new Uint8Array([4, 5, 6]);
    const combined = combinePackets([packet1, packet2]);
    
    assertArrayEqual(combined, [1, 2, 3, 4, 5, 6], 'Combined packets');
}

// Test 8: Error handling - invalid channel
console.log('\n--- Testing error handling ---');
{
    const response = new Uint8Array(64);
    response[0] = 0x02; // Wrong channel
    response[1] = 0x02;
    response[2] = 0x05;
    response[3] = 0x00;
    response[4] = 0x00;
    response[5] = 0x00;
    response[6] = 0x01;
    response[7] = 0xAA;
    
    try {
        unwrapResponseAPDU(CHANNEL, response, PACKET_SIZE);
        console.log('✗ Should throw on invalid channel');
        failed++;
    } catch (e) {
        assert(e.message.includes('Invalid channel'), 'Should throw on invalid channel');
    }
}

// Test 9: Error handling - invalid tag
{
    const response = new Uint8Array(64);
    response[0] = 0x01;
    response[1] = 0x01;
    response[2] = 0x04; // Wrong tag (should be 0x05)
    response[3] = 0x00;
    response[4] = 0x00;
    response[5] = 0x00;
    response[6] = 0x01;
    response[7] = 0xAA;
    
    try {
        unwrapResponseAPDU(CHANNEL, response, PACKET_SIZE);
        console.log('✗ Should throw on invalid tag');
        failed++;
    } catch (e) {
        assert(e.message.includes('Invalid tag'), 'Should throw on invalid tag');
    }
}

// Test 10: BLE mode (no channel header)
console.log('\n--- Testing BLE mode ---');
{
    const apdu = new Uint8Array([0xe0, 0xc4, 0x00, 0x00, 0x00]);
    const wrapped = wrapCommandAPDU(0, apdu, PACKET_SIZE, true);
    
    // BLE mode: no channel header, just tag + seq + len + data
    assertEqual(wrapped[0], 0x05, 'BLE: Tag should be first byte');
    assertEqual(wrapped[1], 0x00, 'BLE: Seq high');
    assertEqual(wrapped[2], 0x00, 'BLE: Seq low');
    assertEqual(wrapped[3], 0x00, 'BLE: Len high');
    assertEqual(wrapped[4], 0x05, 'BLE: Len low');
    assertEqual(wrapped[5], 0xe0, 'BLE: First APDU byte');
}

// Summary
console.log('\n--- Summary ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
