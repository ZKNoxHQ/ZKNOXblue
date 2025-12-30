#!/usr/bin/env python3
"""
SCP v3 Protocol Test - Python Reference Implementation
Computes key derivation, encryption, and MAC for comparison with JavaScript
"""

from Crypto.Cipher import AES
import json

def hex_to_bytes(h):
    return bytes.fromhex(h)

def bytes_to_hex(b):
    return b.hex()

def scp_derive_keys(ecdh_secret):
    """Derive ENC and MAC keys from ECDH secret using SCP v3 method"""
    # ENC key = AES-256-ECB(ecdh_secret, 0x02 * 16)
    enc_block = b'\x02' * 16
    cipher = AES.new(ecdh_secret, AES.MODE_ECB)
    enc_key = cipher.encrypt(enc_block)
    
    # MAC key = AES-256-ECB(ecdh_secret, 0x01 * 16)
    mac_block = b'\x01' * 16
    cipher = AES.new(ecdh_secret, AES.MODE_ECB)
    mac_key = cipher.encrypt(mac_block)
    
    return enc_key, mac_key

def scp_wrap(data, enc_key, mac_key, enc_iv, mac_iv):
    """Wrap data using SCP v3 protocol"""
    # Pad to 16-byte boundary with 0x80 padding
    padded = data + b'\x80'
    while len(padded) % 16 != 0:
        padded += b'\x00'
    
    # Encrypt with AES-CBC
    cipher = AES.new(enc_key, AES.MODE_CBC, enc_iv)
    encrypted = cipher.encrypt(padded)
    
    # New ENC IV is last block of encrypted data
    new_enc_iv = encrypted[-16:]
    
    # Compute MAC using AES-CBC-MAC over encrypted data
    cipher = AES.new(mac_key, AES.MODE_CBC, mac_iv)
    mac_result = cipher.encrypt(encrypted)
    
    # New MAC IV is last block of MAC computation
    new_mac_iv = mac_result[-16:]
    
    # Append first 14 bytes of MAC IV
    result = encrypted + new_mac_iv[:14]
    
    return result, new_enc_iv, new_mac_iv

def run_test_vector(name, ecdh_secret_hex, data_hex, enc_iv_hex="00"*16, mac_iv_hex="00"*16):
    """Run a single test vector and output all intermediate values"""
    print(f"\n{'='*60}")
    print(f"Test: {name}")
    print(f"{'='*60}")
    
    ecdh_secret = hex_to_bytes(ecdh_secret_hex)
    data = hex_to_bytes(data_hex)
    enc_iv = hex_to_bytes(enc_iv_hex)
    mac_iv = hex_to_bytes(mac_iv_hex)
    
    print(f"\nInputs:")
    print(f"  ECDH Secret: {ecdh_secret_hex}")
    print(f"  Data:        {data_hex}")
    print(f"  ENC IV:      {enc_iv_hex}")
    print(f"  MAC IV:      {mac_iv_hex}")
    
    # Derive keys
    enc_key, mac_key = scp_derive_keys(ecdh_secret)
    print(f"\nDerived Keys:")
    print(f"  ENC Key: {bytes_to_hex(enc_key)}")
    print(f"  MAC Key: {bytes_to_hex(mac_key)}")
    
    # Wrap data
    result, new_enc_iv, new_mac_iv = scp_wrap(data, enc_key, mac_key, enc_iv, mac_iv)
    
    # Show intermediate values
    padded = data + b'\x80'
    while len(padded) % 16 != 0:
        padded += b'\x00'
    
    encrypted = result[:-14]
    mac_bytes = result[-14:]
    
    print(f"\nIntermediate Values:")
    print(f"  Padded Data: {bytes_to_hex(padded)}")
    print(f"  Encrypted:   {bytes_to_hex(encrypted)}")
    print(f"  MAC (14b):   {bytes_to_hex(mac_bytes)}")
    print(f"  New ENC IV:  {bytes_to_hex(new_enc_iv)}")
    print(f"  New MAC IV:  {bytes_to_hex(new_mac_iv)}")
    
    print(f"\nFinal Result:")
    print(f"  {bytes_to_hex(result)}")
    
    return {
        "name": name,
        "inputs": {
            "ecdh_secret": ecdh_secret_hex,
            "data": data_hex,
            "enc_iv": enc_iv_hex,
            "mac_iv": mac_iv_hex
        },
        "outputs": {
            "enc_key": bytes_to_hex(enc_key),
            "mac_key": bytes_to_hex(mac_key),
            "padded": bytes_to_hex(padded),
            "encrypted": bytes_to_hex(encrypted),
            "mac": bytes_to_hex(mac_bytes),
            "new_enc_iv": bytes_to_hex(new_enc_iv),
            "new_mac_iv": bytes_to_hex(new_mac_iv),
            "result": bytes_to_hex(result)
        }
    }

def main():
    test_vectors = []
    
    # Test 1: Using actual ECDH secret from the logs
    test_vectors.append(run_test_vector(
        "Delete FROSTGUN (from logs)",
        "d9ab04ec2e19fe4e0a3ff7767cc38d7b6962de3001472995426b97dabc7a1378",
        "0c0846524f535447554e"  # Delete command for FROSTGUN
    ))
    
    # Test 2: Simple test with known values
    test_vectors.append(run_test_vector(
        "Simple test data",
        "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
        "48656c6c6f"  # "Hello"
    ))
    
    # Test 3: Longer data (2 blocks)
    test_vectors.append(run_test_vector(
        "Two-block data",
        "d9ab04ec2e19fe4e0a3ff7767cc38d7b6962de3001472995426b97dabc7a1378",
        "0b160000ba3f000002000000003f0000000000000001"  # createApp command
    ))
    
    # Test 4: With non-zero IVs (chained operation)
    test_vectors.append(run_test_vector(
        "Chained (non-zero IVs)",
        "d9ab04ec2e19fe4e0a3ff7767cc38d7b6962de3001472995426b97dabc7a1378",
        "0b160000ba3f000002000000003f0000000000000001",
        "69f8c7c31eaeff48c0075f8a48c1455e",  # enc_iv from previous operation
        "2f6b9993493de3de9599e18a99bb9f35"   # mac_iv from previous operation
    ))
    
    # Output JSON for JavaScript test
    print("\n" + "="*60)
    print("JSON Test Vectors (for JavaScript comparison):")
    print("="*60)
    print(json.dumps(test_vectors, indent=2))
    
    # Write to file
    with open("scp_test_vectors.json", "w") as f:
        json.dump(test_vectors, f, indent=2)
    print("\nTest vectors written to scp_test_vectors.json")

if __name__ == "__main__":
    main()
