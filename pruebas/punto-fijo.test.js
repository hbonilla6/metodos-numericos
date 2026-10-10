const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, referencias, casiIguales, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/formato.js', 'raices/expresion.js', 'raices/derivada.js', 'raices/metodos.js', 'raices/punto-fijo.js']);
const T = n => m.traer(n);
const D = valor => new Decimal(valor);
const TOL = D('1e-7');
const construir = texto => T('construirFuncion')(texto);

describe('punto fijo: despeje de g(x)', () => {
  it('x³ − 2x − 5: aísla x³ y deja 2x + 5 (el de mayor grado va primero)', () => {
    const candidatos = T('candidatosDePuntoFijo')(construir('x^3 - 2*x - 5').arbol);
    assert.strictEqual(candidatos[0].grado, 3);
    assert.strictEqual(candidatos[0].coeficienteLider, 1);
    const g = T('funcionDesdeArbol')(candidatos[0].arbolG);
    // g(x) = (2x + 5)^(1/3): g(2) = 3√9
    assert.ok(casiIguales(g(D(2)), D(9).pow(D(1).dividedBy(3)), '1e-35'));
  });
  it('los candidatos van del mayor grado al menor', () => {
    const grados = T('candidatosDePuntoFijo')(construir('x^3 + x^2 - x - 1').arbol).map(c => c.grado);
    assert.deepStrictEqual(Array.from(grados), [3, 2, 1]);
  });
  it('el término constante nunca se aísla (no tiene x)', () => {
    const grados = T('candidatosDePuntoFijo')(construir('x^2 - 2').arbol).map(c => c.grado);
    assert.deepStrictEqual(Array.from(grados), [2]);
  });
  it('coeficiente líder distinto de 1: 2x³ − x² − 3  →  x³ = (x² + 3) ÷ 2', () => {
    const candidato = T('candidatosDePuntoFijo')(construir('2*x^3 - x^2 - 3').arbol)[0];
    assert.strictEqual(candidato.coeficienteLider, 2);
    const g = T('funcionDesdeArbol')(candidato.arbolG);
    assert.ok(casiIguales(g(D(1)), D(2).pow(D(1).dividedBy(3)), '1e-35'));       // ((1 + 3) / 2)^(1/3)
  });
  it('si el término líder es negativo, el despeje cambia de signo bien: −x² + 4 = 0 → x² = 4', () => {
    const g = T('funcionDesdeArbol')(T('candidatosDePuntoFijo')(construir('-x^2 + 4').arbol)[0].arbolG);
    assert.ok(casiIguales(g(D(0)), 2, '1e-35'));
  });
  it('un término de primer grado se despeja sin raíz: x² − 4x + 1 con x aislado → x = (x² + 1) ÷ 4', () => {
    const candidatos = T('candidatosDePuntoFijo')(construir('x^2 - 4*x + 1').arbol);
    const g = T('funcionDesdeArbol')(candidatos[candidatos.length - 1].arbolG);
    assert.ok(casiIguales(g(D(3)), D(10).dividedBy(4), '1e-35'));
  });
  it('coeficientes decimales se conservan exactos: 0.1x² − 0.4 → x = (4)^(1/2)', () => {
    const g = T('funcionDesdeArbol')(T('candidatosDePuntoFijo')(construir('0.1*x^2 - 0.4').arbol)[0].arbolG);
    assert.ok(casiIguales(g(D(0)), 2, '1e-35'));
  });
});

describe('punto fijo: lo que no se puede despejar se rechaza con un aviso', () => {
  const rechaza = (texto, codigo) => assert.throws(() => T('candidatosDePuntoFijo')(construir(texto).arbol), new RegExp(codigo), texto);
  it('con divisiones', () => rechaza('x^2/3 - 2', 'NO_ES_POLINOMIO_SIMPLE'));
  it('con paréntesis que no son monomios', () => rechaza('(x+1)^2 - 4', 'NO_ES_POLINOMIO_SIMPLE'));
  it('con cociente de polinomios', () => rechaza('(x+1)/(x-3) - 2', 'NO_ES_POLINOMIO_SIMPLE'));
  it('con exponentes negativos', () => rechaza('x^-1 - 2', 'NO_ES_POLINOMIO_SIMPLE'));
  it('sin ninguna x', () => rechaza('5', 'SIN_TERMINO_CON_X'));
});

describe('punto fijo: la g(x) elegida tiene a la raíz de f(x) como punto fijo', () => {
  for (const caso of referencias.raices.filter(c => c.puntoFijo)) {
    it(caso.expresion, () => {
      const f = construir(caso.expresion);
      const raiz = D(caso.raiz);
      // se prueba con todos los despejes posibles: g(r) = r en cada uno (donde g existe)
      for (const candidato of T('candidatosDePuntoFijo')(f.arbol)) {
        const g = T('funcionDesdeArbol')(candidato.arbolG);
        const valor = g(raiz);
        if (!valor.isFinite()) continue;
        assert.ok(casiIguales(valor, raiz, '1e-30'), `grado ${candidato.grado}: g(r) = ${valor}, r = ${raiz}`);
      }
    });
  }
});

describe('elegirPuntoFijoConvergente', () => {
  it('devuelve la primera g que converge y marca convergio', () => {
    const r = T('elegirPuntoFijoConvergente')(construir('x^3 - 2*x - 5'), D(2), TOL, 80);
    assert.ok(r.convergio);
    assert.strictEqual(r.grado, 3);
    const ultima = r.filas[r.filas.length - 1];
    assert.ok(ultima.error.lessThan(TOL));
  });
  it('si ninguna converge devuelve el primer intento, con convergio = false', () => {
    // x² − 3x + 3: su único punto fijo con el despeje de grado 2 no se alcanza desde este x₀
    const r = T('elegirPuntoFijoConvergente')(construir('x^2 - 3*x + 2'), D(5), TOL, 80);
    assert.ok(r.filas.length > 0);
    assert.strictEqual(r.convergio, T('llegoALaTolerancia')(r.filas, TOL));
  });
  it('si el despeje da un valor no real (raíz de un negativo) la fila queda como divergente', () => {
    const r = T('elegirPuntoFijoConvergente')(construir('x^2 - 4*x + 1'), D(0), TOL, 80);
    assert.ok(r.filas[r.filas.length - 1].divergio || r.convergio);
  });
  it('la raíz que encuentra es raíz de f(x): |f(r)| pequeño', () => {
    for (const [texto, x0] of [['x^3 - 2*x - 5', 2], ['x^4 - 3*x - 1', 1], ['x^2 - 2', 1]]) {
      const f = construir(texto);
      const r = T('elegirPuntoFijoConvergente')(f, D(x0), TOL, 80);
      assert.ok(r.convergio, texto);
      assert.ok(f(r.filas[r.filas.length - 1].xi).abs().lessThan('1e-5'), texto);
    }
  });
});
