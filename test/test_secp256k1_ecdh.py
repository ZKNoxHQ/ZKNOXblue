#!/usr/bin/env python3
"""
Test what Python's secp256k1 library ACTUALLY returns for ECDH.

The secp256k1-py library's ecdh() function might use a different format
than simple SHA256(compressed_point).

Run: python3 test_secp256k1_ecdh.py
"""

import hashlib

# Test keys
DEVICE_PUBKEY = "04e407c4457e1d0fe932b087e873b014ff741361d1584aa886b4b5bc66b4fa8eedde7c39eae58c65fff5fff02028359298726dbd6427d5a9d073a4408ff6ec5055"
OUR_PRIVKEY = "dcfcc8c2eda95ff73094b72098d266556b5f3d34c9b762c2c26a27f81b984b3d"

print("="*70)
print("What does secp256k1-py's ecdh() actually return?")
print("="*70)

# First compute the shared point manually using ecpy
try:
    from ecpy.curves import Curve, Point
    cv = Curve.get_curve('secp256k1')
    
    pubkey_bytes = bytes.fromhex(DEVICE_PUBKEY)
    x = int.from_bytes(pubkey_bytes[1:33], 'big')
    y = int.from_bytes(pubkey_bytes[33:65], 'big')
    pub_point = Point(x, y, cv)
    
    scalar = int.from_bytes(bytes.fromhex(OUR_PRIVKEY), 'big')
    shared_point = scalar * pub_point
    
    print(f"\nShared point X: {shared_point.x:064x}")
    print(f"Shared point Y: {shared_point.y:064x}")
    
    # Different possible formats:
    x_bytes = shared_point.x.to_bytes(32, 'big')
    
    # Format 1: SHA256(X only) - 32 bytes
    sha_x = hashlib.sha256(x_bytes).digest()
    print(f"\nSHA256(X only, 32 bytes):        {sha_x.hex()}")
    
    # Format 2: SHA256(compressed point) - 33 bytes  
    prefix = b"\x03" if (shared_point.y & 1) != 0 else b"\x02"
    compressed = prefix + x_bytes
    sha_compressed = hashlib.sha256(compressed).digest()
    print(f"SHA256(compressed, 33 bytes):    {sha_compressed.hex()}")
    
    # Format 3: SHA256(X + counter) - 36 bytes
    x_counter = x_bytes + b"\x00\x00\x00\x01"
    sha_x_counter = hashlib.sha256(x_counter).digest()
    print(f"SHA256(X + counter, 36 bytes):   {sha_x_counter.hex()}")
    
    # Format 4: Raw X (no hash)
    print(f"Raw X (no hash):                 {x_bytes.hex()}")
    
except ImportError:
    print("ecpy not installed")

# Now try secp256k1-py library
print("\n" + "="*70)
print("secp256k1-py library result:")
print("="*70)

try:
    import secp256k1
    
    privkey = secp256k1.PrivateKey(bytes.fromhex(OUR_PRIVKEY))
    pubkey = secp256k1.PublicKey(bytes.fromhex(DEVICE_PUBKEY), raw=True)
    
    # The ecdh() function
    result = pubkey.ecdh(privkey.private_key)
    print(f"\npubkey.ecdh(privkey): {result.hex()}")
    
    # Check which format it matches
    if result.hex() == sha_x.hex():
        print("✓ Matches SHA256(X only) - libsecp256k1 default!")
    elif result.hex() == sha_compressed.hex():
        print("✓ Matches SHA256(compressed point)")
    elif result.hex() == sha_x_counter.hex():
        print("✓ Matches SHA256(X + counter)")
    elif result.hex() == x_bytes.hex():
        print("✓ Matches raw X (no hash)")
    else:
        print("✗ Matches NONE of the expected formats!")
        
except ImportError:
    print("\nsecp256k1-py not installed.")
    print("Install with: pip install secp256k1")
except Exception as e:
    print(f"\nError: {e}")

# Now try ledgerblue's ecWrapper
print("\n" + "="*70)
print("ledgerblue ecWrapper result:")
print("="*70)

try:
    from ledgerblue.ecWrapper import PrivateKey as LBPrivateKey, PublicKey as LBPublicKey
    
    privkey = LBPrivateKey(bytes.fromhex(OUR_PRIVKEY))
    pubkey = LBPublicKey(bytes.fromhex(DEVICE_PUBKEY), raw=True)
    
    # serialize() returns hex string, need to convert to bytes
    priv_bytes = bytes.fromhex(privkey.serialize())
    result = pubkey.ecdh(priv_bytes)
    print(f"\nledgerblue ecdh(): {result.hex()}")
    
    # Check which format
    if result.hex() == sha_x.hex():
        print("✓ Matches SHA256(X only)")
    elif result.hex() == sha_compressed.hex():
        print("✓ Matches SHA256(compressed point)")
    elif result.hex() == sha_x_counter.hex():
        print("✓ Matches SHA256(X + counter)")
    else:
        print("? Different format - need to investigate!")
        
except ImportError:
    print("\nledgerblue not installed")
except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()
