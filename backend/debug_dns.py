import socket
import sys

host = "db.cvwqbklmxcqvuvewyicx.supabase.co"
port = 5432

print(f"Checking {host}...")
try:
    results = socket.getaddrinfo(host, port)
    for res in results:
        print(f"Family: {res[0]}, Type: {res[1]}, Proto: {res[2]}, Canonname: {res[3]}, Sockaddr: {res[4]}")
except Exception as e:
    print(f"Error: {e}")
