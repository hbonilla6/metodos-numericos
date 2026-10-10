const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, referencias, fraccionATextoCompleto, plano } = require('./ayudas');

const m = cargarModulos(['comun/notacion.js', 'comun/algebra-exacta.js', 'interpolacion/lagrange.js', 'hermite/diferencias.js']);
const T = n => m.traer(n);
const textoDe = polinomio => plano(Array.from(polinomio, fraccionATextoCompleto));

function evaluarExacto(polinomio, x) {
  const punto = T('crearFraccion')(x);
  return polinomio.reduceRight((acc, c) => T('sumar')(T('multiplicar')(acc, punto), c), T('crearFraccion')(0));
}

describe('Lagrange contra la referencia de Python (sistema de Vandermonde exacto)', () => {
  referencias.lagrange.forEach((caso, i) => {
    const etiqueta = JSON.stringify(caso.puntos);
    it('caso ' + (i + 1) + ': ' + etiqueta, () => {
      const { total, terminos } = T('interpolarLagrange')(caso.puntos);
      const real = textoDe(total);
      // el polinomio tiene n coeficientes (grado n − 1); los que sobran serían ceros
      assert.deepStrictEqual(real.slice(0, caso.coeficientes.length), caso.coeficientes);
      assert.ok(real.slice(caso.coeficientes.length).every(c => c === '0/1'));
      // pasa por cada punto (exacto)
      for (const [x, y] of caso.puntos) {
        assert.strictEqual(fraccionATextoCompleto(evaluarExacto(total, x)), y + '/1');
      }
      // cada término de Lagrange vale fᵢ en su punto y 0 en los demás
      terminos.forEach((termino, k) => {
        caso.puntos.forEach(([x], j) => {
          const valor = fraccionATextoCompleto(evaluarExacto(termino.terminoFinal, x));
          assert.strictEqual(valor, k === j ? caso.puntos[k][1] + '/1' : '0/1');
        });
      });
    });
  });
});

describe('Lagrange: los seis ejercicios del pizarrón', () => {
  const esperados = [['2/1', '1/1'], ['2/1', '4/1'], ['4/1', '-2/1'], ['2/1', '0/1', '1/1'], ['6/1', '3/1', '1/1'], ['-4/1', '-2/1', '0/1']];
  const puntos = [[[0, 2], [1, 3]], [[7, 30], [-6, -22]], [[1, 2], [2, 0]], [[1, 3], [4, 18], [6, 38]], [[1, 10], [-4, 10], [-7, 34]], [[-6, 8], [6, -16], [-1, -2]]];
  puntos.forEach((p, i) => it('ejercicio ' + (i + 1), () => {
    const real = textoDe(T('interpolarLagrange')(p).total);
    assert.deepStrictEqual(real.slice(0, esperados[i].length), esperados[i]);
  }));
});

describe('Hermite contra la referencia de Python', () => {
  referencias.hermite.forEach((caso, i) => {
    const puntos = caso.puntos.map(([x, fx, dfx]) => ({ x, fx, dfx }));
    it('caso ' + (i + 1) + ': ' + JSON.stringify(caso.puntos), () => {
      const { z, columnas } = T('calcularDiferenciasDivididas')(puntos);
      // los puntos z: cada x dos veces
      assert.deepStrictEqual(plano(z), caso.puntos.flatMap(([x]) => [x, x]));
      // toda la tabla de diferencias divididas, celda por celda
      const tabla = plano(Array.from(columnas, columna => Array.from(columna, fraccionATextoCompleto)));
      assert.deepStrictEqual(tabla, caso.tabla);
      // el polinomio completo (todos sus coeficientes)
      const { total, terminos } = T('construirPolinomioDeHermite')(z, columnas);
      assert.deepStrictEqual(textoDe(total), caso.coeficientes);
      assert.strictEqual(terminos.length, z.length);
      // pasa por cada punto con la pendiente pedida (exacto)
      const derivada = T('derivarPolinomio')(total);
      for (const [x, fx, dfx] of caso.puntos) {
        assert.strictEqual(fraccionATextoCompleto(T('evaluarPolinomioExacto')(total, x)), fx + '/1');
        assert.strictEqual(fraccionATextoCompleto(T('evaluarPolinomioExacto')(derivada, x)), dfx + '/1');
      }
    });
  });
});

describe('Hermite: el ejercicio del cuaderno', () => {
  it('x₀ = −2, f = −12, f\' = 22;  x₁ = 1, f = 9, f\' = 10  →  2x³ + x² + 2x + 4', () => {
    const puntos = [{ x: -2, fx: -12, dfx: 22 }, { x: 1, fx: 9, dfx: 10 }];
    const { z, columnas } = T('calcularDiferenciasDivididas')(puntos);
    assert.deepStrictEqual(plano(Array.from(columnas, c => Array.from(c, fraccionATextoCompleto))), [
      ['-12/1', '-12/1', '9/1', '9/1'], ['22/1', '7/1', '10/1'], ['-5/1', '1/1'], ['2/1'],
    ]);
    assert.deepStrictEqual(textoDe(T('construirPolinomioDeHermite')(z, columnas).total), ['4/1', '2/1', '1/1', '2/1']);
  });
  it('usaDerivada es verdadero solo en la columna 1 entre z repetidos', () => {
    const z = [-2, -2, 1, 1];
    const usa = T('usaDerivada');
    assert.ok(usa(z, 1, 0));
    assert.ok(!usa(z, 1, 1));
    assert.ok(usa(z, 1, 2));
    assert.ok(!usa(z, 2, 0));
    assert.ok(!usa(z, 0, 0));
  });
  it('puntoDeZ: z₀,z₁ → punto 0; z₂,z₃ → punto 1; z₄,z₅ → punto 2', () => {
    assert.deepStrictEqual([0, 1, 2, 3, 4, 5].map(i => T('puntoDeZ')(i)), [0, 0, 1, 1, 2, 2]);
  });
  it('derivarPolinomio y evaluarPolinomioExacto (Horner)', () => {
    const f = T('crearFraccion');
    const p = [f(4), f(2), f(1), f(2)];                    // 2x³ + x² + 2x + 4
    assert.deepStrictEqual(textoDe(T('derivarPolinomio')(p)), ['2/1', '2/1', '6/1']);
    assert.strictEqual(fraccionATextoCompleto(T('evaluarPolinomioExacto')(p, 1)), '9/1');
    assert.strictEqual(fraccionATextoCompleto(T('evaluarPolinomioExacto')(p, -2)), '-12/1');
  });
});
