#!/usr/bin/env python3
"""
Compare ECDH computation between Python and JavaScript using EXACT values from JS session.

Values from JavaScript log:
- Device ephemeral pubkey: 04349ab80572c4a9b5432aaac786c08e659d042ddc6c7285d5957f37cd12a69159e3d2d9a8c9603791e1e78ca852857396c133ca2ed227fdc76d2d94f7048aeccd
- Our ephemeral private key: 673e2ddea3161d72e1e57d15de6bd7e99610425dfd15e2e242a0737486bc3762
- JS ECDH (X+counter): 01a732daf9fcd9d23dc6b42ad8ccd99d68307fae1add3cbb3910535a8677c7f3
"""

import hashlib

# Exact values from JavaScript session
DEVICE_PUBKEY = "04349ab80572c4a9b5432aaac786c08e659d042ddc6c7285d5957f37cd12a69159e3d2d9a8c9603791e1e78ca852857396c133ca2ed227fdc76d2d94f7048aeccd"
OUR_PRIVKEY = "673e2ddea3161d72e1e57d15de6bd7e99610425dfd15e2e242a0737486bc3762"
JS_ECDH_RESULT = "01a732daf9fcd9d23dc6b42ad8ccd99d68307fae1add3cbb3910535a8677c7f3"

print("="*70)
print("ECDH Comparison: Python vs JavaScript")
print("="*70)

print(f"\nDevice pubkey: {DEVICE_PUBKEY[:40]}...")
print(f"Our privkey:   {OUR_PRIVKEY}")
print(f"JS result:     {JS_ECDH_RESULT}")

# Try with ledgerblue
try:
    from ledgerblue.ecWrapper import PrivateKey, PublicKey
    
    privkey = PrivateKey(bytes.fromhex(OUR_PRIVKEY))
    pubkey = PublicKey(bytes.fromhex(DEVICE_PUBKEY), raw=True)
    
    # Test BOTH formats
    secret_v2 = pubkey.ecdh(privkey.serialize(), scpv3=False)
    secret_v3 = pubkey.ecdh(privkey.serialize(), scpv3=True)
    
    print(f"\n" + "-"*70)
    print("ledgerblue ECDH results:")
    print("-"*70)
    print(f"scpv3=False (compressed point): {secret_v2.hex()}")
    print(f"scpv3=True  (X + counter):      {secret_v3.hex()}")
    
    print(f"\n" + "-"*70)
    print("Comparison with JavaScript:")
    print("-"*70)
    
    if secret_v2.hex() == JS_ECDH_RESULT:
        print("✓ JavaScript matches Python scpv3=FALSE")
        print("  -> Fix: JavaScript should use COMPRESSED POINT format!")
    elif secret_v3.hex() == JS_ECDH_RESULT:
        print("✓ JavaScript matches Python scpv3=TRUE")
        print("  -> JavaScript is using correct X+counter format")
        print("  -> Problem is elsewhere (key derivation or encryption)")
    else:
        print("✗ JavaScript matches NEITHER format!")
        print("  -> There's a bug in ECDH computation itself")
        
    # Also show what Python's deployed.py actually uses
    print(f"\n" + "-"*70)
    print("What does Python's deployed.py use?")
    print("-"*70)
    print("In deployed.py line ~167:")
    print("  secret = lastDevPubKey.ecdh(ephemeralPrivBytes)")
    print("  -> NO scpv3 parameter, so it defaults to scpv3=False")
    print("  -> Python uses COMPRESSED POINT format (33 bytes)")
    
except ImportError:
    print("\nledgerblue not installed, using manual computation...")
    
    # Manual ECDH
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
        
        # Compressed format (scpv3=False)
        prefix = b"\x03" if (shared_point.y & 1) != 0 else b"\x02"
        compressed = prefix + shared_point.x.to_bytes(32, 'big')
        secret_v2 = hashlib.sha256(compressed).digest()
        
        # X + counter format (scpv3=True)
        x_counter = shared_point.x.to_bytes(32, 'big') + b"\x00\x00\x00\x01"
        secret_v3 = hashlib.sha256(x_counter).digest()
        
        print(f"\nCompressed point (33b): {compressed.hex()}")
        print(f"SHA256 -> scpv3=False:  {secret_v2.hex()}")
        
        print(f"\nX + counter (36b):      {x_counter.hex()}")
        print(f"SHA256 -> scpv3=True:   {secret_v3.hex()}")
        
        print(f"\nJavaScript result:      {JS_ECDH_RESULT}")
        
        if secret_v2.hex() == JS_ECDH_RESULT:
            print("\n✓ JS matches compressed point format")
        elif secret_v3.hex() == JS_ECDH_RESULT:
            print("\n✓ JS matches X+counter format")
        else:
            print("\n✗ JS matches neither!")
            
    except ImportError:
        print("ecpy not installed either. Install with: pip install ecpy")
