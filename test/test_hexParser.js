/**
 * Tests for hexParser.js
 * Run with: node test_hexParser.js
 */

import { IntelHexParser, IntelHexPrinter, IntelHexArea, hexToBytes, bytesToHex } from '../src/hexParser.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        console.log(`  Expected: ${JSON.stringify(expectedArr.slice(0, 20))}...`);
        console.log(`  Got:      ${JSON.stringify(actualArr.slice(0, 20))}...`);
        failed++;
    }
}

// Test 1: hexToBytes utility
console.log('\n--- Testing hexToBytes ---');
{
    const result = hexToBytes('deadbeef');
    assertArrayEqual(result, [0xde, 0xad, 0xbe, 0xef], 'hexToBytes basic conversion');
}
{
    const result = hexToBytes('00ff');
    assertArrayEqual(result, [0x00, 0xff], 'hexToBytes with 00 and ff');
}

// Test 2: bytesToHex utility
console.log('\n--- Testing bytesToHex ---');
{
    const result = bytesToHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    assertEqual(result, 'deadbeef', 'bytesToHex basic conversion');
}

// Test 3: Parse simple HEX content
console.log('\n--- Testing IntelHexParser with simple content ---');
{
    const hexContent = `:020000040800F2
:1000000000200020ED000008F1000008F300000844
:04000005080000ED02
:00000001FF`;
    
    const parser = new IntelHexParser(hexContent);
    
    assertEqual(parser.getAreas().length, 1, 'Parser should find 1 area');
    assertEqual(parser.getBootAddr(), 0x080000ED, 'Boot address should be 0x080000ED');
    assertEqual(parser.minAddr(), 0x08000000, 'Min address should be 0x08000000');
    assertEqual(parser.maxAddr(), 0x08000010, 'Max address should be 0x08000010');
}

// Test 4: Parse sample HEX file
console.log('\n--- Testing IntelHexParser with sample file ---');
{
    const hexPath = path.join(__dirname, '../samples/test_app.hex');
    const hexContent = fs.readFileSync(hexPath, 'utf8');
    
    const parser = new IntelHexParser(hexContent);
    
    assert(parser.getAreas().length >= 1, 'Parser should find at least 1 area');
    assertEqual(parser.getBootAddr(), 0x080000ED, 'Boot address from file');
    
    const areas = parser.getAreas();
    console.log(`  Found ${areas.length} area(s)`);
    for (const area of areas) {
        console.log(`    Area: start=0x${area.start.toString(16)}, size=${area.data.length}`);
    }
}

// Test 5: IntelHexArea class
console.log('\n--- Testing IntelHexArea ---');
{
    const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const area = new IntelHexArea(0x08000000, data);
    
    assertEqual(area.getStart(), 0x08000000, 'Area start address');
    assertArrayEqual(area.getData(), [0x01, 0x02, 0x03, 0x04], 'Area data');
    
    area.setData(new Uint8Array([0x05, 0x06]));
    assertArrayEqual(area.getData(), [0x05, 0x06], 'Area data after setData');
}

// Test 6: IntelHexPrinter from parser
console.log('\n--- Testing IntelHexPrinter ---');
{
    const hexContent = `:020000040800F2
:1000000000200020ED000008F1000008F300000844
:04000005080000ED02
:00000001FF`;
    
    const parser = new IntelHexParser(hexContent);
    const printer = new IntelHexPrinter(parser);
    
    assertEqual(printer.getAreas().length, 1, 'Printer should have 1 area');
    assertEqual(printer.getBootAddr(), 0x080000ED, 'Printer boot address');
    assertEqual(printer.minAddr(), parser.minAddr(), 'Printer minAddr matches parser');
    assertEqual(printer.maxAddr(), parser.maxAddr(), 'Printer maxAddr matches parser');
}

// Test 7: IntelHexPrinter addArea
console.log('\n--- Testing IntelHexPrinter.addArea ---');
{
    const printer = new IntelHexPrinter();
    
    printer.addArea(0x08001000, new Uint8Array([0x01, 0x02, 0x03]));
    printer.addArea(0x08000000, new Uint8Array([0x04, 0x05, 0x06]));
    
    assertEqual(printer.getAreas().length, 2, 'Should have 2 areas');
    assertEqual(printer.minAddr(), 0x08000000, 'minAddr should be the lower address');
    assertEqual(printer.getAreas()[0].start, 0x08000000, 'Areas should be sorted by start');
}

// Test 8: IntelHexPrinter generate
console.log('\n--- Testing IntelHexPrinter.generate ---');
{
    const printer = new IntelHexPrinter();
    printer.addArea(0x08000000, new Uint8Array([0x00, 0x20, 0x00, 0x20]));
    printer.setBootAddr(0x080000ED);
    
    const output = printer.generate(16);
    
    assert(output.includes(':020000040800'), 'Output should have extended address record');
    assert(output.includes(':00000001FF'), 'Output should have EOF record');
    assert(output.includes(':04000005'), 'Output should have start address record');
    console.log('  Generated HEX:');
    output.split('\r\n').forEach(line => {
        if (line) console.log(`    ${line}`);
    });
}

// Test 9: Round-trip test (parse -> print -> parse)
console.log('\n--- Testing round-trip (parse -> print -> parse) ---');
{
    const original = `:020000040800F2
:1000000000200020ED000008F1000008F300000844
:04000005080000ED02
:00000001FF`;
    
    const parser1 = new IntelHexParser(original);
    const printer = new IntelHexPrinter(parser1);
    const generated = printer.generate(16);
    const parser2 = new IntelHexParser(generated);
    
    assertEqual(parser1.getBootAddr(), parser2.getBootAddr(), 'Boot address preserved');
    assertEqual(parser1.minAddr(), parser2.minAddr(), 'Min address preserved');
    assertEqual(parser1.maxAddr(), parser2.maxAddr(), 'Max address preserved');
    assertArrayEqual(
        parser1.getAreas()[0].getData(),
        parser2.getAreas()[0].getData(),
        'Data preserved'
    );
}

// Test 10: Error handling
console.log('\n--- Testing error handling ---');
{
    try {
        new IntelHexParser('invalid line without colon');
        console.log('✗ Should throw on invalid line');
        failed++;
    } catch (e) {
        assert(e.message.includes('Invalid data'), 'Should throw on invalid line');
    }
}

// Summary
console.log('\n--- Summary ---');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
