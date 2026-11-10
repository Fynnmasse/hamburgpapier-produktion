# Produktionsseite als Erlebniswelt-Block

Die Einzelseite (`index.html` im Projektordner) als ein Block für das ThemeWare®-Element
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

## Was gegenüber der Einzelseite anders ist

- **Entfallen**, weil der Shop es mitbringt: eigener Header mit Menü, Ladebildschirm, Footer,
  schwebender „Zum Online Shop"-Knopf, Cookiebot, Google Analytics, Smartlook, Meta-Angaben im `<head>`.
- **Schriften** kommen vom Theme (Comfortaa für Überschriften, Open Sans für Text).
  Bekommt das Theme andere Schriften: oben in `src/produktion.css` bei `--hpp-font-heading` / `--hpp-font-body` anpassen.
- **Keine externe Bibliothek** mehr (GSAP entfällt), keine Schrift- oder Skript-Aufrufe zu Drittanbietern.
- Alles liegt unter der Klasse `.hpp`, alle Maße in px – das Theme verändert den Block nicht und umgekehrt.
- Die Höhe eines mitlaufenden Shop-Headers wird automatisch erkannt; der Hero füllt den ersten Bildschirm darunter.
- Strukturierte Daten: FAQ und Herstellungsschritte sind enthalten. Website/Organisation liefert der Shop selbst.

## Medien

Videos und Kartenbilder werden weiterhin von `https://hamburgpapier-shop-produktion.de/Assents/…` geladen
(11 Videos, 5 Bilder). **Solange diese Adresse online ist, funktioniert alles.**

Soll die alte Seite abgeschaltet oder weitergeleitet werden, vorher:

1. Dateien aus dem Ordner `Assents/` in Shopware unter Inhalte → Medien hochladen.
2. In `src/produktion.html` die Adressen ersetzen (Suche nach `hamburgpapier-shop-produktion.de`).
3. `node shopware/build.mjs` ausführen und den Block im Shop neu einfügen.

## Lokale Vorschau

```bash
node shopware/vorschau-server.mjs
```

Dann <http://localhost:8765/shopware/vorschau.html> öffnen. Mit `?sticky=1` läuft der Header auch am Desktop mit.
Die Vorschau lädt das echte Theme-CSS des Shops; dessen Adresse steht in `vorschau.html` und ändert sich,
wenn das Theme im Shop neu kompiliert wird.
