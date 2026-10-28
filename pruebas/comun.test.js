const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, cargarModulos } = require('./ayudas');

describe('guardado en el navegador (almacenamiento.js)', () => {
  it('guarda y recupera valores; borra; un guardado dañado se ignora', () => {
    const p = abrirPagina('hermite.html');
    p.w.eval('guardarValores("prueba", { a: "1", b: "dos" })');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(p.w.eval('leerValores("prueba")'))), { a: '1', b: 'dos' });
    p.w.eval('olvidarValores("prueba")');
    assert.strictEqual(p.w.eval('leerValores("prueba")'), null);
    p.w.localStorage.setItem('roto', '{no es json');
    assert.strictEqual(p.w.eval('leerValores("roto")'), null);
    assert.strictEqual(p.w.eval('leerValores("no existe")'), null);
    p.cerrar();
  });
  it('restaurarCampos escribe solo lo que no está vacío y avisa si restauró algo', () => {
    const p = abrirPagina('hermite.html');
    p.w.localStorage.setItem('clave', JSON.stringify({ x0: '7', f0: '', d0: '9', x1: undefined }));
    assert.strictEqual(p.w.eval('restaurarCampos("clave", ["x0", "f0", "d0", "x1"])'), true);
    assert.strictEqual(p.d.getElementById('x0').value, '7');
    assert.strictEqual(p.d.getElementById('f0').value, '');
    assert.strictEqual(p.d.getElementById('d0').value, '9');
    p.w.localStorage.setItem('vacia', JSON.stringify({ x0: '' }));
    assert.strictEqual(p.w.eval('restaurarCampos("vacia", ["x0"])'), false);
    assert.strictEqual(p.w.eval('restaurarCampos("nada", ["x0"])'), false);
    p.cerrar();
  });
  it('guardarCampos guarda el contenido actual de los campos', () => {
    const p = abrirPagina('hermite.html');
    p.d.getElementById('x0').value = '3';
    p.d.getElementById('f0').value = '-4';
    p.w.eval('guardarCampos("otra", ["x0", "f0"])');
    assert.deepStrictEqual(JSON.parse(p.w.localStorage.getItem('otra')), { x0: '3', f0: '-4' });
    p.cerrar();
  });
  it('si el navegador no permite guardar (modo privado), nada se rompe', () => {
    const p = abrirPagina('hermite.html');
    Object.defineProperty(p.w, 'localStorage', { get() { throw new Error('bloqueado'); } });
    assert.doesNotThrow(() => p.w.eval('guardarValores("x", { a: 1 })'));
    assert.strictEqual(p.w.eval('leerValores("x")'), null);
    assert.doesNotThrow(() => p.w.eval('olvidarValores("x")'));
    p.cerrar();
  });
  it('la preferencia "Mostrar error" se restaura desde lo guardado', () => {
    const p = abrirPagina('sistemas_lineales.html');
    p.w.localStorage.setItem('sistemasLineales_mostrarError', '0');
    p.w.eval('activarOpcionMostrarError("sistemasLineales_mostrarError")');
    assert.strictEqual(p.d.getElementById('chkError').checked, false);
    assert.ok(p.d.getElementById('resultTable').classList.contains('oculta-error'));
    p.cerrar();
  });
});

describe('utilidades', () => {
  it('estaVacio: null, undefined, texto vacío o solo espacios', () => {
    const m = cargarModulos(['comun/utilidades.js']);
    const vacio = m.traer('estaVacio');
    for (const v of [null, undefined, '', '   ', '\t\n']) assert.strictEqual(vacio(v), true, JSON.stringify(v));
    for (const v of ['0', ' 0 ', 'x', 0 === 1 ? '' : '-']) assert.strictEqual(vacio(v), false, JSON.stringify(v));
  });
  it('mostrarEstado escribe el mensaje con su tipo, y lo borra sin mensaje o sin tipo', () => {
    const p = abrirPagina('hermite.html');
    p.w.eval('mostrarEstado("Algo pasó", "error")');
    assert.strictEqual(p.html('statusBox'), '<div class="status error">Algo pasó</div>');
    p.w.eval('mostrarEstado("", "error")');
    assert.strictEqual(p.html('statusBox'), '');
    p.w.eval('mostrarEstado("Algo", "info")');
    p.w.eval('mostrarEstado("Algo", null)');
    assert.strictEqual(p.html('statusBox'), '');
    p.cerrar();
  });
  it('conRetardo espera a que pasen los milisegundos sin llamadas, y solo ejecuta una vez', async () => {
    const m = cargarModulos(['comun/utilidades.js']);
    let veces = 0;
    const retardada = m.traer('conRetardo')(() => { veces++; }, 40);
    retardada(); retardada(); retardada();
    await new Promise(r => setTimeout(r, 10));
    retardada();
    assert.strictEqual(veces, 0);
    await new Promise(r => setTimeout(r, 120));
    assert.strictEqual(veces, 1);
  });
  it('pasoEnHtml arma un paso con título', () => {
    const m = cargarModulos(['comun/utilidades.js']);
    assert.strictEqual(m.traer('pasoEnHtml')('Título', '<b>x</b>'), '<div class="paso"><div class="paso-titulo">Título</div><b>x</b></div>');
  });
});

describe('colores de las celdas (tabla-interactiva.js)', () => {
  const m = cargarModulos(['comun/notacion.js', 'comun/tabla-interactiva.js'], { document: { addEventListener() {} } });
  const tabla = m.evaluar('crearTablaInteractiva({ camposEnOrden: ["a", "b", "c", "d"], grafo: () => new GrafoDeDependencias(), explicar: () => {} })');
  it('cada celda tiene un color propio: 400 celdas, todas distintas y separadas al menos 0.5° de tono', () => {
    const tonos = [];
    for (let fila = 0; fila < 100; fila++) {
      for (const campo of ['a', 'b', 'c', 'd']) {
        const color = tabla.colorDeCelda(campo, fila);
        const tono = Number(/hsl\(([\d.]+),/.exec(color)[1]);
        tonos.push(tono);
      }
    }
    assert.strictEqual(new Set(tonos).size, tonos.length, 'tonos repetidos');
    const ordenados = [...tonos].sort((a, b) => a - b);
    let menorSeparacion = 360;
    for (let i = 1; i < ordenados.length; i++) menorSeparacion = Math.min(menorSeparacion, ordenados[i] - ordenados[i - 1]);
    assert.ok(menorSeparacion > 0.4, 'separación mínima ' + menorSeparacion);
  });
  it('las primeras 12 celdas tienen colores bien distinguibles (≥ 15° entre sí)', () => {
    const tonos = [];
    for (let i = 0; i < 12; i++) tonos.push(Number(/hsl\(([\d.]+),/.exec(tabla.colorDeCelda('a', i))[1]));
    for (let i = 0; i < tonos.length; i++) for (let j = i + 1; j < tonos.length; j++) {
      const d = Math.abs(tonos[i] - tonos[j]);
      assert.ok(Math.min(d, 360 - d) >= 15, `celdas ${i} y ${j}: ${tonos[i]} y ${tonos[j]}`);
    }
  });
  it('la misma celda siempre tiene el mismo color', () => {
    assert.strictEqual(tabla.colorDeCelda('b', 7), tabla.colorDeCelda('b', 7));
  });
  it('referencia(): enlace con el color de la celda y sus coordenadas', () => {
    const html = tabla.referencia('b', 3, 'x₂');
    assert.ok(html.includes('class="ref-link"') && html.includes('data-campo="b"') && html.includes('data-idx="3"') && html.includes('>x₂<'));
    assert.ok(html.includes(tabla.colorDeCelda('b', 3)));
  });
});

describe('interacción de la tabla en una página real', () => {
  it('seleccionar una celda marca solo esa celda y su fila; tocar otra mueve la selección', () => {
    const p = abrirPagina('hermite.html');
    [[-2, -12, 22], [1, 9, 10]].forEach(([x, f, d], i) => { p.escribir('x' + i, x); p.escribir('f' + i, f); p.escribir('d' + i, d); });
    p.clic(p.boton('Resolver'));
    p.clic(p.d.querySelector('td[data-campo="c2"][data-idx="0"]'));
    assert.strictEqual(p.d.querySelectorAll('td.selected').length, 1);
    assert.strictEqual(p.d.querySelectorAll('tr.fila-activa').length, 1);
    p.clic(p.d.querySelector('td[data-campo="c0"][data-idx="3"]'));
    assert.strictEqual(p.d.querySelectorAll('td.selected').length, 1);
    assert.strictEqual(p.d.querySelector('td.selected').dataset.idx, '3');
    assert.strictEqual(p.d.querySelectorAll('td.related').length, 0);
    p.cerrar();
  });
  it('tocar una referencia dentro de la explicación hace pulsar esa celda con su color', () => {
    const p = abrirPagina('hermite.html');
    [[-2, -12, 22], [1, 9, 10]].forEach(([x, f, d], i) => { p.escribir('x' + i, x); p.escribir('f' + i, f); p.escribir('d' + i, d); });
    p.clic(p.boton('Resolver'));
    p.clic(p.d.querySelector('td[data-campo="c3"][data-idx="0"]'));
    const enlace = p.d.querySelector('#explainBox .ref-link');
    p.clic(enlace);
    const pulsada = p.d.querySelector('td.ref-highlight');
    assert.ok(pulsada);
    assert.strictEqual(pulsada.dataset.campo, enlace.dataset.campo);
    assert.strictEqual(pulsada.dataset.idx, enlace.dataset.idx);
    p.cerrar();
  });
  it('tocar un dato dentro de la explicación lleva al campo y lo hace parpadear', () => {
    const p = abrirPagina('sistemas_lineales.html');
    [[10, 1, 1], [1, 10, 1], [1, 1, 10]].forEach((fila, i) => { fila.forEach((v, j) => p.escribir('a' + i + j, v)); p.escribir('b' + i, 12); });
    p.clic(p.boton('Resolver'));
    p.clic(p.d.querySelector('td[data-campo="v0"][data-idx="1"]'));
    const enlace = p.d.querySelector('#explainBox .input-link');
    p.clic(enlace);
    assert.ok(p.d.getElementById(enlace.dataset.input).classList.contains('input-flash'));
    p.cerrar();
  });
});
