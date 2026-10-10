const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, referencias, valorDeHtml, htmlAElemento, aExpresion, evaluarNumerico, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/notacion.js', 'comun/formato.js', 'comun/tabla-interactiva.js', 'raices/expresion.js', 'raices/derivada.js', 'raices/formulas.js']);
const T = n => m.traer(n);
const aNumero = fraccion => { const [n, d] = fraccion.split('/'); return Number(n) / Number(d); };
const cerca = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const textoPlano = html => htmlAElemento(html).textContent;

describe('f(x) dibujada con x sustituida: lo que se ve vale lo mismo que la función (30 expresiones × 10 puntos)', () => {
  for (const { expresion, casos } of referencias.expresiones) {
    it(expresion, () => {
      const f = T('construirFuncion')(expresion);
      for (const { x, valor } of casos) {
        const entreParentesis = x.startsWith('-') ? '−' + x.slice(1) : x;
        const html = T('tokensSustituidos')(f.tokens, entreParentesis);
        const mostrado = valorDeHtml(html);
        assert.ok(mostrado !== null, `no se pudo evaluar lo dibujado: ${textoPlano(html)}`);
        assert.ok(cerca(mostrado, aNumero(valor)), `${expresion} en ${x}: dibujado ${textoPlano(html)} = ${mostrado}, debía ser ${aNumero(valor)}`);
      }
    });
  }
});

describe('derivada dibujada con x sustituida: lo que se ve vale lo mismo que la derivada exacta', () => {
  for (const { expresion, casos, derivable } of referencias.expresiones.filter(e => e.derivable)) {
    it(expresion, () => {
      const derivada = T('derivarFuncion')(T('construirFuncion')(expresion));
      for (const { x, derivada: esperada } of casos) {
        const entreParentesis = x.startsWith('-') ? '−' + x.slice(1) : x;
        const html = T('arbolSustituido')(derivada.arbol, entreParentesis);
        const mostrado = valorDeHtml(html);
        assert.ok(mostrado !== null, `no se pudo evaluar: ${textoPlano(html)}`);
        assert.ok(cerca(mostrado, aNumero(esperada)), `f' de ${expresion} en ${x}: dibujado ${textoPlano(html)} = ${mostrado}, debía ser ${aNumero(esperada)}`);
      }
    });
  }
});

describe('formas de las fórmulas', () => {
  const dibujar = texto => T('tokensAHtml')(T('construirFuncion')(texto).tokens, () => 'x', valor => valor);
  const arbol = texto => T('arbolAHtml')(T('construirFuncion')(texto).arbol);

  it('una división es una fracción de verdad (nunca "/" ni "÷")', () => {
    for (const texto of ['x^2/3 - 2', '(x+1)/(x-3) - 2', '1/x + x', '3/(x^2+1)', '(2x+1)/(x^2-4)', '1/(x+2)^2']) {
      const html = dibujar(texto);
      assert.ok(html.includes('class="frac"'), texto);
      assert.ok(!textoPlano(html).includes('/') && !textoPlano(html).includes('÷'), texto + ' → ' + textoPlano(html));
    }
  });
  it('x²/3 es la fracción con x² arriba y 3 abajo', () => {
    const elemento = htmlAElemento(dibujar('x^2/3'));
    const fraccion = elemento.querySelector('.frac');
    assert.strictEqual(fraccion.querySelector('.frac-num').textContent, 'x2');
    assert.strictEqual(fraccion.querySelector('.frac-den').textContent, '3');
  });
  it('(x+1)/(x−3): los paréntesis de arriba y de abajo sobran dentro de la fracción', () => {
    const fraccion = htmlAElemento(dibujar('(x+1)/(x-3)')).querySelector('.frac');
    assert.strictEqual(fraccion.querySelector('.frac-num').textContent, 'x + 1');
    assert.strictEqual(fraccion.querySelector('.frac-den').textContent, 'x − 3');
  });
  it('el exponente es un superíndice; el signo menos es el tipográfico', () => {
    assert.strictEqual(dibujar('x^3 - 2*x - 5'), 'x<sup>3</sup> − 2 · x − 5');
    assert.strictEqual(dibujar('-x^2'), '−x<sup>2</sup>');
    assert.ok(!dibujar('x - 1').includes('-'));
  });
  it('un exponente fraccionario lleva la fracción en el superíndice', () => {
    assert.ok(dibujar('x^(1/2)').includes('<sup><span class="frac">'));
  });
  it('un exponente 1 ÷ n exacto (el de punto fijo) se dibuja como raíz n-ésima, no como x^0.333', () => {
    const nodo = T('nodoBinario')('^', T('nodoVariable')(), T('nodoBinario')('/', T('nodoNumero')('1'), T('nodoNumero')('3')));
    const html = T('arbolAHtml')(nodo);
    assert.ok(html.includes('class="raiz"') && html.includes('<sup class="raiz-indice">3</sup>'));
    const raizCuadrada = T('arbolAHtml')(T('nodoBinario')('^', T('nodoVariable')(), T('nodoBinario')('/', T('nodoNumero')('1'), T('nodoNumero')('2'))));
    assert.ok(raizCuadrada.includes('class="raiz"') && !raizCuadrada.includes('raiz-indice'));
    const esCinco = T('arbolAHtml')(T('nodoBinario')('^', T('nodoVariable')(), T('nodoNumero')('0.5')));
    assert.ok(esCinco.includes('class="raiz"'));
  });
  it('la raíz que se dibuja vale lo que vale la potencia (x^(1/n), 6 valores de n)', () => {
    for (const n of [2, 3, 4, 5, 6, 10]) {
      const nodo = T('nodoBinario')('^', T('nodoNumero')('7'), T('nodoBinario')('/', T('nodoNumero')('1'), T('nodoNumero')(String(n))));
      const mostrado = valorDeHtml(T('arbolAHtml')(nodo));
      assert.ok(cerca(mostrado, Math.pow(7, 1 / n)), `n = ${n}: ${mostrado}`);
    }
  });
  it('el árbol: suma de un negativo se escribe como resta', () => {
    assert.strictEqual(textoPlano(arbol('x + -3')), 'x − 3');
    assert.strictEqual(textoPlano(arbol('x - -3')), 'x + 3');
    assert.strictEqual(textoPlano(arbol('x - 3')), 'x − 3');
  });
  it('un número negativo ya simplificado a la derecha de una suma o resta se escribe con el signo contrario', () => {
    const n = T('nodoNumero'), v = T('nodoVariable'), b = T('nodoBinario');
    assert.strictEqual(textoPlano(T('arbolAHtml')(b('+', v(), n('-3')))), 'x − 3');
    assert.strictEqual(textoPlano(T('arbolAHtml')(b('-', v(), n('-3')))), 'x + 3');
    assert.strictEqual(textoPlano(T('arbolAHtml')(b('+', v(), n('3')))), 'x + 3');
    assert.strictEqual(textoPlano(T('arbolAHtml')(b('-', v(), n('3')))), 'x − 3');
    // y lo que se dibuja vale lo mismo que el árbol
    for (const [op, valor] of [['+', '-3'], ['-', '-3'], ['+', '2.5'], ['-', '-0.5']]) {
      const nodo = b(op, v(), n(valor));
      const mostrado = valorDeHtml(T('arbolSustituido')(nodo, '4'));
      assert.strictEqual(mostrado, op === '+' ? 4 + Number(valor) : 4 - Number(valor));
    }
  });
  it('los paréntesis necesarios se conservan: (x+1)^2 y −(x+1) y 2·(x+1)', () => {
    assert.strictEqual(textoPlano(arbol('(x+1)^2')), '(x + 1)2');
    assert.strictEqual(textoPlano(arbol('-(x+1)')), '−(x + 1)');
    assert.strictEqual(textoPlano(arbol('2*(x+1)')), '2 · (x + 1)');
    assert.strictEqual(textoPlano(arbol('x - (x+1)')), 'x − (x + 1)');
  });
  it('formulas con división sin denominador todavía (se está escribiendo) no rompen', () => {
    assert.doesNotThrow(() => T('tokensAHtml')(T('tokenizar')('x/'), () => 'x', v => v));
  });
});

describe('referencias y enlaces dentro de las explicaciones', () => {
  it('enlaceACampo escribe el campo y, si se pide, el símbolo de f(x)', () => {
    assert.strictEqual(T('enlaceACampo')('a', '2'), '<span class="input-link" data-input="a">2</span>');
    assert.strictEqual(T('enlaceACampo')('fx', '3', 7), '<span class="input-link" data-input="fx" data-tokidx="7">3</span>');
  });
  it('un número de f(x) sustituido queda enlazado a su lugar en el campo', () => {
    const html = T('tokensSustituidos')(T('construirFuncion')('2*x^3 - 5').tokens, '4');
    const enlaces = [...htmlAElemento(html).querySelectorAll('.input-link[data-input="fx"]')].map(e => e.textContent);
    assert.deepStrictEqual(enlaces, ['2', '3', '5']);
  });
  it('GrafoDeDependencias: cada celda apunta a las que usa; una celda sin dependencias devuelve lista vacía', () => {
    const grafo = new (T('GrafoDeDependencias'))();
    grafo.agregar(T('celdaDe')('xi', 2), T('celdaDe')('a', 2));
    grafo.agregar(T('celdaDe')('xi', 2), T('celdaDe')('b', 2));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(grafo.de('xi', 2))), [{ campo: 'a', idx: 2 }, { campo: 'b', idx: 2 }]);
    assert.deepStrictEqual(Array.from(grafo.de('a', 2)), []);
  });
});
