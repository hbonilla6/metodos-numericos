const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { versionarHtml, paginasHtml } = require('../scripts/versionar-recursos');

describe('versiones de los recursos', () => {
  paginasHtml().forEach(archivo => {
    it(archivo + ' lleva la versión actual de cada css y js (corre "npm run versionar")', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
      assert.strictEqual(versionarHtml(html), html);
    });
  });
  it('cada recurso local lleva versión', () => {
    paginasHtml().forEach(archivo => {
      const html = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
      const sinVersion = [...html.matchAll(/(?:src|href)="((?:css|js)\/[^"]+)"/g)].filter(m => !/\?v=[0-9a-f]{8}$/.test(m[1]));
      assert.deepStrictEqual(sinVersion.map(m => m[1]), [], archivo);
    });
  });
});
