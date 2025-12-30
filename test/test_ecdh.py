#!/usr/bin/env python3
"""
Test ECDH computation to compare with JavaScript

Run with: python3 test_ecdh.py

This will show what ledgerblue computes for ECDH, so we can compare with JavaScript.
"""
import hashlib

# Test values from the last JavaScript session
device_pubkey_hex = "04349ab80572c4a9b5432aaac786c08e659d042ddc6c7285d5957f37cd12a69159e3d2d9a8c9603791e1e78ca852857396c133ca2ed227fdc76d2d94f7048aeccd"
our_privkey_hex = "673e2ddea3161d72e1e57d15de6bd7e99610425dfd15e2e242a0737486bc3762"

print("="*60)
print("ECDH Computation Test")
print("="*60)
print(f"\nDevice pubkey: {device_pubkey_hex[:32]}...")
print(f"Our privkey: {our_privkey_hex}")

print("\n" + "="*60)
print("Testing ledgerblue ecWrapper:")
print("="*60)

try:
    from ledgerblue.ecWrapper import PrivateKey, PublicKey
    
    # Create keys
    privkey = PrivateKey(bytes.fromhex(our_privkey_hex))
    pubkey = PublicKey(bytes.fromhex(device_pubkey_hex), raw=True)
    
    # Test both formats
    secret_v2 = pubkey.ecdh(privkey.serialize(), scpv3=False)
    secret_v3 = pubkey.ecdh(privkey.serialize(), scpv3=True)
    
    print(f"\necdh(scpv3=False): {secret_v2.hex()}")
    print(f"ecdh(scpv3=True):  {secret_v3.hex()}")
    
    # JavaScript computed this (with scpv3=True):
    js_result = "01a732daf9fcd9d23dc6b42ad8ccd99d68307fae1add3cbb3910535a8677c7f3"
    
    print(f"\n" + "="*60)
    print("Comparison with JavaScript:")
    print("="*60)
    print(f"JavaScript (scpv3=true): {js_result}")
    print(f"Python ecdh(scpv3=False): {secret_v2.hex()}")
    print(f"Python ecdh(scpv3=True):  {secret_v3.hex()}")
    
    if secret_v2.hex() == js_result:
        print("\n✓ JavaScript matches Python scpv3=False (compressed point format)")
        print("  -> JavaScript should use scpv3=FALSE for ECDH!")
    elif secret_v3.hex() == js_result:
        print("\n✓ JavaScript matches Python scpv3=True (X+counter format)")
        print("  -> JavaScript is correct using scpv3=TRUE for ECDH")
    else:
        print("\n✗ JavaScript matches NEITHER Python format!")
        print("  There may be a bug in the ECDH computation.")
    
except ImportError as e:
    print(f"\nledgerblue not installed. Install with:")
    print("  pip install ledgerblue")
    print(f"\nError: {e}")
except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()
