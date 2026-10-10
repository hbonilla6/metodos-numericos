const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, plano, valorDeHtml } = require('./ayudas');

const m = cargarModulos(['comun/notacion.js', 'comun/algebra-exacta.js']);
const { crearFraccion, sumar, restar, multiplicar, dividir, negar, esCero, fraccionATexto, polinomioNulo, sumarPolinomios,
  multiplicarPolinomioPorNumero, factorLineal, multiplicarPolinomios, evaluarPolinomio, fraccionEnHtml, polinomioEnHtml, factorConVariable } =
  Object.fromEntries(['crearFraccion', 'sumar', 'restar', 'multiplicar', 'dividir', 'negar', 'esCero', 'fraccionATexto', 'polinomioNulo',
    'sumarPolinomios', 'multiplicarPolinomioPorNumero', 'factorLineal', 'multiplicarPolinomios', 'evaluarPolinomio', 'fraccionEnHtml',
    'polinomioEnHtml', 'factorConVariable'].map(n => [n, m.traer(n)]));

let semilla = 12345;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
const entero = (bajo, alto) => Math.floor(azar() * (alto - bajo + 1)) + bajo;
const fraccionAlAzar = () => crearFraccion(entero(-60, 60), entero(1, 40));
const mcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };

/** a y b representan el mismo número racional (producto cruzado). */
const iguales = (a, b) => a.n * b.d === b.n * a.d;

describe('crearFraccion', () => {
  it('simplifica, deja el denominador positivo y el cero como 0/1', () => {
    assert.deepStrictEqual(plano(crearFraccion(6, 8)), { n: '3', d: '4' });
    assert.deepStrictEqual(plano(crearFraccion(6, -8)), { n: '-3', d: '4' });
    assert.deepStrictEqual(plano(crearFraccion(-6, -8)), { n: '3', d: '4' });
    assert.deepStrictEqual(plano(crearFraccion(0, -5)), { n: '0', d: '1' });
    assert.deepStrictEqual(plano(crearFraccion(7)), { n: '7', d: '1' });
  });
  it('dividir entre cero lanza error', () => {
    assert.throws(() => crearFraccion(1, 0), /cero/);
    assert.throws(() => dividir(crearFraccion(1), crearFraccion(0)), /cero/);
  });
  it('siempre queda en términos mínimos (2000 casos al azar)', () => {
    for (let i = 0; i < 2000; i++) {
      const f = crearFraccion(entero(-9999, 9999), entero(-999, 999) || 1);
      assert.ok(f.d > 0n);
      assert.strictEqual(mcd(f.n, f.d), f.n === 0n ? f.d : mcd(f.n, f.d));
      assert.strictEqual(mcd(f.n, f.d), 1n);
    }
  });
  it('números enormes (más de 64 bits) no pierden exactitud', () => {
    const grande = crearFraccion(123456789012345678901234567890n, 987654321098765432109876543210n);
    assert.strictEqual(mcd(grande.n, grande.d), 1n);
    const suma = sumar(grande, crearFraccion(1, 3));
    assert.ok(iguales(restar(suma, crearFraccion(1, 3)), grande));
  });
});

describe('operaciones con fracciones (comparadas con el producto cruzado)', () => {
  it('suma, resta, producto y cociente: 1000 casos', () => {
    for (let i = 0; i < 1000; i++) {
      const a = fraccionAlAzar();
      const b = fraccionAlAzar();
      const suma = sumar(a, b);
      assert.strictEqual(suma.n * (a.d * b.d), (a.n * b.d + b.n * a.d) * suma.d);
      const resta = restar(a, b);
      assert.strictEqual(resta.n * (a.d * b.d), (a.n * b.d - b.n * a.d) * resta.d);
      const producto = multiplicar(a, b);
      assert.strictEqual(producto.n * (a.d * b.d), a.n * b.n * producto.d);
      if (b.n !== 0n) {
        const cociente = dividir(a, b);
        assert.strictEqual(cociente.n * (a.d * b.n), a.n * b.d * cociente.d);
      }
    }
  });
  it('propiedades: conmutativa, distributiva, a − a = 0, a ÷ a = 1, −(−a) = a', () => {
    for (let i = 0; i < 500; i++) {
      const a = fraccionAlAzar(), b = fraccionAlAzar(), c = fraccionAlAzar();
      assert.ok(iguales(sumar(a, b), sumar(b, a)));
      assert.ok(iguales(multiplicar(a, b), multiplicar(b, a)));
      assert.ok(iguales(multiplicar(a, sumar(b, c)), sumar(multiplicar(a, b), multiplicar(a, c))));
      assert.ok(esCero(restar(a, a)));
      if (a.n !== 0n) assert.ok(iguales(dividir(a, a), crearFraccion(1)));
      assert.ok(iguales(negar(negar(a)), a));
    }
  });
  it('esCero y fraccionATexto', () => {
    assert.ok(esCero(crearFraccion(0, 7)));
    assert.ok(!esCero(crearFraccion(1, 7)));
    assert.strictEqual(fraccionATexto(crearFraccion(6, 4)), '3/2');
    assert.strictEqual(fraccionATexto(crearFraccion(8, 4)), '2');
    assert.strictEqual(fraccionATexto(crearFraccion(-1, 3)), '-1/3');
  });
});

/** Polinomio al azar de cierto grado, con coeficientes fraccionarios. */
const polinomioAlAzar = grado => Array.from({ length: grado + 1 }, fraccionAlAzar);
const evaluarExacto = (p, x) => p.reduceRight((acumulado, c) => sumar(multiplicar(acumulado, x), c), crearFraccion(0));

describe('polinomios exactos', () => {
  it('polinomioNulo tiene grado + 1 coeficientes cero', () => {
    const p = polinomioNulo(3);
    assert.strictEqual(p.length, 4);
    assert.ok(p.every(esCero));
  });
  it('el producto evaluado es el producto de las evaluaciones (500 casos)', () => {
    for (let i = 0; i < 500; i++) {
      const p = polinomioAlAzar(entero(0, 3)), q = polinomioAlAzar(entero(0, 3)), x = fraccionAlAzar();
      const producto = multiplicarPolinomios(p, q);
      assert.strictEqual(producto.length, p.length + q.length - 1);
      assert.ok(iguales(evaluarExacto(producto, x), multiplicar(evaluarExacto(p, x), evaluarExacto(q, x))));
    }
  });
  it('la suma evaluada es la suma de las evaluaciones, aun con grados distintos', () => {
    for (let i = 0; i < 500; i++) {
      const p = polinomioAlAzar(entero(0, 4)), q = polinomioAlAzar(entero(0, 4)), x = fraccionAlAzar();
      assert.ok(iguales(evaluarExacto(sumarPolinomios(p, q), x), sumar(evaluarExacto(p, x), evaluarExacto(q, x))));
    }
  });
  it('multiplicar por un número escala cada coeficiente', () => {
    for (let i = 0; i < 200; i++) {
      const p = polinomioAlAzar(3), k = fraccionAlAzar(), x = fraccionAlAzar();
      assert.ok(iguales(evaluarExacto(multiplicarPolinomioPorNumero(p, k), x), multiplicar(k, evaluarExacto(p, x))));
    }
  });
  it('factorLineal(a) es (x − a): vale 0 en a', () => {
    for (let i = 0; i < 100; i++) {
      const a = fraccionAlAzar();
      assert.ok(esCero(evaluarExacto(factorLineal(a), a)));
      const x = fraccionAlAzar();
      assert.ok(iguales(evaluarExacto(factorLineal(a), x), restar(x, a)));
    }
  });
  it('evaluarPolinomio (con números normales) coincide con la evaluación exacta', () => {
    for (let i = 0; i < 200; i++) {
      const p = polinomioAlAzar(entero(0, 5));
      const x = entero(-9, 9) / 2;
      const exacto = evaluarExacto(p, crearFraccion(Math.round(x * 2), 2));
      assert.ok(Math.abs(evaluarPolinomio(p, x) - Number(exacto.n) / Number(exacto.d)) < 1e-9 * Math.max(1, Math.abs(Number(exacto.n) / Number(exacto.d))));
    }
  });
});

describe('escritura en HTML (se evalúa lo dibujado y debe dar el mismo número)', () => {
  it('fraccionEnHtml vale n/d', () => {
    for (let i = 0; i < 200; i++) {
      const f = fraccionAlAzar();
      assert.ok(Math.abs(valorDeHtml(fraccionEnHtml(f)) - Number(f.n) / Number(f.d)) < 1e-12);
    }
  });
  it('fraccionEnHtml usa el signo menos tipográfico', () => {
    const sinEtiquetas = html => html.replace(/<[^>]+>/g, '');
    assert.strictEqual(sinEtiquetas(fraccionEnHtml(crearFraccion(-3, 4))), '−34');
    assert.strictEqual(sinEtiquetas(fraccionEnHtml(crearFraccion(-3))), '−3');
  });
  it('polinomioEnHtml con x = valor da el valor del polinomio (400 casos)', () => {
    for (let i = 0; i < 400; i++) {
      const p = polinomioAlAzar(entero(0, 4));
      const x = entero(-6, 6);
      const esperado = evaluarExacto(p, crearFraccion(x));
      const real = valorDeHtml(polinomioEnHtml(p, '(' + (x < 0 ? '−' : '') + Math.abs(x) + ')'));
      const valorEsperado = Number(esperado.n) / Number(esperado.d);
      assert.ok(Math.abs(real - valorEsperado) < 1e-9 * Math.max(1, Math.abs(valorEsperado)), JSON.stringify(plano(p)) + ' en ' + x);
    }
  });
  it('polinomioEnHtml: casos de forma', () => {
    const p = (...c) => c.map(([n, d]) => crearFraccion(n, d || 1));
    assert.strictEqual(polinomioEnHtml(p([0], [0], [0])), '0');
    assert.strictEqual(polinomioEnHtml(p([-12])), '−12');
    assert.strictEqual(polinomioEnHtml(p([0], [1])), 'x');
    assert.strictEqual(polinomioEnHtml(p([0], [-1])), '−x');
    assert.strictEqual(polinomioEnHtml(p([4], [2], [1], [2])).replace(/·/g, ''), '2x<sup>3</sup> + x<sup>2</sup> + 2x + 4');
    assert.strictEqual(polinomioEnHtml(p([0], [0], [-3])).replace(/·/g, ''), '−3x<sup>2</sup>');
  });
  it('factorConVariable: (x), (x − a), (x + a)', () => {
    assert.strictEqual(factorConVariable(0), '(x)');
    assert.strictEqual(factorConVariable(5), '(x − 5)');
    assert.strictEqual(factorConVariable(-5), '(x + 5)');
  });
});
