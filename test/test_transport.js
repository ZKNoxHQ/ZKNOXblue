/**
 * Tests for transport.js
 * Run with: node test_transport.js
 * 
 * Note: WebHID tests require a browser environment.
 * These tests focus on the mock transport and utility functions.
 */

import { TransportMock, getDongle } from '../src/transport.js';
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
        failed++;
    }
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Test 1: TransportMock basic exchange
console.log('\n--- Testing TransportMock basic exchange ---');
{
    const mock = new TransportMock();
    
    const apdu = hexToBytes('e0c4000000');
    const response = await mock.exchange(apdu);
    
    // Default response is empty (just 9000 status, stripped)
    assertEqual(response.length, 0, 'Default response should be empty');
    assertEqual(mock.exchanges.length, 1, 'Should record one exchange');
}

// Test 2: TransportMock with custom response handler
console.log('\n--- Testing TransportMock with custom handler ---');
{
    const handler = async (apdu) => {
        // Simulate a version response
        return hexToBytes('0102030405060708090a9000');
    };
    
    const mock = new TransportMock(handler);
    const apdu = hexToBytes('e0c4000000');
    const response = await mock.exchange(apdu);
    
    assertEqual(response.length, 10, 'Response should be 10 bytes');
    assertEqual(bytesToHex(response), '0102030405060708090a', 'Response data should match');
}

// Test 3: TransportMock error handling
console.log('\n--- Testing TransportMock error handling ---');
{
    const handler = async (apdu) => {
        // Return error status
        return hexToBytes('6985'); // Condition not satisfied
    };
    
    const mock = new TransportMock(handler);
    
    try {
        await mock.exchange(hexToBytes('e0c4000000'));
        console.log('✗ Should throw on error status');
        failed++;
    } catch (e) {
        assert(e instanceof CommException, 'Should throw CommException');
        assertEqual(e.sw, 0x6985, 'SW should be 6985');
    }
}

// Test 4: TransportMock records all exchanges
console.log('\n--- Testing TransportMock exchange recording ---');
{
    const mock = new TransportMock();
    
    await mock.exchange(hexToBytes('e0040000'));
    await mock.exchange(hexToBytes('e0500000'));
    await mock.exchange(hexToBytes('e0510000'));
    
    assertEqual(mock.exchanges.length, 3, 'Should record 3 exchanges');
    assertEqual(bytesToHex(mock.exchanges[0]), 'e0040000', 'First exchange');
    assertEqual(bytesToHex(mock.exchanges[1]), 'e0500000', 'Second exchange');
    assertEqual(bytesToHex(mock.exchanges[2]), 'e0510000', 'Third exchange');
}

// Test 5: getDongle with mock
console.log('\n--- Testing getDongle with mock ---');
{
    const mockTransport = new TransportMock();
    const dongle = await getDongle(false, mockTransport);
    
    assert(dongle === mockTransport, 'Should return the mock transport');
}

// Test 6: TransportMock open/close
console.log('\n--- Testing TransportMock open/close ---');
{
    const mock = new TransportMock();
    
    assert(mock.opened, 'Should start opened');
    
    await mock.close();
    assert(!mock.opened, 'Should be closed after close()');
    
    await mock.open();
    assert(mock.opened, 'Should be opened after open()');
}

// Test 7: TransportMock apduMaxDataSize
console.log('\n--- Testing TransportMock apduMaxDataSize ---');
{
    const mock = new TransportMock();
    assertEqual(mock.apduMaxDataSize(), 255, 'apduMaxDataSize should be 255');
}

// Test 8: TransportMock debug mode
console.log('\n--- Testing TransportMock debug mode ---');
{
    let debugOutput = [];
    const originalLog = console.log;
    console.log = (...args) => debugOutput.push(args.join(' '));
    
    const mock = new TransportMock(null, true);
    await mock.exchange(hexToBytes('e0c4000000'));
    
    console.log = originalLog;
    
    assert(debugOutput.some(line => line.includes('MOCK =>')), 'Should log outgoing');
    assert(debugOutput.some(line => line.includes('MOCK <=')), 'Should log incoming');
}

// Test 9: Simulate device protocol
console.log('\n--- Testing simulated device protocol ---');
{
    const deviceState = {
        identified: false,
        nonceExchanged: false
    };
    
    const handler = async (apdu) => {
        const cla = apdu[0];
        const ins = apdu[1];
        
        if (cla === 0xe0 && ins === 0x04) {
            // Identify
            deviceState.identified = true;
            return hexToBytes('9000');
        }
        
        if (cla === 0xe0 && ins === 0x50) {
            // Get nonce
            if (!deviceState.identified) {
                return hexToBytes('6985'); // Not identified
            }
            deviceState.nonceExchanged = true;
            // Return serial + nonce
            return hexToBytes('00000001' + '0102030405060708' + '9000');
        }
        
        return hexToBytes('6d00'); // Unknown command
    };
    
    const mock = new TransportMock(handler);
    
    // Try to get nonce before identify - should work since we identify first
    const identifyResponse = await mock.exchange(hexToBytes('e004000004' + '33100004'));
    assert(deviceState.identified, 'Device should be identified');
    
    // Now get nonce
    const nonceResponse = await mock.exchange(hexToBytes('e050000008' + '0a0b0c0d0e0f1011'));
    assert(deviceState.nonceExchanged, 'Nonce should be exchanged');
    assertEqual(nonceResponse.length, 12, 'Nonce response should be 12 bytes');
}

// Test 10: Error messages
console.log('\n--- Testing error messages ---');
{
    const testCases = [
        { sw: 0x6985, contains: 'denied' },
        { sw: 0x6a84, contains: 'space' },
        { sw: 0x5515, contains: 'unlock' },
        { sw: 0x6e01, contains: 'CLA' },
    ];
    
    for (const tc of testCases) {
        const handler = async () => {
            const sw = new Uint8Array([tc.sw >> 8, tc.sw & 0xff]);
            return sw;
        };
        
        const mock = new TransportMock(handler);
        
        try {
            await mock.exchange(hexToBytes('e0c4000000'));
            console.log(`✗ Should throw for SW ${tc.sw.toString(16)}`);
            failed++;
        } catch (e) {
            assert(
                e.message.toLowerCase().includes(tc.contains.toLowerCase()),
                `SW ${tc.sw.toString(16)} error should contain "${tc.contains}"`
            );
        }
    }
}

// Summary
console.log('\n--- Summary ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
