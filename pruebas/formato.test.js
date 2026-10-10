const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, Decimal } = require('./ayudas');

const { evaluar, traer } = cargarModulos(['comun/notacion.js', 'comun/formato.js']);
const formatear = traer('formatear');
const D = valor => new Decimal(valor);

describe('formatear: números sin ceros de sobra', () => {
  const casos = [
    ['3.0000000000', '3'], ['3', '3'], ['0.5', '0.5'], ['0.5000', '0.5'], ['-2.50', '−2.5'],
    ['0', '0'], ['-0', '0'], ['100', '100'], ['0.1', '0.1'], ['123.456', '123.456'],
    ['1.23456789012345', '1.2345678901'],            // se recorta a 10 decimales
    ['2.99999999999', '3'], ['-2.99999999999', '−3'], ['0.00000000049', '0.0000000005'],
    ['4.9e-11', '4.9 × 10<sup>−11</sup>'], ['1e-11', '1 × 10<sup>−11</sup>'], ['-1.2345e-13', '−1.2345 × 10<sup>−13</sup>'],
    ['1e-10', '0.0000000001'],                        // justo en el umbral, todavía se escribe completo
  ];
  for (const [entrada, esperado] of casos) {
    it(entrada + ' → ' + esperado, () => {
      assert.strictEqual(formatear(D(entrada)), esperado);
    });
  }
  it('null y undefined se muestran como guion largo', () => {
    assert.strictEqual(formatear(null), '—');
    assert.strictEqual(formatear(undefined), '—');
  });
  it('precisión interna de 40 dígitos', () => {
    assert.strictEqual(D(1).dividedBy(3).toString().length, 42); // "0." + 40 dígitos
  });
});

describe('formatear: nunca usa el guion corto como signo menos', () => {
  for (const n of ['-1', '-0.5', '-123.456', '-1e-12', '-4.9e-11']) {
    it(n, () => assert.ok(!formatear(D(n)).includes('-'), formatear(D(n))));
  }
});

describe('anotarRepeticiones', () => {
  const anotar = traer('anotarRepeticiones');
  it('una racha de dígitos iguales lleva su contador en data-n (no en el texto)', () => {
    assert.strictEqual(anotar('3333'), '<span class="run-brace-char" data-n="4">3333</span>');
  });
  it('sin rachas, el texto queda igual', () => {
    for (const t of ['1.2345', '10', '0.101', '−5.1']) assert.strictEqual(anotar(t), t);
  });
  it('cada racha tiene su propio contador', () => {
    assert.deepStrictEqual([...anotar('1.5500').matchAll(/data-n="(\d+)"/g)].map(c => c[1]), ['2', '2']);
  });
  it('el texto visible es EXACTAMENTE el número: copiarlo no arrastra ningún dígito de más (400 casos)', () => {
    let semilla = 5;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    for (let i = 0; i < 400; i++) {
      const t = Array.from({ length: 1 + (i % 12) }, () => Math.floor(azar() * 3)).join('') + '.' +
        Array.from({ length: 1 + (i % 9) }, () => Math.floor(azar() * 3)).join('');
      assert.strictEqual(anotar(t).replace(/<[^>]+>/g, ''), t);
    }
  });
  it('el contador es la longitud exacta de la racha', () => {
    const rachas = [...anotar('0.0000003333').matchAll(/data-n="(\d+)">(\d+)</g)];
    assert.ok(rachas.length >= 2);
    for (const [, contador, digitos] of rachas) assert.strictEqual(digitos.length, Number(contador));
  });
});

describe('formatearAnotado', () => {
  const formatearAnotado = traer('formatearAnotado');
  it('no anota los números en notación científica (el exponente no es una racha de dígitos)', () => {
    assert.ok(!formatearAnotado(D('1.1e-11')).includes('run-brace'));
  });
  it('anota los demás', () => assert.ok(formatearAnotado(D('0.3333333333')).includes('run-brace')));
});

describe('entreParentesisSiNegativo', () => {
  const f = traer('entreParentesisSiNegativo');
  it('solo los negativos llevan paréntesis', () => {
    assert.strictEqual(f(D(5)), '5');
    assert.strictEqual(f(D(-5)), '(−5)');
    assert.strictEqual(f(D(0)), '0');
    assert.strictEqual(f(D('-0')), '0');
  });
});

describe('subíndices y superíndices', () => {
  it('convierte cada dígito', () => {
    assert.strictEqual(traer('aSubindice')(1234567890), '₁₂₃₄₅₆₇₈₉₀');
    assert.strictEqual(traer('aSuperindice')(1234567890), '¹²³⁴⁵⁶⁷⁸⁹⁰');
  });
});

describe('fraccion y raizEnesima', () => {
  it('fraccion pone numerador sobre denominador', () => {
    assert.strictEqual(traer('fraccion')('a', 'b'), '<span class="frac"><span class="frac-num">a</span><span class="frac-den">b</span></span>');
  });
  it('la raíz cuadrada no escribe el índice; las demás sí', () => {
    const raiz = traer('raizEnesima');
    assert.ok(!raiz(2, 'x').includes('raiz-indice'));
    assert.ok(raiz(3, 'x').includes('<sup class="raiz-indice">3</sup>'));
  });
});
