// Baut aus den drei Quelldateien in src/ den einen Block, der in Shopware in den
// HTML-Tab des ThemeWare-Elements „Individueller Code (HTML/CSS/JS)" kopiert wird.
//
//   node shopware/build.mjs
//
// Ergebnis: shopware/produktion-erlebniswelt.html

import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const read = (name) => readFileSync(new URL(`src/${name}`, here), 'utf8').replace(/\r\n/g, '\n').trim();

const css = read('produktion.css');
const html = read('produktion.html');
const js = read('produktion.js');

// Prüfungen, damit der Block im Shop nicht stillschweigend kaputtgeht.
const problems = [];
const check = (condition, message) => { if (condition) problems.push(message); };

check(/\d(?:rem)\b/.test(css), 'CSS enthält rem-Werte (das Theme ändert die Wurzelschrift – px verwenden).');
check(/<\/style/i.test(css), 'CSS enthält ein schließendes style-Tag.');
check(/<\/script/i.test(js), 'Skript enthält ein schließendes script-Tag.');
check(/^\s*\/\//m.test(js), 'Skript enthält //-Kommentare (nur /* */ verwenden, falls der Shop HTML komprimiert).');
for (const [name, text] of [['CSS', css], ['HTML', html], ['Skript', js]]) {
    // Ist im Element „Twig-Variablen erlauben" aktiv, würden diese Zeichenfolgen als Twig gelesen.
    check(/\{\{|\{%|\{#/.test(text), `${name} enthält eine Twig-Zeichenfolge ({{, {% oder {#).`);
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
console.log(`produktion-erlebniswelt.html geschrieben (${(Buffer.byteLength(out) / 1024).toFixed(1)} KB)`);
