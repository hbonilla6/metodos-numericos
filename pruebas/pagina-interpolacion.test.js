const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, cargarModulos, referencias, verificarExplicaciones, valorDeCeldaEnPagina, aExpresion, evaluarNumerico, htmlAElemento, decimalDeFraccion } = require('./ayudas');

const algebra = cargarModulos(['comun/notacion.js', 'comun/algebra-exacta.js']);
const coeficientes = textos => textos.map(t => { const [n, d] = t.split('/'); return algebra.traer('crearFraccion')(BigInt(n), BigInt(d)); });
const polinomioEnHtml = textos => algebra.traer('polinomioEnHtml')(coeficientes(textos));
const evaluarReferencia = (textos, x) => textos.reduce((suma, t, k) => { const [n, d] = t.split('/'); return suma + Number(n) / Number(d) * Math.pow(x, k); }, 0);

/** Valor numérico de una fórmula del procedimiento tras el "=", con x sustituida. */
function valorDeFormula(formula, x) {
  const copia = formula.cloneNode(true);
  const expresion = aExpresion(copia, () => null).replace(/(?<![A-Za-zᵢ₀-₉])x(?![A-Za-zᵢ₀-₉])/g, '(' + x + ')');
  return expresion.split('=').map(evaluarNumerico);
}

function resolverLagrange(puntos) {
  const pagina = abrirPagina('interpolacion.html');
  puntos.forEach(([x, fx], i) => { pagina.escribir('x' + i, x); pagina.escribir('f' + i, fx); });
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}

describe('página de Lagrange: el resultado contra la referencia de Python (86 casos)', () => {
  referencias.lagrange.forEach((caso, i) => {
    it(`caso ${i + 1}: ${JSON.stringify(caso.puntos)}`, () => {
      const pagina = resolverLagrange(caso.puntos);
      assert.deepStrictEqual(pagina.errores, []);
      assert.strictEqual(pagina.html('pasos').includes('class="resultado"'), true);
      // el polinomio que muestra es exactamente el de la referencia (coeficientes sobrantes en cero se omiten)
      const mostrado = pagina.d.querySelector('.resultado').innerHTML;
      assert.strictEqual(mostrado, 'P(x) = ' + polinomioEnHtml(caso.coeficientes));
      pagina.cerrar();
    });
  });
});

describe('página de Lagrange: cada paso del procedimiento vale lo mismo que el polinomio', () => {
  const casos = [[[1, 3], [4, 18], [6, 38]], [[1, 10], [-4, 10], [-7, 34]], [[7, 30], [-6, -22]], [[0, 2], [1, 3]], [[-6, 8], [6, -16], [-1, -2]]];
  for (const puntos of casos) {
    it(JSON.stringify(puntos), () => {
      const referencia = referencias.lagrange.find(c => JSON.stringify(c.puntos) === JSON.stringify(puntos));
      const pagina = resolverLagrange(puntos);
      for (const x of [-3, 0.5, 2, 7.25]) {
        const esperado = evaluarReferencia(referencia.coeficientes, x);
        const formulas = [...pagina.d.querySelectorAll('#pasos .paso')].map(paso => [...paso.querySelectorAll('.formula')]);
        // paso 1: la fórmula de Lagrange con los puntos sustituidos (un solo número a la derecha del "=")
        const paso1 = valorDeFormula(formulas[0][0], x).filter(v => v !== null).pop();
        assert.ok(Math.abs(paso1 - esperado) < 1e-8 * Math.max(1, Math.abs(esperado)), `paso 1 en x = ${x}: ${paso1} contra ${esperado}`);
        // paso 3: cada término simplificado; la suma de los términos es el polinomio
        const terminos = formulas[2].map(f => valorDeFormula(f, x).filter(v => v !== null).pop());
        const suma = terminos.reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(suma - esperado) < 1e-8 * Math.max(1, Math.abs(esperado)), `suma de términos en x = ${x}`);
        // paso 4 (si hay más de dos puntos... con dos también): la suma escrita
        const paso4 = valorDeFormula(formulas[3][0], x).filter(v => v !== null).pop();
        assert.ok(Math.abs(paso4 - esperado) < 1e-8 * Math.max(1, Math.abs(esperado)), `paso 4 en x = ${x}`);
      }
      pagina.cerrar();
    });
  }
  it('cada término expandido: numerador ÷ denominador × f(xᵢ) = término simplificado', () => {
    const pagina = resolverLagrange([[1, 3], [4, 18], [6, 38]]);
    const pasos = [...pagina.d.querySelectorAll('#pasos .paso')];
    const expandidos = [...pasos[1].querySelectorAll('.formula')];
    const simplificados = [...pasos[2].querySelectorAll('.formula')];
    for (const x of [-2, 1.5, 9]) {
      expandidos.forEach((formula, k) => {
        // "Término k: frac(poly, den) · (f)": solo hay números tras los dos puntos
        const copia = formula.cloneNode(true);
        const texto = aExpresion(copia, () => null).replace(/\s+/g, '').replace(/^Término\d+:/, '').replace(/x/g, '(' + x + ')');
        const valor = evaluarNumerico(texto);
        const simple = valorDeFormula(simplificados[k], x).filter(v => v !== null).pop();
        assert.ok(Math.abs(valor - simple) < 1e-8 * Math.max(1, Math.abs(simple)), `término ${k + 1}, x = ${x}: ${valor} contra ${simple}`);
      });
    }
    pagina.cerrar();
  });
});

describe('página de Lagrange: validaciones', () => {
  const aviso = (puntos) => { const p = resolverLagrange(puntos); const t = p.texto('statusBox'); const visible = p.d.getElementById('resultCard').style.display; p.cerrar(); return { t, visible }; };
  it('con menos de 2 puntos no se muestra nada (ni aviso)', () => {
    const pagina = abrirPagina('interpolacion.html');
    pagina.escribir('x0', '1'); pagina.escribir('f0', '2');
    pagina.clic(pagina.boton('Resolver'));
    assert.strictEqual(pagina.texto('statusBox'), '');
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    pagina.cerrar();
  });
  it('un punto a medias avisa', () => assert.match(aviso([[1, 2], [2, '']]).t, /Completa tanto x como f\(x\)/));
  it('valores no enteros avisan', () => {
    assert.match(aviso([[1.5, 2], [2, 3]]).t, /Usa números enteros/);
    assert.match(aviso([['a', 2], [2, 3]]).t, /Usa números enteros/);
    assert.match(aviso([[1, '2.5'], [2, 3]]).t, /Usa números enteros/);
  });
  it('x repetidas avisan', () => assert.match(aviso([[1, 2], [1, 3]]).t, /Los valores de x deben ser distintos/));
  it('acepta negativos y cero', () => {
    const r = aviso([[0, 0], [-1, -1]]);
    assert.strictEqual(r.t, '');
    assert.strictEqual(r.visible, 'block');
  });
  it('Limpiar borra los campos, los resultados y lo guardado', () => {
    const pagina = resolverLagrange([[0, 2], [1, 3]]);
    assert.ok(pagina.w.localStorage.getItem('interpolacion_campos'));
    pagina.clic(pagina.boton('Limpiar'));
    assert.strictEqual(pagina.d.getElementById('x0').value, '');
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'none');
    assert.strictEqual(pagina.w.localStorage.getItem('interpolacion_campos'), null);
    pagina.cerrar();
  });
  it('lo escrito se guarda mientras se teclea', () => {
    const pagina = abrirPagina('interpolacion.html');
    pagina.escribir('x0', '5');
    assert.strictEqual(JSON.parse(pagina.w.localStorage.getItem('interpolacion_campos')).x0, '5');
    pagina.cerrar();
  });
});

// ------------------------------------------------------------------ Hermite

function resolverHermite(puntos) {
  const pagina = abrirPagina('hermite.html');
  puntos.forEach(([x, f, d], i) => { pagina.escribir('x' + i, x); pagina.escribir('f' + i, f); pagina.escribir('d' + i, d); });
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}

describe('página de Hermite: tabla, polinomio y comprobación contra la referencia de Python', () => {
  referencias.hermite.slice(0, 40).forEach((caso, i) => {
    it(`caso ${i + 1}: ${JSON.stringify(caso.puntos)}`, () => {
      const pagina = resolverHermite(caso.puntos);
      assert.deepStrictEqual(pagina.errores, []);
      // cada celda de la tabla vale lo que dice la referencia
      caso.tabla.forEach((columna, k) => columna.forEach((valor, fila) => {
        const real = valorDeCeldaEnPagina(pagina, 'c' + k, fila);
        const esperado = Number(decimalDeFraccion(valor));
        assert.ok(Math.abs(real - esperado) < 1e-9 * Math.max(1, Math.abs(esperado)), `celda f[${k}][${fila}]: ${real} contra ${esperado}`);
      }));
      // el polinomio mostrado es el de la referencia
      assert.strictEqual(pagina.d.querySelector('.resultado').innerHTML, 'H(x) = ' + polinomioEnHtml(caso.coeficientes));
      // todas las comprobaciones salen ✓
      const marcas = [...pagina.d.querySelectorAll('.comprobacion-ok, .comprobacion-mal')];
      assert.strictEqual(marcas.length, 2 * caso.puntos.length);
      assert.ok(marcas.every(m => m.classList.contains('comprobacion-ok')));
      pagina.cerrar();
    });
  });
});

describe('página de Hermite: la aritmética de cada explicación cuadra', () => {
  for (const puntos of [[[-2, -12, 22], [1, 9, 10]], [[0, 1, 0], [1, 2, 3], [3, -1, 2]], [[5, 6, 10], [-4, 13, 12]], [[-8, -4, 0], [6, 10, 8], [1, 1, -3]]]) {
    it(JSON.stringify(puntos), () => {
      const pagina = resolverHermite(puntos);
      const r = verificarExplicaciones(pagina);
      assert.deepStrictEqual(r.fallos, [], r.fallos.slice(0, 3).join('\n'));
      assert.ok(r.celdas >= 10);
      assert.ok(r.comprobadas >= r.celdas * 0.5, `solo ${r.comprobadas} de ${r.celdas}`);
      pagina.cerrar();
    });
  }
  it('las celdas entre z repetidos usan la derivada y lo dicen', () => {
    const pagina = resolverHermite([[-2, -12, 22], [1, 9, 10]]);
    pagina.clic(pagina.d.querySelector('td[data-campo="c1"][data-idx="0"]'));
    assert.match(pagina.texto('explainBox'), /f'\(x₀\)/);
    assert.match(pagina.texto('explainBox'), /se usa la derivada f'\(x₀\) que te dieron/);
    pagina.clic(pagina.d.querySelector('td[data-campo="c1"][data-idx="1"]'));
    assert.ok(!/se usa la derivada/.test(pagina.texto('explainBox')));
    pagina.cerrar();
  });
  it('f[z₀,z₁,z₂,z₃] depende de las dos celdas vecinas de la columna anterior', () => {
    const pagina = resolverHermite([[-2, -12, 22], [1, 9, 10]]);
    pagina.clic(pagina.d.querySelector('td[data-campo="c3"][data-idx="0"]'));
    assert.deepStrictEqual([...pagina.d.querySelectorAll('td.related')].map(td => td.dataset.campo + td.dataset.idx).sort(), ['c20', 'c21']);
    pagina.clic(pagina.d.querySelector('td[data-campo="c1"][data-idx="0"]'));
    assert.strictEqual(pagina.d.querySelectorAll('td.related').length, 0);
    pagina.cerrar();
  });
});

describe('página de Hermite: validaciones', () => {
  const mensaje = puntos => { const p = resolverHermite(puntos); const t = p.texto('statusBox'); p.cerrar(); return t; };
  it('un punto a medias avisa', () => assert.match(mensaje([[0, 1, ''], [1, 2, 3]]), /Completa x, f\(x\) y f'\(x\)/));
  it('no enteros avisan', () => assert.match(mensaje([[0, 1, 1.5], [1, 2, 3]]), /Usa números enteros/));
  it('x repetidas avisan', () => assert.match(mensaje([[1, 1, 1], [1, 2, 3]]), /deben ser distintos/));
  it('con un solo punto no se muestra nada', () => {
    const pagina = abrirPagina('hermite.html');
    pagina.escribir('x0', '1'); pagina.escribir('f0', '1'); pagina.escribir('d0', '1');
    pagina.clic(pagina.boton('Resolver'));
    assert.strictEqual(pagina.texto('statusBox'), '');
    assert.strictEqual(pagina.d.getElementById('tablaCard').style.display, 'none');
    pagina.cerrar();
  });
  it('Limpiar oculta todo', () => {
    const pagina = resolverHermite([[-2, -12, 22], [1, 9, 10]]);
    pagina.clic(pagina.boton('Limpiar'));
    for (const id of ['tablaCard', 'resultCard', 'graficaCard']) assert.strictEqual(pagina.d.getElementById(id).style.display, 'none');
    assert.strictEqual(pagina.w.localStorage.getItem('hermite_campos'), null);
    pagina.cerrar();
  });
});
