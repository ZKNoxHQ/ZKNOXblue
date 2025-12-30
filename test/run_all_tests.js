/**
 * Run all tests
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
    'test_hexParser.js',
    'test_ledgerWrapper.js',
    'test_ecWrapper.js',
    'test_deployed.js',
    'test_transport.js',
    'test_hexLoader.js',
    'test_loadApp.js'
];

async function runTest(testFile) {
    return new Promise((resolve, reject) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Running: ${testFile}`);
        console.log('='.repeat(60));
        
        const testPath = path.join(__dirname, testFile);
        const proc = spawn('node', [testPath], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ test: testFile, passed: true });
            } else {
                resolve({ test: testFile, passed: false, code });
            }
        });
        
        proc.on('error', (err) => {
            resolve({ test: testFile, passed: false, error: err.message });
        });
    });
}

async function main() {
    console.log('LedgerJS Test Suite');
    console.log('='.repeat(60));
    
    const results = [];
    
    for (const test of tests) {
        const result = await runTest(test);
        results.push(result);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('Test Summary');
    console.log('='.repeat(60));
    
    let allPassed = true;
    for (const result of results) {
        const status = result.passed ? '✓ PASS' : '✗ FAIL';
        console.log(`${status}: ${result.test}`);
        if (!result.passed) {
            allPassed = false;
        }
    }
    
    console.log('='.repeat(60));
    
    if (allPassed) {
        console.log('All tests passed!');
        process.exit(0);
    } else {
        console.log('Some tests failed!');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
