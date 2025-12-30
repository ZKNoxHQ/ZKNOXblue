#!/usr/bin/env python3
"""
Compare createApp command format between Python and JavaScript
"""
import struct

# Parameters from sideloader logs
api_level = 22
code_length = 47679  # 0xBA3F
data_length = 512    # 0x200
install_params = 63  # 0x3F
flags = 0
boot_offset = 0xc0de0001

print("=== createApp Parameter Comparison ===\n")

# Python's createApp format: struct.pack('>BIIIII', ...)
# B = 1 byte (api_level)
# I = 4 bytes unsigned big-endian (each of the 5 integers)
data = struct.pack('>BIIIII', api_level, code_length, data_length, install_params, flags, boot_offset)

print(f"Parameters:")
print(f"  api_level:      {api_level} (0x{api_level:02x})")
print(f"  code_length:    {code_length} (0x{code_length:08x})")
print(f"  data_length:    {data_length} (0x{data_length:08x})")
print(f"  install_params: {install_params} (0x{install_params:08x})")
print(f"  flags:          {flags} (0x{flags:08x})")
print(f"  boot_offset:    {boot_offset} (0x{boot_offset:08x})")

print(f"\nPython createApp params (21 bytes):")
print(f"  {data.hex()}")

print(f"\nWith INS 0x0B prepended (22 bytes):")
print(f"  0b{data.hex()}")

print(f"\nBreakdown:")
print(f"  0b                 = INS (CREATE_APP)")
print(f"  {data[0:1].hex()}                 = api_level ({api_level})")
print(f"  {data[1:5].hex()}         = code_length ({code_length})")
print(f"  {data[5:9].hex()}         = data_length ({data_length})")
print(f"  {data[9:13].hex()}         = install_params ({install_params})")
print(f"  {data[13:17].hex()}         = flags ({flags})")
print(f"  {data[17:21].hex()}         = boot_offset (0x{boot_offset:x})")

# JavaScript output from logs
js_output = "0b160000ba3f000002000000003f00000000c0de0001"
print(f"\n=== JavaScript Output (from logs) ===")
print(f"  {js_output}")

# Compare
python_output = "0b" + data.hex()
print(f"\n=== Comparison ===")
print(f"Python: {python_output}")
print(f"JS:     {js_output}")
print(f"Match:  {'✓ YES' if python_output == js_output else '✗ NO'}")

if python_output != js_output:
    print(f"\nDifferences:")
    for i in range(0, len(python_output), 2):
        py_byte = python_output[i:i+2]
        js_byte = js_output[i:i+2] if i < len(js_output) else "??"
        if py_byte != js_byte:
            print(f"  Byte {i//2}: Python={py_byte}, JS={js_byte}")
