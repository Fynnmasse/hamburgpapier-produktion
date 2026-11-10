// Baut aus den drei Quelldateien in src/ den einen Block, der in Shopware in den
// HTML-Tab des ThemeWare-Elements „Individueller Code (HTML/CSS/JS)" kopiert wird.
//
//   node shopware/build.mjs
//
// Ergebnis: shopware/produktion-erlebniswelt.html
// CSS und Skript werden dabei verdichtet (Kommentare und Einrückung entfernt),
// das HTML bleibt lesbar, damit Texte und Preise im Shop direkt änderbar sind.

import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const read = (name) => readFileSync(new URL(`src/${name}`, here), 'utf8').replace(/\r\n/g, '\n').trim();

// Kommentare, Einrückung und Leerzeilen entfernen. Voraussetzung: /* */ kommt in
// keinem String vor und das Skript nutzt keine mehrzeiligen Zeichenketten.
const compact = (text) => text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

const cssSource = read('produktion.css');
const html = read('produktion.html');
const jsSource = read('produktion.js');
const css = compact(cssSource);
const js = compact(jsSource);

// Prüfungen, damit der Block im Shop nicht stillschweigend kaputtgeht.
const problems = [];
const check = (condition, message) => { if (condition) problems.push(message); };

check(/\d(?:rem)\b/.test(css), 'CSS enthält rem-Werte (das Theme ändert die Wurzelschrift – px verwenden).');
check(/<\/style/i.test(css), 'CSS enthält ein schließendes style-Tag.');
check(/<\/script/i.test(js), 'Skript enthält ein schließendes script-Tag.');
check(/^\s*\/\//m.test(jsSource), 'Skript enthält //-Kommentare (nur /* */ verwenden).');
check(/`/.test(jsSource), 'Skript enthält Template-Strings (würden beim Verdichten beschädigt).');
for (const [name, text] of [['CSS', css], ['HTML', html], ['Skript', js]]) {
    // Ist im Element „Twig-Variablen erlauben" aktiv, würden diese Zeichenfolgen als Twig gelesen.
    check(/\{\{|\{%|\{#/.test(text), `${name} enthält eine Twig-Zeichenfolge ({{, {% oder {#).`);
}
try {
    // Nur parsen, nicht ausführen: fängt Syntaxfehler im verdichteten Skript ab.
    new Function(js);
} catch (error) {
    problems.push(`Verdichtetes Skript ist fehlerhaft: ${error.message}`);
}

if (problems.length) {
    console.error('Build abgebrochen:\n - ' + problems.join('\n - '));
    process.exit(1);
}

const out = [
    '<!-- ===== HAMBURGPAPIER PRODUKTION · AB HIER KOPIEREN ===== -->',
    '<style>',
    css,
    '</style>',
    '',
    html,
    '',
    '<script>',
    js,
    '</script>',
    '<!-- ===== HAMBURGPAPIER PRODUKTION · BIS HIER KOPIEREN ===== -->',
    ''
].join('\n');

writeFileSync(new URL('produktion-erlebniswelt.html', here), out, 'utf8');
const kb = (text) => (Buffer.byteLength(text) / 1024).toFixed(1);
console.log(`produktion-erlebniswelt.html geschrieben (${kb(out)} KB; CSS ${kb(css)}, HTML ${kb(html)}, Skript ${kb(js)})`);
