const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, cargarModulos, aExpresion, evaluarNumerico, casiIguales, plano, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/notacion.js', 'comun/formato.js', 'comun/expresion.js', 'comun/derivada.js', 'integracion/metodos.js']);
const T = n => m.traer(n);
const d = n => new Decimal(n);
const f = texto => T('construirFuncion')(texto);
const integrar = (metodo, texto, a, b, n) => T(metodo)(f(texto), d(a), d(b), n);

describe('integración compuesta: los ejercicios del cuaderno, ∫₁² 2x³ dx con n = 4', () => {
  it('punto medio: 7.453125', () => assert.strictEqual(integrar('puntoMedioCompuesto', '2x^3', 1, 2, 4).integral.toString(), '7.453125'));
  it('trapecio: 7.59375', () => assert.strictEqual(integrar('trapecioCompuesto', '2x^3', 1, 2, 4).integral.toString(), '7.59375'));
  it('Simpson: 7.5 (exacto, la función es un polinomio cúbico)', () => assert.strictEqual(integrar('simpsonCompuesto', '2x^3', 1, 2, 4).integral.toString(), '7.5'));
  it('h = 0.25 y los nodos son 1, 1.25, 1.5, 1.75, 2', () => {
    const { h, filas } = integrar('trapecioCompuesto', '2x^3', 1, 2, 4);
    assert.strictEqual(h.toString(), '0.25');
    assert.deepStrictEqual(plano(filas.map(fila => fila.x.toString())), ['1', '1.25', '1.5', '1.75', '2']);
  });
  it('tabla del punto medio: x̄ᵢ y f(x̄ᵢ) de las hojas', () => {
    const { filas, suma } = integrar('puntoMedioCompuesto', '2x^3', 1, 2, 4);
    assert.deepStrictEqual(plano(filas.map(fila => fila.medio && fila.medio.toString())), [null, '1.125', '1.375', '1.625', '1.875']);
    assert.deepStrictEqual(plano(filas.slice(1).map(fila => fila.fMedio.toDecimalPlaces(6).toString())), ['2.847656', '5.199219', '8.582031', '13.183594']);
    assert.strictEqual(suma.toString(), '29.8125');
  });
  it('tabla del trapecio: pesos 1, 2, 2, 2, 1 y suma 60.75', () => {
    const { filas, suma } = integrar('trapecioCompuesto', '2x^3', 1, 2, 4);
    assert.deepStrictEqual(plano(filas.map(fila => fila.coeficiente)), [1, 2, 2, 2, 1]);
    assert.deepStrictEqual(plano(filas.map(fila => fila.ponderado.toString())), ['2', '7.8125', '13.5', '21.4375', '16']);
    assert.strictEqual(suma.toString(), '60.75');
  });
  it('Simpson: Σ₁ = 21.375 y Σ₂ = 29.8125', () => {
    const r = integrar('simpsonCompuesto', '2x^3', 1, 2, 4);
    assert.strictEqual(r.sigma1.toString(), '21.375');
    assert.strictEqual(r.sigma2.toString(), '29.8125');
    assert.strictEqual(r.corchete.toString(), '180');
  });
});

describe('integración compuesta: ∫₁⁴ (1 − √x) dx con 8 subintervalos', () => {
  const r = integrar('trapecioCompuesto', '1 - sqrt(x)', 1, 4, 8);
  it('h = 3/8 y 9 nodos', () => {
    assert.strictEqual(r.h.toString(), '0.375');
    assert.strictEqual(r.filas.length, 9);
  });
  it('suma ponderada −8.87331562 y trapecio −1.66374668 (el cuaderno redondea a 9 decimales)', () => {
    assert.ok(r.suma.minus('-8.873315618').abs().lessThan('2e-9'));
    assert.ok(r.integral.minus('-1.663746678').abs().lessThan('2e-9'));
  });
  it('valores de f(xᵢ) de la tabla', () => {
    const esperados = ['0', '-0.17260394', '-0.322875656', '-0.457737974', '-0.581138830', '-0.695582496', '-0.802775638', '-0.903943277', '-1'];
    r.filas.forEach((fila, i) => assert.ok(fila.fx.minus(esperados[i]).abs().lessThan('1e-8'), `fila ${i}: ${fila.fx}`));
  });
  it('valor exacto −5/3', () => assert.ok(casiIguales(T('integralExacta')(f('1 - sqrt(x)').arbol, d(1), d(4)), d(-5).dividedBy(3), '1e-30')));
});

describe('integración compuesta: propiedades', () => {
  let semilla = 2024;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  const entero = (minimo, maximo) => minimo + Math.floor(azar() * (maximo - minimo + 1));
  const polinomio = grado => {
    const terminos = [];
    for (let k = 0; k <= grado; k++) terminos.push(`(${entero(-9, 9)}/${entero(1, 5)})*x^${k}`);
    return terminos.join(' + ');
  };

  for (let caso = 0; caso < 40; caso++) {
    const grado = entero(0, 3);
    const texto = polinomio(grado);
    const a = entero(-5, 2);
    const b = a + entero(1, 6);
    const n = entero(1, 12);
    it(`caso ${caso + 1}: ∫ ${texto} entre ${a} y ${b}, n = ${n}`, () => {
      const exacta = T('integralExacta')(f(texto).arbol, d(a), d(b));
      assert.ok(exacta !== null);
      // Simpson es exacto hasta grado 3
      assert.ok(casiIguales(integrar('simpsonCompuesto', texto, a, b, n).integral, exacta, '1e-25'), 'Simpson');
      // punto medio y trapecio son exactos hasta grado 1
      if (grado <= 1) {
        assert.ok(casiIguales(integrar('puntoMedioCompuesto', texto, a, b, n).integral, exacta, '1e-25'), 'punto medio');
        assert.ok(casiIguales(integrar('trapecioCompuesto', texto, a, b, n).integral, exacta, '1e-25'), 'trapecio');
      }
      // S = (T + 2M)/3 con los mismos subintervalos
      const trapecio = integrar('trapecioCompuesto', texto, a, b, n).integral;
      const medio = integrar('puntoMedioCompuesto', texto, a, b, n).integral;
      assert.ok(casiIguales(integrar('simpsonCompuesto', texto, a, b, n).integral, trapecio.plus(medio.times(2)).dividedBy(3), '1e-25'), 'S = (T + 2M)/3');
      // T₂ₙ = (Tₙ + Mₙ)/2
      assert.ok(casiIguales(integrar('trapecioCompuesto', texto, a, b, 2 * n).integral, trapecio.plus(medio).dividedBy(2), '1e-25'), 'T₂ₙ = (T + M)/2');
    });
  }

  it('al duplicar n el error del trapecio y del punto medio baja ≈ 4 veces, y el de Simpson ≈ 16 veces', () => {
    const exacta = T('integralExacta')(f('x^5 + x^4').arbol, d(0), d(2));
    const error = (metodo, n) => integrar(metodo, 'x^5 + x^4', 0, 2, n).integral.minus(exacta).abs();
    const razon = (metodo, n) => error(metodo, n).dividedBy(error(metodo, 2 * n)).toNumber();
    assert.ok(Math.abs(razon('trapecioCompuesto', 64) - 4) < 0.1);
    assert.ok(Math.abs(razon('puntoMedioCompuesto', 64) - 4) < 0.1);
    assert.ok(Math.abs(razon('simpsonCompuesto', 32) - 16) < 0.5);
  });

  it('converge a la integral de una función que no es polinomio: ∫₀^π sin(x) dx = 2', () => {
    const resultado = T('simpsonCompuesto')(f('sin(x)'), d(0), d('3.141592653589793238462643383279502884197'), 100).integral;
    assert.ok(resultado.minus(2).abs().lessThan('1e-8'));
  });

  it('∫₀¹ e^(x²) dx ≈ 1.4626517459 (la función del cuaderno sin primitiva elemental)', () => {
    const resultado = T('simpsonCompuesto')(f('e^(x^2)'), d(0), d(1), 100).integral;
    assert.ok(resultado.minus('1.462651745907181608804').abs().lessThan('1e-8'));
  });
});

describe('integración: valor exacto con la regla de la potencia', () => {
  const exacta = (texto, a, b) => T('integralExacta')(f(texto).arbol, d(a), d(b));
  const casos = [['x', 0, 4, '8'], ['3x^2', 0, 2, '8'], ['1/x^2', 1, 2, '0.5'], ['x^-2', 1, 2, '0.5'], ['sqrt(x)', 0, 4, '5.333333333333333333333333333333333333333'],
    ['x^0.5 + 1', 0, 1, '1.666666666666666666666666666666666666667'], ['2*x^3 - x + 4', -1, 2, '18'], ['5', 1, 3, '10'], ['-x^2', 0, 3, '-9'], ['x^2/3', 0, 3, '3']];
  for (const [texto, a, b, esperado] of casos) {
    it(`∫ ${texto} entre ${a} y ${b} = ${esperado}`, () => assert.ok(casiIguales(exacta(texto, a, b), esperado, '1e-30')));
  }
  for (const [texto, a, b] of [['sin(x)', 0, 1], ['1/x', 1, 2], ['1/x^2', -1, 1], ['e^x', 0, 1], ['(x+1)^2', 0, 1], ['x*sin(x)', 0, 1], ['sqrt(x)', -4, -1]]) {
    it(`∫ ${texto} entre ${a} y ${b} no tiene valor exacto disponible`, () => assert.strictEqual(exacta(texto, a, b), null));
  }
});

describe('integración: funciones no definidas en algún nodo', () => {
  it('1/x desde 0 avisa en qué x falla', () => {
    assert.throws(() => integrar('trapecioCompuesto', '1/x', 0, 1, 4), /f\(x\) no está definida en x = 0/);
  });
  it('sqrt(x) en un intervalo con negativos avisa', () => {
    assert.throws(() => integrar('puntoMedioCompuesto', 'sqrt(x)', -1, 1, 4), /no está definida/);
  });
});

// ---------------------------------------------------------------- la página

function resolver(pestana, fx, a, b, n) {
  const pagina = abrirPagina('integracion.html', pestana);
  pagina.escribir('fx', fx); pagina.escribir('a', a); pagina.escribir('b', b); pagina.escribir('n', n);
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}

/** Valores numéricos de cada igualdad de una fórmula "a = b = c" (las partes que no son números se omiten). */
function valoresDeIgualdades(formula) {
  const copia = formula.cloneNode(true);
  return aExpresion(copia, () => null).split('=').map(evaluarNumerico).filter(v => v !== null);
}

describe('página de integración', () => {
  const resultado = pagina => pagina.d.querySelector('.resultado').textContent.replace(/\s+/g, '');
  const exacta = pagina => pagina.d.querySelector('.comparacion').textContent;

  it('punto medio: el ejercicio del cuaderno', () => {
    const pagina = resolver('puntomedio', '2x^3', '1', '2', '4');
    assert.deepStrictEqual(pagina.errores, []);
    assert.match(resultado(pagina), /≈7\.453125$/);
    assert.match(exacta(pagina), /Valor exacto: 7\.5 · Error absoluto: 0\.046875/);
    assert.strictEqual(pagina.d.querySelectorAll('#pasos tbody tr').length, 5);
    pagina.cerrar();
  });
  it('trapecio: el ejercicio del cuaderno', () => {
    const pagina = resolver('trapecio', '2x^3', '1', '2', '4');
    assert.match(resultado(pagina), /≈7\.59375$/);
    assert.match(exacta(pagina), /Error absoluto: 0\.09375/);
    pagina.cerrar();
  });
  it('Simpson: el ejercicio del cuaderno, con Σ₁ y Σ₂', () => {
    const pagina = resolver('simpson', '2x^3', '1', '2', '4');
    assert.match(resultado(pagina), /≈7\.5$/);
    const texto = pagina.texto('pasos');
    assert.ok(texto.includes('Σ₁ = 21.375'));
    assert.ok(texto.includes('Σ₂ = 29.8125'));
    assert.match(exacta(pagina), /Error absoluto: 0$/);
    pagina.cerrar();
  });
  it('trapecio con 1 − √x: −1.663746678 y valor exacto −1.6666666667', () => {
    const pagina = resolver('trapecio', '1 - sqrt(x)', '1', '4', '8');
    assert.deepStrictEqual(pagina.errores, []);
    assert.match(resultado(pagina), /≈−1\.66374667[89]/);
    assert.match(exacta(pagina), /Valor exacto: −1\.6666666667/);
    pagina.cerrar();
  });
  it('sin valor exacto elemental no se muestra la comparación', () => {
    const pagina = resolver('simpson', 'e^(x^2)', '0', '1', '10');
    assert.ok(pagina.d.querySelector('.resultado'));
    assert.strictEqual(pagina.d.querySelector('.comparacion'), null);
    pagina.cerrar();
  });
  it('los límites pueden ser fracciones o pi', () => {
    const pagina = resolver('simpson', 'sin(x)', '0', 'pi', '20');
    assert.deepStrictEqual(pagina.errores, []);
    assert.match(resultado(pagina), /≈2\.0000/);
    pagina.cerrar();
  });
  it('cada igualdad del procedimiento vale lo mismo en los tres métodos', () => {
    for (const pestana of ['puntomedio', 'trapecio', 'simpson']) {
      const pagina = resolver(pestana, '2x^3 - x + 1', '-1', '2.5', '6');
      let comprobadas = 0;
      pagina.d.querySelectorAll('#pasos .formula').forEach(formula => {
        const valores = valoresDeIgualdades(formula);
        if (valores.length < 2) return;
        comprobadas++;
        valores.forEach(v => assert.ok(Math.abs(v - valores[valores.length - 1]) < 1e-8 * Math.max(1, Math.abs(v)), `${pestana}: ${valores}`));
      });
      assert.ok(comprobadas >= 2, pestana);
      pagina.cerrar();
    }
  });
  it('la gráfica aparece con la curva y la figura del método', () => {
    const pagina = resolver('simpson', 'x^2', '0', '2', '4');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'block');
    assert.ok(pagina.d.querySelectorAll('#grafica path.g-curva').length >= 1);
    assert.ok(pagina.d.querySelectorAll('#grafica line.g-segmento').length >= 4 * 12);
    pagina.cerrar();
  });
  it('cambiar de pestaña conserva lo escrito y recalcula', () => {
    const pagina = resolver('puntomedio', '2x^3', '1', '2', '4');
    pagina.clic(pagina.d.getElementById('tab-trapecio'));
    assert.strictEqual(pagina.d.getElementById('fx').value, '2x^3');
    assert.match(resultado(pagina), /≈7\.59375$/);
    pagina.cerrar();
  });
  it('f(x) se muestra con formato matemático apenas se escribe', () => {
    const pagina = abrirPagina('integracion.html');
    pagina.escribir('fx', '1 - sqrt(x)');
    assert.ok(pagina.d.querySelector('#fxDisplay .raiz'));
    pagina.cerrar();
  });

  describe('validaciones', () => {
    const mensaje = (fx, a, b, n, pestana = 'puntomedio') => { const p = resolver(pestana, fx, a, b, n); const t = p.texto('statusBox'); const visible = p.d.getElementById('resultCard').style.display; p.cerrar(); return { t, visible }; };
    it('faltan datos: no se muestra nada ni error', () => {
      const pagina = abrirPagina('integracion.html');
      pagina.escribir('fx', 'x^2'); pagina.escribir('a', '0');
      pagina.clic(pagina.boton('Resolver'));
      assert.strictEqual(pagina.texto('statusBox'), '');
      assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
      pagina.cerrar();
    });
    it('f(x) mal escrita avisa', () => {
      assert.match(mensaje('x^', '0', '1', '4').t, /No pude leer f\(x\)/);
      assert.match(mensaje('foo(x)', '0', '1', '4').t, /No pude leer f\(x\)/);
      assert.match(mensaje('x + y', '0', '1', '4').t, /No pude leer f\(x\)/);
    });
    it('límites que no son números avisan', () => assert.match(mensaje('x', 'a', '1', '4').t, /deben ser números/));
    it('a debe ser menor que b', () => {
      assert.match(mensaje('x', '2', '1', '4').t, /a debe ser menor que b/);
      assert.match(mensaje('x', '1', '1', '4').t, /a debe ser menor que b/);
    });
    it('n debe ser un entero entre 1 y 200', () => {
      for (const n of ['0', '-3', '2.5', 'abc', '201']) assert.match(mensaje('x', '0', '1', n).t, /n debe ser un entero entre 1 y 200/, n);
      assert.strictEqual(mensaje('x', '0', '1', '200').t, '');
    });
    it('f(x) no definida en un nodo avisa dónde', () => assert.match(mensaje('1/x', '0', '1', '4', 'trapecio').t, /f\(x\) no está definida en x = 0/));
    it('el punto medio no evalúa en los extremos, así que sí puede con 1/x desde 0', () => assert.strictEqual(mensaje('1/x', '0', '1', '4').t, ''));
  });

  it('Limpiar borra campos, resultados y lo guardado', () => {
    const pagina = resolver('trapecio', '2x^3', '1', '2', '4');
    assert.ok(pagina.w.localStorage.getItem('integracion_campos'));
    pagina.clic(pagina.boton('Limpiar'));
    assert.strictEqual(pagina.d.getElementById('fx').value, '');
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'none');
    assert.strictEqual(pagina.w.localStorage.getItem('integracion_campos'), null);
    pagina.cerrar();
  });
  it('recuerda la pestaña usada', () => {
    const pagina = resolver('simpson', '2x^3', '1', '2', '4');
    assert.strictEqual(JSON.parse(pagina.w.localStorage.getItem('integracion_pestana')).clave, 'simpson');
    pagina.cerrar();
  });
});
