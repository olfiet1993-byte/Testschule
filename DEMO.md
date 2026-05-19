# Test Schule · Demo-Zugang & Sharing

Diese Datei enthält alles, was du brauchst, um die App an andere weiterzugeben.

---

## 🎯 Demo-Konten

Bereits in der Datenbank angelegt (durch `npm run seed:demo`):

### Lehrkraft-Konto

| | |
|---|---|
| URL | `/login` (Tab „👩‍🏫 Lehrkraft") |
| E-Mail | `lehrer@demo.test` |
| Passwort | `demo1234` |

### Schüler-Zugang

| | |
|---|---|
| URL | `/login` (Tab „🎓 Schüler:in") |
| Klassen-Code | `DEMO01` |
| Name | beliebig (z. B. „Anna M.") |
| PIN | beim ersten Login selbst wählen (4–12 Ziffern) |

In der Demo-Klasse **„Pflege Demo 24"** sind bereits angelegt:
- 4 Themen (Vitalwerte, Hygiene, Medikamentenlehre, Anatomie)
- 5 Aufgaben (je 1 von jedem Typ)
- Ein 4-Wochen-Lernpfad „Pflegegrundlagen — 4 Wochen Einstieg"
- Ein Stundenplan (4 Slots Mo/Mi/Fr)
- 2 Lerntexte in der Bibliothek

### Öffentliche Anleitung (ohne Login)

`/anleitung` — Funktionsübersicht & Demo-Zugänge zum Verteilen.

---

## 🌐 Schritt für Schritt: Per Tailscale Funnel öffentlich teilen

Tailscale Funnel exponiert deinen lokalen Server unter einer öffentlichen `https://*.ts.net`-URL, ohne Portforwarding oder Cloud-Hosting.

### Einmalige Einrichtung (~ 2 Minuten)

**1. HTTPS im Tailnet aktivieren**

Öffne:
👉 https://login.tailscale.com/admin/dns

Scroll zu **„HTTPS Certificates"** → klick **„Enable HTTPS"**.

**2. Funnel-Feature freischalten**

Öffne den Link, den Tailscale dir beim ersten Funnel-Versuch genannt hat:
👉 https://login.tailscale.com/f/funnel?node=nY9KejaPLu11CNTRL

Klick auf der Seite **„Enable Funnel"**.

(Falls der Link abgelaufen ist: führe `tailscale funnel 3000` aus — der aktuelle Link erscheint dann in der Fehlermeldung.)

### Funnel starten

Nach der Freischaltung im Terminal:

```bash
/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --bg 3000
```

Output sollte sein:
```
Available on the internet:
https://imac-von-oliver.tail6f554d.ts.net/
```

### Funnel stoppen

```bash
/Applications/Tailscale.app/Contents/MacOS/Tailscale funnel --https=443 off
```

---

## 📢 Vorlage für die Weitergabe

> Hi! Ich teste gerade eine Lernplattform für die Pflegeausbildung — würdest du sie dir mal anschauen?
>
> **Anleitung & Funktionsübersicht (ohne Login):**
> https://imac-von-oliver.tail6f554d.ts.net/anleitung
>
> **Direkt einloggen:**
> https://imac-von-oliver.tail6f554d.ts.net/login
>
> – Als Lehrkraft: `lehrer@demo.test` / `demo1234`
> – Als Schüler:in: Klassencode `DEMO01`, Name + selbst gewählte PIN
>
> Auf jeder Seite gibt es unten rechts den 💡 „Idee?"-Button — wenn du Feedback hast, hau es da rein.
>
> Danke!

---

## 🔧 Wartung

```bash
# Demo-Daten erneut säen (idempotent)
npm run seed:demo

# Service neu starten (nach Code-Änderungen)
launchctl kickstart -k gui/$(id -u)/com.oliver.testschule

# Logs einsehen
tail -f /tmp/testschule.log /tmp/testschule.err.log
```

---

## ⚠️ Sicherheitshinweis

Mit aktivem Funnel ist deine App **öffentlich aus dem Internet erreichbar**.
- Schalte Funnel ab, wenn du die Demo nicht mehr brauchst.
- Lege keine echten Schülerdaten in der Demo-Klasse ab.
- Verteile den Link nur an Personen, denen du vertraust — Schüler:innen können sich mit beliebigen Namen anmelden.
