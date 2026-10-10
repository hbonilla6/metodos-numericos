const { describe, it } = require('node:test');
const assert = require('node:assert');
const { cargarModulos, referencias, casiIguales, plano, Decimal } = require('./ayudas');

const m = cargarModulos(['comun/formato.js', 'raices/expresion.js', 'raices/derivada.js', 'raices/metodos.js', 'raices/punto-fijo.js']);
const T = n => m.traer(n);
const D = valor => new Decimal(valor);
const TOL = D('1e-7');
const CAMPOS = ['a', 'b', 'fa', 'fb', 'xi', 'fxi', 'error'];

/** Compara las filas de la página con las del generador de Python, campo por campo. */
function compararFilas(filasReales, filasEsperadas, nombre, campos = CAMPOS) {
  assert.strictEqual(filasReales.length, filasEsperadas.length, `${nombre}: distinto número de iteraciones`);
  filasEsperadas.forEach((esperada, i) => {
    const real = filasReales[i];
    assert.strictEqual(real.iteracion, esperada.it, `${nombre}: iteración ${i + 1}`);
    for (const campo of campos) {
      const valorReal = real[campo];
      const valorEsperado = esperada[campo];
      if (valorEsperado === null) {
        assert.ok(valorReal === null || valorReal === undefined, `${nombre}, fila ${i + 1}, ${campo}: debía ser vacío y es ${valorReal}`);
      } else {
        assert.ok(valorReal !== null && casiIguales(valorReal, valorEsperado, '1e-28'),
          `${nombre}, fila ${i + 1}, ${campo}: obtuve ${valorReal}, debía ser ${valorEsperado}`);
      }
    }
  });
}

describe('los cuatro métodos de intervalo y Newton contra Python (cada fila de la tabla)', () => {
  for (const caso of referencias.raices) {
    const f = () => T('construirFuncion')(caso.expresion);
    const a = D(caso.a), b = D(caso.b);

    it(`${caso.expresion}: bisección`, () => {
      const filas = T('correrIntervalo')('bisec', f(), a, b, TOL, 80);
      compararFilas(filas, caso.biseccion, 'bisección');
    });
    it(`${caso.expresion}: regla falsa`, () => {
      const filas = T('correrIntervalo')('falsa', f(), a, b, TOL, 80);
      compararFilas(filas, caso.falsa, 'regla falsa');
    });
    it(`${caso.expresion}: secante`, () => {
      const filas = T('correrSecante')(f(), a, b, TOL, 80);
      compararFilas(filas, caso.secante, 'secante');
    });
    it(`${caso.expresion}: Newton-Raphson`, () => {
      const funcion = f();
      const filas = T('correrNewton')(funcion, T('derivarFuncion')(funcion), a, TOL, 80);
      compararFilas(filas, caso.newton, 'Newton');
    });
  }
});

describe('cada método llega a la raíz de referencia (alta precisión) dentro de su tolerancia', () => {
  // cota del error verdadero respecto de la raíz exacta; la regla falsa se acerca por un solo lado y es más lenta
  const cotas = { biseccion: '2e-7', falsa: '2e-5', secante: '1e-7', newton: '1e-7' };
  for (const caso of referencias.raices) {
    for (const [clave, cota] of Object.entries(cotas)) {
      it(`${caso.expresion}: ${clave}`, () => {
        const filas = caso[clave];
        const ultima = filas[filas.length - 1];
        const error = D(ultima.xi).minus(caso.raiz).abs();
        assert.ok(error.lessThan(cota), `la raíz ${ultima.xi} se aleja ${error} de ${caso.raiz}`);
      });
    }
  }
});

describe('bisección: propiedades', () => {
  for (const caso of referencias.raices) {
    it(caso.expresion, () => {
      const f = T('construirFuncion')(caso.expresion);
      const filas = T('correrIntervalo')('bisec', f, D(caso.a), D(caso.b), TOL, 80);
      filas.forEach((fila, i) => {
        assert.ok(fila.fa.times(fila.fb).lessThan(0), 'la raíz debe seguir encerrada: f(a)·f(b) < 0');
        assert.ok(fila.xi.equals(fila.a.plus(fila.b).dividedBy(2)), 'xi es el punto medio');
        if (i > 0) {
          const anchoAnterior = filas[i - 1].b.minus(filas[i - 1].a);
          assert.ok(fila.b.minus(fila.a).equals(anchoAnterior.dividedBy(2)), 'el intervalo se reduce a la mitad');
          assert.ok(fila.error.equals(fila.xi.minus(filas[i - 1].xi).abs()));
        } else {
          assert.strictEqual(fila.error, null);
        }
      });
    });
  }
});

describe('regla falsa y secante: el nuevo punto es donde la recta cruza el eje x', () => {
  const calcular = T('calcularNuevoPunto');
  it('para 300 pares al azar, la recta por (a, f(a)) y (b, f(b)) vale 0 en xi', () => {
    let semilla = 7;
    const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
    for (let i = 0; i < 300; i++) {
      const a = D((azar() * 20 - 10).toFixed(3)), b = D((azar() * 20 - 10).toFixed(3));
      const fa = D((azar() * 40 - 20).toFixed(3)), fb = D((azar() * 40 - 20).toFixed(3));
      if (a.equals(b) || fa.equals(fb)) continue;
      for (const metodo of ['falsa', 'secante']) {
        const xi = calcular(metodo, a, b, fa, fb);
        const pendiente = fb.minus(fa).dividedBy(b.minus(a));
        const enLaRecta = fa.plus(pendiente.times(xi.minus(a)));
        assert.ok(enLaRecta.abs().lessThan('1e-30'), `${metodo}: la recta vale ${enLaRecta} en xi`);
      }
    }
  });
  it('bisección: punto medio', () => assert.strictEqual(calcular('bisec', D(2), D(5), D(1), D(-1)).toString(), '3.5'));
  it('falsa y secante usan la misma fórmula', () => {
    assert.ok(calcular('falsa', D(1), D(3), D(-2), D(4)).equals(calcular('secante', D(1), D(3), D(-2), D(4))));
    assert.ok(casiIguales(calcular('falsa', D(1), D(3), D(-2), D(4)), D(5).dividedBy(3), '1e-38'));   // 1 + 4/6 = 5/3
  });
});

describe('Newton-Raphson: cada fila cumple xᵢ₊₁ = xᵢ − f(xᵢ) ÷ f\'(xᵢ)', () => {
  for (const caso of referencias.raices) {
    it(caso.expresion, () => {
      const f = T('construirFuncion')(caso.expresion);
      const derivada = T('derivarFuncion')(f);
      const filas = T('correrNewton')(f, derivada, D(caso.a), TOL, 80);
      filas.forEach(fila => {
        assert.ok(casiIguales(fila.xi, fila.a.minus(fila.fa.dividedBy(fila.b)), '1e-35'));
        assert.ok(casiIguales(fila.fa, f(fila.a), '1e-35'));
        assert.ok(casiIguales(fila.b, derivada(fila.a), '1e-35'));
        assert.ok(casiIguales(fila.fxi, f(fila.xi), '1e-35'));
      });
    });
  }
});

describe('casos límite de los métodos', () => {
  const f = texto => T('construirFuncion')(texto);
  it('Newton con f\'(x₀) = 0 termina en una fila divergente, sin inventar un número', () => {
    const funcion = f('x^2 - 4');
    const filas = T('correrNewton')(funcion, T('derivarFuncion')(funcion), D(0), TOL, 80);
    assert.strictEqual(filas.length, 1);
    assert.ok(filas[0].divergio && filas[0].xi === null);
  });
  it('secante con f(x₀) = f(x₁) termina en una fila divergente', () => {
    const filas = T('correrSecante')(f('x^2'), D(-1), D(1), TOL, 80);
    assert.ok(filas[filas.length - 1].divergio);
  });
  it('un método que no converge se detiene en el tope de 80 iteraciones', () => {
    const funcion = f('x^3 - 2*x + 2');  // Newton desde 0 oscila entre 0 y 1
    const filas = T('correrNewton')(funcion, T('derivarFuncion')(funcion), D(0), TOL, 80);
    assert.strictEqual(filas.length, 80);
    assert.ok(!T('llegoALaTolerancia')(filas, TOL));
  });
  it('llegoALaTolerancia: usa el error de la última fila, ignora las divergentes', () => {
    const llego = T('llegoALaTolerancia');
    assert.ok(llego([{ error: D('1e-8'), divergio: false }], TOL));
    assert.ok(!llego([{ error: D('1e-6'), divergio: false }], TOL));
    assert.ok(!llego([{ error: null, divergio: false }], TOL));
    assert.ok(!llego([{ error: null, divergio: true }], TOL));
    assert.ok(!llego([{ error: D('1e-9'), divergio: true }], TOL));
    assert.ok(!llego([{ error: D('1e-7'), divergio: false }], TOL), 'justo en la tolerancia no basta: tiene que ser menor');
  });
  it('correrMetodoDeIntervalo reparte a la función correcta', () => {
    const funcion = f('x^2 - 2');
    const via = T('correrMetodoDeIntervalo');
    assert.deepStrictEqual(plano(via('secante', funcion, D(1), D(2), TOL, 80).map(r => r.xi.toString())),
      plano(T('correrSecante')(funcion, D(1), D(2), TOL, 80).map(r => r.xi.toString())));
    assert.deepStrictEqual(plano(via('falsa', funcion, D(1), D(2), TOL, 80).map(r => r.xi.toString())),
      plano(T('correrIntervalo')('falsa', funcion, D(1), D(2), TOL, 80).map(r => r.xi.toString())));
  });
  it('la secante guarda cómo se desliza: cambioPrevio null en la primera fila y "desliza" después', () => {
    const filas = T('correrSecante')(f('x^2 - 2'), D(1), D(2), TOL, 80);
    assert.strictEqual(filas[0].cambioPrevio, null);
    assert.ok(filas.slice(1).every(fila => fila.cambioPrevio === 'desliza'));
  });
  it('en bisección y falsa, cambioPrevio dice qué extremo se reemplazó', () => {
    const filas = T('correrIntervalo')('bisec', f('x^2 - 2'), D(1), D(2), TOL, 80);
    assert.strictEqual(filas[0].cambioPrevio, null);
    filas.slice(1).forEach((fila, i) => {
      const anterior = filas[i];
      assert.strictEqual(fila.cambioPrevio, anterior.proximoCambio);
      if (anterior.proximoCambio === 'a') assert.ok(fila.a.equals(anterior.xi) && fila.b.equals(anterior.b));
      else assert.ok(fila.b.equals(anterior.xi) && fila.a.equals(anterior.a));
    });
  });
});

describe('punto fijo contra Python', () => {
  for (const caso of referencias.raices.filter(c => c.puntoFijo)) {
    it(`${caso.expresion} (x₀ = ${caso.puntoFijo.x0})`, () => {
      const resultado = T('elegirPuntoFijoConvergente')(T('construirFuncion')(caso.expresion), D(caso.puntoFijo.x0), TOL, 80);
      assert.ok(resultado.convergio, 'debía converger');
      compararFilas(resultado.filas, caso.puntoFijo.filas, 'punto fijo', ['a', 'fa', 'xi', 'error']);
    });
  }
  for (const caso of referencias.raices.filter(c => c.puntoFijo)) {
    it(`${caso.expresion}: la raíz que encuentra es raíz de f(x) (precisión de la referencia)`, () => {
      const f = T('construirFuncion')(caso.expresion);
      const resultado = T('elegirPuntoFijoConvergente')(f, D(caso.puntoFijo.x0), TOL, 80);
      const ultima = resultado.filas[resultado.filas.length - 1];
      // el error verdadero debe ser del orden de la tolerancia (la iteración converge con razón menor que 1)
      assert.ok(D(ultima.xi).minus(D(caso.raiz)).abs().lessThan('1e-6'));
    });
  }
});
