# Produktionsseite als Erlebniswelt-Block

Die Produktionsseite als ein Block für das ThemeWare®-Element
**„Individueller Code (HTML/CSS/JS)"**.

| Datei | Zweck |
| --- | --- |
| `produktion-erlebniswelt.html` | **Der fertige Block.** Komplett kopieren und in Shopware einfügen. |
| `src/produktion.css` / `.html` / `.js` | Quellen. Hier ändern, dann `node shopware/build.mjs` ausführen. |
| `vorschau.html`, `vorschau-server.mjs` | Lokale Vorschau im nachgebauten Shop-Rahmen. |

## Einbau in Shopware

1. **Erlebniswelt** anlegen (Landingpage oder Shopseite) mit einer Sektion, Größenmodus **„Volle Breite"**.
2. Einen Block mit dem Element **„Individueller Code (HTML/CSS/JS)"** einfügen und in den
   Block-Einstellungen **alle Abstände auf 0** setzen.
3. Im Element den Tab **HTML** öffnen und den **gesamten Inhalt** von
   `produktion-erlebniswelt.html` einfügen. Die Tabs CSS und JavaScript bleiben leer,
   „Twig-Variablen erlauben" bleibt aus.
4. Layout der Landingpage bzw. Kategorie zuweisen und dort die SEO-Angaben eintragen:
   - Titel: `Hamburgpapier - Hygienepapier Produktion & Prozess-Insights`
   - Beschreibung: `Erleben Sie die Produktion von Hygienepapier bei Hamburgpapier: Vom Zellstoff zur fertigen Rolle, mit Videos zu Papiermaschine, Trocknung, Schneiden, Verpacken und Versand.`
5. Speichern, Shop-Cache leeren, Seite am Desktop und am Handy ansehen.

## Aufbau und Gestaltung

Die Seite folgt einem ruhigen Unternehmensauftritt (Vorbild: Nachhaltigkeitsseite von Tork) –
viel Weißraum, getönte Felder, Karten. Die **Farben sind die der Shop-Startseite**: Marine `#0f3d56`,
Petrol `#0e7c96`, Ink `#16232f`, Fließtext `#3b4b57`, als getönte Fläche das helle Blau `#eef4f7`,
Linien `#e3e7ea`. Alle Werte stehen als `--hpp-…`-Variablen oben in `src/produktion.css`.

1. **Hero** – Video-Kachel mit Pause-Taste, darunter das helle Titelfeld. Beides zusammen füllt den ersten Bildschirm.
2. **So entsteht Hygienepapier** – getöntes Band: Überschrift und Einleitungssatz, darunter die zehn
   Produktionsschritte als Karussell mit Videos, Zähler, Pfeilen und einer Pause-Taste für die Videos.
3. **Vorteile von Hamburgpapier** – zentrierte Einleitung, drei Karten (Lieferung, Service mit Telefon und E-Mail, Muster), darunter das Marine-Feld „Wir bieten".
4. **Häufige Fragen** – Überschrift links (läuft am Desktop mit), Akkordeon rechts.

Der frühere Abschnitt „Produktion gesehen? Gleich im Shop bestellen!" mit den Kategorie-Karten ist entfernt.

## Technik

- **Entfallen**, weil der Shop es mitbringt: eigener Header mit Menü, Ladebildschirm, Footer,
  Cookiebot, Google Analytics, Smartlook, Meta-Angaben im `<head>`.
- **Schriften** kommen vom Theme (Comfortaa für Überschriften, Open Sans für Text).
  Bekommt das Theme andere Schriften: in `src/produktion.css` bei `--hpp-font-heading` / `--hpp-font-body` anpassen.
- **Keine externe Bibliothek**, keine Schrift- oder Skript-Aufrufe zu Drittanbietern.
- Alles liegt unter der Klasse `.hpp`, alle Maße in px – das Theme verändert den Block nicht und umgekehrt.
- Die Höhe eines mitlaufenden Shop-Headers wird automatisch erkannt.
- **Hero-Video:** Am `<video>` stehen zwei Listen, getrennt mit `|`:
  `data-hpp-videos` für Desktop/Tablet und `data-hpp-videos-light` für Handys und langsame Verbindungen
  (dort gehören nur kleine Dateien hinein). Geladen wird immer nur ein Video; im Datensparmodus keines.
- **Vorschaubilder im Hero:** Am Element `hpp-hero__poster` steht in `data-hpp-posters` je Video ein winziges
  Bild (64 × 36 px, als Text eingebettet), in derselben Reihenfolge wie `data-hpp-videos`. Es steht unscharf
  im Hintergrund, bis das Video Bilder liefert. Kommt ein neues Hero-Video dazu, braucht es dort ein weiteres Bild.
- **Schritt-Videos** laden erst, wenn das Karussell in die Nähe des Bildschirms kommt.
- **Barrierefreiheit:** Alle Videos lassen sich anhalten. Hat ein Besucher „Bewegung reduzieren" eingestellt,
  starten sie erst auf Knopfdruck. Im Karussell liegt nur der aktive Schritt in der Tab-Reihenfolge;
  Blättern wird für Screenreader angesagt.
- Strukturierte Daten: FAQ und Herstellungsschritte sind enthalten. Website/Organisation liefert der Shop selbst.
- Der Build verdichtet CSS und Skript (Kommentare und Einrückung entfallen); das HTML bleibt lesbar,
  damit sich Texte auch direkt im Shop ändern lassen.

## Medien

Die Videos werden weiterhin von `https://hamburgpapier-shop-produktion.de/Assents/…` geladen (11 Dateien).
**Solange diese Adresse online ist, funktioniert alles.**

Soll die alte Seite abgeschaltet oder weitergeleitet werden, vorher:

1. Die Videos aus dem Ordner `Assents/` in Shopware unter Inhalte → Medien hochladen.
2. In `src/produktion.html` die Adressen ersetzen (Suche nach `hamburgpapier-shop-produktion.de`).
3. `node shopware/build.mjs` ausführen und den Block im Shop neu einfügen.

## Lokale Vorschau

```bash
node shopware/vorschau-server.mjs
```

Dann <http://localhost:8765/shopware/vorschau.html> öffnen. Mit `?sticky=1` läuft der Header auch am Desktop mit.
Die Vorschau lädt das echte Theme-CSS des Shops; dessen Adresse steht in `vorschau.html` und ändert sich,
wenn das Theme im Shop neu kompiliert wird.
