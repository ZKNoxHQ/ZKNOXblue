#!/usr/bin/env python3
"""
SCP Debug Tool - Compare Python and JavaScript SCP implementations

This tool helps debug SCP encryption differences by:
1. Computing ECDH secret from known keys
2. Deriving encryption and MAC keys
3. Encrypting a test command
4. Showing all intermediate values

Run: python3 debug_scp.py
"""

from Crypto.Cipher import AES
import hashlib

def hex_to_bytes(h):
    return bytes.fromhex(h)

def bytes_to_hex(b):
    return b.hex()

# Test with values from JavaScript log (copy-paste from console)
# UPDATE THESE VALUES from your JavaScript session:
device_pubkey_hex = "04349ab80572c4a9b5432aaac786c08e659d042ddc6c7285d5957f37cd12a69159e3d2d9a8c9603791e1e78ca852857396c133ca2ed227fdc76d2d94f7048aeccd"
our_privkey_hex = "673e2ddea3161d72e1e57d15de6bd7e99610425dfd15e2e242a0737486bc3762"

print("="*70)
print("SCP Debug Tool - Comparing Python vs JavaScript")
print("="*70)

# Step 1: Compute ECDH using ledgerblue
print("\n[Step 1] ECDH Computation")
print("-"*70)

try:
    from ledgerblue.ecWrapper import PrivateKey, PublicKey
    
    privkey = PrivateKey(bytes.fromhex(our_privkey_hex))
    pubkey = PublicKey(bytes.fromhex(device_pubkey_hex), raw=True)
    
    # Python's default (scpv3=False) - compressed point format
    ecdh_secret = pubkey.ecdh(privkey.serialize(), scpv3=False)
    
    print(f"Device pubkey: {device_pubkey_hex[:40]}...")
    print(f"Our privkey:   {our_privkey_hex}")
    print(f"ECDH secret:   {ecdh_secret.hex()}")
    
except ImportError:
    print("ledgerblue not installed! Using manual computation...")
    
    # Manual ECDH computation
    from ecpy.curves import Curve, Point
    cv = Curve.get_curve('secp256k1')
    
    pubkey_bytes = bytes.fromhex(device_pubkey_hex)
    x = int.from_bytes(pubkey_bytes[1:33], 'big')
    y = int.from_bytes(pubkey_bytes[33:65], 'big')
    pub_point = Point(x, y, cv)
    
    scalar = int.from_bytes(bytes.fromhex(our_privkey_hex), 'big')
    shared_point = scalar * pub_point
    
    # Compressed format
    prefix = b"\x03" if (shared_point.y & 1) != 0 else b"\x02"
    compressed = prefix + shared_point.x.to_bytes(32, 'big')
    
    print(f"Shared point (compressed): {compressed.hex()}")
    
    ecdh_secret = hashlib.sha256(compressed).digest()
    print(f"ECDH secret: {ecdh_secret.hex()}")

# Step 2: Derive SCP v3 keys
print("\n[Step 2] Key Derivation (SCP v3)")
print("-"*70)

# ENC key = AES-256-ECB(ecdh_secret, 0x02 * 16)
enc_block = b'\x02' * 16
cipher = AES.new(ecdh_secret, AES.MODE_ECB)
enc_key = cipher.encrypt(enc_block)

# MAC key = AES-256-ECB(ecdh_secret, 0x01 * 16)
mac_block = b'\x01' * 16
cipher = AES.new(ecdh_secret, AES.MODE_ECB)
mac_key = cipher.encrypt(mac_block)

print(f"ENC key: {enc_key.hex()}")
print(f"MAC key: {mac_key.hex()}")

# Step 3: Encrypt a test command (LIST_APP = 0x0e)
print("\n[Step 3] Encrypt LIST_APP command (0x0e)")
print("-"*70)

plaintext = b'\x0e'  # LIST_APP command
print(f"Plaintext: {plaintext.hex()}")

# Pad with 0x80 + zeros to 16 bytes
padded = plaintext + b'\x80' + b'\x00' * (16 - len(plaintext) - 1)
print(f"Padded:    {padded.hex()}")

# Encrypt with AES-CBC (IV = zeros)
enc_iv = b'\x00' * 16
cipher = AES.new(enc_key, AES.MODE_CBC, enc_iv)
encrypted = cipher.encrypt(padded)
print(f"Encrypted: {encrypted.hex()}")

# Compute MAC
mac_iv = b'\x00' * 16
cipher = AES.new(mac_key, AES.MODE_CBC, mac_iv)
mac_result = cipher.encrypt(encrypted)
mac_14 = mac_result[:14]
print(f"MAC (14b): {mac_14.hex()}")

# Final result
final = encrypted + mac_14
print(f"Final:     {final.hex()}")

# Step 4: Compare with JavaScript
print("\n[Step 4] Comparison")
print("-"*70)

# Copy-paste the JavaScript values here to compare:
js_ecdh_secret = "01a732daf9fcd9d23dc6b42ad8ccd99d68307fae1add3cbb3910535a8677c7f3"  # From JS log
js_enc_key = "247f533ad0ca4ca3a04e8d3c5ea90553"
js_mac_key = "1f15bea500faf629749239b0bc542586"
js_encrypted = "7c023156ba488fbe006f3aee3c2409a5"
js_mac = "324b6c55662207721b5b9c13c439"
js_final = "7c023156ba488fbe006f3aee3c2409a5324b6c55662207721b5b9c13c439"

print(f"Python ECDH:  {ecdh_secret.hex()}")
print(f"JS ECDH:      {js_ecdh_secret}")
print(f"ECDH Match:   {'✓' if ecdh_secret.hex() == js_ecdh_secret else '✗ DIFFERENT!'}")

print(f"\nPython ENC:   {enc_key.hex()}")
print(f"JS ENC:       {js_enc_key}")
print(f"ENC Match:    {'✓' if enc_key.hex() == js_enc_key else '✗ DIFFERENT!'}")

print(f"\nPython MAC:   {mac_key.hex()}")
print(f"JS MAC:       {js_mac_key}")
print(f"MAC Match:    {'✓' if mac_key.hex() == js_mac_key else '✗ DIFFERENT!'}")

print(f"\nPython Final: {final.hex()}")
print(f"JS Final:     {js_final}")
print(f"Final Match:  {'✓' if final.hex() == js_final else '✗ DIFFERENT!'}")

print("\n" + "="*70)
if ecdh_secret.hex() != js_ecdh_secret:
    print("⚠️  ECDH secrets don't match!")
    print("   This means Python and JavaScript compute ECDH differently.")
    print("   The issue is in the ECDH computation, not the encryption.")
else:
    print("✓ ECDH matches - encryption should work!")
print("="*70)
