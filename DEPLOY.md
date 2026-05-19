# Cloud-Deployment (Vercel + Supabase EU)

Die App läuft aktuell auf einem Mac mit SQLite. Diese Anleitung migriert sie auf
**Vercel + Supabase Postgres in Frankfurt** für DSGVO-konformen Schul-Einsatz.

## Voraussetzung

- Vercel-Account (vercel.com) — kostenlos
- Supabase-Account (supabase.com) — kostenlos, EU-Region wählbar
- GitHub-Account für die Codebasis
- Domain (optional)

## 1. Postgres bei Supabase EU anlegen

1. Supabase Dashboard → **New Project** → **Region: West EU (Frankfurt)**
2. Passwort sicher notieren
3. Unter **Project Settings → Database** den **Connection String** kopieren (URI-Form)
4. Format: `postgres://postgres:[password]@db.[ref].supabase.co:5432/postgres`

## 2. Code vorbereiten

```bash
# Lokal das Schema gegen den neuen Postgres-Cluster generieren
export DATABASE_URL_PG="postgres://..."

# Drizzle-Config umstellen
cp drizzle.config.ts drizzle.config.pg.ts
```

In `drizzle.config.pg.ts`:
```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/postgres/schema-pg.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_PG! },
} satisfies Config;
```

Migrations generieren + ausführen:
```bash
npx drizzle-kit generate --config drizzle.config.pg.ts
npx drizzle-kit push --config drizzle.config.pg.ts
```

## 3. Daten von SQLite → Postgres übertragen

```bash
npm install postgres
DATABASE_URL_PG="postgres://..." npx tsx scripts/migrate-to-postgres.ts
```

Das Skript liest aus `data/testschule.db` und schreibt 1:1 nach Postgres
(Foreign-Key-Reihenfolge beachtet, Boolean/Date konvertiert).

## 4. Code für Postgres umstellen

In allen Imports tauschen:
```diff
- import { ... } from "@/db";
+ import { ... } from "@/db/postgres";
```

Die `@/db/postgres/index.ts` (musst du noch anlegen) sollte so aussehen:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema-pg";

const sql = postgres(process.env.DATABASE_URL!, { max: 5 });
export const db = drizzle(sql, { schema });
export { schema };
```

> **Tipp:** Für sauberen Wechsel kannst du eine Env-Variable `DB_DIALECT=sqlite|postgres`
> einführen und einen Adapter-Pattern bauen. Für eine Migration reicht aber das
> Suchen-Ersetzen.

## 5. Bei Vercel deployen

```bash
npx vercel link
npx vercel env add DATABASE_URL production   # → Postgres-URL aus Supabase
npx vercel env add AUTH_SECRET production    # → openssl rand -hex 32
npx vercel env add AUTH_URL production       # → https://deine-domain.de
npx vercel env add AUTH_TRUST_HOST production # → true
npx vercel env add RESEND_API_KEY production  # → falls Mail aktiv
npx vercel env add MAIL_FROM production       # → Test Schule <noreply@deine-domain.de>

npx vercel --prod
```

## 6. DSGVO-Checkliste vor Schul-Einsatz

- [ ] **AVV mit Supabase** abschließen (über Supabase-Dashboard → Settings → Auftragsverarbeitungsvertrag)
- [ ] **AVV mit Vercel** abschließen (vercel.com/teams/[team]/settings/billing → DPA)
- [ ] **Datenschutzbeauftragten** der Schule einbeziehen
- [ ] **Schulträger** über Einsatz informieren
- [ ] **Eltern-/Schüler-Einwilligungen** dokumentieren (bei <16 Jahre verpflichtend)
- [ ] **Datenschutzerklärung** auf `/datenschutz` an Schul-Realität anpassen
- [ ] **Backup-Strategie** prüfen (Supabase macht Snapshots automatisch — täglich, 7 Tage Aufbewahrung im Free-Tier)
- [ ] **Audit-Log** funktioniert (siehe `/audit`)
- [ ] **Bildmaterial** vor Upload auf Urheberrecht prüfen
- [ ] **HTTPS** + valide Domain (Vercel macht automatisch HTTPS)

## 7. Was lokal bleibt

- **Backups**: Sind aktuell in `data/backups/` — bei Cloud-Migration übernimmt Supabase die DB-Backups. Der lokale Cron-Job (`scripts/backup.sh`) wird obsolet.
- **Uploads**: Bilder unter `public/uploads/` müssen entweder **mit-deployed werden** oder besser auf Supabase Storage migriert werden (siehe optional unten).

## Optional: Storage auf Supabase

Wenn viele Bilder hochgeladen werden, würde der Vercel-Build groß. Besser:

1. Supabase Storage Bucket „uploads" anlegen
2. In `src/lib/actions/content.ts` den `writeFile`-Block durch Supabase-Storage-API ersetzen
3. `imagePath` zeigt dann auf die öffentliche URL

Das ist eine eigene kleine Anpassung — kann später nachgezogen werden.

---

**Stand der App**, die so deployed wird:
- 36 Routen, 21 DB-Tabellen
- 5 Aufgabentypen, davon alle Klausur-fähig
- Live-Quiz, Forum, Direktnachrichten, Stundenplan
- Multi-Lehrer + Co-Lehrer pro Klasse
- Audit-Log, Backups, DSGVO Art. 15/16/17/20
