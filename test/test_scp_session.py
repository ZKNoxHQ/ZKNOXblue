#!/usr/bin/env python3
"""
Test SCP v3 wrap using the EXACT values from the last JavaScript session.
This will show us if the encryption matches byte-for-byte.
"""

from Crypto.Cipher import AES

# Values from the JavaScript session:
ECDH_SECRET = "54e12930c52970719f60df6c30a68b7ca46e9d47549f85b442be24b5a51ab7cb"
JS_ENC_KEY = "dfcf12c495d719855f1cb82348596159"
JS_MAC_KEY = "ba66f9f53dc17feefde451f781ca4ea0"

# Delete command: 0c 05 "EDDSA"
DELETE_INPUT = "0c054544445341"
JS_DELETE_ENCRYPTED = "eec6be20468008ea111537192b032a99"
JS_DELETE_MAC_IV_AFTER = "51de9d818ce3724cdf2b1eaf2103d56a"  # Full 16-byte MAC result stored as next IV
JS_DELETE_MAC = "51de9d818ce3724cdf2b1eaf2103"  # First 14 bytes sent
JS_DELETE_FINAL = "eec6be20468008ea111537192b032a9951de9d818ce3724cdf2b1eaf2103"

# CreateApp command
CREATE_INPUT = "0b160000ba3f000002000000003f00000000c0de0001"
JS_CREATE_ENC_IV = "eec6be20468008ea111537192b032a99"  # Last encrypted block from delete
JS_CREATE_MAC_IV = "51de9d818ce3724cdf2b1eaf2103d56a"  # Full MAC result from delete
JS_CREATE_ENCRYPTED = "1e0530ce51104fcba9e467db9501ba54796b09e9f4ca9ffdf35b958bd3c2e728"
JS_CREATE_MAC = "8bc44c3916ff0e87e1639d7aeb2f"

print("="*70)
print("SCP v3 Encryption Comparison")
print("="*70)

# Step 1: Derive keys
print("\n[Step 1] Key Derivation")
print("-"*70)

ecdh_bytes = bytes.fromhex(ECDH_SECRET)

cipher = AES.new(ecdh_bytes, AES.MODE_ECB)
enc_key = cipher.encrypt(b'\x02' * 16)

cipher = AES.new(ecdh_bytes, AES.MODE_ECB)
mac_key = cipher.encrypt(b'\x01' * 16)

print(f"ENC key (Python): {enc_key.hex()}")
print(f"ENC key (JS):     {JS_ENC_KEY}")
print(f"Match: {'✓' if enc_key.hex() == JS_ENC_KEY else '✗'}")

print(f"MAC key (Python): {mac_key.hex()}")
print(f"MAC key (JS):     {JS_MAC_KEY}")
print(f"Match: {'✓' if mac_key.hex() == JS_MAC_KEY else '✗'}")

# Step 2: Test delete command encryption
print("\n[Step 2] Delete Command Encryption")
print("-"*70)

plaintext = bytes.fromhex(DELETE_INPUT)
print(f"Input:     {plaintext.hex()} ({len(plaintext)} bytes)")

# Pad with 0x80 + zeros
pad_len = 16 - (len(plaintext) % 16)
if pad_len == 0:
    pad_len = 16
padded = plaintext + b'\x80' + b'\x00' * (pad_len - 1)
print(f"Padded:    {padded.hex()} ({len(padded)} bytes)")

# Encrypt with AES-CBC, IV=zeros
enc_iv = b'\x00' * 16
cipher = AES.new(enc_key, AES.MODE_CBC, enc_iv)
encrypted = cipher.encrypt(padded)
print(f"Encrypted: {encrypted.hex()} ({len(encrypted)} bytes)")
print(f"JS:        {JS_DELETE_ENCRYPTED}")
print(f"Match:     {'✓' if encrypted.hex() == JS_DELETE_ENCRYPTED else '✗'}")

# Compute MAC - for single block, result IS the MAC IV for next command
mac_iv = b'\x00' * 16
cipher = AES.new(mac_key, AES.MODE_CBC, mac_iv)
mac_result = cipher.encrypt(encrypted)
print(f"MAC result (full 16 bytes): {mac_result.hex()}")
print(f"JS MAC IV after:            {JS_DELETE_MAC_IV_AFTER}")
print(f"Match:     {'✓' if mac_result.hex() == JS_DELETE_MAC_IV_AFTER else '✗'}")

mac = mac_result[:14]
print(f"MAC (first 14 bytes): {mac.hex()}")
print(f"JS MAC:               {JS_DELETE_MAC}")
print(f"Match:     {'✓' if mac.hex() == JS_DELETE_MAC else '✗'}")

# Store IVs for next command
next_enc_iv = encrypted[-16:]  # Last encrypted block
next_mac_iv = mac_result  # Full MAC result (16 bytes)

# Step 3: Test createApp command (uses chained IV)
print("\n[Step 3] CreateApp Command Encryption (chained IV)")
print("-"*70)

plaintext2 = bytes.fromhex(CREATE_INPUT)
print(f"Input:     {plaintext2.hex()} ({len(plaintext2)} bytes)")

# Pad
pad_len = 16 - (len(plaintext2) % 16)
if pad_len == 0:
    pad_len = 16
padded2 = plaintext2 + b'\x80' + b'\x00' * (pad_len - 1)
print(f"Padded:    {padded2.hex()} ({len(padded2)} bytes)")

# Encrypt with chained IV
print(f"ENC IV:    {next_enc_iv.hex()}")
print(f"JS ENC IV: {JS_CREATE_ENC_IV}")
print(f"Match:     {'✓' if next_enc_iv.hex() == JS_CREATE_ENC_IV else '✗'}")

cipher = AES.new(enc_key, AES.MODE_CBC, next_enc_iv)
encrypted2 = cipher.encrypt(padded2)
print(f"Encrypted: {encrypted2.hex()} ({len(encrypted2)} bytes)")
print(f"JS:        {JS_CREATE_ENCRYPTED}")
print(f"Match:     {'✓' if encrypted2.hex() == JS_CREATE_ENCRYPTED else '✗'}")

# Compute MAC with chained IV
print(f"MAC IV:    {next_mac_iv.hex()}")
print(f"JS MAC IV: {JS_CREATE_MAC_IV}")
print(f"Match:     {'✓' if next_mac_iv.hex() == JS_CREATE_MAC_IV else '✗'}")

cipher = AES.new(mac_key, AES.MODE_CBC, next_mac_iv)
mac_result2 = cipher.encrypt(encrypted2)
print(f"MAC result (full): {mac_result2.hex()} ({len(mac_result2)} bytes)")

# For multi-block, take LAST 16 bytes as the MAC result
mac_final_block = mac_result2[-16:]
print(f"MAC last block:    {mac_final_block.hex()}")
mac2 = mac_final_block[:14]
print(f"MAC (first 14):    {mac2.hex()}")
print(f"JS MAC:            {JS_CREATE_MAC}")
print(f"Match:     {'✓' if mac2.hex() == JS_CREATE_MAC else '✗'}")

print("\n" + "="*70)
all_match = (
    enc_key.hex() == JS_ENC_KEY and 
    mac_key.hex() == JS_MAC_KEY and
    encrypted.hex() == JS_DELETE_ENCRYPTED and 
    mac.hex() == JS_DELETE_MAC and
    encrypted2.hex() == JS_CREATE_ENCRYPTED and
    mac2.hex() == JS_CREATE_MAC
)
if all_match:
    print("✓ ALL MATCH! Encryption is byte-identical to JavaScript.")
    print("  The issue is NOT in the encryption.")
else:
    print("✗ MISMATCH FOUND - check differences above")
print("="*70)
