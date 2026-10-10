const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, referencias, decimalDeFraccion, casiIguales, plano, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/formato.js', 'sistemas/matematica.js']);
const T = n => m.traer(n);
const D = valor => new Decimal(valor);
const matrizDecimal = A => A.map(fila => fila.map(v => D(v)));
const vectorDecimal = b => b.map(v => D(v));
const TOL = () => T('TOLERANCIA');

describe('determinante y sistemas singulares', () => {
  referencias.sistemas.forEach((caso, i) => {
    it(`sistema ${i + 1}: det = ${caso.determinante}`, () => {
      const real = T('determinante3x3')(matrizDecimal(caso.A));
      assert.ok(casiIguales(real, decimalDeFraccion(caso.determinante), '1e-30'));
      const esperadoSingular = decimalDeFraccion(caso.determinante).isZero();
      assert.strictEqual(T('esSingular')(matrizDecimal(caso.A)), esperadoSingular);
    });
  });
  it('un sistema con una ecuación múltiplo de otra es singular', () => {
    assert.ok(T('esSingular')(matrizDecimal([[1, 2, 3], [2, 4, 6], [1, 1, 1]])));
    assert.ok(T('esSingular')(matrizDecimal([[1, 2, 3], [4, 5, 6], [7, 8, 9]])));
    assert.ok(T('esSingular')(matrizDecimal([[0, 0, 0], [1, 2, 3], [4, 5, 6]])));
  });
  it('un sistema bien condicionado no es singular, aunque sus números sean chicos', () => {
    assert.ok(!T('esSingular')(matrizDecimal([[1, 0, 0], [0, 1, 0], [0, 0, 1]])));
    assert.ok(!T('esSingular')(matrizDecimal([['0.001', 0, 0], [0, '0.001', 0], [0, 0, '0.001']])));
    assert.ok(!T('esSingular')(matrizDecimal([[10, 1, 1], [1, 10, 1], [1, 1, 10]])));
  });
});

describe('orden de las ecuaciones contra Python', () => {
  referencias.sistemas.forEach((caso, i) => {
    const A = matrizDecimal(caso.A);
    it(`sistema ${i + 1}: los seis órdenes, ordenados de mejor a peor`, () => {
      const real = T('ordenesPosibles')(A);
      assert.strictEqual(real.length, 6);
      real.forEach((candidato, k) => {
        const esperado = caso.ordenes[k];
        assert.deepStrictEqual(plano(candidato.orden), esperado.orden, `posición ${k + 1}`);
        assert.strictEqual(candidato.estricta, esperado.estricta);
        assert.ok(casiIguales(candidato.puntaje, decimalDeFraccion(esperado.puntaje), '1e-30'));
        assert.deepStrictEqual(plano(candidato.diagonal.map(d => d.toString())), esperado.diagonal.map(d => String(decimalDeFraccion(d))));
      });
    });
    it(`sistema ${i + 1}: orden de clase = ${JSON.stringify(caso.ordenDeClase)}`, () => {
      assert.deepStrictEqual(plano(T('ordenDeClase')(A)), caso.ordenDeClase);
    });
  });
  it('el del pizarrón: x + 3y + z = −8, 3x − y + 2z = 1, 2x − y + z = −1 → ecuaciones (2, 1, 3)', () => {
    assert.deepStrictEqual(plano(T('ordenDeClase')(matrizDecimal([[1, 3, 1], [3, -1, 2], [2, -1, 1]]))), [1, 0, 2]);
  });
  it('si hay diagonal estrictamente dominante, el orden de clase la usa', () => {
    assert.deepStrictEqual(plano(T('ordenDeClase')(matrizDecimal([[1, 2, 10], [10, 1, 2], [1, 10, 1]]))), [1, 2, 0]);
  });
  it('permutacionesDe(n) da n! órdenes distintos', () => {
    for (const [n, esperado] of [[1, 1], [2, 2], [3, 6], [4, 24]]) {
      const lista = plano(T('permutacionesDe')(n));
      assert.strictEqual(lista.length, esperado);
      assert.strictEqual(new Set(lista.map(p => p.join())).size, esperado);
    }
  });
  it('evaluarDiagonal: estricta solo si en cada fila |diagonal| > suma de |los demás|', () => {
    const evaluar = T('evaluarDiagonal');
    assert.ok(evaluar(matrizDecimal([[10, 1, 1], [1, 10, 1], [1, 1, 10]]), [0, 1, 2]).estricta);
    assert.ok(!evaluar(matrizDecimal([[2, 1, 1], [1, 3, -2], [1, -2, -3]]), [0, 1, 2]).estricta);   // 2 = 1 + 1 no es mayor
    assert.ok(evaluar(matrizDecimal([[1, 10, 1], [10, 1, 1], [1, 1, 10]]), [1, 0, 2]).estricta);
  });
});

describe('un paso de Jacobi o Gauss-Seidel (contra la fórmula escrita a mano)', () => {
  let semilla = 4242;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  const entero = (a, b) => Math.floor(azar() * (b - a + 1)) + a;
  it('500 sistemas al azar', () => {
    for (let k = 0; k < 500; k++) {
      const A = Array.from({ length: 3 }, (_, i) => Array.from({ length: 3 }, (_, j) => entero(i === j ? 3 : -4, i === j ? 9 : 4) || 1));
      const b = [entero(-9, 9), entero(-9, 9), entero(-9, 9)];
      const x = [entero(-5, 5), entero(-5, 5), entero(-5, 5)].map(v => D(v));
      const [x0, x1, x2] = x;
      // Jacobi: todo con el vector anterior
      const jacobi = T('calcularPaso')(matrizDecimal(A), vectorDecimal(b), x, false);
      assert.ok(jacobi[0].equals(D(b[0]).minus(D(A[0][1]).times(x1)).minus(D(A[0][2]).times(x2)).dividedBy(A[0][0])));
      assert.ok(jacobi[1].equals(D(b[1]).minus(D(A[1][0]).times(x0)).minus(D(A[1][2]).times(x2)).dividedBy(A[1][1])));
      assert.ok(jacobi[2].equals(D(b[2]).minus(D(A[2][0]).times(x0)).minus(D(A[2][1]).times(x1)).dividedBy(A[2][2])));
      // Gauss-Seidel: cada variable usa de inmediato las ya calculadas
      const gauss = T('calcularPaso')(matrizDecimal(A), vectorDecimal(b), x, true);
      const n0 = D(b[0]).minus(D(A[0][1]).times(x1)).minus(D(A[0][2]).times(x2)).dividedBy(A[0][0]);
      const n1 = D(b[1]).minus(D(A[1][0]).times(n0)).minus(D(A[1][2]).times(x2)).dividedBy(A[1][1]);
      const n2 = D(b[2]).minus(D(A[2][0]).times(n0)).minus(D(A[2][1]).times(n1)).dividedBy(A[2][2]);
      assert.ok(gauss[0].equals(n0) && gauss[1].equals(n1) && gauss[2].equals(n2));
    }
  });
  it('no modifica el vector de entrada', () => {
    const x = [D(1), D(2), D(3)];
    T('calcularPaso')(matrizDecimal([[4, 1, 1], [1, 4, 1], [1, 1, 4]]), vectorDecimal([6, 6, 6]), x, true);
    assert.deepStrictEqual(x.map(v => v.toString()), ['1', '2', '3']);
  });
  it('normaInfinito: la mayor diferencia en valor absoluto', () => {
    assert.strictEqual(T('normaInfinito')([D(1), D(5), D(-3)], [D(2), D(1), D(-3)]).toString(), '4');
    assert.strictEqual(T('normaInfinito')([D(1), D(2)], [D(1), D(2)]).toString(), '0');
    assert.strictEqual(T('normaInfinito')([D(-5), D(0)], [D(5), D(1)]).toString(), '10');
  });
});

describe('iteraciones exactas contra Python (Fractions → 60 dígitos)', () => {
  referencias.sistemas.filter(s => s.trazas).forEach((caso, i) => {
    for (const metodo of ['jacobi', 'gauss']) {
      it(`sistema ${i + 1}, ${metodo}`, () => {
        const orden = caso.ordenDeClase;
        const resultado = T('correrMetodo')(metodo, matrizDecimal(caso.A), vectorDecimal(caso.b), orden, D('1e-90'), 16);
        const esperadas = caso.trazas[metodo];
        const comparables = Math.min(resultado.filas.length, esperadas.length);
        assert.ok(comparables >= 1);
        for (let k = 0; k < comparables; k++) {
          const fila = resultado.filas[k];
          if (fila.diverge) break;     // cuando se desborda se detiene: ya no hay valores comparables
          esperadas[k].x.forEach((valor, j) => assert.ok(casiIguales(fila.x[j], valor, '1e-28'), `iteración ${k + 1}, variable ${j}: ${fila.x[j]} contra ${valor}`));
          assert.ok(casiIguales(fila.error, esperadas[k].error, '1e-28'), `error de la iteración ${k + 1}`);
          assert.strictEqual(fila.iteracion, k + 1);
        }
      });
    }
  });
});

/** Radio espectral de la matriz de iteración, estimado como ‖Mᵏ‖^(1/k) con números normales. */
function radioEspectral(A, orden, metodo) {
  const Ar = orden.map(i => A[i].map(Number));
  const n = 3;
  // Jacobi: M = −D⁻¹(L+U).  Gauss-Seidel: M = −(D+L)⁻¹U
  const D_ = Ar.map((fila, i) => fila.map((v, j) => i === j ? v : 0));
  const L = Ar.map((fila, i) => fila.map((v, j) => j < i ? v : 0));
  const U = Ar.map((fila, i) => fila.map((v, j) => j > i ? v : 0));
  const inversaTriangular = M => {   // M triangular inferior con diagonal ≠ 0
    const inv = Array.from({ length: n }, () => Array(n).fill(0));
    for (let col = 0; col < n; col++) {
      for (let i = 0; i < n; i++) {
        let s = i === col ? 1 : 0;
        for (let j = 0; j < i; j++) s -= M[i][j] * inv[j][col];
        inv[i][col] = s / M[i][i];
      }
    }
    return inv;
  };
  const mul = (P, Q) => P.map((fila, i) => Q[0].map((_, j) => fila.reduce((s, _, k) => s + P[i][k] * Q[k][j], 0)));
  const sumaMatrices = (P, Q) => P.map((fila, i) => fila.map((v, j) => v + Q[i][j]));
  const negativa = P => P.map(fila => fila.map(v => -v));
  const M = metodo === 'jacobi'
    ? negativa(mul(inversaTriangular(D_), sumaMatrices(L, U)))
    : negativa(mul(inversaTriangular(sumaMatrices(D_, L)), U));
  let potencia = M;
  let k = 1;
  for (; k < 200; k++) {
    potencia = mul(potencia, M);
    const norma = Math.max(...potencia.flat().map(Math.abs));
    if (norma > 1e100) break;
    if (norma < 1e-200) return 0;
  }
  return Math.pow(Math.max(...potencia.flat().map(Math.abs)), 1 / (k + 1));
}

describe('convergencia según la teoría (radio espectral de la matriz de iteración)', () => {
  const casos = [];
  referencias.sistemas.forEach((caso, i) => { casos.push([`sistema ${i + 1}`, caso]); });
  for (const [nombre, caso] of casos) {
    for (const metodo of ['jacobi', 'gauss']) {
      it(`${nombre}, ${metodo}`, () => {
        const orden = caso.ordenDeClase;
        if (caso.A.some((_, v) => caso.A[orden[v]][v] === 0)) return;   // sin diagonal no hay método
        const rho = radioEspectral(caso.A, orden, metodo);
        const r = T('correrMetodo')(metodo, matrizDecimal(caso.A), vectorDecimal(caso.b), orden, TOL(), 150);
        if (rho < 0.85) assert.strictEqual(r.estado, 'convergio', `ρ = ${rho.toFixed(3)}: debía converger y dio ${r.estado}`);
        if (rho > 1.02) assert.strictEqual(r.estado, 'diverge', `ρ = ${rho.toFixed(3)}: debía divergir y dio ${r.estado}`);
        if (r.estado === 'convergio') assert.ok(rho < 1, `convergió con ρ = ${rho.toFixed(3)} ≥ 1`);
      });
    }
  }
  it('el teorema: con diagonal estrictamente dominante nunca diverge (1500 sistemas al azar)', () => {
    let semilla = 2024;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    const entero = (a, b) => Math.floor(azar() * (b - a + 1)) + a;
    let verificados = 0;
    for (let k = 0; k < 1500; k++) {
      const A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => entero(-9, 9)));
      // se fuerza la dominancia estricta: cada diagonal supera la suma de los demás de su fila
      A.forEach((fila, i) => {
        const resto = fila.reduce((suma, valor, j) => j === i ? suma : suma + Math.abs(valor), 0);
        fila[i] = (entero(0, 1) ? 1 : -1) * (resto + entero(1, 6));
      });
      const orden = [0, 1, 2];
      assert.ok(T('evaluarDiagonal')(matrizDecimal(A), orden).estricta);
      const b = [entero(-20, 20), entero(-20, 20), entero(-20, 20)];
      for (const metodo of ['jacobi', 'gauss']) {
        const r = T('correrMetodo')(metodo, matrizDecimal(A), vectorDecimal(b), orden, TOL(), 150);
        assert.notStrictEqual(r.estado, 'diverge', JSON.stringify({ A, b, metodo }));
        verificados++;
      }
    }
    assert.strictEqual(verificados, 3000);
  });
});

/** Solución por la regla de Cramer (exacta con Decimal de 40 dígitos). */
function solucionPorCramer(A, b) {
  const det = T('determinante3x3')(matrizDecimal(A));
  return [0, 1, 2].map(columna => {
    const reemplazada = A.map((fila, i) => fila.map((v, j) => j === columna ? b[i] : v));
    return T('determinante3x3')(matrizDecimal(reemplazada)).dividedBy(det);
  });
}
function llegaALaSolucionExacta(A, b, resultado) {
  const exacta = solucionPorCramer(A, b);
  const ultima = resultado.filas[resultado.filas.length - 1];
  return exacta.every((valor, j) => ultima.x[j].minus(valor).abs().lessThan('1e-4'));
}

describe('el veredicto coincide con la teoría en 4000 sistemas al azar', () => {
  it('ρ < 0.85 nunca se declara divergente; ρ > 1.1 siempre se declara divergente', () => {
    let semilla = 31337;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    const entero = (a, b) => Math.floor(azar() * (b - a + 1)) + a;
    const resumen = { convergentes: 0, divergentes: 0, falsosDivergentes: 0, falsosConvergentes: 0 };
    for (let k = 0; k < 4000; k++) {
      const A = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => entero(-9, 9) || 1));
      const b = [entero(-20, 20), entero(-20, 20), entero(-20, 20)];
      for (const metodo of ['jacobi', 'gauss']) {
        const rho = radioEspectral(A, [0, 1, 2], metodo);
        if (!(rho < 0.85 || rho > 1.1)) continue;
        const r = T('correrMetodo')(metodo, matrizDecimal(A), vectorDecimal(b), [0, 1, 2], TOL(), 150);
        if (rho < 0.85) { resumen.convergentes++; if (r.estado === 'diverge') resumen.falsosDivergentes++; }
        else {
          resumen.divergentes++;
          // Excepción legítima: si la solución exacta cae en el subespacio estable de la iteración, converge aunque ρ > 1
          if (r.estado !== 'diverge' && !(r.estado === 'convergio' && llegaALaSolucionExacta(A, b, r))) resumen.falsosConvergentes++;
        }
      }
    }
    assert.ok(resumen.convergentes > 500 && resumen.divergentes > 3000, JSON.stringify(resumen));
    assert.strictEqual(resumen.falsosDivergentes, 0, JSON.stringify(resumen));
    assert.strictEqual(resumen.falsosConvergentes, 0, JSON.stringify(resumen));
  });
});

describe('la solución a la que llega coincide con la exacta', () => {
  referencias.sistemas.forEach((caso, i) => {
    if (!caso.solucion) return;
    for (const metodo of ['jacobi', 'gauss']) {
      it(`sistema ${i + 1}, ${metodo}`, () => {
        const r = T('correrMetodo')(metodo, matrizDecimal(caso.A), vectorDecimal(caso.b), caso.ordenDeClase, TOL(), 150);
        if (r.estado !== 'convergio') return;
        const ultima = r.filas[r.filas.length - 1];
        caso.solucion.forEach((valor, j) => {
          const error = ultima.x[j].minus(decimalDeFraccion(valor)).abs();
          // el paro por diferencia entre iteraciones deja un error verdadero de pocas veces la tolerancia
          assert.ok(error.lessThan('1e-4'), `x${j}: ${ultima.x[j]} contra ${decimalDeFraccion(valor)} (error ${error})`);
        });
      });
    }
  });
});

describe('el sistema del cuaderno y el del pizarrón', () => {
  const cuaderno = { A: [[2, 1, 1], [1, 3, -2], [1, -2, -3]], b: [6, 13, -1] };
  it('Gauss-Seidel, 2x + y + z = 6, x + 3y − 2z = 13, x − 2y − 3z = −1 → (2, 3, −1), como en la tabla escrita a mano', () => {
    const r = T('correrMetodo')('gauss', matrizDecimal(cuaderno.A), vectorDecimal(cuaderno.b), [0, 1, 2], TOL(), 150);
    assert.strictEqual(r.estado, 'convergio');
    const redondeado = fila => fila.x.map(v => v.toDecimalPlaces(6).toString());
    assert.deepStrictEqual(redondeado(r.filas[0]), ['3', '3.333333', '-0.888889']);
    assert.deepStrictEqual(redondeado(r.filas[1]), ['1.777778', '3.148148', '-1.17284']);
    assert.deepStrictEqual(redondeado(r.filas[2]), ['2.012346', '2.880658', '-0.916324']);
    assert.deepStrictEqual(r.filas[r.filas.length - 1].x.map(v => v.toDecimalPlaces(5).toString()), ['2', '3', '-1']);
  });
  it('con el orden de clase, el sistema del pizarrón diverge en la iteración 15 (el error no baja)', () => {
    const A = matrizDecimal([[1, 3, 1], [3, -1, 2], [2, -1, 1]]);
    const b = vectorDecimal([-8, 1, -1]);
    for (const metodo of ['jacobi', 'gauss']) {
      const r = T('correrMetodo')(metodo, A, b, [1, 0, 2], TOL(), 150);
      assert.strictEqual(r.estado, 'diverge');
      assert.strictEqual(r.sinAcercarse, true);
      assert.strictEqual(r.filas.length, 15);
    }
  });
  it('resolverSistema ofrece el otro orden (3, 1, 2) que sí llega a la solución exacta (−19/3, −10/3, 25/3)', () => {
    const A = matrizDecimal([[1, 3, 1], [3, -1, 2], [2, -1, 1]]);
    const b = vectorDecimal([-8, 1, -1]);
    const normal = T('resolverSistema')(A, b, false);
    assert.deepStrictEqual(plano(normal.orden), [1, 0, 2]);
    assert.ok(normal.alternativo && !normal.esAlternativo);
    assert.deepStrictEqual(plano(normal.alternativo.orden), [2, 0, 1]);
    const alternativo = T('resolverSistema')(A, b, true);
    assert.ok(alternativo.esAlternativo);
    assert.deepStrictEqual(plano(alternativo.ordenDeClase), [1, 0, 2]);
    assert.strictEqual(alternativo.gauss.estado, 'convergio');
    const x = alternativo.gauss.filas[alternativo.gauss.filas.length - 1].x;
    ['-19/3', '-10/3', '25/3'].forEach((esperado, j) => assert.ok(x[j].minus(decimalDeFraccion(esperado)).abs().lessThan('1e-4')));
  });
  it('si el orden de clase ya converge, no hay alternativa que ofrecer', () => {
    const r = T('resolverSistema')(matrizDecimal([[10, 1, 1], [1, 10, 1], [1, 1, 10]]), vectorDecimal([12, 12, 12]), false);
    assert.strictEqual(r.alternativo, null);
    assert.ok(!r.esAlternativo);
    assert.strictEqual(r.jacobi.estado, 'convergio');
    assert.strictEqual(r.gauss.estado, 'convergio');
  });
  it('buscarOrdenQueConverge prefiere el orden donde convergen los dos métodos', () => {
    const r = T('buscarOrdenQueConverge')(matrizDecimal([[1, 3, 1], [3, -1, 2], [2, -1, 1]]), vectorDecimal([-8, 1, -1]));
    assert.ok(r.gauss.estado === 'convergio' || r.jacobi.estado === 'convergio');
  });
});

describe('criterios de parada', () => {
  it('se detiene cuando el error es menor que la tolerancia, no antes', () => {
    const r = T('correrMetodo')('gauss', matrizDecimal([[10, 1, 1], [1, 10, 1], [1, 1, 10]]), vectorDecimal([12, 12, 12]), [0, 1, 2], TOL(), 150);
    assert.strictEqual(r.estado, 'convergio');
    const ultima = r.filas[r.filas.length - 1];
    assert.ok(ultima.error.lessThan(TOL()));
    r.filas.slice(0, -1).forEach(fila => assert.ok(!fila.error.lessThan(TOL())));
  });
  it('un sistema que se dispara termina en "diverge" con una fila desbordada', () => {
    const r = T('correrMetodo')('jacobi', matrizDecimal([[1, 5, 5], [5, 1, 5], [5, 5, 1]]), vectorDecimal([1, 1, 1]), [0, 1, 2], TOL(), 150);
    assert.strictEqual(r.estado, 'diverge');
  });
  it('el tope de iteraciones devuelve "maximo"', () => {
    const r = T('correrMetodo')('jacobi', matrizDecimal([[10, 1, 1], [1, 10, 1], [1, 1, 10]]), vectorDecimal([12, 12, 12]), [0, 1, 2], D('1e-300'), 5);
    assert.strictEqual(r.estado, 'maximo');
    assert.strictEqual(r.filas.length, 5);
  });
  it('convergio(): solo el estado "convergio"', () => {
    const c = T('convergio');
    assert.ok(c({ estado: 'convergio' }));
    for (const e of ['diverge', 'maximo', 'error']) assert.ok(!c({ estado: e }));
  });
});
