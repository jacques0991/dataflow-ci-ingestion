import http.server
import socketserver
import webbrowser
import sys

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

# Enable UTF-8 encoding in server log output
sys.stdout.reconfigure(encoding='utf-8')

print("------------------------------------------------------------")
print("DataFlow CI - Portail d'Ingestion & Validation")
print("Démarrage du serveur local...")
print("------------------------------------------------------------")

# Use socketserver to reuse address to avoid 'Address already in use' error
socketserver.TCPServer.allow_reuse_address = True

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"Serveur actif à l'adresse : {url}")
        print("Pour arrêter le serveur, appuyez sur Ctrl+C.")
        print("------------------------------------------------------------")
        
        # Open default web browser to the application url
        webbrowser.open(url)
        
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServeur arrêté par l'utilisateur.")
except Exception as e:
    print(f"Erreur lors du démarrage du serveur : {e}")
