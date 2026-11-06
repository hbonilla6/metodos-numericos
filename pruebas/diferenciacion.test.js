const { describe, it } = require('node:test');
const assert = require('node:assert');
const { abrirPagina, cargarModulos, casiIguales, plano, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/notacion.js', 'comun/formato.js', 'comun/expresion.js', 'comun/derivada.js', 'diferenciacion/metodos.js']);
const T = n => m.traer(n);
const d = n => new Decimal(n);
const f = texto => T('construirFuncion')(texto);
const aproximar = (texto, x0, h) => T('aproximarDerivada')(f(texto), d(x0), d(h));
const valorDe = (aproximaciones, clave) => aproximaciones.find(a => a.clave === clave);
const cerca = (a, b, tolerancia) => Math.abs(a - b) <= tolerancia;

describe('diferenciación numérica: el ejercicio del cuaderno, f(x) = √(3 + x), x₀ = 1, h = 0.1', () => {
  const r = aproximar('sqrt(3 + x)', 1, 0.1);
  const g = Math.sqrt;
  const h = 0.1;
  it('hay cinco fórmulas, en el orden del cuaderno', () => {
    assert.deepStrictEqual(plano(r.map(a => a.clave)), ['adelante', 'atras', 'centrales', 'tres', 'cinco']);
  });
  it('hacia adelante: 0.2484567313', () => assert.ok(cerca(valorDe(r, 'adelante').aproximacion.toNumber(), (g(4.1) - g(4)) / h, 1e-12)));
  it('hacia atrás: 0.2515823419', () => assert.ok(cerca(valorDe(r, 'atras').aproximacion.toNumber(), (g(4) - g(3.9)) / h, 1e-12)));
  it('centrales: 0.2500195366', () => assert.ok(cerca(valorDe(r, 'centrales').aproximacion.toNumber(), (g(4.1) - g(3.9)) / (2 * h), 1e-12)));
  it('3 puntos: 0.2499626967', () => assert.ok(cerca(valorDe(r, 'tres').aproximacion.toNumber(), (-3 * g(4) + 4 * g(4.1) - g(4.2)) / (2 * h), 1e-12)));
  it('5 puntos: 0.2499999786', () => assert.ok(cerca(valorDe(r, 'cinco').aproximacion.toNumber(), (g(3.8) - 8 * g(3.9) + 8 * g(4.1) - g(4.2)) / (12 * h), 1e-12)));
  it('los valores coinciden con los del cuaderno a 9 decimales', () => {
    const esperados = { adelante: '0.248456731', atras: '0.251582342', centrales: '0.250019537', tres: '0.249962697', cinco: '0.249999979' };
    for (const [clave, texto] of Object.entries(esperados)) {
      assert.strictEqual(valorDe(r, clave).aproximacion.toDecimalPlaces(9).toString(), texto, clave);
    }
  });
  it('f(1.1) = 2.024845673 y f(1) = 2', () => {
    const terminos = valorDe(r, 'adelante').terminos;
    assert.strictEqual(terminos[0].fx.toDecimalPlaces(9).toString(), '2.024845673');
    assert.strictEqual(terminos[1].fx.toString(), '2');
  });
  it('la derivada exacta en 1 es 0.25', () => {
    const exacta = T('derivadaExactaEn')(f('sqrt(3 + x)'), d(1));
    assert.ok(casiIguales(exacta.valor, '0.25', '1e-30'));
  });
});

describe('diferenciación numérica: propiedades', () => {
  let semilla = 77;
  const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
  const entero = (minimo, maximo) => minimo + Math.floor(azar() * (maximo - minimo + 1));
  const polinomio = grado => Array.from({ length: grado + 1 }, (_, k) => `(${entero(-9, 9)}/${entero(1, 5)})*x^${k}`).join(' + ');

  const gradoDeExactitud = { adelante: 1, atras: 1, centrales: 2, tres: 2, cinco: 4 };
  for (let caso = 0; caso < 30; caso++) {
    const grado = entero(0, 4);
    const texto = polinomio(grado);
    const x0 = entero(-4, 4);
    const h = ['0.1', '0.5', '1', '0.25'][entero(0, 3)];
    it(`caso ${caso + 1}: f(x) = ${texto}, x₀ = ${x0}, h = ${h}`, () => {
      const exacta = T('derivadaExactaEn')(f(texto), d(x0)).valor;
      for (const a of aproximar(texto, x0, h)) {
        if (grado <= gradoDeExactitud[a.clave]) assert.ok(casiIguales(a.aproximacion, exacta, '1e-25'), `${a.clave}: ${a.aproximacion} contra ${exacta}`);
      }
    });
  }

  it('al reducir h a la mitad el error baja ≈ 2 veces (orden 1), 4 veces (orden 2) y 16 veces (orden 4) en f(x) = e^x', () => {
    const exacta = Decimal.exp(1);
    const error = (clave, h) => valorDe(aproximar('e^x', 1, h), clave).aproximacion.minus(exacta).abs();
    const razon = clave => error(clave, '0.01').dividedBy(error(clave, '0.005')).toNumber();
    assert.ok(cerca(razon('adelante'), 2, 0.05));
    assert.ok(cerca(razon('atras'), 2, 0.05));
    assert.ok(cerca(razon('centrales'), 4, 0.05));
    assert.ok(cerca(razon('tres'), 4, 0.1));
    assert.ok(cerca(razon('cinco'), 16, 0.2));
  });

  it('las diferencias centrales son el promedio de las de adelante y de atrás', () => {
    const r = aproximar('sin(x) + x^2', 0.7, 0.05);
    const promedio = valorDe(r, 'adelante').aproximacion.plus(valorDe(r, 'atras').aproximacion).dividedBy(2);
    assert.ok(casiIguales(valorDe(r, 'centrales').aproximacion, promedio, '1e-30'));
  });
});

describe('diferenciación numérica: puntos donde f no está definida', () => {
  it('una fórmula que necesita un punto fuera del dominio avisa, las demás siguen', () => {
    const r = aproximar('sqrt(x)', 0.05, 0.1);
    assert.match(valorDe(r, 'atras').problema, /f\(x\) no está definida en x = −0\.05/);
    assert.ok(valorDe(r, 'adelante').aproximacion);
    assert.ok(valorDe(r, 'tres').aproximacion);
    assert.match(valorDe(r, 'centrales').problema, /no está definida/);
    assert.match(valorDe(r, 'cinco').problema, /no está definida/);
  });
});

describe('derivada exacta', () => {
  const exacta = (texto, x) => T('derivadaExactaEn')(f(texto), d(x));
  it('sin(x) en 0 vale 1', () => assert.ok(casiIguales(exacta('sin(x)', 0).valor, 1, '1e-30')));
  it('e^(x^2) en 1 vale 2e', () => assert.ok(casiIguales(exacta('e^(x^2)', 1).valor, Decimal.exp(1).times(2), '1e-30')));
  it('guarda el árbol de la derivada', () => assert.strictEqual(exacta('x^2', 3).arbol.tipo, 'binario'));
  it('x^x no se puede derivar: null', () => assert.strictEqual(exacta('x^x', 2), null));
  it('sqrt(x) en 0 tiene derivada infinita: null', () => assert.strictEqual(exacta('sqrt(x)', 0), null));
});

// ---------------------------------------------------------------- la página

function resolver(fx, x0, h) {
  const pagina = abrirPagina('diferenciacion.html');
  pagina.escribir('fx', fx); pagina.escribir('x0', x0); pagina.escribir('h', h);
  pagina.clic(pagina.boton('Resolver'));
  return pagina;
}

const filasDelResumen = pagina => [...pagina.d.querySelectorAll('#pasos table tbody tr')].map(fila => [...fila.children].map(celda => celda.textContent));

describe('página de diferenciación numérica', () => {
  it('el ejercicio del cuaderno: resumen de las cinco fórmulas', () => {
    const pagina = resolver('sqrt(3 + x)', '1', '0.1');
    assert.deepStrictEqual(pagina.errores, []);
    assert.deepStrictEqual(filasDelResumen(pagina), [
      ['Diferencias hacia adelante', 'O(h)', '0.2484567313', '0.0015432687'],
      ['Diferencias hacia atrás', 'O(h)', '0.2515823419', '0.0015823419'],
      ['Diferencias centrales', 'O(h2)', '0.2500195366', '0.0000195366'],
      ['Fórmula de 3 puntos', 'O(h2)', '0.2499626967', '0.0000373033'],
      ['Fórmula de 5 puntos', 'O(h4)', '0.2499999786', '0.0000000214'],
    ]);
    pagina.cerrar();
  });
  it('muestra la derivada exacta y su valor en x₀', () => {
    const pagina = resolver('sqrt(3 + x)', '1', '0.1');
    const primera = pagina.d.querySelector('#pasos .formula');
    assert.ok(primera.querySelector('.frac'));
    assert.match(primera.textContent, /f'\(1\) = 0\.25/);
    pagina.cerrar();
  });
  it('cada fórmula muestra los valores de f y la sustitución', () => {
    const pagina = resolver('sqrt(3 + x)', '1', '0.1');
    const pasos = [...pagina.d.querySelectorAll('#pasos .paso')].map(paso => paso.textContent);
    assert.strictEqual(pasos.length, 7);
    assert.ok(pasos[2].includes('f(x₀ + h) = f(1.1) = 2.0248456731'));
    assert.ok(pasos[2].includes('f(x₀) = f(1) = 2'));
    assert.ok(pasos[6].includes('f(x₀ − 2h) = f(0.8) = 1.949358869'));
    assert.ok(pasos[5].includes('f(x₀ + 2h) = f(1.2) = 2.0493901532'));
    pagina.cerrar();
  });
  it('la fórmula general y la sustituida de cada método', () => {
    const pagina = resolver('x^2', '1', '0.5');
    const formulas = [...pagina.d.querySelectorAll('#pasos .paso')].slice(2).map(paso => paso.querySelectorAll('.formula'));
    const texto = indice => [...formulas[indice]].map(formula => formula.textContent.replace(/\s+/g, ''));
    assert.ok(texto(0)[0].startsWith("f'(x₀)≈f(x₀+h)−f(x₀)h"));
    assert.ok(texto(2)[0].startsWith("f'(x₀)≈f(x₀+h)−f(x₀−h)2h"));
    assert.ok(texto(3)[0].startsWith("f'(x₀)≈12h[−3f(x₀)+4f(x₀+h)−f(x₀+2h)]"));
    assert.ok(texto(4)[0].startsWith("f'(x₀)≈112h[f(x₀−2h)−8f(x₀−h)+8f(x₀+h)−f(x₀+2h)]"));
    pagina.cerrar();
  });
  it('la gráfica muestra f(x), la tangente y las tres rectas con sus pendientes', () => {
    const pagina = resolver('sqrt(3 + x)', '1', '0.1');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'block');
    assert.strictEqual(pagina.d.querySelectorAll('#grafica line.g-segmento').length, 4);
    assert.strictEqual(pagina.d.querySelectorAll('#grafica circle').length, 5);
    assert.strictEqual(pagina.d.querySelectorAll('#graficaLeyenda .leyenda-item').length, 5);
    pagina.cerrar();
  });
  it('sin derivada exacta (x^x) se calculan las aproximaciones sin error', () => {
    const pagina = resolver('x^x', '2', '0.1');
    assert.deepStrictEqual(pagina.errores, []);
    assert.strictEqual(pagina.d.querySelectorAll('#pasos table thead th').length, 3);
    assert.match(pagina.texto('pasos'), /No pude derivar f\(x\) de forma exacta/);
    assert.strictEqual(pagina.d.querySelectorAll('#grafica line.g-segmento').length, 3);
    pagina.cerrar();
  });
  it('si una fórmula no puede evaluarse, su fila queda con guiones y explica por qué', () => {
    const pagina = resolver('sqrt(x)', '0.05', '0.1');
    const filas = filasDelResumen(pagina);
    assert.deepStrictEqual(filas[1].slice(2), ['—', '—']);
    assert.match(pagina.texto('pasos'), /Diferencias hacia atrás · error O\(h\)f\(x\) no está definida en x = −0\.05/);
    pagina.cerrar();
  });
  it('f(x) se muestra con formato matemático apenas se escribe', () => {
    const pagina = abrirPagina('diferenciacion.html');
    pagina.escribir('fx', 'sqrt(3 + x)');
    assert.ok(pagina.d.querySelector('#fxDisplay .raiz'));
    pagina.cerrar();
  });

  describe('validaciones', () => {
    const mensaje = (...datos) => { const p = resolver(...datos); const t = p.texto('statusBox'); const visible = p.d.getElementById('resultCard').style.display; p.cerrar(); return { t, visible }; };
    it('faltan datos: no se muestra nada ni error', () => {
      const pagina = abrirPagina('diferenciacion.html');
      pagina.escribir('fx', 'x^2'); pagina.escribir('x0', '1');
      pagina.clic(pagina.boton('Resolver'));
      assert.strictEqual(pagina.texto('statusBox'), '');
      assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
      pagina.cerrar();
    });
    it('f(x) mal escrita avisa', () => {
      assert.match(mensaje('x^', '1', '0.1').t, /No pude leer f\(x\)/);
      assert.match(mensaje('x + y', '1', '0.1').t, /No pude leer f\(x\)/);
    });
    it('x₀ y h deben ser números', () => {
      assert.match(mensaje('x^2', 'a', '0.1').t, /x₀ y h deben ser números/);
      assert.match(mensaje('x^2', '1', 'h').t, /x₀ y h deben ser números/);
    });
    it('h debe ser positivo', () => {
      for (const h of ['0', '-0.1']) assert.match(mensaje('x^2', '1', h).t, /h debe ser un número positivo/, h);
    });
    it('si f no está definida en ningún punto, avisa', () => assert.match(mensaje('sqrt(x)', '-5', '0.1').t, /no está definida cerca de x₀ = −5/));
  });

  it('Limpiar borra campos, resultados y lo guardado', () => {
    const pagina = resolver('sqrt(3 + x)', '1', '0.1');
    assert.ok(pagina.w.localStorage.getItem('diferenciacion_campos'));
    pagina.clic(pagina.boton('Limpiar'));
    ['fx', 'x0', 'h'].forEach(id => assert.strictEqual(pagina.d.getElementById(id).value, ''));
    assert.strictEqual(pagina.d.getElementById('resultCard').style.display, 'none');
    assert.strictEqual(pagina.d.getElementById('graficaCard').style.display, 'none');
    assert.strictEqual(pagina.w.localStorage.getItem('diferenciacion_campos'), null);
    pagina.cerrar();
  });
});
