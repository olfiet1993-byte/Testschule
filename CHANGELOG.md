# Changelog

Wesentliche Änderungen werden hier gesammelt — neueste oben.
Format lehnt sich locker an [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Tooling
- GitHub Actions CI: TypeScript-Check + Next.js Build auf jedem PR
- Issue-Templates (Bug, Feature, Etappe) + PR-Template
- README + CHANGELOG hinzugefügt
- `.gitignore` erweitert um `data/`, `public/uploads/`, `.claude/`, `*.db`
- `npm run typecheck` als eigenes Script

## 2026-05 — Initial Release (Etappen 1 – 49)

### Lehrer-Features
- Klassen anlegen, Co-Lehrkräfte einladen, Schüler-Einladung über 6-stelligen Code + QR
- 5 Aufgabentypen (Quiz, Cloze, Flashcards, Image Hotspot, Case Study)
- Klausur-Modus mit Timer + gesperrter Auflösung
- Live-Quiz über SSE
- Lernpfade mit Auto-Verteilung nach Schwierigkeit
- Inhalts-Bibliothek (Texte, Bilder, Links, Begriffe, Videos, Dateien)
- Themen-Mastery-Heatmap in der Klassenstatistik
- Notenliste als A4-Druckansicht + CSV-Export
- Klassenzimmer-Sidebar mit Mo-Fr-Tab-Planer, Drag-Drop, Bulk-Senden, Auto-Refresh, Erinnern
- Vitalwerte-Szenarien (lehrer-eigen + 5 Standard)
- Lehrplan-Austausch (32 Lernfelder, schulweit teilen + klonen)

### Schüler-Features
- Anmeldung über Klassen-Code + Name + selbstgewählter PIN
- Aufgaben-Liste mit Filtern, Konfetti bei 100%
- Karteikarten-Trainer mit SM-2 Spaced Repetition
- Fehlerbuch (automatisch gesammelte falsche Antworten)
- Wochenplan + Vitalwerte-Simulator
- XP / Level / Streak / Abzeichen

### KI-Helfer (Claude Haiku 4.5)
- Aufgaben aus Thema generieren (alle 4 Typen)
- Aufgaben aus Bibliotheks-Inhalt ableiten (Text + Bild + Link)
- Distraktoren pro Quiz-Frage
- Erklärung pro Quiz-Frage
- Synonyme pro Cloze-Lücke
- Optionen + Feedback pro Case-Schritt
- Curriculum-Vorschlag im Lehrplan-Picker
- Glossar-Extraktion aus Lerntexten
- Vital-Szenarien aus Thema generieren

### Betrieb
- PWA-Manifest + iOS-Icons
- DSGVO: Datenexport, Audit-Log, automatische Backups
- Tailscale-Funnel-fähig für öffentliche Demo
- Anleitung-Seite (öffentlich)
- Feedback-Board mit Voting + Status-Workflow
- Notifications-System (in-App + E-Mail-Hook)
