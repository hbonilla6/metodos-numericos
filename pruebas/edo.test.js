const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, cargarModulos, aExpresion, evaluarNumerico, casiIguales, plano, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/notacion.js', 'comun/formato.js', 'comun/expresion.js', 'edo/metodos.js']);
const T = n => m.traer(n);
const d = n => new Decimal(n);
const f = texto => T('construirFuncion')(texto, ['x', 'y']);
const resolver = (metodo, texto, x0, y0, xn, n) => T(metodo)(f(texto), d(x0), d(y0), d(xn), n);
const columna = (resultado, campo) => plano(resultado.filas.map(fila => fila[campo] === null ? null : fila[campo].toString()));

describe('Euler: el ejercicio del cuaderno, y\' = 2xy, y(0) = 1, n = 5', () => {
  const r = resolver('metodoDeEuler', '2xy', 0, 1, 0.5, 5);
  it('h = 0.1', () => assert.strictEqual(r.h.toString(), '0.1'));
  it('los nodos xᵢ son 0, 0.1, …, 0.5', () => assert.deepStrictEqual(columna(r, 'x'), ['0', '0.1', '0.2', '0.3', '0.4', '0.5']));
  it('la tabla de yᵢ del cuaderno', () => assert.deepStrictEqual(columna(r, 'y'), ['1', '1', '1.02', '1.0608', '1.124448', '1.21440384']));
  it('y₁ = 1 + 0.1·(2·0·1) = 1 y y₂ = 1 + 0.1·(2·0.1·1) = 1.02', () => {
    assert.strictEqual(r.filas[0].pendiente.toString(), '0');
    assert.strictEqual(r.filas[1].pendiente.toString(), '0.2');
  });
});

describe('Heun: el ejercicio del cuaderno, y\' = 2xy, y(0) = 1, n = 5', () => {
  const r = resolver('metodoDeHeun', '2xy', 0, 1, 0.5, 5);
  it('y₁* = 1 y y₁ = 1.01', () => {
    assert.strictEqual(r.filas[1].yPredicha.toString(), '1');
    assert.strictEqual(r.filas[1].y.toString(), '1.01');
  });
  it('f(x₁, y₁) = 0.202', () => assert.strictEqual(r.filas[1].pendiente.toString(), '0.202'));
  it('y₂* = 1.0302 y y₂ = 1.040704', () => {
    assert.strictEqual(r.filas[2].yPredicha.toString(), '1.0302');
    assert.strictEqual(r.filas[2].y.toString(), '1.040704');
  });
  it('y₃ = 1.093988045, f(x₃, y₃) = 0.656392827', () => {
    assert.strictEqual(r.filas[3].y.toDecimalPlaces(9).toString(), '1.093988045');
    assert.strictEqual(r.filas[3].pendiente.toDecimalPlaces(9).toString(), '0.656392827');
  });
  it('y(0.5) ≈ 1.2834729', () => assert.strictEqual(r.filas[5].y.toDecimalPlaces(7).toString(), '1.2834729'));
  it('la fila 0 no tiene predicha', () => assert.strictEqual(r.filas[0].yPredicha, null));
});

describe('métodos de un paso: propiedades', () => {
  it('con y\' constante Euler y Heun son exactos', () => {
    for (const metodo of ['metodoDeEuler', 'metodoDeHeun']) {
      const r = resolver(metodo, '3', 1, 2, 4, 7);
      assert.ok(casiIguales(r.filas[7].y, d(2).plus(d(3).times(3)), '1e-30'), metodo);
    }
  });
  it('con y\' = 2x (solo de x) Heun es exacto: y = x² + c', () => {
    const r = resolver('metodoDeHeun', '2x', 0, 1, 3, 6);
    r.filas.forEach(fila => assert.ok(casiIguales(fila.y, fila.x.pow(2).plus(1), '1e-30')));
  });
  it('con y\' = 2x Euler no es exacto', () => {
    const r = resolver('metodoDeEuler', '2x', 0, 1, 3, 6);
    assert.ok(!casiIguales(r.filas[6].y, 10, '1e-6'));
  });
  it('y\' = y: Euler es de orden 1 (el error baja ≈ 2 veces al duplicar n) y Heun de orden 2 (≈ 4 veces)', () => {
    const error = (metodo, n) => resolver(metodo, 'y', 0, 1, 1, n).filas[n].y.minus(Decimal.exp(1)).abs();
    assert.ok(Math.abs(error('metodoDeEuler', 100).dividedBy(error('metodoDeEuler', 200)).toNumber() - 2) < 0.05);
    assert.ok(Math.abs(error('metodoDeHeun', 50).dividedBy(error('metodoDeHeun', 100)).toNumber() - 4) < 0.05);
  });
  it('cada fila de Heun cumple yᵢ = yᵢ₋₁ + h/2·(fᵢ₋₁ + f(xᵢ, yᵢ*))', () => {
    const g = f('sin(x) + y/2');
    const r = T('metodoDeHeun')(g, d(0), d(1), d(2), 9);
    for (let i = 1; i < r.filas.length; i++) {
      const anterior = r.filas[i - 1];
      const fila = r.filas[i];
      assert.ok(casiIguales(fila.yPredicha, anterior.y.plus(r.h.times(g(anterior.x, anterior.y))), '1e-30'));
      assert.ok(casiIguales(fila.pendientePredicha, g(fila.x, fila.yPredicha), '1e-30'));
      assert.ok(casiIguales(fila.y, anterior.y.plus(r.h.dividedBy(2).times(g(anterior.x, anterior.y).plus(g(fila.x, fila.yPredicha)))), '1e-30'));
    }
  });
  it('el último nodo es exactamente xₙ', () => {
    const r = resolver('metodoDeEuler', 'x', 0, 0, 1, 3);
    assert.strictEqual(r.filas[3].x.toString(), '1');
  });
  it('si f no está definida en un nodo, avisa en qué punto', () => {
    assert.throws(() => resolver('metodoDeEuler', '1/(x - 0.2)', 0, 0, 1, 5), /f\(x, y\) no está definida en x = 0\.2, y = /);
  });
  it('si la aproximación crece sin límite, avisa', () => {
    assert.throws(() => resolver('metodoDeEuler', 'y^2', 0, 1, 3, 200), /crece sin límite|no está definida/);
  });
  it('f indefinida solo en el último nodo no impide el resultado', () => {
    const r = resolver('metodoDeEuler', '1/(x - 1)', 0, 0, 1, 4);
    assert.strictEqual(r.filas[4].pendiente, null);
    assert.ok(r.filas[4].y.isFinite());
  });
});

describe('valoresExactos', () => {
  it('evalúa la solución en cada nodo', () => {
    const r = resolver('metodoDeEuler', '2xy', 0, 1, 0.5, 5);
    const exactas = T('valoresExactos')(T('construirFuncion')('e^(x^2)'), r.filas);
    assert.ok(casiIguales(exactas[5], Decimal.exp(0.25), '1e-30'));
    assert.strictEqual(exactas[0].toString(), '1');
  });
  it('devuelve null donde no está definida', () => {
    const r = resolver('metodoDeEuler', 'x', 0, 0, 1, 2);
    assert.deepStrictEqual(plano(T('valoresExactos')(T('construirFuncion')('1/x'), r.filas).map(v => v === null ? null : v.toString())), [null, '2', '1']);
  });
});

// ---------------------------------------------------------------- la página

function resolverEnPagina(pestana, fxy, x0, y0, xn, n, exacta = '') {
  const pagina = abrirPagina('ecuaciones_diferenciales.html', pestana);
  [['fxy', fxy], ['x0', x0], ['y0', y0], ['xn', xn], ['n', n], ['exacta', exacta]].forEach(([id, valor]) => { if (valor !== '') pagina.escribir(id, valor); });
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}

const filasDeLaTabla = pagina => [...pagina.d.querySelectorAll('#pasos tbody tr')].map(fila => [...fila.children].map(celda => celda.textContent));

describe('página de ecuaciones diferenciales', () => {
  it('Euler: el ejercicio del cuaderno', () => {
    const pagina = resolverEnPagina('euler', '2xy', '0', '1', '0.5', '5');
    assert.deepStrictEqual(pagina.errores, []);
    assert.deepStrictEqual(filasDeLaTabla(pagina).map(fila => fila[2]), ['1', '1', '1.02', '1.0608', '1.124448', '1.21440384']);
    assert.match(pagina.d.querySelector('.resultado').textContent, /y\(0\.5\) ≈ 1\.21440384/);
    assert.strictEqual(pagina.d.querySelector('.comparacion'), null);
    pagina.cerrar();
  });
  it('Heun: el ejercicio del cuaderno, con la tabla yᵢ*, yᵢ y f(xᵢ, yᵢ)', () => {
    const pagina = resolverEnPagina('heun', '2xy', '0', '1', '0.5', '5');
    const filas = filasDeLaTabla(pagina);
    assert.deepStrictEqual(filas[0], ['0', '0', '—', '—', '1', '0']);
    assert.deepStrictEqual(filas[1].slice(0, 2).concat(filas[1].slice(2)), ['1', '0.1', '1', '0.2', '1.01', '0.202']);
    assert.strictEqual(filas[2][4], '1.040704');
    assert.match(pagina.d.querySelector('.resultado').textContent, /y\(0\.5\) ≈ 1\.2834729/);
    pagina.cerrar();
  });
  it('con la solución exacta se agregan las columnas de y(xᵢ) y del error, y la comparación final', () => {
    const pagina = resolverEnPagina('heun', '2xy', '0', '1', '0.5', '5', 'e^(x^2)');
    assert.strictEqual(pagina.d.querySelectorAll('#pasos thead th').length, 8);
    assert.match(pagina.d.querySelector('.comparacion').textContent, /Valor exacto: 1\.2840254167 · Error absoluto: 0\.0005525162/);
    assert.ok(pagina.d.querySelectorAll('#grafica path.g-curva').length >= 2);
    pagina.cerrar();
  });
  it('los primeros pasos se escriben con sus valores y cada igualdad cuadra', () => {
    for (const pestana of ['euler', 'heun']) {
      const pagina = resolverEnPagina(pestana, '2xy', '0', '1', '0.5', '5');
      const titulos = [...pagina.d.querySelectorAll('#pasos .paso-titulo')].map(t => t.textContent);
      assert.ok(titulos.includes('Paso 2.1: calcular y₁') && titulos.includes('Paso 2.2: calcular y₂'), pestana);
      let comprobadas = 0;
      pagina.d.querySelectorAll('#pasos .formula').forEach(formula => {
        const valores = aExpresion(formula.cloneNode(true), () => null).split('=').map(evaluarNumerico).filter(v => v !== null);
        if (valores.length < 2) return;
        comprobadas++;
        valores.forEach(v => assert.ok(Math.abs(v - valores[valores.length - 1]) < 1e-8 * Math.max(1, Math.abs(v)), `${pestana}: ${valores}`));
      });
      assert.ok(comprobadas >= 4, pestana);
      pagina.cerrar();
    }
  });
  it('y\' = f(x, y) se dibuja con la y como y', () => {
    const pagina = abrirPagina('ecuaciones_diferenciales.html');
    pagina.escribir('fxy', 'x + 2y');
    assert.strictEqual(pagina.texto('fxDisplay'), "y' = x + 2 · y");
    pagina.cerrar();
  });
  it('la gráfica muestra los puntos del método', () => {
    const pagina = resolverEnPagina('euler', 'x + y', '0', '1', '1', '10');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'block');
    assert.strictEqual(pagina.d.querySelectorAll('#grafica circle').length, 11);
    pagina.cerrar();
  });
  it('cambiar de pestaña conserva lo escrito y recalcula', () => {
    const pagina = resolverEnPagina('euler', '2xy', '0', '1', '0.5', '5');
    pagina.clic(pagina.d.getElementById('tab-heun'));
    assert.strictEqual(pagina.d.getElementById('fxy').value, '2xy');
    assert.match(pagina.d.querySelector('.resultado').textContent, /1\.2834729/);
    pagina.cerrar();
  });
  it('con n = 1 solo hay un paso detallado y ninguna nota de pasos siguientes', () => {
    const pagina = resolverEnPagina('euler', 'x + y', '0', '1', '1', '1');
    assert.strictEqual(pagina.d.querySelectorAll('#pasos .paso-titulo').length, 4);
    assert.ok(!pagina.texto('pasos').includes('Los pasos siguientes'));
    pagina.cerrar();
  });

  describe('validaciones', () => {
    const mensaje = (...datos) => { const p = resolverEnPagina(...datos); const t = p.texto('statusBox'); const visible = p.d.getElementById('resultCard').style.display; p.cerrar(); return { t, visible }; };
    it('faltan datos: no se muestra nada ni error', () => {
      const pagina = abrirPagina('ecuaciones_diferenciales.html');
      pagina.escribir('fxy', 'x + y'); pagina.escribir('x0', '0');
      pagina.clic(pagina.boton('Resolver'));
      assert.strictEqual(pagina.texto('statusBox'), '');
      assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
      pagina.cerrar();
    });
    it('f(x, y) mal escrita avisa', () => {
      assert.match(mensaje('euler', 'x +', '0', '1', '1', '4').t, /No pude leer f\(x, y\)/);
      assert.match(mensaje('euler', 'x + z', '0', '1', '1', '4').t, /No pude leer f\(x, y\)/);
    });
    it('x₀, y₀ y xₙ deben ser números', () => assert.match(mensaje('euler', 'x', 'a', '1', '1', '4').t, /deben ser números/));
    it('xₙ debe ser mayor que x₀', () => {
      assert.match(mensaje('euler', 'x', '1', '1', '0', '4').t, /xₙ debe ser mayor que x₀/);
      assert.match(mensaje('euler', 'x', '1', '1', '1', '4').t, /xₙ debe ser mayor que x₀/);
    });
    it('n debe ser un entero entre 1 y 200', () => {
      for (const n of ['0', '-1', '1.5', 'x', '201']) assert.match(mensaje('euler', 'x', '0', '1', '1', n).t, /n debe ser un entero entre 1 y 200/, n);
    });
    it('una solución exacta ilegible avisa', () => assert.match(mensaje('euler', 'x', '0', '1', '1', '4', 'e^(').t, /No pude leer la solución exacta/));
    it('f no definida en un nodo avisa en qué punto', () => assert.match(mensaje('euler', '1/(x - 0.5)', '0', '1', '1', '4').t, /f\(x, y\) no está definida en x = 0\.5/));
  });

  it('Limpiar borra campos, resultados y lo guardado', () => {
    const pagina = resolverEnPagina('euler', '2xy', '0', '1', '0.5', '5', 'e^(x^2)');
    assert.ok(pagina.w.localStorage.getItem('edo_campos'));
    pagina.clic(pagina.boton('Limpiar'));
    ['fxy', 'x0', 'y0', 'xn', 'n', 'exacta'].forEach(id => assert.strictEqual(pagina.d.getElementById(id).value, ''));
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    assert.strictEqual(pagina.w.localStorage.getItem('edo_campos'), null);
    pagina.cerrar();
  });
});
