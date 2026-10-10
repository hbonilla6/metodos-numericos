const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, referencias, decimalDeFraccion, casiIguales, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/formato.js', 'raices/expresion.js', 'raices/derivada.js']);
const T = n => m.traer(n);
const construirFuncion = texto => T('construirFuncion')(texto);

describe('derivada simbólica contra Python (derivación automática con fracciones exactas)', () => {
  for (const { expresion, derivable, casos } of referencias.expresiones.filter(e => e.derivable)) {
    it(expresion + " → f'(x) en " + casos.length + ' puntos', () => {
      const derivada = T('derivarFuncion')(construirFuncion(expresion));
      for (const { x, derivada: esperada } of casos) {
        const real = derivada(new Decimal(x));
        assert.ok(casiIguales(real, decimalDeFraccion(esperada), '1e-28'), `f'(${x}): obtuve ${real}, debía ser ${decimalDeFraccion(esperada)}`);
      }
    });
  }
});

describe('derivadas que se rechazan con un aviso (exponente que no es un número)', () => {
  for (const { expresion } of referencias.expresiones.filter(e => !e.derivable)) {
    it(expresion, () => assert.throws(() => T('derivarFuncion')(construirFuncion(expresion)), /EXPONENTE_NO_CONSTANTE/));
  }
});

describe('derivadas conocidas', () => {
  const evaluar = (texto, x) => T('derivarFuncion')(construirFuncion(texto))(new Decimal(x)).toNumber();
  const casos = [
    ['x^3 - 2*x - 5', 2, 10], ['3x^2 - 2x + 1', 1, 4], ['x^2/3 - 2', 3, 2], ['1/x', 2, -0.25], ['x^-1', 2, -0.25],
    ['x^-2', 2, -0.25], ['2^-1*x', 7, 0.5], ['0.5*x^2', 4, 4], ['x^0.5', 4, 0.25], ['(x+1)^3', 1, 12], ['-x^3', 2, -12],
    ['5', 3, 0], ['x', 9, 1], ['(2x+1)/(x-1)', 3, -0.75], ['x(x+1)(x+2)', 1, 11],
  ];
  for (const [texto, x, esperado] of casos) {
    it(`d/dx ${texto} en x = ${x} → ${esperado}`, () => assert.ok(Math.abs(evaluar(texto, x) - esperado) < 1e-12));
  }
});

/** Pruebas con expresiones al azar (el generador es de las pruebas, no de la página) */
let semilla = 99;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
const entero = (a, b) => Math.floor(azar() * (b - a + 1)) + a;

function arbolAlAzar(profundidad) {
  const N = T('nodoNumero'), V = T('nodoVariable'), NEG = T('nodoNegativo'), B = T('nodoBinario');
  if (profundidad === 0) return azar() < 0.5 ? V() : N(String(entero(1, 5)));
  const forma = entero(0, 7);
  if (forma === 0) return NEG(arbolAlAzar(profundidad - 1));
  if (forma === 1) return B('^', arbolAlAzar(profundidad - 1), N(String(entero(0, 3))));
  const operacion = ['+', '-', '*', '+', '-', '*', '/'][entero(0, 6)];
  return B(operacion, arbolAlAzar(profundidad - 1), arbolAlAzar(profundidad - 1));
}

function evaluarArbol(arbol, x) { return T('evaluarArbol')(arbol, new Decimal(x)); }

describe('simplificar no cambia el valor (600 árboles al azar)', () => {
  it('el árbol simplificado vale lo mismo que el original', () => {
    let comparados = 0;
    for (let i = 0; i < 600; i++) {
      const arbol = arbolAlAzar(entero(1, 4));
      const simple = T('simplificar')(arbol);
      for (const x of ['-3', '-1.5', '0.5', '2', '7']) {
        const a = evaluarArbol(arbol, x);
        const b = evaluarArbol(simple, x);
        if (!a.isFinite() || !b.isFinite()) continue;
        comparados++;
        assert.ok(casiIguales(b, a, '1e-8'), `x = ${x}: original ${a}, simplificado ${b}`);
      }
    }
    assert.ok(comparados > 1500);
  });
});

describe('derivar contra diferencias finitas (500 árboles al azar)', () => {
  it('la derivada simbólica coincide con (f(x+h) − f(x−h)) / 2h', () => {
    const h = new Decimal('1e-12');
    let comparados = 0;
    for (let i = 0; i < 500; i++) {
      const arbol = arbolAlAzar(entero(1, 3));
      let derivada;
      try { derivada = T('simplificar')(T('derivarArbol')(arbol)); } catch (e) { continue; }
      for (const x of ['-2.5', '0.7', '3']) {
        const px = new Decimal(x);
        const delante = evaluarArbol(arbol, px.plus(h));
        const detras = evaluarArbol(arbol, px.minus(h));
        const simbolica = evaluarArbol(derivada, px);
        if (![delante, detras, simbolica].every(v => v.isFinite())) continue;
        const numerica = delante.minus(detras).dividedBy(h.times(2));
        comparados++;
        const escala = Decimal.max(1, simbolica.abs());
        assert.ok(numerica.minus(simbolica).abs().lessThan(escala.times('1e-7')), `x = ${x}: simbólica ${simbolica}, numérica ${numerica}`);
      }
    }
    assert.ok(comparados > 800, 'solo se compararon ' + comparados);
  });
});

describe('terminosDeSuma reparte f(x) en términos con su signo', () => {
  it('la suma de signo × término vale f(x) (casos y puntos distintos)', () => {
    for (const expresion of ['2*x^3 - x^2 - 3', 'x - (x - 3) + 2', '-x + 4 - x^2', 'x^3 - 2*x - 5', '5 - (2 - x)']) {
      const f = construirFuncion(expresion);
      const terminos = [];
      T('terminosDeSuma')(f.arbol, 1, terminos);
      for (const x of ['-2', '0.5', '3']) {
        const suma = terminos.reduce((total, { signo, nodo }) => total.plus(evaluarArbol(nodo, x).times(signo)), new Decimal(0));
        assert.ok(casiIguales(suma, f(new Decimal(x)), '1e-30'), expresion + ' en ' + x);
      }
    }
  });
});
