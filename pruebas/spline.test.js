const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, cargarModulos, fraccionATextoCompleto, aExpresion, evaluarNumerico } = require('./ayudas');

const m = cargarModulos(['comun/notacion.js', 'comun/algebra-exacta.js', 'spline/spline.js']);
const T = n => m.traer(n);
const F = (n, d = 1) => T('crearFraccion')(n, d);
const texto = f => fraccionATextoCompleto(f);

const punto = (x, y) => ({ x: typeof x === 'string' ? T('leerFraccion')(x) : F(x), y: typeof y === 'string' ? T('leerFraccion')(y) : F(y) });

/** Valor exacto de la recta [término libre, pendiente] en x. */
const evaluarRecta = (recta, x) => T('sumar')(recta[0], T('multiplicar')(recta[1], x));

describe('leerFraccion: lo que se acepta al escribir', () => {
  const casos = [
    ['3', '3/1'], ['-2', '-2/1'], ['+4', '4/1'], ['1/2', '1/2'], ['-1/4', '-1/4'], ['2/4', '1/2'], ['6/3', '2/1'],
    ['0.5', '1/2'], ['0,25', '1/4'], ['-0.125', '-1/8'], ['1.0', '1/1'], ['−3', '-3/1'], ['  7  ', '7/1'], ['0', '0/1'],
  ];
  for (const [escrito, esperado] of casos) {
    it(JSON.stringify(escrito) + ' → ' + esperado, () => assert.strictEqual(texto(T('leerFraccion')(escrito)), esperado));
  }
  for (const invalido of ['', 'a', '1/0', '1/', '/2', '1.5/2', '1..2', '1/2/3', '--1', '1e3', '½', '3 4']) {
    it(JSON.stringify(invalido) + ' no es válido', () => assert.strictEqual(T('leerFraccion')(invalido), null));
  }
});

describe('spline lineal: el ejercicio del cuaderno', () => {
  const tramos = T('interpolarSplineLineal')([punto(1, 1), punto(2, '1/2'), punto(4, '1/4')]);
  it('hay un tramo por cada par de puntos', () => assert.strictEqual(tramos.length, 2));
  it('tramo [1, 2]: −1/2·x + 3/2', () => {
    assert.strictEqual(texto(tramos[0].pendiente), '-1/2');
    assert.deepStrictEqual([texto(tramos[0].recta[0]), texto(tramos[0].recta[1])], ['3/2', '-1/2']);
  });
  it('tramo [2, 4]: −1/8·x + 3/4', () => {
    assert.strictEqual(texto(tramos[1].pendiente), '-1/8');
    assert.deepStrictEqual([texto(tramos[1].recta[0]), texto(tramos[1].recta[1])], ['3/4', '-1/8']);
  });
});

describe('spline lineal: propiedades exactas con puntos al azar', () => {
  // Generador determinista para que la prueba sea repetible
  let semilla = 12345;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  const entero = (minimo, maximo) => minimo + Math.floor(azar() * (maximo - minimo + 1));

  for (let caso = 0; caso < 60; caso++) {
    const cantidad = entero(2, 5);
    const abscisas = new Set();
    while (abscisas.size < cantidad) abscisas.add(entero(-9, 9));
    const ordenadas = [...abscisas].sort((a, b) => a - b);
    const denominadorDeX = entero(1, 4);   // el mismo para todas las x, para que sigan siendo distintas
    const puntos = ordenadas.map(x => ({ x: F(x, denominadorDeX), y: F(entero(-12, 12), entero(1, 6)) }));

    it('caso ' + (caso + 1) + ': ' + puntos.map(p => '(' + texto(p.x) + ', ' + texto(p.y) + ')').join(' '), () => {
      const tramos = T('interpolarSplineLineal')(puntos);
      assert.strictEqual(tramos.length, cantidad - 1);
      tramos.forEach((tramo, k) => {
        // la recta pasa por los dos extremos de su tramo (exacto)
        assert.strictEqual(texto(evaluarRecta(tramo.recta, puntos[k].x)), texto(puntos[k].y));
        assert.strictEqual(texto(evaluarRecta(tramo.recta, puntos[k + 1].x)), texto(puntos[k + 1].y));
        // pendiente × (x₁ − x₀) = y₁ − y₀
        const subida = T('multiplicar')(tramo.pendiente, T('restar')(puntos[k + 1].x, puntos[k].x));
        assert.strictEqual(texto(subida), texto(T('restar')(puntos[k + 1].y, puntos[k].y)));
      });
      // el spline es continuo: en cada punto interior las dos rectas coinciden
      for (let k = 1; k < tramos.length; k++) {
        assert.strictEqual(texto(evaluarRecta(tramos[k - 1].recta, puntos[k].x)), texto(evaluarRecta(tramos[k].recta, puntos[k].x)));
      }
    });
  }
});

// ---------------------------------------------------------------- la página

function resolver(puntos) {
  const pagina = abrirPagina('spline.html');
  puntos.forEach(([x, f], i) => { pagina.escribir('x' + i, x); pagina.escribir('f' + i, f); });
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}

/** Valores numéricos de cada tramo de una fórmula "a = b = c", con x sustituida; la parte que no es numérica da null. */
function valoresDeFormula(formula, x) {
  const expresion = aExpresion(formula.cloneNode(true), () => null).replace(/(?<![A-Za-zₖᵢ₀-₉])x(?![A-Za-zₖᵢ₀-₉])/g, '(' + x + ')');
  return expresion.split('=').map(evaluarNumerico);
}

describe('página del spline lineal', () => {
  it('el ejercicio del cuaderno da el polinomio por tramos', () => {
    const pagina = resolver([['1', '1'], ['2', '1/2'], ['4', '1/4']]);
    assert.deepStrictEqual(pagina.errores, []);
    const resultado = pagina.d.querySelector('.resultado');
    const filas = [...resultado.querySelectorAll('.tramo')].map(fila => fila.textContent.replace(/\s+/g, ''));
    assert.deepStrictEqual(filas, ['−12·x+32,six∈[1,2]', '−18·x+34,six∈[2,4]']);
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'block');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'block');
    pagina.cerrar();
  });

  it('cada paso de cada tramo vale lo mismo que la recta', () => {
    const pagina = resolver([['-2', '3'], ['0', '-1/2'], ['3', '4'], ['5', '0.5']]);
    const pasos = [...pagina.d.querySelectorAll('#pasos .paso')].filter(paso => paso.querySelector('.paso-titulo').textContent.startsWith('Tramo'));
    assert.strictEqual(pasos.length, 3);
    const puntos = [[-2, 3], [0, -0.5], [3, 4], [5, 0.5]];
    pasos.forEach((paso, k) => {
      const [x0, y0] = puntos[k];
      const [x1, y1] = puntos[k + 1];
      const pendiente = (y1 - y0) / (x1 - x0);
      const [formulaDePendiente, formulaDeRecta] = paso.querySelectorAll('.formula');

      const valoresDePendiente = valoresDeFormula(formulaDePendiente, 0).filter(v => v !== null);
      assert.ok(valoresDePendiente.length >= 3);
      valoresDePendiente.forEach(v => assert.ok(Math.abs(v - pendiente) < 1e-12, `pendiente ${v} contra ${pendiente}`));

      for (const x of [-3, 0.5, 2, 7.25]) {
        const esperado = y0 + pendiente * (x - x0);
        const valoresDeRecta = valoresDeFormula(formulaDeRecta, x).filter(v => v !== null);
        assert.ok(valoresDeRecta.length >= 3);
        valoresDeRecta.forEach(v => assert.ok(Math.abs(v - esperado) < 1e-9 * Math.max(1, Math.abs(esperado)), `tramo ${k + 1}, x = ${x}: ${v} contra ${esperado}`));
      }
    });
    pagina.cerrar();
  });

  it('ordena los puntos por x antes de armar los tramos', () => {
    const pagina = resolver([['4', '1/4'], ['1', '1'], ['2', '1/2']]);
    const filas = [...pagina.d.querySelectorAll('.resultado .tramo')].map(fila => fila.textContent.replace(/\s+/g, ''));
    assert.deepStrictEqual(filas, ['−12·x+32,six∈[1,2]', '−18·x+34,six∈[2,4]']);
    pagina.cerrar();
  });

  it('con 2 puntos hay un solo tramo', () => {
    const pagina = resolver([['0', '2'], ['1', '3']]);
    const filas = [...pagina.d.querySelectorAll('.resultado .tramo')].map(fila => fila.textContent.replace(/\s+/g, ''));
    assert.deepStrictEqual(filas, ['x+2,six∈[0,1]']);
    pagina.cerrar();
  });

  describe('validaciones', () => {
    const mensaje = puntos => { const p = resolver(puntos); const t = p.texto('statusBox'); const visible = p.d.getElementById('resultCard').style.display; p.cerrar(); return { t, visible }; };
    it('con menos de 2 puntos no se muestra nada', () => {
      const pagina = abrirPagina('spline.html');
      pagina.escribir('x0', '1'); pagina.escribir('f0', '2');
      pagina.clic(pagina.boton('Resolver'));
      assert.strictEqual(pagina.texto('statusBox'), '');
      assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
      pagina.cerrar();
    });
    it('un punto a medias avisa', () => assert.match(mensaje([['1', '2'], ['2', '']]).t, /Completa tanto x como f\(x\)/));
    it('valores no numéricos avisan', () => {
      assert.match(mensaje([['a', '2'], ['2', '3']]).t, /Usa enteros, fracciones/);
      assert.match(mensaje([['1', '2'], ['2', '1/0']]).t, /Usa enteros, fracciones/);
    });
    it('x repetidas avisan, aunque se escriban distinto', () => {
      assert.match(mensaje([['1', '2'], ['1', '3']]).t, /Los valores de x deben ser distintos/);
      assert.match(mensaje([['1/2', '2'], ['0.5', '3']]).t, /Los valores de x deben ser distintos/);
    });
    it('acepta negativos, cero, fracciones y decimales', () => {
      const r = mensaje([['-1/2', '0'], ['0.5', '-3']]);
      assert.strictEqual(r.t, '');
      assert.strictEqual(r.visible, 'block');
    });
  });

  it('Limpiar borra los campos, los resultados y lo guardado', () => {
    const pagina = resolver([['0', '2'], ['1', '3']]);
    assert.ok(pagina.w.localStorage.getItem('spline_campos'));
    pagina.clic(pagina.boton('Limpiar'));
    assert.strictEqual(pagina.d.getElementById('x0').value, '');
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'none');
    assert.strictEqual(pagina.w.localStorage.getItem('spline_campos'), null);
    pagina.cerrar();
  });
});
