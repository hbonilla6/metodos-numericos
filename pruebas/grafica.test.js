const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, cargarModulos, referencias, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/grafica.js']);
const T = n => m.traer(n);

describe('graficador: ayudas numéricas', () => {
  it('pasoRedondo siempre da 1, 2 o 5 × 10ⁿ y deja entre 3 y 12 marcas (2000 rangos)', () => {
    let semilla = 11;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    for (let i = 0; i < 2000; i++) {
      const rango = Math.pow(10, azar() * 14 - 7) * (1 + azar() * 8);
      const paso = T('pasoRedondo')(rango);
      const mantisa = paso / Math.pow(10, Math.floor(Math.log10(paso)));
      assert.ok([1, 2, 5].some(v => Math.abs(mantisa - v) < 1e-9), `paso ${paso} no es 1, 2 ni 5 × 10ⁿ`);
      const marcas = rango / paso;
      assert.ok(marcas >= 3 && marcas <= 12, `rango ${rango}: ${marcas} marcas`);
    }
  });
  it('marcasDelEje: dentro del rango, equiespaciadas, sin ruido de coma flotante y con el 0 cuando cabe', () => {
    for (const [min, max] of [[-2.5, 2.5], [0, 10], [-0.3, 0.9], [1.4, 2.6], [-1000, 5000], [0.0001, 0.0009], [-7, -1]]) {
      const marcas = Array.from(T('marcasDelEje')(min, max));
      assert.ok(marcas.length >= 2, `[${min}, ${max}]`);
      assert.ok(marcas.every(v => v >= min - 1e-12 && v <= max + 1e-12));
      const pasos = marcas.slice(1).map((v, i) => v - marcas[i]);
      assert.ok(pasos.every(p => Math.abs(p - pasos[0]) < 1e-9 * Math.max(1, Math.abs(pasos[0]))));
      assert.ok(marcas.every(v => String(v).replace(/^-?\d+\.?/, '').length <= 12), 'ruido: ' + marcas.join(','));
      if (min < 0 && max > 0) assert.ok(marcas.some(v => v === 0), `debía haber una marca en 0 en [${min}, ${max}]`);
    }
  });
  it('textoDeMarca: signo menos tipográfico y sin ceros de más', () => {
    const f = T('textoDeMarca');
    assert.strictEqual(f(-1.5), '−1.5');
    assert.strictEqual(f(2), '2');
    assert.strictEqual(f(0.1 + 0.2), '0.3');
    assert.strictEqual(f(1234.5678912), '1234.57');
  });
  it('rangoVertical ignora el 5 % más extremo y siempre deja un rango no vacío', () => {
    const valores = Array.from({ length: 200 }, (_, i) => i / 10 - 10);   // −10 … 9.9
    valores.push(1e9, -1e9);                                            // asíntotas
    const [min, max] = T('rangoVertical')(valores);
    assert.ok(max < 100 && min > -100, `${min}, ${max}`);
    assert.ok(min <= -9.5 && max >= 9.4, `se perdieron datos normales: ${min}, ${max}`);   // lo que no es asíntota se conserva
    const [a, b] = T('rangoVertical')([3, 3, 3]);
    assert.ok(a < 3 && b > 3);
    assert.deepStrictEqual(Array.from(T('rangoVertical')([])), [-1, 1]);
  });
  it('rangoConMargen: margen proporcional y ancho mínimo alrededor del centro', () => {
    const f = T('rangoConMargen');
    assert.deepStrictEqual(Array.from(f([0, 10], 0.1)), [-1, 11]);
    const [a, b] = f([2, 2.1], 0.25, 1.5);
    assert.ok(Math.abs((b - a) - 1.5) < 1e-12 && Math.abs((a + b) / 2 - 2.05) < 0.05);
    const [c, d] = f([5], 0.15);
    assert.ok(c < 5 && d > 5);
  });
  it('valorSeguro: números finitos o null', () => {
    assert.strictEqual(T('valorSeguro')(x => x * 2, 3), 6);
    assert.strictEqual(T('valorSeguro')(x => 1 / x, 0), null);
    assert.strictEqual(T('valorSeguro')(() => { throw new Error('x'); }, 1), null);
    assert.strictEqual(T('valorSeguro')(() => NaN, 1), null);
  });
  it('escaparTexto evita que un título meta etiquetas', () => {
    assert.strictEqual(T('escaparTexto')('<b>&</b>'), '&lt;b&gt;&amp;&lt;/b&gt;');
  });
});

// ---------------------------------------------------------------- dibujo

/** Convierte el SVG dibujado en una transformación píxel ↔ dato usando los números de los ejes. */
function transformacion(svg) {
  const marcas = [...svg.querySelectorAll('text.g-marca')].map(t => ({
    x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y')), valor: Number(t.textContent.replace('−', '-')), anclaje: t.getAttribute('text-anchor'),
  }));
  const enX = marcas.filter(t => t.anclaje === 'middle');
  const enY = marcas.filter(t => t.anclaje === 'end');
  const ajustar = (pares) => {                       // recta píxel = a·valor + b por mínimos cuadrados
    const n = pares.length;
    const sx = pares.reduce((s, [v]) => s + v, 0), sy = pares.reduce((s, [, p]) => s + p, 0);
    const sxx = pares.reduce((s, [v]) => s + v * v, 0), sxy = pares.reduce((s, [v, p]) => s + v * p, 0);
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { a, b: (sy - a * sx) / n };
  };
  const tx = ajustar(enX.map(t => [t.valor, t.x]));
  const ty = ajustar(enY.map(t => [t.valor, t.y - 4]));     // el texto va 4 px bajo la marca
  return {
    pixelX: x => tx.a * x + tx.b, pixelY: y => ty.a * y + ty.b,
    datoX: p => (p - tx.b) / tx.a, datoY: p => (p - ty.b) / ty.a,
    escalaY: Math.abs(ty.a), marcasX: enX.length, marcasY: enY.length,
  };
}
const circulos = svg => [...svg.querySelectorAll('circle')].map(c => ({ cx: Number(c.getAttribute('cx')), cy: Number(c.getAttribute('cy')), titulo: c.querySelector('title').textContent }));
/** ¿El vértice del trazo está sobre la curva f? Se mide en píxeles: las coordenadas del trazo y de las marcas de los ejes se redondean a 0.1 px, y en tramos empinados ese error crece con la pendiente. */
function estaSobreLaCurva(vertice, f, t) {
  const x = t.datoX(vertice.x);
  const h = 1e-4 * Math.max(1, Math.abs(x));
  const pendientePixeles = (t.pixelY(f(x + h)) - t.pixelY(f(x - h))) / (t.pixelX(x + h) - t.pixelX(x - h));
  const distancia = Math.abs(vertice.y - t.pixelY(f(x)));
  return { cerca: distancia <= 0.15 + 0.12 * Math.abs(pendientePixeles), distancia, x, esperado: f(x), real: t.datoY(vertice.y) };
}
function verticesDeCurva(svg, indice = 0) {
  const trazo = svg.querySelectorAll('path.g-curva')[indice].getAttribute('d');
  return [...trazo.matchAll(/([ML])\s*([\d.-]+)\s+([\d.-]+)/g)].map(([, orden, x, y]) => ({ orden, x: Number(x), y: Number(y) }));
}

describe('graficador: el dibujo corresponde a los datos (se leen los números de los ejes)', () => {
  function dibujarEn(pagina, opciones) {
    pagina.w.eval('dibujarGrafica("grafica", ' + JSON.stringify(opciones).replace(/"f":"[^"]*"/g, '') + ')');
  }
  const conCurva = (pagina, funcion, opciones) => {
    pagina.w.__f = funcion;
    pagina.w.eval('dibujarGrafica("grafica", Object.assign({ curvas: [{ f: window.__f, color: "var(--ink)" }] }, ' + JSON.stringify(opciones) + '))');
    return pagina.d.querySelector('#grafica svg');
  };

  it('la parábola y = x² sobre [−2, 3]: cada vértice del trazo cumple y = x² en las unidades de los ejes', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => x * x, { xMin: -2, xMax: 3 });
    const t = transformacion(svg);
    const vertices = verticesDeCurva(svg);
    assert.ok(vertices.length > 400);
    for (const v of vertices) {
      const r = estaSobreLaCurva(v, x => x * x, t);
      assert.ok(r.cerca, `x = ${r.x}: dibujado ${r.real}, debía ser ${r.esperado}`);
    }
    pagina.cerrar();
  });
  it('orientación: lo que crece hacia la derecha se ve a la derecha, y lo que sube se ve arriba', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => x, { xMin: -3, xMax: 3, puntos: [{ x: -2, y: -2 }, { x: 2, y: 2 }] });
    // los números del eje x crecen de izquierda a derecha; los del eje y, de abajo hacia arriba
    const marcas = [...svg.querySelectorAll('text.g-marca')].map(t => ({ x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y')), valor: Number(t.textContent.replace('−', '-')), anclaje: t.getAttribute('text-anchor') }));
    const enX = marcas.filter(t => t.anclaje === 'middle').sort((a, b) => a.valor - b.valor);
    const enY = marcas.filter(t => t.anclaje === 'end').sort((a, b) => a.valor - b.valor);
    for (let i = 1; i < enX.length; i++) assert.ok(enX[i].x > enX[i - 1].x, 'eje x al revés');
    for (let i = 1; i < enY.length; i++) assert.ok(enY[i].y < enY[i - 1].y, 'eje y al revés: un valor mayor debe quedar más arriba');
    // el punto (2, 2) queda arriba y a la derecha del punto (−2, −2)
    const [abajoIzquierda, arribaDerecha] = circulos(svg);
    assert.ok(arribaDerecha.cx > abajoIzquierda.cx && arribaDerecha.cy < abajoIzquierda.cy);
    // la recta y = x sube de izquierda a derecha en la pantalla
    const vertices = verticesDeCurva(svg);
    assert.ok(vertices[vertices.length - 1].x > vertices[0].x && vertices[vertices.length - 1].y < vertices[0].y);
    pagina.cerrar();
  });
  it('el eje x se dibuja donde y = 0 y el eje y donde x = 0', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => x * x - 1, { xMin: -2, xMax: 3 });
    const t = transformacion(svg);
    const ejes = [...svg.querySelectorAll('.g-eje')];
    assert.strictEqual(ejes.length, 2);
    const horizontal = ejes.find(e => e.getAttribute('y1') === e.getAttribute('y2'));
    const vertical = ejes.find(e => e.getAttribute('x1') === e.getAttribute('x2'));
    assert.ok(Math.abs(Number(horizontal.getAttribute('y1')) - t.pixelY(0)) < 0.2);
    assert.ok(Math.abs(Number(vertical.getAttribute('x1')) - t.pixelX(0)) < 0.2);
    pagina.cerrar();
  });
  it('los puntos se dibujan en su lugar y el título dice sus coordenadas', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => x * x, { xMin: -3, xMax: 3, puntos: [{ x: 1, y: 1 }, { x: -2, y: 4 }, { x: 0, y: 0, etiqueta: 'origen' }] });
    const t = transformacion(svg);
    const c = circulos(svg);
    assert.strictEqual(c.length, 3);
    [[1, 1], [-2, 4], [0, 0]].forEach(([x, y], i) => {
      assert.ok(Math.abs(c[i].cx - t.pixelX(x)) < 0.3 && Math.abs(c[i].cy - t.pixelY(y)) < 0.3, `punto ${i}`);
      assert.strictEqual(c[i].titulo, `(${x}, ${y})`.replace(/-/g, '−'));
    });
    assert.ok(svg.textContent.includes('origen'));
    pagina.cerrar();
  });
  it('un punto fuera del rango no se dibuja', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => x, { xMin: -1, xMax: 1, yMin: -1, yMax: 1, puntos: [{ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 9 }] });
    assert.strictEqual(circulos(svg).length, 1);
    pagina.cerrar();
  });
  it('una asíntota (1/x) corta el trazo: ninguna línea une los dos lados', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => 1 / x, { xMin: -2, xMax: 2, yMin: -5, yMax: 5 });
    const t = transformacion(svg);
    const vertices = verticesDeCurva(svg);
    assert.ok(vertices.filter(v => v.orden === 'M').length >= 2, 'debía haber al menos dos trazos');
    for (let i = 1; i < vertices.length; i++) {
      if (vertices[i].orden === 'L') assert.ok(Math.sign(t.datoX(vertices[i].x)) === Math.sign(t.datoX(vertices[i - 1].x)) || Math.abs(t.datoX(vertices[i].x)) < 0.02, 'línea que cruza la asíntota');
    }
    pagina.cerrar();
  });
  it('un valor que no se puede evaluar abre un hueco en la curva', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => Math.sqrt(x), { xMin: -4, xMax: 4 });   // no existe a la izquierda del 0
    const t = transformacion(svg);
    for (const v of verticesDeCurva(svg)) assert.ok(t.datoX(v.x) > -0.02);
    pagina.cerrar();
  });
  it('segmentos y verticales se dibujan en las coordenadas pedidas', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => x, { xMin: 0, xMax: 10, yMin: 0, yMax: 10, segmentos: [{ x1: 1, y1: 2, x2: 7, y2: 9 }], verticales: [{ x: 5, etiqueta: 'cinco' }] });
    const t = transformacion(svg);
    const segmento = svg.querySelector('line.g-segmento');
    assert.ok(Math.abs(Number(segmento.getAttribute('x1')) - t.pixelX(1)) < 0.3 && Math.abs(Number(segmento.getAttribute('y2')) - t.pixelY(9)) < 0.3);
    const vertical = [...svg.querySelectorAll('line.g-discontinua')].find(l => l.getAttribute('x1') === l.getAttribute('x2') && Number(l.getAttribute('y1')) === 14);
    assert.ok(Math.abs(Number(vertical.getAttribute('x1')) - t.pixelX(5)) < 0.3);
    assert.ok(svg.textContent.includes('cinco'));
    pagina.cerrar();
  });
  it('un título con etiquetas HTML no inserta elementos en la página', () => {
    const pagina = abrirPagina('interpolacion.html');
    const svg = conCurva(pagina, x => x, { xMin: 0, xMax: 1, puntos: [{ x: 0.5, y: 0.5, titulo: '<img src=x onerror=alert(1)>', etiqueta: '<script>alert(2)</script>' }] });
    assert.strictEqual(svg.querySelectorAll('img, script').length, 0);
    pagina.cerrar();
  });
  it('la leyenda escribe un elemento por entrada', () => {
    const pagina = abrirPagina('interpolacion.html');
    pagina.w.eval('dibujarLeyenda("graficaLeyenda", [{ color: "red", texto: "uno" }, { color: "blue", texto: "dos" }])');
    assert.deepStrictEqual([...pagina.d.querySelectorAll('.leyenda-item')].map(e => e.textContent), ['uno', 'dos']);
    pagina.cerrar();
  });
});

// ---------------------------------------------------------------- gráficas de cada herramienta

describe('gráfica de interpolación', () => {
  for (const caso of referencias.lagrange.slice(0, 25)) {
    it(JSON.stringify(caso.puntos), () => {
      const pagina = abrirPagina('interpolacion.html');
      caso.puntos.forEach(([x, f], i) => { pagina.escribir('x' + i, x); pagina.escribir('f' + i, f); });
      pagina.clic(pagina.boton('Resolver'));
      const svg = pagina.d.querySelector('#grafica svg');
      const t = transformacion(svg);
      // los puntos están donde dicen los datos
      const c = circulos(svg);
      assert.strictEqual(c.length, caso.puntos.length);
      caso.puntos.forEach(([x, y], i) => assert.ok(Math.abs(c[i].cx - t.pixelX(x)) < 0.3 && Math.abs(c[i].cy - t.pixelY(y)) < 0.3));
      // y la curva es el polinomio de la referencia
      const coef = caso.coeficientes.map(f => { const [n, d] = f.split('/'); return Number(n) / Number(d); });
      const polinomio = x => coef.reduce((s, k, g) => s + k * Math.pow(x, g), 0);
      for (const v of verticesDeCurva(svg)) {
        const r = estaSobreLaCurva(v, polinomio, t);
        assert.ok(r.cerca, `x = ${r.x}: dibujado ${r.real}, debía ser ${r.esperado}`);
      }
      pagina.cerrar();
    });
  }
});

describe('gráfica de Hermite', () => {
  for (const caso of referencias.hermite.slice(0, 20)) {
    it(JSON.stringify(caso.puntos), () => {
      const pagina = abrirPagina('hermite.html');
      caso.puntos.forEach(([x, f, d], i) => { pagina.escribir('x' + i, x); pagina.escribir('f' + i, f); pagina.escribir('d' + i, d); });
      pagina.clic(pagina.boton('Resolver'));
      const svg = pagina.d.querySelector('#grafica svg');
      const t = transformacion(svg);
      const coef = caso.coeficientes.map(f => { const [n, d] = f.split('/'); return Number(n) / Number(d); });
      const polinomio = x => coef.reduce((s, k, g) => s + k * Math.pow(x, g), 0);
      for (const v of verticesDeCurva(svg)) {
        const r = estaSobreLaCurva(v, polinomio, t);
        assert.ok(r.cerca, `x = ${r.x}: dibujado ${r.real}, debía ser ${r.esperado}`);
      }
      // cada trazo de tangente tiene la pendiente f'(x) en las unidades de los datos
      const tangentes = [...svg.querySelectorAll('line.g-segmento')];
      assert.strictEqual(tangentes.length, caso.puntos.length);
      tangentes.forEach((linea, i) => {
        const dx = t.datoX(Number(linea.getAttribute('x2'))) - t.datoX(Number(linea.getAttribute('x1')));
        const dy = t.datoY(Number(linea.getAttribute('y2'))) - t.datoY(Number(linea.getAttribute('y1')));
        assert.ok(Math.abs(dy / dx - caso.puntos[i][2]) < 0.05 * Math.max(1, Math.abs(caso.puntos[i][2])), `punto ${i}: pendiente ${dy / dx} contra ${caso.puntos[i][2]}`);
      });
      pagina.cerrar();
    });
  }
});

describe('gráfica de sistemas', () => {
  const sistemas = [[[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]];
  it('x, y, z por iteración: tantos puntos como filas + el inicial, y líneas punteadas en la solución', () => {
    const pagina = abrirPagina('sistemas_lineales.html');
    sistemas[0].forEach((fila, i) => { fila.forEach((v, j) => pagina.escribir('a' + i + j, v)); pagina.escribir('b' + i, sistemas[1][i]); });
    pagina.clic(pagina.boton('Resolver'));
    const svg = pagina.d.querySelector('#grafica svg');
    const filas = pagina.d.querySelectorAll('#tableBody tr').length;
    assert.strictEqual(svg.querySelectorAll('circle').length, 3 * (filas + 1));
    assert.strictEqual(svg.querySelectorAll('line.g-segmento.g-discontinua').length, 3);
    // la solución es (1, 1, 1): las tres líneas punteadas están a la altura de 1
    const t = transformacion(svg);
    [...svg.querySelectorAll('line.g-segmento')].forEach(l => assert.ok(Math.abs(t.datoY(Number(l.getAttribute('y1'))) - 1) < 1e-3));
    // los puntos de la serie son los valores de la tabla
    const ultima = circulos(svg).slice(-1)[0];
    assert.ok(Math.abs(t.datoY(ultima.cy) - 1) < 1e-2);
    assert.strictEqual(svg.textContent.includes('iteración 15'), false);
    pagina.cerrar();
  });
  it('si la tabla pasa de la iteración 15, se marca una línea en la 15', () => {
    const pagina = abrirPagina('sistemas_lineales.html');
    [[1, '0.9', '0.9'], ['0.9', 1, '0.9'], ['0.9', '0.9', 1]].forEach((fila, i) => { fila.forEach((v, j) => pagina.escribir('a' + i + j, v)); pagina.escribir('b' + i, 3); });
    pagina.clic(pagina.boton('Resolver'));
    assert.ok(pagina.d.querySelector('#grafica svg').textContent.includes('iteración 15'));
    pagina.cerrar();
  });
  it('un sistema que diverge no dibuja líneas de solución', () => {
    const pagina = abrirPagina('sistemas_lineales.html');
    [[1, 3, 1], [3, -1, 2], [2, -1, 1]].forEach((fila, i) => { fila.forEach((v, j) => pagina.escribir('a' + i + j, v)); pagina.escribir('b' + i, [-8, 1, -1][i]); });
    pagina.clic(pagina.boton('Resolver'));
    assert.strictEqual(pagina.d.querySelectorAll('#grafica line.g-segmento').length, 0);
    pagina.cerrar();
  });
  it('la gráfica se oculta al limpiar', () => {
    const pagina = abrirPagina('sistemas_lineales.html');
    sistemas[0].forEach((fila, i) => { fila.forEach((v, j) => pagina.escribir('a' + i + j, v)); pagina.escribir('b' + i, sistemas[1][i]); });
    pagina.clic(pagina.boton('Resolver'));
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'block');
    pagina.clic(pagina.boton('Limpiar'));
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'none');
    pagina.cerrar();
  });
});

describe('gráfica de raíces', () => {
  const generar = (f, a, b, pestana) => {
    const pagina = abrirPagina('metodos_comparacion.html');
    pagina.escribir('fx', f); pagina.escribir('a', a); pagina.escribir('b', b);
    pagina.clic(pagina.boton('Generar tabla'));
    if (pestana) pagina.clic(pagina.d.getElementById(pestana));
    return pagina;
  };
  const PESTANAS = ['tabBisec', 'tabFalsa', 'tabSecante', 'tabNewton'];
  for (const caso of referencias.raices) {
    for (const pestana of PESTANAS) {
      it(`${caso.expresion} — ${pestana}: la curva es f(x) y la raíz está sobre el eje x`, () => {
        const pagina = generar(caso.expresion, caso.a, caso.b, pestana);
        const svg = pagina.d.querySelector('#grafica svg');
        if (pagina.d.getElementById('graficaCard').style.display === 'none') { pagina.cerrar(); return; }
        const t = transformacion(svg);
        const f = new (require('./ayudas').Decimal)(0) && cargarModulos(['comun/formato.js', 'raices/expresion.js']).traer('construirFuncion')(caso.expresion);
        for (const v of verticesDeCurva(svg)) {
          const r = estaSobreLaCurva(v, x => f(new Decimal(x)).toNumber(), t);
          assert.ok(r.cerca, `x = ${r.x}: dibujado ${r.real}, debía ser ${r.esperado}`);
        }
        // el punto verde de la raíz está sobre el eje x, en la raíz de referencia
        const verdes = [...svg.querySelectorAll('circle')].filter(c => c.getAttribute('style').includes('--green'));
        if (verdes.length) {
          assert.strictEqual(verdes.length, 1);
          assert.ok(Math.abs(Number(verdes[0].getAttribute('cy')) - t.pixelY(0)) < 0.3);
          assert.ok(Math.abs(t.datoX(Number(verdes[0].getAttribute('cx'))) - Number(caso.raiz)) < 2e-5 + 0.3 / Math.abs(t.pixelX(1) - t.pixelX(0)));
        }
        pagina.cerrar();
      });
    }
  }
  it('punto fijo: g(x) contra y = x, y la raíz está sobre la diagonal', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3', 'tabPF');
    const svg = pagina.d.querySelector('#grafica svg');
    const t = transformacion(svg);
    const curvas = svg.querySelectorAll('path.g-curva');
    assert.strictEqual(curvas.length, 2);
    // la segunda curva es la diagonal y = x
    for (const v of verticesDeCurva(svg, 1)) assert.ok(estaSobreLaCurva(v, x => x, t).cerca);
    // la primera curva es g(x) = (2x + 5)^(1/3)
    for (const v of verticesDeCurva(svg, 0)) {
      const r = estaSobreLaCurva(v, x => Math.cbrt(2 * x + 5), t);
      assert.ok(r.cerca, `x = ${r.x}: dibujado ${r.real}, debía ser ${r.esperado}`);
    }
    const verde = [...svg.querySelectorAll('circle')].find(c => c.getAttribute('style').includes('--green'));
    const x = t.datoX(Number(verde.getAttribute('cx'))), y = t.datoY(Number(verde.getAttribute('cy')));
    assert.ok(Math.abs(x - y) < 1e-3 && Math.abs(x - 2.0945515) < 1e-3);
    // la escalera: cada tramo es vertical u horizontal
    for (const l of svg.querySelectorAll('line.g-segmento')) {
      const vertical = l.getAttribute('x1') === l.getAttribute('x2');
      const horizontal = l.getAttribute('y1') === l.getAttribute('y2');
      assert.ok(vertical || horizontal);
    }
    pagina.cerrar();
  });
  it('Newton: cada tangente cruza el eje x en la siguiente aproximación', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3', 'tabNewton');
    const svg = pagina.d.querySelector('#grafica svg');
    const t = transformacion(svg);
    const tangentes = [...svg.querySelectorAll('line.g-segmento')];
    assert.ok(tangentes.length >= 3);
    const f = x => x ** 3 - 2 * x - 5, df = x => 3 * x * x - 2;
    tangentes.forEach(l => {
      const x1 = t.datoX(Number(l.getAttribute('x1'))), y1 = t.datoY(Number(l.getAttribute('y1')));
      const x2 = t.datoX(Number(l.getAttribute('x2'))), y2 = t.datoY(Number(l.getAttribute('y2')));
      assert.ok(Math.abs(y1 - f(x1)) < 0.02 && Math.abs(y2) < 0.02);
      assert.ok(Math.abs(x2 - (x1 - f(x1) / df(x1))) < 1e-3, `tangente en ${x1}: cruza en ${x2}`);
    });
    pagina.cerrar();
  });
  it('la gráfica se oculta cuando hay un aviso que impide la tabla', () => {
    const pagina = generar('x^2 - 4', '3', '5', 'tabBisec');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'none');
    pagina.cerrar();
  });
});
