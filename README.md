# WhisperDoc - Audio Recording System

## Installation auf macOS (Intel & Apple Silicon)

### Voraussetzungen

1. Homebrew installieren (falls noch nicht vorhanden):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Benötigte Pakete installieren:
   ```bash
   brew install node ffmpeg openai-whisper
   ```

### Projekt einrichten

1. Projekt-Abhängigkeiten installieren:
   ```bash
   npm install
   ```

2. Server starten:
   ```bash
   npm start
   ```

## Fehlerbehebung

### Keine Audioaufnahme möglich
1. Überprüfen Sie die Mikrofonberechtigungen in den macOS Systemeinstellungen:
   - Öffnen Sie Systemeinstellungen > Datenschutz & Sicherheit > Mikrofon
   - Stellen Sie sicher, dass der Browser Zugriff auf das Mikrofon hat

### Whisper-Transkription funktioniert nicht
1. Whisper neu installieren:
   ```bash
   brew reinstall openai-whisper
   ```

## Verwendung

1. Öffnen Sie die Weboberfläche unter `http://localhost:3000`
   - Optional können Sie einen Dateinamen vorausfüllen mit: `http://localhost:3000?filename=beispiel`
2. Geben Sie einen Dateinamen für die Aufnahme ein (oder nutzen Sie den vorausgefüllten Namen)
3. Starten und stoppen Sie die Aufnahme über die Benutzeroberfläche

## Hinweise

- Die Aufnahmen werden im MP3-Format im Verzeichnis `~/whisperdoc/records` gespeichert
- Die Transkriptionen werden als TXT-Dateien im gleichen Verzeichnis gespeichert
- Die Anwendung verwendet das Standard-Mikrofon des Browsers
- Für beste Audioqualität empfehlen wir ein externes USB-Mikrofon
- Die Anwendung ist optimiert für sowohl Intel als auch Apple Silicon Macs