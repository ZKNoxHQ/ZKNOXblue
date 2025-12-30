#!/usr/bin/env python3
"""
Test with EXACT values from the JavaScript session.
Run: python3 test_exact_ecdh.py

This will show what Python computes so we can compare byte-by-byte.
"""

from Crypto.Cipher import AES
import hashlib

# EXACT values from JavaScript log:
DEVICE_PUBKEY = "04e407c4457e1d0fe932b087e873b014ff741361d1584aa886b4b5bc66b4fa8eedde7c39eae58c65fff5fff02028359298726dbd6427d5a9d073a4408ff6ec5055"
OUR_PRIVKEY = "dcfcc8c2eda95ff73094b72098d266556b5f3d34c9b762c2c26a27f81b984b3d"

# JavaScript computed:
JS_COMPRESSED = "0270bd40b5550cf723924454778be88481302b7f3f3d6bee2511199cb8c429951e"
JS_ECDH = "9a46877dee807fc7ee2b6588784517921a2e48f51c84da2a4054a3544ec3cc24"
JS_ENC_KEY = "062220b8ecd96057655e0c8c994e3b14"
JS_MAC_KEY = "1440d61a7551b8cb1c1042bf46c2b85b"

print("="*70)
print("EXACT ECDH Comparison")
print("="*70)
print(f"Device pubkey: {DEVICE_PUBKEY[:40]}...")
print(f"Our privkey:   {OUR_PRIVKEY}")

# Try with ledgerblue
try:
    from ledgerblue.ecWrapper import PrivateKey, PublicKey
    HAS_LEDGERBLUE = True
except ImportError:
    HAS_LEDGERBLUE = False
    print("\nledgerblue not installed, using ecpy...")

if HAS_LEDGERBLUE:
    privkey = PrivateKey(bytes.fromhex(OUR_PRIVKEY))
    pubkey = PublicKey(bytes.fromhex(DEVICE_PUBKEY), raw=True)
    
    # What does Python compute?
    py_ecdh = pubkey.ecdh(privkey.serialize(), scpv3=False)
    print(f"\nPython ECDH (scpv3=False): {py_ecdh.hex()}")
    print(f"JavaScript ECDH:           {JS_ECDH}")
    print(f"Match: {'✓ YES' if py_ecdh.hex() == JS_ECDH else '✗ NO - DIFFERENT!'}")
    
    if py_ecdh.hex() != JS_ECDH:
        # Also try scpv3=True
        py_ecdh_v3 = pubkey.ecdh(privkey.serialize(), scpv3=True)
        print(f"\nPython ECDH (scpv3=True):  {py_ecdh_v3.hex()}")
        if py_ecdh_v3.hex() == JS_ECDH:
            print("✓ JavaScript matches scpv3=True!")
else:
    # Manual computation with ecpy
    from ecpy.curves import Curve, Point
    cv = Curve.get_curve('secp256k1')
    
    pubkey_bytes = bytes.fromhex(DEVICE_PUBKEY)
    x = int.from_bytes(pubkey_bytes[1:33], 'big')
    y = int.from_bytes(pubkey_bytes[33:65], 'big')
    pub_point = Point(x, y, cv)
    
    scalar = int.from_bytes(bytes.fromhex(OUR_PRIVKEY), 'big')
    shared_point = scalar * pub_point
    
    # Compressed format
    prefix = b"\x03" if (shared_point.y & 1) != 0 else b"\x02"
    compressed = prefix + shared_point.x.to_bytes(32, 'big')
    
    print(f"\nShared point X: {shared_point.x:064x}")
    print(f"Shared point Y: {shared_point.y:064x}")
    print(f"\nCompressed point: {compressed.hex()}")
    print(f"JS compressed:    {JS_COMPRESSED}")
    print(f"Match: {'✓' if compressed.hex() == JS_COMPRESSED else '✗ DIFFERENT!'}")
    
    py_ecdh = hashlib.sha256(compressed).digest()
    print(f"\nPython ECDH: {py_ecdh.hex()}")
    print(f"JS ECDH:     {JS_ECDH}")
    print(f"Match: {'✓ YES' if py_ecdh.hex() == JS_ECDH else '✗ NO!'}")

# Now test key derivation
print("\n" + "="*70)
print("Key Derivation Test")
print("="*70)

ecdh_bytes = bytes.fromhex(JS_ECDH)

# ENC key
cipher = AES.new(ecdh_bytes, AES.MODE_ECB)
enc_key = cipher.encrypt(b'\x02' * 16)
print(f"\nENC key (Python): {enc_key.hex()}")
print(f"ENC key (JS):     {JS_ENC_KEY}")
print(f"Match: {'✓' if enc_key.hex() == JS_ENC_KEY else '✗'}")

# MAC key
cipher = AES.new(ecdh_bytes, AES.MODE_ECB)
mac_key = cipher.encrypt(b'\x01' * 16)
print(f"\nMAC key (Python): {mac_key.hex()}")
print(f"MAC key (JS):     {JS_MAC_KEY}")
print(f"Match: {'✓' if mac_key.hex() == JS_MAC_KEY else '✗'}")

# Test actual delete command encryption
print("\n" + "="*70)
print("Delete Command Encryption Test")
print("="*70)

# Delete "ZKNOXHX" (7 chars)
app_name = "ZKNOXHX"
plaintext = bytes([0x0c, len(app_name)]) + app_name.encode()
print(f"Plaintext: {plaintext.hex()}")

# Pad
padded = plaintext + b'\x80' + b'\x00' * (16 - len(plaintext) - 1)
print(f"Padded:    {padded.hex()}")

# Encrypt
cipher = AES.new(enc_key, AES.MODE_CBC, b'\x00' * 16)
encrypted = cipher.encrypt(padded)
print(f"Encrypted: {encrypted.hex()}")

# MAC
cipher = AES.new(mac_key, AES.MODE_CBC, b'\x00' * 16)
mac = cipher.encrypt(encrypted)[:14]
print(f"MAC:       {mac.hex()}")

# Final
final = encrypted + mac
print(f"Final:     {final.hex()}")

# Compare with JS
JS_ENCRYPTED = "4cbb8faa790f0e5ca42721d32c3f6dbc"
JS_MAC = "f74c54c63beb6f96c13c40b973e3"
JS_FINAL = "4cbb8faa790f0e5ca42721d32c3f6dbcf74c54c63beb6f96c13c40b973e3"

print(f"\n--- Comparison ---")
print(f"Encrypted match: {'✓' if encrypted.hex() == JS_ENCRYPTED else '✗'}")
print(f"MAC match:       {'✓' if mac.hex() == JS_MAC else '✗'}")
print(f"Final match:     {'✓' if final.hex() == JS_FINAL else '✗'}")

if final.hex() == JS_FINAL:
    print("\n✓ Everything matches! The encryption is correct.")
    print("  The issue must be in the SCP handshake or device state.")
else:
    print("\n✗ Mismatch found - check the differences above.")
