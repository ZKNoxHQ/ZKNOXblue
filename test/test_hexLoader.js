/**
 * Tests for hexLoader.js
 * Run with: node test_hexLoader.js
 */

import { 
    HexLoader, 
    encodelv, 
    encodetlv,
    BOLOS_TAG_APPNAME,
    BOLOS_TAG_APPVERSION,
    BOLOS_TAG_ICON,
    BOLOS_TAG_DERIVEPATH
} from '../src/hexLoader.js';
import { TransportMock } from '../src/transport.js';
import { IntelHexParser, IntelHexPrinter } from '../src/hexParser.js';

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
        console.log(`  Expected: [${expectedArr.slice(0, 10).join(', ')}...]`);
        console.log(`  Got:      [${actualArr.slice(0, 10).join(', ')}...]`);
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

// Test 1: encodelv function
console.log('\n--- Testing encodelv ---');
{
    // Short length (< 128)
    const short = encodelv(new Uint8Array([0x01, 0x02, 0x03]));
    assertEqual(short[0], 3, 'Short length byte');
    assertArrayEqual(short.slice(1), [0x01, 0x02, 0x03], 'Short value');
    
    // Medium length (128-255)
    const medium = new Uint8Array(200);
    const mediumEncoded = encodelv(medium);
    assertEqual(mediumEncoded[0], 0x81, 'Medium length marker');
    assertEqual(mediumEncoded[1], 200, 'Medium length value');
    
    // Long length (256-65535)
    const long = new Uint8Array(1000);
    const longEncoded = encodelv(long);
    assertEqual(longEncoded[0], 0x82, 'Long length marker');
    assertEqual((longEncoded[1] << 8) | longEncoded[2], 1000, 'Long length value');
}

// Test 2: encodetlv function
console.log('\n--- Testing encodetlv ---');
{
    const value = new Uint8Array([0x41, 0x42, 0x43]); // "ABC"
    const tlv = encodetlv(BOLOS_TAG_APPNAME, value);
    
    assertEqual(tlv[0], BOLOS_TAG_APPNAME, 'TLV tag');
    assertEqual(tlv[1], 3, 'TLV length');
    assertArrayEqual(tlv.slice(2), [0x41, 0x42, 0x43], 'TLV value');
}

// Test 3: CRC16 calculation
console.log('\n--- Testing CRC16 ---');
{
    const mock = new TransportMock();
    const loader = new HexLoader(mock, 0xe0, false);
    
    // Test with known data
    const testData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const crc = loader.crc16(testData);
    
    assert(typeof crc === 'number', 'CRC should be a number');
    assert(crc >= 0 && crc <= 0xffff, 'CRC should be 16-bit');
    
    // Same data should give same CRC
    const crc2 = loader.crc16(testData);
    assertEqual(crc, crc2, 'CRC should be deterministic');
    
    // Different data should give different CRC
    const testData2 = new Uint8Array([0x04, 0x03, 0x02, 0x01]);
    const crc3 = loader.crc16(testData2);
    assert(crc !== crc3, 'Different data should give different CRC');
}

// Test 4: HexLoader without encryption
console.log('\n--- Testing HexLoader without encryption ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    // Test selectSegment
    await loader.selectSegment(0x08000000);
    assert(exchanges.length > 0, 'Should have made an exchange');
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.includes('05'), 'Select segment should have command 0x05');
    assert(lastApdu.includes('08000000'), 'Should contain address');
}

// Test 5: HexLoader loadSegmentChunk
console.log('\n--- Testing loadSegmentChunk ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    const chunk = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    await loader.loadSegmentChunk(0x0100, chunk);
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.includes('06'), 'Load chunk should have command 0x06');
    assert(lastApdu.includes('0100'), 'Should contain offset');
    assert(lastApdu.includes('deadbeef'), 'Should contain data');
}

// Test 6: HexLoader flushSegment
console.log('\n--- Testing flushSegment ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    await loader.flushSegment();
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.includes('07'), 'Flush segment should have command 0x07');
}

// Test 7: HexLoader crcSegment
console.log('\n--- Testing crcSegment ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    await loader.crcSegment(0, 256, 0x1234);
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.includes('08'), 'CRC segment should have command 0x08');
    assert(lastApdu.includes('1234'), 'Should contain CRC value');
}

// Test 8: HexLoader createApp
console.log('\n--- Testing createApp ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    await loader.createApp(
        1024,  // codeLength
        12,    // apiLevel
        256,   // dataLength
        64,    // installParamsLength
        0,     // flags
        1      // bootOffset
    );
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.startsWith('e0'), 'Should use CLA 0xE0');
    assert(lastApdu.includes('0b'), 'Create app should have command 0x0b');
    
    // Verify createappParams was set
    assert(loader.createappParams !== null, 'createappParams should be set');
}

// Test 9: HexLoader deleteApp
console.log('\n--- Testing deleteApp ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    const appName = new TextEncoder().encode('TestApp');
    await loader.deleteApp(appName);
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.includes('0c'), 'Delete app should have command 0x0c');
    assert(lastApdu.includes('54657374417070'), 'Should contain app name "TestApp"');
}

// Test 10: HexLoader boot
console.log('\n--- Testing boot ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    await loader.boot(0x080000ED);
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.includes('09'), 'Boot should have command 0x09');
}

// Test 11: HexLoader commit
console.log('\n--- Testing commit ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    await loader.commit();
    
    const lastApdu = exchanges[exchanges.length - 1];
    assert(lastApdu.includes('09'), 'Commit should have command 0x09');
}

// Test 12: HexLoader load with HEX file
console.log('\n--- Testing load with HEX file ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(bytesToHex(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    // Create a simple hex file
    const hexContent = `:020000040800F2
:1000000000200020ED000008F1000008F300000844
:04000005080000ED02
:00000001FF`;
    
    const parser = new IntelHexParser(hexContent);
    const printer = new IntelHexPrinter(parser);
    
    const hash = await loader.load(0, 0xf0, printer, {
        targetId: 0x33100004,
        targetVersion: '1.0.0',
        doCRC: true
    });
    
    assert(hash.length === 64, 'Hash should be 64 hex chars (32 bytes)');
    assert(exchanges.length > 0, 'Should have made exchanges');
    
    // Should have: selectSegment, loadSegmentChunk(s), flushSegment, crcSegment
    // APDU structure: CLA(2) INS(2) P1(2) P2(2) Lc(2) CMD(2) ...
    // Command byte is at position 10-12 in hex string (byte index 5)
    const commands = exchanges.map(e => e.slice(10, 12));
    assert(commands.includes('05'), 'Should have selectSegment (0x05)');
    assert(commands.includes('06'), 'Should have loadSegmentChunk (0x06)');
    assert(commands.includes('07'), 'Should have flushSegment (0x07)');
    assert(commands.includes('08'), 'Should have crcSegment (0x08)');
    
    console.log(`  Loaded with hash: ${hash}`);
    console.log(`  Total exchanges: ${exchanges.length}`);
}

// Test 13: TLV tag constants
console.log('\n--- Testing TLV tag constants ---');
{
    assertEqual(BOLOS_TAG_APPNAME, 0x01, 'BOLOS_TAG_APPNAME');
    assertEqual(BOLOS_TAG_APPVERSION, 0x02, 'BOLOS_TAG_APPVERSION');
    assertEqual(BOLOS_TAG_ICON, 0x03, 'BOLOS_TAG_ICON');
    assertEqual(BOLOS_TAG_DERIVEPATH, 0x04, 'BOLOS_TAG_DERIVEPATH');
}

// Test 14: Build install params with TLV
console.log('\n--- Testing TLV install params building ---');
{
    const appName = new TextEncoder().encode('MyApp');
    const appVersion = new TextEncoder().encode('1.0.0');
    
    let installParams = new Uint8Array(0);
    
    // Add app name
    const nameTlv = encodetlv(BOLOS_TAG_APPNAME, appName);
    let newParams = new Uint8Array(installParams.length + nameTlv.length);
    newParams.set(installParams);
    newParams.set(nameTlv, installParams.length);
    installParams = newParams;
    
    // Add app version
    const versionTlv = encodetlv(BOLOS_TAG_APPVERSION, appVersion);
    newParams = new Uint8Array(installParams.length + versionTlv.length);
    newParams.set(installParams);
    newParams.set(versionTlv, installParams.length);
    installParams = newParams;
    
    // Verify structure
    assertEqual(installParams[0], BOLOS_TAG_APPNAME, 'First TLV should be app name');
    assertEqual(installParams[1], 5, 'App name length should be 5');
    
    const versionOffset = 2 + 5; // tag + len + "MyApp"
    assertEqual(installParams[versionOffset], BOLOS_TAG_APPVERSION, 'Second TLV should be app version');
    
    console.log(`  Install params: ${bytesToHex(installParams)}`);
}

// Test 15: HexLoader apduMaxDataSize
console.log('\n--- Testing apduMaxDataSize ---');
{
    const mock = new TransportMock();
    const loader = new HexLoader(mock, 0xe0, false);
    
    // Default max MTU should be 0xFE (254)
    assert(loader.maxMtu <= 0xfe, 'Max MTU should be <= 254');
    assert(loader.maxMtu > 0, 'Max MTU should be positive');
}

// Test 16: Verify command structure
console.log('\n--- Testing command structure ---');
{
    const exchanges = [];
    const handler = async (apdu) => {
        exchanges.push(new Uint8Array(apdu));
        return hexToBytes('9000');
    };
    
    const mock = new TransportMock(handler);
    const loader = new HexLoader(mock, 0xe0, false);
    
    await loader.selectSegment(0x08001234);
    
    const apdu = exchanges[0];
    assertEqual(apdu[0], 0xe0, 'CLA should be 0xE0');
    assertEqual(apdu[1], 0x00, 'INS should be 0x00');
    assertEqual(apdu[2], 0x00, 'P1 should be 0x00');
    assertEqual(apdu[3], 0x00, 'P2 should be 0x00');
    assertEqual(apdu[4], 5, 'Data length should be 5');
    assertEqual(apdu[5], 0x05, 'Command should be 0x05 (selectSegment)');
    assertEqual(apdu[6], 0x08, 'Address byte 0');
    assertEqual(apdu[7], 0x00, 'Address byte 1');
    assertEqual(apdu[8], 0x12, 'Address byte 2');
    assertEqual(apdu[9], 0x34, 'Address byte 3');
}

// Summary
console.log('\n--- Summary ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
