# Test Schule

Lernplattform für die Pflegeausbildung. Next.js + Drizzle + SQLite + Tailwind + Claude API.

📘 **[Anleitung & Funktionsübersicht](https://github.com/olfiet1993-byte/Testschule)** ·
🎯 **[Demo-Setup](./DEMO.md)** ·
🚀 **[Deployment](./DEPLOY.md)**

---

## Quickstart (lokal)

Voraussetzungen: Node 22+, macOS oder Linux.

```bash
git clone git@github.com:olfiet1993-byte/Testschule.git
cd Testschule
npm install
cp .env.example .env.local
# .env.local öffnen, AUTH_SECRET mit `openssl rand -hex 32` setzen
npx drizzle-kit push          # Schema in lokale SQLite-DB legen
npm run seed:demo             # Demo-Daten (Lehrer + Klasse + Aufgaben)
npm run dev
```

Browser auf <http://localhost:3000> öffnen. Demo-Login:

| Rolle | Zugang |
|---|---|
| Lehrkraft | `lehrer@demo.test` / `demo1234` |
| Schüler:in | Klassencode `DEMO01` + selbstgewählter Name + PIN |

## Features (Kurzfassung)

- **5 Aufgabentypen** — Quiz · Lückentext · Karteikarten · Bildhotspot · Fallstudie
- **Klausur-Modus** mit Timer und verschlossener Auflösung
- **Live-Quiz** über Server-Sent Events
- **Lernpfade** mit Auto-Verteilung
- **Karteikarten-Trainer** mit SM-2 Spaced Repetition + Auto-Vorschläge beim Schreiben
- **Vitalwerte-Simulator** mit Lehrer-eigenen Szenarien
- **Klassenzimmer-Sidebar** für Tagesplanung, Drag-Drop, Senden + Erinnern
- **QR-Code-Beitritt** mit Print-Poster
- **10+ KI-Helfer** (Claude API)
- **DSGVO-Konformität**: Datenexport, Audit-Log, automatische Backups
- **PWA** + Dark-Mode + Tailscale-fähig

Vollständige Übersicht: siehe [Anleitung in der App](http://localhost:3000/anleitung).

## Entwicklung

```bash
# TypeScript prüfen
npm run typecheck

# Build (wie in CI)
npm run build

# Demo-Daten neu seeden (idempotent)
npm run seed:demo
npm run seed:curriculum
```

### Branch-Workflow

1. Feature-Branch von `main` abzweigen: `git checkout -b feature/<thema>`
2. Lokal arbeiten, häufig kleine Commits
3. Push + PR öffnen (Templates: siehe `.github/`)
4. CI muss grün sein → mergen → Branch löschen

### Tech-Stack

- **Next.js 16.2.6** (App Router, Turbopack) — Achtung: viele Breaking Changes vs Next 14
- **React 19**
- **Drizzle ORM** mit **better-sqlite3** (Postgres-ready via `src/db/postgres/schema-pg.ts`)
- **NextAuth v5 (beta)** mit getrenntem Edge-Safe `auth.config.ts`
- **Tailwind v4** mit class-basiertem Dark-Mode
- **Claude Haiku 4.5** für alle KI-Features (`ANTHROPIC_API_KEY` in `.env.local`)
- **lucide-react** Icons · **qrcode** für QR-Generierung

### Wichtige Verzeichnisse

```
src/app/             Routes (App Router)
src/components/      Wiederverwendbare UI-Komponenten
src/lib/actions/     Server Actions (DB-Mutationen)
src/lib/             Utilities, SM-2-Algorithmus, Card-Suggester
src/db/              Schema + Drizzle-Client
drizzle/             SQL-Migrationen
scripts/             Seeds, Backup-Skripte, launchd-Plists
public/              statische Assets, Manifest
```

## Deployment

Aktuell: lokal über `launchd` + Tailscale Funnel — siehe [DEPLOY.md](./DEPLOY.md).
Geplant: Vercel + Postgres (Schema-Datei `src/db/postgres/schema-pg.ts` ist schon angelegt).

## Lizenz

Privat — kein offizielles Open-Source-Projekt. Bitte vor Wiederverwendung nachfragen.
