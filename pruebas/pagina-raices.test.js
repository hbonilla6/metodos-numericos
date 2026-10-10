const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, referencias, verificarExplicaciones, valorDeCeldaEnPagina, Decimal } = require('./ayudas');

const PESTANAS = { bisec: 'tabBisec', falsa: 'tabFalsa', secante: 'tabSecante', newton: 'tabNewton', puntofijo: 'tabPF' };
const CLAVE_REFERENCIA = { bisec: 'biseccion', falsa: 'falsa', secante: 'secante', newton: 'newton', puntofijo: 'puntoFijo' };

function generar(f, a, b, tol = '1e-7') {
  const pagina = abrirPagina('metodos_comparacion.html');
  pagina.escribir('fx', f); pagina.escribir('a', a); pagina.escribir('b', b); pagina.escribir('tol', tol);
  pagina.clic(pagina.boton('Generar tabla'));
  return pagina;
}
const filasDeTabla = pagina => [...pagina.d.querySelectorAll('#tableBody tr')];
const tarjetaVisible = pagina => pagina.d.getElementById('tableCard').style.display !== 'none';
const numeroDeIteraciones = (pagina, clave) => Number(pagina.texto(clave).replace(/\D/g, ''));

describe('página de raíces: cada pestaña muestra las mismas filas que la referencia de Python', () => {
  for (const caso of referencias.raices) {
    it(caso.expresion, () => {
      const pagina = generar(caso.expresion, caso.a, caso.b);
      assert.deepStrictEqual(pagina.errores, []);
      for (const [metodo, pestana] of Object.entries(PESTANAS)) {
        const esperado = metodo === 'puntofijo' ? (caso.puntoFijo ? caso.puntoFijo.filas : null) : caso[CLAVE_REFERENCIA[metodo]];
        pagina.clic(pagina.d.getElementById(pestana));
        if (metodo === 'puntofijo' && !caso.puntoFijo) continue;   // sin referencia de punto fijo para esta función
        if (metodo === 'puntofijo' && caso.puntoFijo.x0 !== caso.a) continue;   // la página usa a como x₀
        if (!tarjetaVisible(pagina)) continue;
        const filas = filasDeTabla(pagina);
        assert.strictEqual(filas.length, esperado.length, `${metodo}: filas`);
        esperado.forEach((fila, k) => {
          for (const campo of ['a', 'fa', 'xi']) {
            if (fila[campo] === null) continue;
            const real = valorDeCeldaEnPagina(pagina, campo, k);
            if (real === null) continue;                 // columna que ese método no muestra
            const valor = Number(fila[campo]);
            assert.ok(Math.abs(real - valor) <= 1e-9 * Math.max(1, Math.abs(valor)), `${metodo}, fila ${k + 1}, ${campo}: ${real} contra ${valor}`);
          }
        });
      }
      pagina.cerrar();
    });
  }
});

describe('página de raíces: la raíz mostrada coincide con la de referencia', () => {
  for (const caso of referencias.raices) {
    it(caso.expresion, () => {
      const pagina = generar(caso.expresion, caso.a, caso.b);
      for (const [metodo, pestana] of Object.entries(PESTANAS)) {
        pagina.clic(pagina.d.getElementById(pestana));
        const respuesta = pagina.d.querySelector('.final-answer strong');
        if (!respuesta) continue;
        const real = new Decimal(respuesta.textContent.replace('−', '-'));
        const cota = metodo === 'falsa' ? '2e-5' : '2e-7';
        assert.ok(real.minus(caso.raiz).abs().lessThan(cota), `${metodo}: ${real} contra ${caso.raiz}`);
      }
      pagina.cerrar();
    });
  }
});

describe('página de raíces: toda la aritmética de las explicaciones cuadra, método por método', () => {
  const funciones = [
    ['2*x^3 - x^2 - 3', '-1', '2'], ['x^3 - 2*x - 5', '2', '3'], ['x^2 - 4*x + 1', '3', '4'],
    ['x^4 - 3*x - 1', '1', '2'], ['(x+1)/(x-3) - 2', '6', '8'], ['x^2/3 - 2', '1', '4'],
    ['2x^2 + 3x - 5', '0', '2'], ['0.5*x^3 - 1.5*x + 0.25', '1', '2'], ['x^-1 - 0.5', '1', '3'],
  ];
  for (const [f, a, b] of funciones) {
    for (const [metodo, pestana] of Object.entries(PESTANAS)) {
      it(`${f} — ${metodo}`, () => {
        const pagina = generar(f, a, b);
        pagina.clic(pagina.d.getElementById(pestana));
        if (!tarjetaVisible(pagina)) { pagina.cerrar(); return; }     // el método no aplica a esta función
        const r = verificarExplicaciones(pagina);
        assert.deepStrictEqual(r.fallos, [], r.fallos.slice(0, 3).join('\n'));
        assert.ok(r.celdas > 5);
        assert.ok(r.comprobadas >= r.celdas * 0.5, `solo ${r.comprobadas} fórmulas comprobadas en ${r.celdas} celdas`);
        assert.deepStrictEqual(pagina.errores, []);
        pagina.cerrar();
      });
    }
  }
});

describe('página de raíces: comparación de métodos (la ★)', () => {
  it('la ★ está en el método con menos iteraciones, y los contadores son las filas de cada tabla', () => {
    for (const caso of referencias.raices) {
      const pagina = generar(caso.expresion, caso.a, caso.b);
      const iteraciones = {};
      for (const [metodo, pestana] of Object.entries(PESTANAS)) {
        const contador = pagina.texto({ bisec: 'iterBisec', falsa: 'iterFalsa', secante: 'iterSecante', newton: 'iterNewton', puntofijo: 'iterPF' }[metodo]);
        iteraciones[metodo] = contador ? numeroDeIteraciones(pagina, { bisec: 'iterBisec', falsa: 'iterFalsa', secante: 'iterSecante', newton: 'iterNewton', puntofijo: 'iterPF' }[metodo]) : null;
        if (iteraciones[metodo] !== null) {
          pagina.clic(pagina.d.getElementById(pestana));
          assert.strictEqual(filasDeTabla(pagina).length, iteraciones[metodo], `${caso.expresion}: contador de ${metodo}`);
        }
      }
      const conResultado = Object.entries(iteraciones).filter(([, n]) => n !== null);
      assert.ok(conResultado.length >= 3, caso.expresion);
      const mejor = Math.min(...conResultado.map(([, n]) => n));
      const estrellas = Object.entries({ bisec: 'badgeBisec', falsa: 'badgeFalsa', secante: 'badgeSecante', newton: 'badgeNewton', puntofijo: 'badgePF' })
        .filter(([, id]) => pagina.d.getElementById(id).classList.contains('show')).map(([m]) => m);
      assert.strictEqual(estrellas.length, 1, caso.expresion);
      assert.strictEqual(iteraciones[estrellas[0]], mejor, `${caso.expresion}: ★ en ${estrellas[0]}`);
      pagina.cerrar();
    }
  });
  it('si el usuario elige una pestaña a mano, la ★ ya no la cambia; al escribir otra f(x) vuelve a poder', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    const ganadoraInicial = ['tabBisec', 'tabFalsa', 'tabSecante', 'tabNewton', 'tabPF'].find(id => pagina.d.getElementById(id).classList.contains('activo'));
    assert.strictEqual(ganadoraInicial, 'tabNewton');
    pagina.clic(pagina.d.getElementById('tabBisec'));
    pagina.clic(pagina.boton('Generar tabla'));
    assert.ok(pagina.d.getElementById('tabBisec').classList.contains('activo'));
    pagina.escribir('fx', 'x^3 - 2*x - 5 ');
    pagina.clic(pagina.boton('Generar tabla'));
    assert.ok(pagina.d.getElementById('tabNewton').classList.contains('activo'));
    pagina.cerrar();
  });
});

describe('página de raíces: avisos y estados', () => {
  const estado = pagina => pagina.texto('statusBox');
  it('faltan datos: no se calcula nada y no se muestra ningún error', () => {
    const pagina = abrirPagina('metodos_comparacion.html');
    pagina.escribir('fx', 'x^2 - 4');
    pagina.clic(pagina.boton('Generar tabla'));
    assert.strictEqual(estado(pagina), '');
    assert.ok(!tarjetaVisible(pagina));
    pagina.cerrar();
  });
  it('f(x) mal escrita avisa', () => {
    assert.match(estado(generar('x^', '1', '2')), /Revisa f\(x\), a, b y la tolerancia/);
    assert.match(estado(generar('sin(x)', '1', '2')), /Revisa f\(x\)/);
  });
  it('sin cambio de signo en [a, b]: avisa con f(a)·f(b)', () => {
    const pagina = generar('x^2 - 4', '3', '5');
    pagina.clic(pagina.d.getElementById('tabBisec'));
    assert.match(estado(pagina), /f\(a\)·f\(b\) = 105, no es negativo\. No hay raíz garantizada en \[a,b\]\./);
    assert.ok(!tarjetaVisible(pagina));
    pagina.cerrar();
  });
  it('f(a)·f(b) = 0 (una extremo ya es raíz) también se rechaza en bisección', () => {
    const pagina = generar('x^2 - 4', '2', '5');
    pagina.clic(pagina.d.getElementById('tabBisec'));
    assert.match(estado(pagina), /no es negativo/);
    pagina.cerrar();
  });
  it('secante con x₀ = x₁ avisa', () => {
    const pagina = generar('x^2 - 4', '2', '2');
    pagina.clic(pagina.d.getElementById('tabSecante'));
    assert.match(estado(pagina), /x₀ y x₁ deben ser distintos/);
    pagina.cerrar();
  });
  it('Newton con f\'(x₀) = 0 avisa que diverge', () => {
    const pagina = generar('x^2 - 4', '0', '3');
    pagina.clic(pagina.d.getElementById('tabNewton'));
    assert.match(estado(pagina), /Diverge: f'\(xᵢ\) = 0/);
    pagina.cerrar();
  });
  it('Newton con un exponente que no es número avisa que no puede derivar', () => {
    const pagina = generar('x^(1+1) - 4', '1', '3');
    pagina.clic(pagina.d.getElementById('tabNewton'));
    assert.match(estado(pagina), /No pude derivar esta función/);
    pagina.cerrar();
  });
  it('punto fijo con una f(x) que no es un polinomio sencillo avisa', () => {
    const pagina = generar('x^2/3 - 2', '1', '4');
    pagina.clic(pagina.d.getElementById('tabPF'));
    assert.match(estado(pagina), /No pude despejar x de esta f\(x\)/);
    pagina.cerrar();
  });
  it('un método que no llega a la tolerancia lo dice', () => {
    const pagina = generar('x^3 - 2*x + 2', '0', '1');
    pagina.clic(pagina.d.getElementById('tabNewton'));
    assert.match(estado(pagina), /No se alcanzó la tolerancia/);
    assert.strictEqual(filasDeTabla(pagina).length, 80);
    pagina.cerrar();
  });
  it('una tolerancia mayor termina antes: 1e-3 usa menos iteraciones que 1e-12', () => {
    const grande = generar('x^3 - 2*x - 5', '2', '3', '1e-3');
    grande.clic(grande.d.getElementById('tabBisec'));
    const poca = filasDeTabla(grande).length;
    const chica = generar('x^3 - 2*x - 5', '2', '3', '1e-12');
    chica.clic(chica.d.getElementById('tabBisec'));
    assert.ok(poca < filasDeTabla(chica).length);
    grande.cerrar(); chica.cerrar();
  });
  it('la bisección que cae en la raíz exacta se detiene ahí (2x² + 3x − 5 en [0, 2] → 1)', () => {
    const pagina = generar('2x^2 + 3x - 5', '0', '2');
    pagina.clic(pagina.d.getElementById('tabBisec'));
    assert.strictEqual(filasDeTabla(pagina).length, 1);
    assert.strictEqual(pagina.d.querySelector('.final-answer strong').textContent, '1');
    assert.ok(pagina.d.querySelector('td.celda-raiz'));
    pagina.cerrar();
  });
  it('la última fila resalta la raíz: celda-raiz en xᵢ (y en g(xᵢ) para punto fijo)', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    pagina.clic(pagina.d.getElementById('tabNewton'));
    assert.strictEqual(pagina.d.querySelector('td.celda-raiz').dataset.campo, 'xi');
    pagina.clic(pagina.d.getElementById('tabPF'));
    assert.strictEqual(pagina.d.querySelector('td.celda-raiz').dataset.campo, 'fa');
    pagina.cerrar();
  });
  it('los encabezados y las columnas ocultas cambian con el método', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    const visibles = () => [...pagina.d.querySelectorAll('#resultTable thead th')].filter(th => pagina.w.getComputedStyle(th).display !== 'none' && !pagina.d.getElementById('resultTable').classList.contains('oculta-' + (th.className.match(/col-(\w+)/) || [])[1])).map(th => th.textContent);
    pagina.clic(pagina.d.getElementById('tabBisec'));
    assert.deepStrictEqual(visibles(), ['It', 'a', 'b', 'f(a)', 'f(b)', 'xᵢ', 'f(xᵢ)', 'Error']);
    pagina.clic(pagina.d.getElementById('tabSecante'));
    assert.deepStrictEqual(visibles(), ['It', 'x₀', 'x₁', 'f(x₀)', 'f(x₁)', 'xᵢ', 'f(xᵢ)', 'Error']);
    pagina.clic(pagina.d.getElementById('tabNewton'));
    assert.deepStrictEqual(visibles(), ['It', 'xᵢ', "f'(xᵢ)", 'f(xᵢ)', 'xᵢ₊₁', 'f(xᵢ₊₁)', 'Error']);
    pagina.clic(pagina.d.getElementById('tabPF'));
    assert.deepStrictEqual(visibles(), ['It', 'xᵢ', 'g(xᵢ)', 'Error']);
    pagina.cerrar();
  });
  it('Limpiar borra campos, avisos y resultados', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    pagina.clic(pagina.boton('Limpiar'));
    for (const id of ['fx', 'a', 'b', 'tol']) assert.strictEqual(pagina.d.getElementById(id).value, '');
    assert.strictEqual(pagina.texto('fxDisplay'), '');
    assert.ok(!tarjetaVisible(pagina));
    assert.ok(pagina.d.getElementById('tabBisec').classList.contains('activo'));
    pagina.cerrar();
  });
});

describe('página de raíces: vista previa y paneles de apoyo', () => {
  it('f(x) se escribe en formato matemático con una fracción de verdad (nada de "/")', () => {
    const pagina = abrirPagina('metodos_comparacion.html');
    pagina.escribir('fx', 'x^2/3 - 2');
    assert.ok(pagina.d.querySelector('#fxDisplay .frac'));
    assert.ok(!pagina.texto('fxDisplay').includes('/'));
    assert.ok(pagina.texto('fxDisplay').startsWith('f(x) = '));
    pagina.cerrar();
  });
  it('una expresión a medias deja la última vista previa válida', () => {
    const pagina = abrirPagina('metodos_comparacion.html');
    pagina.escribir('fx', 'x^2');
    const antes = pagina.html('fxDisplay');
    pagina.escribir('fx', 'x^2*(');
    assert.strictEqual(pagina.html('fxDisplay'), antes);
    pagina.cerrar();
  });
  it('en Newton se muestra la derivada término por término', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    pagina.clic(pagina.d.getElementById('tabNewton'));
    const panel = pagina.d.getElementById('derivDisplay');
    assert.strictEqual(panel.style.display, 'block');
    assert.match(panel.textContent, /f'\(x\) = 3 · x2 − 2/);
    assert.match(panel.textContent, /Evaluando x₀ = 2/);
    pagina.clic(pagina.d.getElementById('tabBisec'));
    assert.strictEqual(panel.style.display, 'none');
    pagina.cerrar();
  });
  it('en punto fijo se muestra el despeje con una raíz de verdad', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    pagina.clic(pagina.d.getElementById('tabPF'));
    const panel = pagina.d.getElementById('derivDisplay');
    assert.ok(panel.querySelector('.raiz .raiz-indice'));
    assert.match(panel.textContent, /x3 = 2 · x \+ 5/);
    pagina.cerrar();
  });
  it('al cambiar a punto fijo, la vista previa muestra también g(x) (con su raíz) y no "undefined"', () => {
    const pagina = abrirPagina('metodos_comparacion.html');
    pagina.escribir('fx', 'x^3 - 2*x - 5');
    pagina.clic(pagina.d.getElementById('tabPF'));
    pagina.escribir('fx', 'x^3 - 2*x - 5 ');
    assert.ok(!pagina.texto('fxDisplay').includes('undefined'));
    pagina.cerrar();
  });
  it('un número de f(x) tocado en la explicación hace parpadear su lugar en la fórmula', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    pagina.clic(pagina.d.getElementById('tabBisec'));
    pagina.clic(pagina.d.querySelector('td[data-campo="fa"][data-idx="0"]'));
    const enlace = pagina.d.querySelector('#explainBox .input-link[data-tokidx]');
    assert.ok(enlace);
    pagina.clic(enlace);
    assert.ok(pagina.d.querySelector('.fx-token.token-flash'));
    pagina.cerrar();
  });
  it('tocar una celda pinta de colores las celdas de las que depende', () => {
    const pagina = generar('x^3 - 2*x - 5', '2', '3');
    pagina.clic(pagina.d.getElementById('tabBisec'));
    pagina.clic(pagina.d.querySelector('td[data-campo="xi"][data-idx="2"]'));
    const relacionadas = [...pagina.d.querySelectorAll('td.related')].map(td => td.dataset.campo + td.dataset.idx).sort();
    assert.deepStrictEqual(relacionadas, ['a2', 'b2']);
    pagina.clic(pagina.d.querySelector('td[data-campo="error"][data-idx="2"]'));
    assert.deepStrictEqual([...pagina.d.querySelectorAll('td.related')].map(td => td.dataset.campo + td.dataset.idx).sort(), ['xi1', 'xi2']);
    assert.ok(pagina.d.querySelector('td.selected'));
    assert.strictEqual(pagina.d.querySelectorAll('tr.fila-activa').length, 1);
    pagina.cerrar();
  });
});

describe('página de raíces: qué celdas se resaltan al tocar una celda (cada método)', () => {
  const relacionadas = pagina => [...pagina.d.querySelectorAll('td.related')].map(td => td.dataset.campo + '@' + td.dataset.idx).sort();
  const tocar = (pagina, campo, idx) => pagina.clic(pagina.d.querySelector(`td[data-campo="${campo}"][data-idx="${idx}"]`));
  const con = (pestana) => { const p = generar('x^3 - 2*x - 5', '2', '3'); p.clic(p.d.getElementById(pestana)); return p; };

  it('bisección: xᵢ sale de a y b; f(xᵢ) de xᵢ y de f(a) (que decide el cambio); el error de dos xᵢ seguidos', () => {
    const p = con('tabBisec');
    tocar(p, 'xi', 2); assert.deepStrictEqual(relacionadas(p), ['a@2', 'b@2']);
    tocar(p, 'fxi', 2); assert.deepStrictEqual(relacionadas(p), ['fa@2', 'xi@2']);
    tocar(p, 'fa', 2); assert.deepStrictEqual(relacionadas(p), ['a@2']);
    tocar(p, 'error', 2); assert.deepStrictEqual(relacionadas(p), ['xi@1', 'xi@2']);
    p.cerrar();
  });
  it('bisección: el extremo que cambió viene de xᵢ, f(a) y f(xᵢ) de la fila anterior; el otro se copia', () => {
    const p = con('tabBisec');
    const fila = 3;
    const anterior = p.d.querySelectorAll('#tableBody tr')[fila - 1];
    tocar(p, 'a', fila);
    const relA = relacionadas(p);
    tocar(p, 'b', fila);
    const relB = relacionadas(p);
    // exactamente uno de los dos extremos cambió
    const cambioA = relA.includes('xi@' + (fila - 1));
    const cambioB = relB.includes('xi@' + (fila - 1));
    assert.notStrictEqual(cambioA, cambioB);
    if (cambioA) { assert.deepStrictEqual(relA, ['fa@2', 'fxi@2', 'xi@2']); assert.deepStrictEqual(relB, ['b@2']); }
    else { assert.deepStrictEqual(relB, ['fa@2', 'fxi@2', 'xi@2']); assert.deepStrictEqual(relA, ['a@2']); }
    assert.ok(anterior);
    p.cerrar();
  });
  it('regla falsa: xᵢ sale de a, b, f(a) y f(b)', () => {
    const p = con('tabFalsa');
    tocar(p, 'xi', 1); assert.deepStrictEqual(relacionadas(p), ['a@1', 'b@1', 'fa@1', 'fb@1']);
    p.cerrar();
  });
  it('secante: xᵢ sale de x₀, x₁, f(x₀), f(x₁); el error usa x₁ de la misma fila; los extremos se deslizan', () => {
    const p = con('tabSecante');
    tocar(p, 'xi', 2); assert.deepStrictEqual(relacionadas(p), ['a@2', 'b@2', 'fa@2', 'fb@2']);
    tocar(p, 'error', 2); assert.deepStrictEqual(relacionadas(p), ['b@2', 'xi@2']);
    tocar(p, 'a', 2); assert.deepStrictEqual(relacionadas(p), ['b@1']);
    tocar(p, 'b', 2); assert.deepStrictEqual(relacionadas(p), ['xi@1']);
    p.cerrar();
  });
  it("Newton: f'(xᵢ) y f(xᵢ) salen de xᵢ; xᵢ₊₁ de xᵢ, f(xᵢ) y f'(xᵢ); xᵢ viene del xᵢ₊₁ anterior", () => {
    const p = con('tabNewton');
    tocar(p, 'b', 2); assert.deepStrictEqual(relacionadas(p), ['a@2']);
    tocar(p, 'fa', 2); assert.deepStrictEqual(relacionadas(p), ['a@2']);
    tocar(p, 'xi', 2); assert.deepStrictEqual(relacionadas(p), ['a@2', 'b@2', 'fa@2']);
    tocar(p, 'fxi', 2); assert.deepStrictEqual(relacionadas(p), ['xi@2']);
    tocar(p, 'error', 2); assert.deepStrictEqual(relacionadas(p), ['a@2', 'xi@2']);
    tocar(p, 'a', 2); assert.deepStrictEqual(relacionadas(p), ['xi@1']);
    p.cerrar();
  });
  it('punto fijo: solo se enlazan las columnas visibles (xᵢ y g(xᵢ)), nunca las ocultas', () => {
    const p = con('tabPF');
    tocar(p, 'fa', 1); assert.deepStrictEqual(relacionadas(p), ['a@1']);
    tocar(p, 'error', 1); assert.deepStrictEqual(relacionadas(p), ['a@1', 'fa@1']);
    tocar(p, 'a', 2); assert.deepStrictEqual(relacionadas(p), ['fa@1']);
    p.cerrar();
  });
});
