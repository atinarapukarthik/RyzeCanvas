#!/usr/bin/env python
"""Test script to verify system prompts load correctly."""

from app.agent.system_prompt import GENERATE_CODE_PROMPT

# Check the critical instructions section
if "YOU ARE ONLY WRITING CODE FILES" in GENERATE_CODE_PROMPT:
    print("[OK] Critical instructions found")
else:
    print("[FAIL] Critical instructions NOT found")

# Check output format
if "IMMEDIATELY output a JSON object" in GENERATE_CODE_PROMPT:
    print("[OK] Output format instructions found")
else:
    print("[FAIL] Output format instructions NOT found")

# Check for example format
if '"package.json"' in GENERATE_CODE_PROMPT:
    print("[OK] Example JSON format found")
else:
    print("[FAIL] Example JSON format NOT found")

# Check length
print(f"\nPrompt length: {len(GENERATE_CODE_PROMPT)} characters")

# Show a key section
print("\n--- Output Format Section ---")
start = GENERATE_CODE_PROMPT.find("<output-format>")
end = GENERATE_CODE_PROMPT.find("</output-format>") + len("</output-format>")
if start != -1 and end != -1:
    section = GENERATE_CODE_PROMPT[start:end]
    # Show first 500 chars to avoid encoding issues
    print(section[:500])
else:
    print("Output format section not found!")
