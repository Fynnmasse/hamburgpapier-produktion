Shop-Animation (Online Shop Sektion)

Kurzbeschreibung (Wie es aussieht)
- Beim Einblenden der Sektion schieben sich die Inhalte von links ins Bild.
- Die Kartenreihe wirkt wie ein horizontaler Slider, der beim vertikalen Scrollen nach rechts wandert.
- Die Kartenbilder bekommen einen leichten Parallax-Effekt (Bild bewegt sich minimal gegen den Scroll).
- Die Intro-Ueberschrift faehrt von unten nach oben ein (Reveal).
- Auf Desktop wird die Sektion fuer einen Abschnitt gepinnt (sticky), damit die horizontale Bewegung sichtbar bleibt.

Wie es funktioniert (Technik)
1) HTML-Struktur
   - .shop.shop-groovy ist die Sektion.
   - .sticky-parent / .sticky-child bilden das Pinning.
   - .scroll-h-parent enthaelt mehrere .scroll-h-child (die einzelnen Karten).

2) CSS-Startzustand + Reveal
   - .scroll-h-parent startet mit opacity: 0 und transform per CSS-Variablen.
   - .scroll-h-child startet mit translate3d(-100vw, 0, 0).
   - Wenn die Klasse .shop-groovy--ready gesetzt wird, springen die Werte auf 0 und animieren ueber Transition.

   Wichtige Auszuege (styles.css):
   .shop-groovy .scroll-h-parent {
     opacity: 0;
     transform: translate3d(var(--shop-scroll-x, 0%), var(--shop-card-shift, 0px), 0);
     transition: opacity var(--shop-reveal-opacity-duration) var(--shop-reveal-ease);
   }
   .shop-groovy .scroll-h-child {
     transform: translate3d(-100vw, 0, 0);
     transition: transform var(--shop-reveal-duration) var(--shop-reveal-ease);
   }
   .shop-groovy.shop-groovy--ready .scroll-h-parent { opacity: 1; }
   .shop-groovy.shop-groovy--ready .scroll-h-child { transform: translate3d(0, 0, 0); }

3) JS-Scroll-Animation (GSAP + ScrollTrigger)
   - initGroovyShopScroll() in script.js setzt die Klasse .shop-groovy--ready, sobald die Sektion in den Viewport kommt.
   - Auf Desktop (min-width: 992px) wird die Sektion gepinnt und die CSS-Variablen animiert:
     --shop-scroll-x bewegt den ganzen Karten-Container horizontal.
     --shop-card-parallax verschiebt die Bilder leicht fuer den Parallax-Effekt.

   Wichtige Auszuege (script.js):
   ScrollTrigger.create({
     trigger: section,
     start: 'top 85%',
     onEnter: setReady,
     onEnterBack: setReady
   });

   gsap.to(scrollParent, {
     '--shop-scroll-x': '-38%',
     scrollTrigger: { trigger: stickyParent, start: 'top top', end: 'bottom bottom', scrub: true }
   });

   gsap.to(section, {
     '--shop-card-parallax': '-6%',
     scrollTrigger: { trigger: stickyParent, start: 'top top', end: 'bottom bottom', scrub: true }
   });

4) Fallbacks
   - Wenn prefers-reduced-motion aktiv ist oder GSAP/ScrollTrigger fehlt, wird nur .shop-groovy--ready gesetzt.
   - Dann erscheinen die Inhalte ohne Pinning/Parallax.

Dateien / Stellen
- HTML: index.html (Sektion mit .shop.shop-groovy, .sticky-parent, .scroll-h-parent, .scroll-h-child)
- CSS: styles.css (Bereich ab .shop.shop-groovy und die Scroll/Reveal-Regeln)
- JS: script.js (initGroovyShopScroll)
