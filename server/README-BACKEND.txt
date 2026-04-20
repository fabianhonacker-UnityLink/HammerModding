HAMMER MODDING TEBEX BACKEND

WO GEHÖRT WAS HIN?

Projektordner:
C:\Users\EPIC\Downloads\HammerModding-main

Dort kommt dieser neue Ordner rein:
server\

Die Struktur muss danach so aussehen:
HammerModding-main\
  index.html
  styles.css
  script.js
  ...
  server\
    package.json
    app.js
    .env.example
    start-backend.bat
    lib\
      supabase.js
      tebex.js
    routes\
      tebex.js

WAS MUSST DU DANACH MACHEN?

1. server\.env.example in server\.env umbenennen
2. In server\.env den TEBEX_PRIVATE_KEY eintragen
3. Optional ALLOWED_ORIGIN anpassen
4. Im server-Ordner npm install ausführen
5. Backend starten

WICHTIG:
Der Private Key gehört NUR in server\.env und nirgendwo ins Frontend.
