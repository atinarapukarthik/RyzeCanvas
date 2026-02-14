import requests
import json

# Test the chat/stream endpoint
url = "http://localhost:8000/api/v1/chat/stream"

payload = {
    "prompt": "create a simple hello world app",
    "mode": "generate",
    "provider": "openrouter",
    "model": "anthropic/claude-3-5-sonnet",
    "conversation_history": []
}

headers = {
    "Content-Type": "application/json"
}

print("Testing chat/stream endpoint with OpenRouter...")
print("=" * 60)

try:
    response = requests.post(url, json=payload, headers=headers, stream=True, timeout=120)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print("\nResponse Stream:")
    print("-" * 60)

    event_count = 0
    all_code = ""
    for line in response.iter_lines():
        if line:
            decoded = line.decode('utf-8')
            print(decoded)

            # Capture the code event
            if 'data: {"event": "code"' in decoded:
                try:
                    json_str = decoded.replace('data: ', '')
                    event_data = json.loads(json_str)
                    all_code = event_data.get('data', '')
                except:
                    pass

            event_count += 1

            if event_count > 200:  # Safety limit
                print("\n... (truncated, too many events)")
                break

    print("-" * 60)
    print(f"Total events: {event_count}")

    if all_code:
        print("\n" + "=" * 60)
        print("Generated Code (first 1000 chars):")
        print("=" * 60)
        print(all_code[:1000])

except Exception as e:
    print(f"ERROR: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()

