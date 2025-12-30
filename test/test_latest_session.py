#!/usr/bin/env python3
"""
Test with EXACT values from latest JavaScript session.
"""

from Crypto.Cipher import AES

# Values from the JavaScript session:
ECDH_SECRET = "7c7b0f6300144af5c819e98014f56c5a39872ed35751ef9371f8423a4198d488"

# Delete command: 0c 08 "zknoxhhw"
DELETE_INPUT = "0c087a6b6e6f78686877"

print("="*70)
print("SCP v3 Verification with Latest Session")
print("="*70)

# Step 1: Derive keys
ecdh_bytes = bytes.fromhex(ECDH_SECRET)

cipher = AES.new(ecdh_bytes, AES.MODE_ECB)
enc_key = cipher.encrypt(b'\x02' * 16)

cipher = AES.new(ecdh_bytes, AES.MODE_ECB)
mac_key = cipher.encrypt(b'\x01' * 16)

print(f"\nECDH secret: {ECDH_SECRET}")
print(f"ENC key: {enc_key.hex()}")
print(f"MAC key: {mac_key.hex()}")

# JS values:
JS_ENC_KEY = "c4a5ef076eb46f3f933744124dab5036"
JS_MAC_KEY = "8014a7640e2e4fb0dbe2cc02061362ac"
print(f"\nJS ENC key: {JS_ENC_KEY}")
print(f"JS MAC key: {JS_MAC_KEY}")
print(f"ENC match: {'✓' if enc_key.hex() == JS_ENC_KEY else '✗'}")
print(f"MAC match: {'✓' if mac_key.hex() == JS_MAC_KEY else '✗'}")

# Step 2: Delete command
print("\n" + "-"*70)
print("Delete Command")
print("-"*70)

plaintext = bytes.fromhex(DELETE_INPUT)
print(f"Input: {plaintext.hex()}")

# Pad
padded = plaintext + b'\x80'
while len(padded) % 16 != 0:
    padded += b'\x00'
print(f"Padded: {padded.hex()}")

# Encrypt
enc_iv = b'\x00' * 16
cipher = AES.new(enc_key, AES.MODE_CBC, enc_iv)
encrypted = cipher.encrypt(padded)
print(f"Encrypted: {encrypted.hex()}")

# MAC
mac_iv = b'\x00' * 16
cipher = AES.new(mac_key, AES.MODE_CBC, mac_iv)
mac_result = cipher.encrypt(encrypted)
print(f"MAC result (full): {mac_result.hex()}")
print(f"MAC (last 14): {mac_result[-14:].hex()}")

# Final
final = encrypted + mac_result[-14:]
print(f"Final: {final.hex()}")

# JS values
JS_ENCRYPTED = "23d84f12d2cceb0b70bb759a0b051177"
JS_MAC_RESULT = "e5597c55590c6738b0994bee34943cf9"
JS_FINAL = "23d84f12d2cceb0b70bb759a0b0511777c55590c6738b0994bee34943cf9"

print(f"\nJS encrypted: {JS_ENCRYPTED}")
print(f"JS MAC result: {JS_MAC_RESULT}")
print(f"JS final: {JS_FINAL}")

print(f"\nEncrypted match: {'✓' if encrypted.hex() == JS_ENCRYPTED else '✗'}")
print(f"MAC result match: {'✓' if mac_result.hex() == JS_MAC_RESULT else '✗'}")
print(f"Final match: {'✓' if final.hex() == JS_FINAL else '✗'}")

if final.hex() == JS_FINAL:
    print("\n✓ Perfect match! JavaScript encryption is correct.")
else:
    print("\n✗ Mismatch!")
