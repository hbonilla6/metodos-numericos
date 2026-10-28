/* ==========================================================================
   Agrega a cada css/js local de los HTML una versión (?v=…) calculada con su
   contenido. Si un archivo cambia, su URL cambia y el navegador lo descarga
   de nuevo en lugar de usar la copia guardada.

   Uso:  npm run versionar   (después de cambiar cualquier css/ o js/)
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const RECURSO_LOCAL = /((?:src|href)="((?:css|js)\/[^"?]+))(?:\?v=[0-9a-f]+)?"/g;

function versionDe(ruta) {
  const contenido = fs.readFileSync(path.join(RAIZ, ruta));
  return crypto.createHash('sha1').update(contenido).digest('hex').slice(0, 8);
}

/** El HTML con la versión correcta en cada recurso local. */
function versionarHtml(html) {
  return html.replace(RECURSO_LOCAL, (texto, inicio, ruta) => inicio + '?v=' + versionDe(ruta) + '"');
}

function paginasHtml() {
  return fs.readdirSync(RAIZ).filter(archivo => archivo.endsWith('.html'));
}

if (require.main === module) {
  paginasHtml().forEach(archivo => {
    const ruta = path.join(RAIZ, archivo);
    const original = fs.readFileSync(ruta, 'utf8');
    const nuevo = versionarHtml(original);
    if (nuevo !== original) fs.writeFileSync(ruta, nuevo);
  });
}

module.exports = { versionarHtml, paginasHtml };
