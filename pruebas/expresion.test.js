const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, referencias, decimalDeFraccion, casiIguales, plano, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/formato.js', 'raices/expresion.js']);
const T = n => m.traer(n);
const construirFuncion = (...a) => T('construirFuncion')(...a);

describe('evaluar expresiones: 30 expresiones × 10 puntos contra Python (fracciones exactas)', () => {
  for (const { expresion, casos } of referencias.expresiones) {
    it(expresion + ' (' + casos.length + ' puntos)', () => {
      const f = construirFuncion(expresion);
      for (const { x, valor } of casos) {
        const real = f(new Decimal(x));
        const esperado = decimalDeFraccion(valor);
        assert.ok(casiIguales(real, esperado, '1e-30'), `f(${x}): obtuve ${real}, debía ser ${esperado}`);
      }
    });
  }
});

describe('precedencia y asociatividad', () => {
  const valor = (texto, x = 3) => construirFuncion(texto)(new Decimal(x)).toNumber();
  const casos = [
    ['-x^2', 3, -9],              // la potencia manda sobre el signo
    ['(-x)^2', 3, 9],
    ['2^3^2', 0, 512],            // asociativa a la derecha: 2^(3^2)
    ['2^-1', 0, 0.5],
    ['-2^2', 0, -4],
    ['2-3-4', 0, -5],             // asociativa a la izquierda
    ['8/4/2', 0, 1],
    ['2+3*4', 0, 14],
    ['(2+3)*4', 0, 20],
    ['2*3^2', 0, 18],
    ['-(-x)', 3, 3],
    ['5 - -x', 3, 8],
    ['--x', 3, 3],
    ['+x', 3, 3],
    ['2*-x', 3, -6],
    ['x^2^2', 3, 81],             // 3^(2^2)
    ['1/2/2', 0, 0.25],
    ['10-2*3', 0, 4],
    ['2^0', 0, 1],
    ['x^0', 3, 1],
    ['0^2', 0, 0],
  ];
  for (const [texto, x, esperado] of casos) {
    it(`${texto}  (x = ${x})  →  ${esperado}`, () => assert.strictEqual(valor(texto, x), esperado));
  }
});

describe('multiplicación implícita (prepararExpresion)', () => {
  const preparar = T('prepararExpresion');
  const casos = [['2x', '2*x'], ['x2', 'x*2'], ['xx', 'x*x'], ['2(x+1)', '2*(x+1)'], ['(x+1)(x-1)', '(x+1)*(x-1)'],
    ['x(x+1)', 'x*(x+1)'], ['(x+1)x', '(x+1)*x'], ['2.5x', '2.5*x'], ['3x^2', '3*x^2'], ['x^2x', 'x^2*x'], ['2x3x', '2*x*3*x'],
    ['2 x', '2 x'], ['  x+1  ', 'x+1'], ['X', 'X'], ['2X', '2*X']];
  for (const [entrada, esperado] of casos) {
    it(`"${entrada}" → "${esperado}"`, () => assert.strictEqual(preparar(entrada), esperado));
  }
  it('evalúa igual con mayúscula o minúscula', () => {
    assert.strictEqual(construirFuncion('2X+1')(new Decimal(3)).toNumber(), 7);
  });
});

describe('tokenizar', () => {
  it('reconoce números, variable, operadores y paréntesis', () => {
    const fichas = plano(T('tokenizar')('2.5*x^3 + (x-1)/4'));
    assert.deepStrictEqual(fichas.map(f => f.tipo), ['NUMERO', '*', 'VARIABLE', '^', 'NUMERO', '+', '(', 'VARIABLE', '-', 'NUMERO', ')', '/', 'NUMERO']);
    assert.strictEqual(fichas[0].valor, '2.5');
  });
  it('ignora los espacios', () => assert.strictEqual(T('tokenizar')('  x   +   1 ').length, 3));
  it('rechaza caracteres que no son matemática permitida', () => {
    for (const malo of ['sin(x)', '2,5*x', 'x=1', 'x%2', 'x!', '$']) {
      assert.throws(() => T('tokenizar')(malo), /Carácter no reconocido/, malo);
    }
  });
});

describe('expresiones mal escritas lanzan error (nunca devuelven un número inventado)', () => {
  for (const malo of ['', '   ', '2*x^', '(x', 'x)', '2**3', '*x', 'x+', '()', '2 3', 'x y', '(x+1))', '^2', '1/']) {
    it(JSON.stringify(malo), () => assert.throws(() => construirFuncion(malo)));
  }
});

describe('la función construida', () => {
  it('acepta Decimal, texto y número como entrada', () => {
    const f = construirFuncion('x^2');
    assert.strictEqual(f(new Decimal('1.5')).toString(), '2.25');
    assert.strictEqual(f('1.5').toString(), '2.25');
    assert.strictEqual(f(1.5).toString(), '2.25');
  });
  it('los decimales de la expresión son exactos (0.1 + 0.2 = 0.3)', () => {
    assert.strictEqual(construirFuncion('0.1 + 0.2')(0).toString(), '0.3');
    assert.strictEqual(construirFuncion('0.1*3')(0).toString(), '0.3');
  });
  it('dividir entre cero da un valor no finito, que las demás piezas detectan', () => {
    assert.ok(!construirFuncion('1/x')(0).isFinite());
    assert.ok(!construirFuncion('1/(x-2)')(2).isFinite());
  });
  it('guarda sus tokens y su árbol', () => {
    const f = construirFuncion('2x+1');
    assert.ok(f.tokens.length > 0 && f.arbol.tipo === 'binario');
  });
  it('potencia con exponente fraccionario (raíces)', () => {
    assert.ok(casiIguales(construirFuncion('x^0.5')(new Decimal(2)), new Decimal(2).sqrt(), '1e-30'));
    assert.ok(casiIguales(construirFuncion('x^(1/3)')(new Decimal(27)), 3, '1e-30'));
  });
  it('precisión interna de 40 dígitos', () => {
    assert.strictEqual(construirFuncion('1/3')(0).toString().replace('0.', '').length, 40);
  });
});
