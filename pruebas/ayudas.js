/* ==========================================================================
   Ayudas compartidas por las pruebas.
   - cargarModulos: ejecuta los archivos de js/ (los mismos que usa el navegador) en un contexto aislado.
   - abrirPagina:   abre una página HTML completa en jsdom, con sus scripts, para probar la interfaz.
   - referencias:   valores calculados aparte con Python (ver referencias/generar_referencias.py).
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Decimal = require('decimal.js');
const { JSDOM, VirtualConsole } = require('jsdom');

const RAIZ = path.join(__dirname, '..');
const referencias = require('./referencias/referencias.json');

function leerArchivo(ruta) { return fs.readFileSync(path.join(RAIZ, ruta), 'utf8'); }

/** Contexto aislado con los archivos pedidos (rutas dentro de js/) ya ejecutados, en orden. */
function cargarModulos(archivos, extras = {}) {
  const contexto = vm.createContext({ Decimal, console, BigInt, Math, JSON, Number, String, Object, Array, Set, Map, Error, parseFloat, parseInt, isFinite, setTimeout, clearTimeout, ...extras });
  archivos.forEach(archivo => vm.runInContext(leerArchivo('js/' + archivo), contexto, { filename: archivo }));
  return {
    contexto,
    traer: nombre => vm.runInContext(nombre, contexto),
    evaluar: codigo => vm.runInContext(codigo, contexto),
  };
}

/** Copia "plana" para comparar con deepStrictEqual (quita los prototipos de otro contexto y convierte BigInt). */
function plano(valor) {
  return JSON.parse(JSON.stringify(valor, (clave, v) => typeof v === 'bigint' ? v.toString() : v));
}

/** Fracción exacta {n, d} (BigInt) → "p/q", igual que escribe el generador de Python. */
function fraccionATextoCompleto(f) { return f.n.toString() + '/' + f.d.toString(); }

/** "p/q" → Decimal con 40 dígitos. */
function decimalDeFraccion(texto) {
  const [n, d] = texto.split('/');
  return new Decimal(n).dividedBy(new Decimal(d));
}

/** ¿|a − b| ≤ tolerancia · max(1, |b|)? Para comparar Decimales (o textos) con un error relativo/absoluto. */
function casiIguales(a, b, tolerancia = '1e-25') {
  const x = new Decimal(a);
  const y = new Decimal(b);
  const escala = Decimal.max(1, y.abs());
  return x.minus(y).abs().lessThanOrEqualTo(escala.times(tolerancia));
}

// ---------- Páginas completas en jsdom ----------

function armarHtml(archivo) {
  const decimalFuente = fs.readFileSync(require.resolve('decimal.js'), 'utf8');
  return fs.readFileSync(path.join(RAIZ, archivo), 'utf8').replace(/<script\s+src="([^"]+)"[^>]*><\/script>/g, (m, src) => {
    if (/decimal/.test(src)) return '<script>' + decimalFuente.replace(/<\/script>/g, '') + '</script>';
    if (/^https?:/.test(src)) return '';
    return '<script>' + leerArchivo(src).replace(/<\/script>/g, '<\\/script>') + '</script>';
  });
}

function abrirPagina(archivo) {
  const errores = [];
  const consola = new VirtualConsole();
  consola.on('jsdomError', e => errores.push(e.message));
  const dom = new JSDOM(armarHtml(archivo), {
    runScripts: 'dangerously', virtualConsole: consola, pretendToBeVisual: true, url: 'http://localhost/',
    beforeParse(w) {
      w.Element.prototype.scrollIntoView = function () {};
      w.HTMLElement.prototype.focus = function () {};
    },
  });
  const w = dom.window;
  const d = w.document;
  return {
    w, d, errores,
    cerrar: () => w.close(),
    escribir(id, valor) {
      const campo = d.getElementById(id);
      campo.value = valor;
      campo.dispatchEvent(new w.Event('input', { bubbles: true }));
    },
    clic(elemento) { elemento.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); },
    boton(texto) { return [...d.querySelectorAll('button')].find(b => b.textContent.includes(texto)); },
    html: id => d.getElementById(id).innerHTML,
    texto: id => d.getElementById(id).textContent,
    celdasTocables: () => [...d.querySelectorAll('#resultTable td.clickable')],
  };
}

// ---------- Evaluar fórmulas dibujadas en HTML (para comprobar que lo que se ve es matemáticamente correcto) ----------

/** Texto de una celda sin las llaves de dígitos repetidos. */
function htmlSinAnotaciones(elemento) {
  const copia = elemento.cloneNode(true);
  copia.querySelectorAll('.run-count').forEach(e => e.remove());
  return copia;
}

/**
 * Convierte un fragmento de HTML matemático (fracciones, exponentes, raíces, referencias a celdas)
 * en una expresión de JavaScript. `valorDeReferencia(campo, idx)` da el número de una celda.
 */
function aExpresion(nodo, valorDeReferencia) {
  if (nodo.nodeType === 3) {
    return nodo.textContent.replace(/−/g, '-').replace(/·/g, '*').replace(/×/g, '*').replace(/÷/g, '/');
  }
  const hijos = () => [...nodo.childNodes].map(n => aExpresion(n, valorDeReferencia)).join('');
  const clases = nodo.classList;

  if (clases.contains('frac')) {
    const [numerador, denominador] = [...nodo.children].map(h => aExpresion(h, valorDeReferencia));
    return '((' + numerador + ')/(' + denominador + '))';
  }
  if (nodo.tagName === 'SUP') {
    if (clases.contains('raiz-indice')) return '';
    return '**(' + hijos() + ')';
  }
  if (clases.contains('raiz')) {
    const indice = nodo.querySelector('.raiz-indice');
    const contenido = nodo.querySelector('.raiz-cont');
    return 'Math.pow((' + aExpresion(contenido, valorDeReferencia) + '),1/' + (indice ? indice.textContent : '2') + ')';
  }
  if (clases.contains('ref-link')) {
    const valor = valorDeReferencia(nodo.dataset.campo, parseInt(nodo.dataset.idx));
    return valor === null ? 'NaN' : '(' + valor + ')';
  }
  if (clases.contains('raiz-signo')) return '';
  return hijos();
}

/**
 * Evalúa una expresión producida por aExpresion con un analizador propio (sin eval):
 * + − * / ^ (asociativa a la derecha), signo menos, paréntesis, |x|, máx(…), Math.pow/abs/max.
 * Devuelve un número, o null si no es una expresión puramente numérica.
 */
function evaluarNumerico(expresion) {
  let texto = expresion.replace(/\s+/g, '').replace(/\*\*/g, '^').replace(/máx\(/g, 'Math.max(');
  texto = texto.replace(/\)\(/g, ')*(').replace(/(\d)\(/g, '$1*(').replace(/\)(\d)/g, ')*$1');   // multiplicación implícita: (x−2)(x−4)
  const fichas = texto.match(/Math\.(?:abs|max|pow)|\d+\.?\d*(?:[eE][+-]?\d+)?|[-+*/^(),|]|./g) || [];
  if (!fichas.length) return null;
  let posicion = 0;
  const siguiente = () => fichas[posicion];
  const fallo = () => { throw new Error('no numérica'); };

  function suma() {
    let valor = producto();
    while (siguiente() === '+' || siguiente() === '-') valor = fichas[posicion++] === '+' ? valor + producto() : valor - producto();
    return valor;
  }
  function producto() {
    let valor = conSigno();
    while (siguiente() === '*' || siguiente() === '/') valor = fichas[posicion++] === '*' ? valor * conSigno() : valor / conSigno();
    return valor;
  }
  function conSigno() {
    if (siguiente() === '-') { posicion++; return -conSigno(); }
    if (siguiente() === '+') { posicion++; return conSigno(); }
    return potencia();
  }
  function potencia() {
    const base = atomo();
    if (siguiente() === '^') { posicion++; return Math.pow(base, conSigno()); }
    return base;
  }
  function argumentos() {
    const lista = [suma()];
    while (siguiente() === ',') { posicion++; lista.push(suma()); }
    return lista;
  }
  function atomo() {
    const ficha = fichas[posicion++];
    if (ficha === undefined) fallo();
    if (/^\d/.test(ficha)) return parseFloat(ficha);
    if (ficha === '(') { const v = suma(); if (fichas[posicion++] !== ')') fallo(); return v; }
    if (ficha === '|') { const v = suma(); if (fichas[posicion++] !== '|') fallo(); return Math.abs(v); }
    if (/^Math\./.test(ficha)) {
      if (fichas[posicion++] !== '(') fallo();
      const args = argumentos();
      if (fichas[posicion++] !== ')') fallo();
      return Math[ficha.slice(5)](...args);
    }
    return fallo();
  }

  try {
    const valor = suma();
    return posicion === fichas.length && Number.isFinite(valor) ? valor : null;
  } catch (e) {
    return null;
  }
}

/** Número que muestra una celda de una tabla (resuelve notación científica y signos). */
function valorDeCeldaEnPagina(pagina, campo, idx) {
  const td = pagina.d.querySelector('#resultTable td[data-campo="' + campo + '"][data-idx="' + idx + '"]');
  if (!td) return null;
  const texto = aExpresion(htmlSinAnotaciones(td), () => null);
  return evaluarNumerico(texto);
}

/** Convierte un fragmento de HTML en elementos del DOM (para analizar fórmulas dibujadas). */
let documentoAuxiliar = null;
function htmlAElemento(html) {
  if (!documentoAuxiliar) documentoAuxiliar = new JSDOM('<body></body>').window.document;
  const contenedor = documentoAuxiliar.createElement('div');
  contenedor.innerHTML = html;
  return contenedor;
}

/** Valor numérico de un fragmento de HTML matemático sin referencias (por ejemplo un polinomio con x = 3). */
function valorDeHtml(html) {
  return evaluarNumerico(aExpresion(htmlAElemento(html), () => null));
}

/**
 * Pulsa cada celda tocable de la tabla y comprueba la aritmética de su explicación:
 * en cada fórmula "A = B = C = …" todos los pasos que se pueden evaluar como número
 * (con las referencias a otras celdas sustituidas por su valor) deben dar el mismo resultado.
 * Devuelve { celdas, formulas, comprobadas, fallos } (fallos vacío si todo cuadra).
 */
function verificarExplicaciones(pagina, { tolerancia = 1e-8, x = null } = {}) {
  const resultado = { celdas: 0, formulas: 0, comprobadas: 0, fallos: [] };
  const resolverCelda = (campo, idx) => valorDeCeldaEnPagina(pagina, campo, idx);

  const tabla = pagina.d.getElementById('resultTable');
  for (const td of pagina.celdasTocables()) {
    if (tabla.classList.contains('oculta-' + td.dataset.campo)) continue;   // columna oculta: el usuario no puede tocarla
    pagina.clic(td);
    resultado.celdas++;
    const nombre = `${td.dataset.campo}[${td.dataset.idx}]`;
    const panel = pagina.d.getElementById('explainBox');

    // Toda celda que la explicación menciona (salvo la propia) debe quedar resaltada en la tabla
    const mencionadas = new Set([...panel.querySelectorAll('.ref-link')].map(e => e.dataset.campo + '_' + e.dataset.idx));
    mencionadas.delete(td.dataset.campo + '_' + td.dataset.idx);
    const resaltadas = new Set([...pagina.d.querySelectorAll('#resultTable td.related')].map(e => e.dataset.campo + '_' + e.dataset.idx));
    const sinResaltar = [...mencionadas].filter(c => !resaltadas.has(c));
    if (sinResaltar.length) resultado.fallos.push(`${nombre}: la explicación menciona ${sinResaltar.join(', ')} pero no se resalta`);

    const formulas = [...panel.querySelectorAll('.formula')];
    if (!formulas.length && !panel.querySelector('.empty')) resultado.fallos.push(`${nombre}: la explicación está vacía`);

    for (const formula of formulas) {
      resultado.formulas++;
      const copia = formula.cloneNode(true);
      copia.querySelectorAll('.formula-etq, .orden-de').forEach(e => e.remove());
      let expresion = aExpresion(copia, resolverCelda);
      if (x !== null) expresion = expresion.replace(/(?<![A-Za-zᵢ₀-₉])x(?![A-Za-zᵢ₀-₉(])/g, '(' + x + ')');
      const partes = expresion.split('=');
      const valores = partes.map(evaluarNumerico).filter(v => v !== null);
      if (valores.length < 2) continue;
      resultado.comprobadas++;
      const referencia = valores[valores.length - 1];
      for (const v of valores) {
        if (Math.abs(v - referencia) > tolerancia * Math.max(1, Math.abs(referencia))) {
          resultado.fallos.push(`${nombre}: ${expresion.replace(/\s+/g, '')} → ${valores.join(' ≠ ')}`);
          break;
        }
      }
    }
  }
  return resultado;
}

module.exports = {
  htmlAElemento, valorDeHtml,
  Decimal, referencias, cargarModulos, plano, fraccionATextoCompleto, decimalDeFraccion, casiIguales,
  abrirPagina, verificarExplicaciones, htmlSinAnotaciones, aExpresion, evaluarNumerico, valorDeCeldaEnPagina,
};
