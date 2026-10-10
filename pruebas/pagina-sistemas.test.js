const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, referencias, decimalDeFraccion, verificarExplicaciones, valorDeCeldaEnPagina, htmlSinAnotaciones, evaluarNumerico, aExpresion, Decimal } = require('./ayudas');

function escribirSistema(pagina, A, b) {
  A.forEach((fila, i) => {
    fila.forEach((valor, j) => pagina.escribir('a' + i + j, valor));
    pagina.escribir('b' + i, b[i]);
  });
}
function resolver(A, b) {
  const pagina = abrirPagina('sistemas_lineales.html');
  escribirSistema(pagina, A, b);
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}
const filasVisibles = pagina => [...pagina.d.querySelectorAll('#tableBody tr')];
const textoPlano = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

describe('página de sistemas: la tabla y la respuesta contra las referencias exactas', () => {
  referencias.sistemas.slice(0, 5).forEach((caso, i) => {
    it(`sistema ${i + 1}: ${JSON.stringify(caso.A)}`, () => {
      const pagina = resolver(caso.A, caso.b);
      assert.deepStrictEqual(pagina.errores, []);
      for (const [pestana, metodo] of [['tabJacobi', 'jacobi'], ['tabGauss', 'gauss']]) {
        pagina.clic(pagina.d.getElementById(pestana));
        const esperadas = caso.trazas[metodo];
        const filas = filasVisibles(pagina);
        const comparables = Math.min(filas.length, esperadas.length);
        for (let k = 1; k <= comparables; k++) {
          [0, 1, 2].forEach(j => {
            const real = valorDeCeldaEnPagina(pagina, 'v' + j, k);
            const esperado = Number(esperadas[k - 1].x[j]);
            assert.ok(Math.abs(real - esperado) <= 1e-9 * Math.max(1, Math.abs(esperado)), `${metodo}, iteración ${k}, ${'xyz'[j]}: ${real} contra ${esperado}`);
          });
        }
      }
      pagina.cerrar();
    });
  });

  it('la respuesta final coincide con la solución exacta (a 6 decimales)', () => {
    for (const idx of [0, 1, 2]) {
      const caso = referencias.sistemas[idx];
      const pagina = resolver(caso.A, caso.b);
      const mostrados = [...pagina.d.querySelectorAll('.final-answer strong')].map(e => Number(e.textContent.replace('−', '-')));
      assert.strictEqual(mostrados.length, 3);
      caso.solucion.forEach((valor, j) => assert.ok(Math.abs(mostrados[j] - Number(decimalDeFraccion(valor))) < 5e-6, `x${j}`));
      pagina.cerrar();
    }
  });
});

describe('página de sistemas: toda la aritmética de las explicaciones cuadra', () => {
  const sistemas = [
    ['fácil (10 en la diagonal)', [[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]],
    ['del cuaderno', [[2, 1, 1], [1, 3, -2], [1, -2, -3]], [6, 13, -1]],
    ['reordenado', [[1, 2, 10], [10, 1, 2], [1, 10, 1]], [13, 13, 12]],
    ['con ceros y negativos', [[4, 0, -1], [0, 5, 2], [-1, 2, 6]], [3, -7, 11]],
    ['decimales', [['4.5', '1.25', 1], [1, '5.5', '0.5'], ['0.25', 1, '6.75']], [7, 8, 9]],
    ['que diverge con el orden de clase', [[1, 3, 1], [3, -1, 2], [2, -1, 1]], [-8, 1, -1]],
  ];
  for (const [nombre, A, b] of sistemas) {
    for (const [pestana, metodo] of [['tabJacobi', 'Jacobi'], ['tabGauss', 'Gauss-Seidel']]) {
      it(`${nombre}, ${metodo}`, () => {
        const pagina = resolver(A, b);
        pagina.clic(pagina.d.getElementById(pestana));
        // se abren todas las filas para poder pulsar cada celda
        pagina.d.getElementById('resultTable').classList.add('expandida');
        const r = verificarExplicaciones(pagina);
        assert.deepStrictEqual(r.fallos, [], r.fallos.slice(0, 3).join('\n'));
        assert.ok(r.celdas >= 8, 'se pulsaron ' + r.celdas + ' celdas');
        assert.ok(r.comprobadas >= r.celdas * 2, `solo ${r.comprobadas} fórmulas con números en ${r.celdas} celdas`);
        assert.deepStrictEqual(pagina.errores, []);
        pagina.cerrar();
      });
    }
  }
  it('explicación de x₂ en Gauss-Seidel: usa los valores nuevos de la misma fila', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    pagina.clic(pagina.d.getElementById('tabGauss'));
    pagina.clic(pagina.d.querySelector('td[data-campo="v1"][data-idx="2"]'));
    const nota = pagina.texto('explainBox');
    assert.match(nota, /Gauss-Seidel: usa los valores ya actualizados en esta misma fila \(x₂\) y los de la anterior \(z₁\)/);
    pagina.clic(pagina.d.querySelector('td[data-campo="v0"][data-idx="2"]'));
    assert.match(pagina.texto('explainBox'), /todavía no hay valores nuevos en esta fila/);
    pagina.clic(pagina.d.getElementById('tabJacobi'));
    pagina.clic(pagina.d.querySelector('td[data-campo="v1"][data-idx="2"]'));
    assert.match(pagina.texto('explainBox'), /Jacobi: todo se calcula únicamente con los valores de la iteración anterior \(fila 1\)/);
    pagina.cerrar();
  });
});

describe('página de sistemas: vista previa del sistema escrito', () => {
  const vistaPrevia = (campos) => {
    const pagina = abrirPagina('sistemas_lineales.html');
    Object.entries(campos).forEach(([id, v]) => pagina.escribir(id, v));
    const filas = [...pagina.d.querySelectorAll('#vistaPrevia .vp-fila')].map(f => f.textContent);
    const visible = pagina.d.getElementById('vistaPrevia').style.display;
    const malos = pagina.d.querySelectorAll('#vistaPrevia .vp-mal').length;
    pagina.cerrar();
    return { filas, visible, malos };
  };
  it('sin nada escrito no se muestra', () => assert.strictEqual(vistaPrevia({}).visible, 'none'));
  it('signos y coeficientes: el 1 no se escribe, el − sustituye al + − y el 0 desaparece', () => {
    const { filas } = vistaPrevia({ a00: '1', a01: '-2', a02: '3', b0: '1', a10: '', a11: '5', a12: '0', b1: '-4', a20: '-1', a21: '-1', a22: '-1', b2: '0' });
    assert.deepStrictEqual(filas, ['x − 2y + 3z = 1', 'x + 5y = −4', '−x − y − z = 0']);
  });
  it('acepta coma decimal y el signo − tipográfico', () => {
    const { filas } = vistaPrevia({ a00: '1,5', a01: '−2', a02: '0,25', b0: '3,5', b1: '1', b2: '1' });
    assert.strictEqual(filas[0], '1.5x − 2y + 0.25z = 3.5');
  });
  it('un valor que no es número se marca en rojo y falta el término independiente se marca con ?', () => {
    const { filas, malos } = vistaPrevia({ a00: 'abc', b0: '', a01: '2' });
    assert.ok(malos >= 1);
    assert.ok(filas[0].includes('?'));
  });
  it('un coeficiente vacío vale 1 en la vista previa y en el cálculo', () => {
    const pagina = resolver([['', '', ''], ['', 4, ''], ['', '', 5]], [3, 6, 7]);
    // sistema: x + y + z = 3, x + 4y + z = 6, x + y + 5z = 7  → solución (1, 1, 1)? se comprueba abajo contra Cramer
    const mostrados = [...pagina.d.querySelectorAll('.final-answer strong')].map(e => Number(e.textContent.replace('−', '-')));
    assert.strictEqual(mostrados.length, 3);
    const A = [[1, 1, 1], [1, 4, 1], [1, 1, 5]], b = [3, 6, 7];
    const det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
    [0, 1, 2].forEach(c => {
      const Ac = A.map((fila, i) => fila.map((v, j) => j === c ? b[i] : v));
      assert.ok(Math.abs(mostrados[c] - det(Ac) / det(A)) < 5e-6);
    });
    pagina.cerrar();
  });
});

describe('página de sistemas: avisos y estados', () => {
  it('falta un término independiente: no se calcula nada y no se muestra ningún error', () => {
    const pagina = abrirPagina('sistemas_lineales.html');
    pagina.escribir('a00', '2'); pagina.escribir('b0', '1');
    pagina.clic(pagina.boton('Resolver'));
    assert.strictEqual(pagina.texto('statusBox'), '');
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    pagina.cerrar();
  });
  it('un coeficiente inválido avisa', () => {
    const pagina = resolver([['4', 'x', '1'], [1, 5, 1], [1, 1, 6]], [7, 8, 9]);
    assert.match(pagina.texto('statusBox'), /Revisa que todos los coeficientes sean números válidos/);
    pagina.cerrar();
  });
  it('un sistema singular avisa y no calcula', () => {
    const pagina = resolver([[1, 2, 3], [2, 4, 6], [1, 1, 1]], [1, 2, 3]);
    assert.match(pagina.texto('statusBox'), /no tiene solución única/);
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    pagina.cerrar();
  });
  it('el sistema de coeficientes chicos (0.001·I) ya no se rechaza como singular', () => {
    const pagina = resolver([['0.001', 0, 0], [0, '0.001', 0], [0, 0, '0.001']], ['0.002', '0.004', '0.006']);
    assert.strictEqual(pagina.texto('statusBox'), '');
    assert.deepStrictEqual([...pagina.d.querySelectorAll('.final-answer strong')].map(e => e.textContent), ['2', '4', '6']);
    pagina.cerrar();
  });
  it('veredicto "Converge" con la respuesta; ★ en el método que llega en menos iteraciones', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    assert.match(pagina.texto('veredicto'), /Converge/);
    const jacobi = Number(pagina.texto('iterJacobi').replace(/\D/g, ''));
    const gauss = Number(pagina.texto('iterGauss').replace(/\D/g, ''));
    assert.ok(gauss <= jacobi);
    assert.ok(pagina.d.getElementById(gauss <= jacobi ? 'badgeGauss' : 'badgeJacobi').classList.contains('show'));
    pagina.cerrar();
  });
  it('el sistema del pizarrón: Diverge en la iteración 15 y se ofrece el otro orden', () => {
    const pagina = resolver([[1, 3, 1], [3, -1, 2], [2, -1, 1]], [-8, 1, -1]);
    assert.match(pagina.texto('veredicto'), /Diverge/);
    assert.match(pagina.texto('veredicto'), /en la iteración 15 los valores no se acercan/);
    assert.strictEqual(filasVisibles(pagina).length, 15);
    assert.match(pagina.texto('veredicto'), /Con otro orden de las ecuaciones \(3, 1, 2\) sí se llega a la solución/);
    pagina.clic(pagina.boton('Probar ese orden'));
    assert.match(pagina.texto('veredicto'), /Converge/);
    assert.match(pagina.texto('veredicto'), /Estás viendo un orden distinto al de clase: ecuaciones \(3, 1, 2\)/);
    const x = [...pagina.d.querySelectorAll('.final-answer strong')].map(e => Number(e.textContent.replace('−', '-')));
    [-19 / 3, -10 / 3, 25 / 3].forEach((esperado, j) => assert.ok(Math.abs(x[j] - esperado) < 5e-6));
    pagina.clic(pagina.boton('Volver al orden de clase'));
    assert.match(pagina.texto('veredicto'), /Diverge/);
    pagina.cerrar();
  });
  it('si hay más de 25 iteraciones, se pliega a 15 filas con un botón para ver el resto; hasta 25 se muestra todo', () => {
    const lento = resolver([[1, '0.9', '0.9'], ['0.9', 1, '0.9'], ['0.9', '0.9', 1]], [3, 3, 3]);
    const total = lento.d.querySelectorAll('#tableBody tr').length;
    assert.ok(total > 25);
    assert.strictEqual([...lento.d.querySelectorAll('#tableBody tr')].filter(tr => !tr.classList.contains('fila-extra')).length, 15);
    const boton = lento.d.getElementById('btnExpandir');
    assert.ok(boton && /iteraciones restantes \(16–/.test(boton.textContent));
    assert.ok(!lento.d.getElementById('resultTable').classList.contains('expandida'));
    lento.clic(boton);
    assert.ok(lento.d.getElementById('resultTable').classList.contains('expandida'));
    assert.match(boton.textContent, /Mostrar solo las primeras 15/);
    lento.clic(boton);
    assert.ok(!lento.d.getElementById('resultTable').classList.contains('expandida'));
    lento.cerrar();

    const rapido = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    assert.strictEqual(rapido.d.getElementById('btnExpandir'), null);
    assert.ok([...rapido.d.querySelectorAll('#tableBody tr')].every(tr => !tr.classList.contains('fila-extra')));
    rapido.cerrar();
  });
  it('la casilla "Mostrar error" oculta la columna y se recuerda', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    const casilla = pagina.d.getElementById('chkError');
    casilla.checked = false;
    casilla.dispatchEvent(new pagina.w.Event('change'));
    assert.ok(pagina.d.getElementById('resultTable').classList.contains('oculta-error'));
    assert.strictEqual(pagina.w.localStorage.getItem('sistemasLineales_mostrarError'), '0');
    casilla.checked = true;
    casilla.dispatchEvent(new pagina.w.Event('change'));
    assert.ok(!pagina.d.getElementById('resultTable').classList.contains('oculta-error'));
    pagina.cerrar();
  });
  it('Limpiar borra todo y lo guardado', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    assert.ok(pagina.w.localStorage.getItem('sistemasLineales_campos'));
    pagina.clic(pagina.boton('Limpiar'));
    assert.strictEqual(pagina.d.getElementById('a00').value, '');
    assert.strictEqual(pagina.w.localStorage.getItem('sistemasLineales_campos'), null);
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    pagina.cerrar();
  });
});

describe('página de sistemas: diagonal dominante', () => {
  it('muestra el sistema original, el acomodado y la comprobación de cada fila', () => {
    const pagina = resolver([[1, 2, 10], [10, 1, 2], [1, 10, 1]], [13, 13, 12]);
    const filas = [...pagina.d.querySelectorAll('.bloque-diag .formula')].map(f => textoPlano(f.textContent));
    assert.strictEqual(filas.length, 3);
    assert.ok(filas.every(f => f.includes('✓ cumple')));
    assert.ok(filas[0].includes('Fila 1 (era la ecuación 2)'));
    assert.strictEqual(pagina.d.querySelectorAll('.diag-sistemas .diag-term').length, 3);
    const comprobaciones = filas.map(f => f.match(/\|(\d+)\| > (.*?) →/));
    assert.ok(comprobaciones.every(c => c));
    pagina.cerrar();
  });
  it('si ningún orden logra diagonal dominante lo avisa', () => {
    const pagina = resolver([[1, 3, 1], [3, -1, 2], [2, -1, 1]], [-8, 1, -1]);
    assert.match(pagina.texto('ordenBox'), /Ningún orden de las ecuaciones logra diagonal estrictamente dominante/);
    assert.ok(pagina.d.querySelectorAll('.diag-mal').length >= 1);
    pagina.cerrar();
  });
});

describe('página de sistemas: qué celdas se resaltan al tocar una celda', () => {
  const relacionadas = pagina => [...pagina.d.querySelectorAll('td.related')].map(td => td.dataset.campo + '@' + td.dataset.idx).sort();
  const tocar = (pagina, campo, idx) => pagina.clic(pagina.d.querySelector(`td[data-campo="${campo}"][data-idx="${idx}"]`));
  it('Jacobi: cada variable usa las otras dos de la fila anterior', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    pagina.clic(pagina.d.getElementById('tabJacobi'));
    tocar(pagina, 'v0', 3); assert.deepStrictEqual(relacionadas(pagina), ['v1@2', 'v2@2']);
    tocar(pagina, 'v1', 3); assert.deepStrictEqual(relacionadas(pagina), ['v0@2', 'v2@2']);
    tocar(pagina, 'v2', 3); assert.deepStrictEqual(relacionadas(pagina), ['v0@2', 'v1@2']);
    pagina.cerrar();
  });
  it('Gauss-Seidel: usa los valores nuevos de la misma fila y los viejos de la anterior', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    pagina.clic(pagina.d.getElementById('tabGauss'));
    tocar(pagina, 'v0', 3); assert.deepStrictEqual(relacionadas(pagina), ['v1@2', 'v2@2']);
    tocar(pagina, 'v1', 3); assert.deepStrictEqual(relacionadas(pagina), ['v0@3', 'v2@2']);
    tocar(pagina, 'v2', 3); assert.deepStrictEqual(relacionadas(pagina), ['v0@3', 'v1@3']);
    pagina.cerrar();
  });
  it('el error usa toda la fila y la anterior', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    tocar(pagina, 'error', 3);
    assert.deepStrictEqual(relacionadas(pagina), ['v0@2', 'v0@3', 'v1@2', 'v1@3', 'v2@2', 'v2@3']);
    pagina.cerrar();
  });
  it('la primera fila depende de los valores iniciales (que no son una celda): nada se resalta', () => {
    const pagina = resolver([[10, 1, 1], [1, 10, 1], [1, 1, 10]], [12, 12, 12]);
    pagina.clic(pagina.d.getElementById('tabJacobi'));
    tocar(pagina, 'v1', 1);
    assert.deepStrictEqual(relacionadas(pagina), []);
    pagina.clic(pagina.d.getElementById('tabGauss'));
    tocar(pagina, 'v1', 1);
    assert.deepStrictEqual(relacionadas(pagina), ['v0@1']);       // en Gauss-Seidel usa el x₁ recién calculado
    pagina.cerrar();
  });
  it('una respuesta que llega antes de la iteración 25 nunca se pliega (el del cuaderno tarda 17)', () => {
    const pagina = resolver([[2, 1, 1], [1, 3, -2], [1, -2, -3]], [6, 13, -1]);
    assert.strictEqual(pagina.d.getElementById('btnExpandir'), null);
    assert.strictEqual(pagina.d.querySelectorAll('#tableBody tr.fila-extra').length, 0);
    pagina.cerrar();
  });
});
