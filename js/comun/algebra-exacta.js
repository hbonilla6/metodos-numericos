/* ==========================================================================
   Álgebra exacta con fracciones (BigInt, sin errores de redondeo) y polinomios,
   y su escritura en HTML. La usan Lagrange y Hermite.

   Un polinomio es la lista de sus coeficientes de menor a mayor grado:
   [c0, c1, c2] representa c0 + c1·x + c2·x².
   ========================================================================== */

// ---------- Fracciones ----------

function maximoComunDivisor(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}

/** Fracción simplificada con denominador positivo: { n: numerador, d: denominador }. */
function crearFraccion(numerador, denominador) {
  numerador = BigInt(numerador);
  denominador = BigInt(denominador === undefined ? 1n : denominador);
  if (denominador === 0n) throw new Error('División entre cero');
  if (denominador < 0n) { numerador = -numerador; denominador = -denominador; }
  const divisor = maximoComunDivisor(numerador, denominador);
  return { n: numerador / divisor, d: denominador / divisor };
}

function sumar(a, b) { return crearFraccion(a.n * b.d + b.n * a.d, a.d * b.d); }
function restar(a, b) { return crearFraccion(a.n * b.d - b.n * a.d, a.d * b.d); }
function multiplicar(a, b) { return crearFraccion(a.n * b.n, a.d * b.d); }
function dividir(a, b) { return crearFraccion(a.n * b.d, a.d * b.n); }
function negar(a) { return crearFraccion(-a.n, a.d); }
function esCero(a) { return a.n === 0n; }
function fraccionATexto(a) { return a.d === 1n ? a.n.toString() : a.n.toString() + '/' + a.d.toString(); }

// ---------- Polinomios ----------

function polinomioNulo(grado) {
  return Array.from({ length: grado + 1 }, () => crearFraccion(0));
}

function sumarPolinomios(p, q) {
  const largo = Math.max(p.length, q.length);
  const resultado = polinomioNulo(largo - 1);
  for (let i = 0; i < largo; i++) {
    resultado[i] = sumar(p[i] || crearFraccion(0), q[i] || crearFraccion(0));
  }
  return resultado;
}

function multiplicarPolinomioPorNumero(p, numero) {
  return p.map(coeficiente => multiplicar(coeficiente, numero));
}

/** El polinomio (x − a). */
function factorLineal(a) {
  return [negar(a), crearFraccion(1)];
}

function multiplicarPolinomios(p, q) {
  const resultado = polinomioNulo(p.length + q.length - 2);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      resultado[i + j] = sumar(resultado[i + j], multiplicar(p[i], q[j]));
    }
  }
  return resultado;
}

/** Evalúa el polinomio (coeficientes como fracciones exactas) en un número normal. */
function evaluarPolinomio(polinomio, x) {
  return polinomio.reduce((suma, coeficiente, grado) =>
    suma + Number(coeficiente.n) / Number(coeficiente.d) * Math.pow(x, grado), 0);
}

// ---------- Escritura en HTML ----------

/** Un número entero o una fracción de verdad (numerador sobre denominador). */
function fraccionEnHtml(f) {
  const texto = n => n.toString().replace('-', '−');
  if (f.d === 1n) return texto(f.n);
  return fraccion(texto(f.n), texto(f.d));
}

/** Separa el signo del valor: { signo: ' − ' o ' + ', absoluto }. */
function signoYValor(f) {
  if (f.n < 0n) return { signo: ' − ', absoluto: crearFraccion(-f.n, f.d) };
  return { signo: ' + ', absoluto: f };
}

/** (x − xj) con el signo correcto; (x) si xj es 0. */
function factorConVariable(xj) {
  if (xj === 0) return '(x)';
  return xj > 0 ? '(x − ' + xj + ')' : '(x + ' + (-xj) + ')';
}

/** Polinomio como "2·x² − x + 3", sin términos nulos ni coeficientes 1 de más. */
function polinomioEnHtml(polinomio, variable) {
  variable = variable || 'x';
  const partes = [];
  for (let grado = polinomio.length - 1; grado >= 0; grado--) {
    const coeficiente = polinomio[grado];
    if (esCero(coeficiente)) continue;

    const { signo, absoluto } = signoYValor(coeficiente);
    let termino = fraccionEnHtml(absoluto);
    if (grado >= 1) {
      const esUno = absoluto.n === 1n && absoluto.d === 1n;
      termino = (esUno ? '' : termino + '·') + variable + (grado > 1 ? '<sup>' + grado + '</sup>' : '');
    }
    partes.push({ signo, termino });
  }
  if (partes.length === 0) return '0';

  let html = (partes[0].signo === ' − ' ? '−' : '') + partes[0].termino;
  for (let i = 1; i < partes.length; i++) html += partes[i].signo + partes[i].termino;
  return html;
}
