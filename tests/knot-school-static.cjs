/* Ein kleiner, abhängigkeitfreier Schutztest für die Knotenschule. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'knot-illustrations.js'), 'utf8');

const knotNames = [
  'Verbesserter Clinchknoten', 'Palomarknoten', 'Grinnerknoten', 'Doppel-Grinner',
  'Doppelter Überhand-Schlaufenknoten', 'Albrightknoten', 'Blutknoten',
  'Rapalaknoten', 'Arborknoten', 'Springerschlaufe', 'Snellknoten'
];
knotNames.forEach(name => assert.match(html, new RegExp(name), `Knoten fehlt: ${name}`));
['back', 'play', 'slow', 'next', 'zoom', '3d'].forEach(action =>
  assert.match(script, new RegExp(`'${action}'`), `Steuerung fehlt: ${action}`));
assert.match(script, /slow \? 5200 : 2600/, 'Zeitlupe verwendet keine längere Schrittzeit');
assert.match(script, /pointermove/, 'freie Drehsteuerung fehlt');
console.log(`OK: ${knotNames.length} Knoten und alle sechs Bedienfunktionen vorhanden.`);
